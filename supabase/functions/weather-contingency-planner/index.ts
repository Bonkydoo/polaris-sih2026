// Weather Contingency Planner — triggered on new weather snapshot
// ingestion. Cron-scans snapshots from the last 6h with risk_score above
// threshold, cross-references shipments and POs at that station, and
// drafts a contingency brief with what's actually at stake if the vessel
// has to move.
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { draftWithClaude } from "../_shared/claude.ts";

const RISK_THRESHOLD = 60;

Deno.serve(async () => {
  const supabase = supabaseAdmin();
  const results: Record<string, unknown>[] = [];

  const since = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  const { data: snapshots, error } = await supabase
    .from("weather_snapshots")
    .select("*, stations(id, name)")
    .gte("created_at", since)
    .gte("risk_score", RISK_THRESHOLD)
    .not("station_id", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  for (const snap of snapshots ?? []) {
    const station = snap.stations as { id: string; name: string } | null;
    if (!station) continue;

    const { data: existing } = await supabase
      .from("ai_agent_runs")
      .select("id")
      .eq("agent_type", "weather_contingency_planner")
      .eq("status", "pending_review")
      .contains("input_ref", { weather_snapshot_id: snap.id })
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const { data: shipments } = await supabase
      .from("shipments")
      .select("id, mode, route, status")
      .eq("destination_station_id", station.id)
      .in("status", ["scheduled", "in-transit"]);

    const { data: requisitions } = await supabase
      .from("purchase_requisitions")
      .select("id, purchase_orders(id, items_summary, packing_deadline, status)")
      .eq("station_id", station.id)
      .neq("status", "converted_to_po");

    const affectedPoCount = (requisitions ?? []).length;
    if ((shipments?.length ?? 0) === 0 && affectedPoCount === 0) continue;

    const draft = await draftWithClaude({
      system:
        "You are the Weather Contingency Planner agent inside POLARIS. Write a short contingency brief (3-4 sentences) explaining the weather risk, which shipments/deliveries could be affected, and one or two concrete mitigation options (e.g. moving cargo to air charter, adjusting the packing deadline). No markdown, no headers.",
      prompt: `Station: ${station.name}. Risk score: ${snap.risk_score}/100. Raw signals: ${JSON.stringify(snap.raw_payload)}. Shipments at risk: ${shipments?.length ?? 0} (${(shipments ?? []).map((s) => s.mode).join(", ")}). Pending requisitions at this station: ${affectedPoCount}.`,
      fallback: `A developing weather system at ${station.name} is scoring ${snap.risk_score}/100 on the risk model. ${shipments?.length ?? 0} shipment(s) currently scheduled to or in transit toward this station could be affected if the vessel or flight window shifts. Consider moving time-critical cargo to a faster mode, or confirming the packing deadline still holds before it's too late to adjust.`,
      maxTokens: 256,
    });

    const { error: runErr } = await supabase.from("ai_agent_runs").insert({
      agent_type: "weather_contingency_planner",
      trigger: "on_weather_snapshot",
      input_ref: { weather_snapshot_id: snap.id, station_id: station.id },
      title: `Contingency brief — elevated risk at ${station.name}`,
      detail: draft.text,
      output: { risk_score: snap.risk_score, affected_shipments: shipments?.length ?? 0 },
      severity: snap.risk_score >= 80 ? "critical" : "watch",
      status: "pending_review",
    });
    if (runErr) {
      console.error("Failed to record agent run:", runErr);
      continue;
    }

    results.push({ station: station.name, riskScore: snap.risk_score, draftSource: draft.source });
  }

  return Response.json({ processed: results.length, results });
});
