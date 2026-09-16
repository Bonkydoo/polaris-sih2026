// Reorder Forecaster — nightly cron.
// Projects inventory depletion against each item's reorder_threshold_days
// and auto-drafts a purchase requisition (not yet a PO — that needs a
// vendor, decided later in the procurement flow) the moment a station's
// buffer gets tight. Mirrors the derivation in
// apps/command-center/lib/derive.ts — duplicated rather than shared
// because Deno Edge Functions and the Next.js app don't share a module
// graph; if that logic changes, update both.
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { draftWithClaude } from "../_shared/claude.ts";

function daysRemaining(quantity: number, ratePerDay: number) {
  if (ratePerDay <= 0) return Infinity;
  return quantity / ratePerDay;
}

Deno.serve(async () => {
  const supabase = supabaseAdmin();
  const results: Record<string, unknown>[] = [];

  const { data: inventory, error: invErr } = await supabase
    .from("inventory")
    .select("*, stations(id, name, code)");
  if (invErr) return Response.json({ error: invErr.message }, { status: 500 });

  const { data: expedition } = await supabase
    .from("expeditions")
    .select("id, window_close")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  for (const item of inventory ?? []) {
    const days = daysRemaining(item.quantity, item.consumption_rate_per_day);
    const isCritical = days <= item.reorder_threshold_days * 0.75;
    if (!isCritical) continue;

    // Skip if an unreviewed draft already covers this exact item.
    const { data: existing } = await supabase
      .from("ai_agent_runs")
      .select("id")
      .eq("agent_type", "reorder_forecaster")
      .eq("status", "pending_review")
      .contains("input_ref", { inventory_id: item.id })
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const station = item.stations as { id: string; name: string; code: string } | null;
    if (!station) continue;

    const reorderQty = Math.max(
      0,
      Math.round(item.consumption_rate_per_day * item.reorder_threshold_days * 2 - item.quantity)
    );
    const packingDeadline = new Date(Date.now() + Math.max(1, Math.floor(days) - 5) * 86400000);
    if (expedition && new Date(expedition.window_close) < packingDeadline) {
      packingDeadline.setTime(new Date(expedition.window_close).getTime());
    }

    const { data: requisition, error: reqErr } = await supabase
      .from("purchase_requisitions")
      .insert({
        expedition_id: expedition?.id,
        station_id: station.id,
        // Agent-drafted rows still need a human owner of record; the
        // first admin/ops profile stands in until an ops user reassigns it.
        requested_by: await firstCommandStaffId(supabase),
        items: [{ name: item.name, category: item.category, quantity: reorderQty, unit: item.unit }],
        status: "draft",
        packing_deadline: packingDeadline.toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    if (reqErr || !requisition) {
      console.error("Failed to draft requisition:", reqErr);
      continue;
    }

    const draft = await draftWithClaude({
      system:
        "You are the Reorder Forecaster agent inside POLARIS, NCPOR's polar expedition logistics platform. Write a single terse paragraph (2-3 sentences) explaining why you drafted this requisition. State the days remaining, the threshold, and that it's sized to the shipping-window deadline. No preamble, no markdown.",
      prompt: `Item: ${item.name} (${item.category}) at ${station.name}. Quantity: ${item.quantity} ${item.unit}. Consumption: ${item.consumption_rate_per_day}/day. Days remaining: ${Math.round(days)}. Reorder threshold: ${item.reorder_threshold_days} days. Drafted requisition for ${reorderQty} ${item.unit}, packing deadline ${packingDeadline.toDateString()}.`,
      fallback: `Consumption model projects ${station.name}'s ${item.name} stock crosses the ${item.reorder_threshold_days}-day reorder threshold in ${Math.round(days)} days. Auto-drafted a ${reorderQty} ${item.unit} requisition, sized to the shipping-window deadline rather than a flat reorder quantity.`,
      maxTokens: 256,
    });

    const { data: agentRun, error: runErr } = await supabase
      .from("ai_agent_runs")
      .insert({
        agent_type: "reorder_forecaster",
        trigger: "nightly_cron",
        input_ref: { inventory_id: item.id, station_id: station.id, requisition_id: requisition.id },
        title: `Drafted requisition — ${item.name}, ${station.name}`,
        detail: draft.text,
        output: { requisition_id: requisition.id, quantity: reorderQty, unit: item.unit },
        severity: days <= item.reorder_threshold_days * 0.5 ? "critical" : "watch",
        status: "pending_review",
      })
      .select("id")
      .single();
    if (runErr || !agentRun) {
      console.error("Failed to record agent run:", runErr);
      continue;
    }

    await supabase
      .from("purchase_requisitions")
      .update({ drafted_by_agent_run_id: agentRun.id })
      .eq("id", requisition.id);

    results.push({ item: item.name, station: station.name, days: Math.round(days), draftSource: draft.source });
  }

  return Response.json({ processed: results.length, results });
});

async function firstCommandStaffId(supabase: ReturnType<typeof supabaseAdmin>) {
  const { data } = await supabase.from("profiles").select("id").in("role", ["admin", "ops"]).limit(1).maybeSingle();
  return data?.id ?? null;
}
