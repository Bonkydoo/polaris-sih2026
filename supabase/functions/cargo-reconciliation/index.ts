// Cargo Reconciliation — triggered on shipment "arrived" (cron-scanned).
// Diffs each arrived shipment's cargo_items.quantity (the manifest) against
// received_quantity (what a field user scanned in at the station) and
// flags shortfall/overage. Items with received_quantity still null are
// "arrived but not yet checked in" — worth surfacing too, at lower
// severity, since a station that never checks cargo in defeats the point
// of the manifest.
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { draftWithClaude } from "../_shared/claude.ts";

Deno.serve(async () => {
  const supabase = supabaseAdmin();
  const results: Record<string, unknown>[] = [];

  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("id, mode, route, stations:destination_station_id(name), cargo_items(*)")
    .eq("status", "arrived");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  for (const shipment of shipments ?? []) {
    const station = shipment.stations as { name: string } | null;
    const items = (shipment.cargo_items ?? []) as {
      id: string;
      name: string;
      quantity: number;
      unit: string;
      received_quantity: number | null;
    }[];

    const mismatched = items.filter(
      (i) => i.received_quantity !== null && i.received_quantity !== i.quantity
    );
    const unchecked = items.filter((i) => i.received_quantity === null);
    if (mismatched.length === 0 && unchecked.length === 0) continue;

    const { data: existing } = await supabase
      .from("ai_agent_runs")
      .select("id")
      .eq("agent_type", "cargo_reconciliation")
      .eq("status", "pending_review")
      .contains("input_ref", { shipment_id: shipment.id })
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const mismatchSummary = mismatched
      .map((i) => `${i.name}: manifest ${i.quantity} ${i.unit}, received ${i.received_quantity} ${i.unit}`)
      .join("; ");

    const draft = await draftWithClaude({
      system:
        "You are the Cargo Reconciliation agent inside POLARIS. Write a short, factual paragraph (2-3 sentences) summarizing manifest discrepancies for an arrived shipment — shortfalls, overages, or items not yet checked in. No markdown, no speculation about cause.",
      prompt: `Shipment ${shipment.mode} to ${station?.name}, route ${shipment.route}. Mismatched items: ${mismatchSummary || "none"}. Items not yet checked in: ${unchecked.map((i) => i.name).join(", ") || "none"}.`,
      fallback:
        mismatched.length > 0
          ? `Manifest discrepancy on arrival at ${station?.name}: ${mismatchSummary}. ${unchecked.length > 0 ? `${unchecked.length} additional item(s) not yet checked in.` : ""}`
          : `${unchecked.length} item(s) from the ${shipment.mode} shipment to ${station?.name} have arrived but not yet been checked in against the manifest.`,
      maxTokens: 220,
    });

    const { error: runErr } = await supabase.from("ai_agent_runs").insert({
      agent_type: "cargo_reconciliation",
      trigger: "on_shipment_arrived",
      input_ref: { shipment_id: shipment.id },
      title: `Cargo reconciliation — ${station?.name ?? "shipment"} (${shipment.mode})`,
      detail: draft.text,
      output: { mismatched: mismatched.length, unchecked: unchecked.length },
      severity: mismatched.length > 0 ? "critical" : "watch",
      status: "pending_review",
    });
    if (runErr) {
      console.error("Failed to record agent run:", runErr);
      continue;
    }

    results.push({ shipment: shipment.id, mismatched: mismatched.length, unchecked: unchecked.length });
  }

  return Response.json({ processed: results.length, results });
});
