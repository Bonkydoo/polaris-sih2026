// Vendor Deadline Watcher — nightly cron (also worth wiring to a
// `purchase_orders` update webhook in the dashboard for the "+ on PO
// update" trigger the TRD calls for; cron alone still catches everything
// within a day).
//
// Flags POs whose committed delivery is trending past the *packing*
// cutoff, not the shipping date — that distinction is the whole point:
// missing the packing deadline is what actually strands cargo.
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { draftWithClaude } from "../_shared/claude.ts";

Deno.serve(async () => {
  const supabase = supabaseAdmin();
  const results: Record<string, unknown>[] = [];

  const { data: orders, error } = await supabase
    .from("purchase_orders")
    .select("*, vendors(name, location), purchase_requisitions(station_id, stations(name))")
    .not("status", "in", "(delivered,cancelled)");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const today = new Date();

  for (const po of orders ?? []) {
    const packingDeadline = new Date(po.packing_deadline);
    const committed = po.committed_delivery_date ? new Date(po.committed_delivery_date) : null;
    const daysToDeadline = Math.ceil((packingDeadline.getTime() - today.getTime()) / 86400000);

    const trendingLate = !committed || committed > packingDeadline;
    const alreadyMissed = daysToDeadline < 0;
    if (!trendingLate && !alreadyMissed) continue;

    const newStatus = alreadyMissed ? "late" : "at-risk";
    if (po.status !== newStatus) {
      await supabase.from("purchase_orders").update({ status: newStatus }).eq("id", po.id);
    }

    const { data: existing } = await supabase
      .from("ai_agent_runs")
      .select("id")
      .eq("agent_type", "vendor_deadline_watcher")
      .eq("status", "pending_review")
      .contains("input_ref", { purchase_order_id: po.id })
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const vendor = po.vendors as { name: string; location: string } | null;
    const station = (po.purchase_requisitions as { stations?: { name: string } } | null)?.stations?.name ?? "the station";

    const draft = await draftWithClaude({
      system:
        "You are the Vendor Deadline Watcher agent inside POLARIS. Draft a short, professional escalation email body (3-4 sentences) to a vendor's logistics coordinator about a purchase order trending late against the packing cutoff. Offer two concrete mitigation options. No subject line, no markdown, no salutation placeholders beyond 'Hello,'.",
      prompt: `Vendor: ${vendor?.name ?? "Unknown vendor"} (${vendor?.location ?? "unknown location"}). PO items: ${po.items_summary}. Packing deadline: ${po.packing_deadline}. Committed delivery: ${po.committed_delivery_date ?? "not yet committed"}. Destination: ${station}.`,
      fallback: `${vendor?.name ?? "This vendor"}'s committed delivery for "${po.items_summary}" now lands after the ${po.packing_deadline} packing deadline, not the shipping date. Drafted an escalation with two mitigation options: expedite courier to the transit port, or check for a substitute from another station's surplus stock.`,
      maxTokens: 256,
    });

    const { error: runErr } = await supabase.from("ai_agent_runs").insert({
      agent_type: "vendor_deadline_watcher",
      trigger: "nightly_cron",
      input_ref: { purchase_order_id: po.id },
      title: `Escalation drafted — ${vendor?.name ?? "vendor"} PO trending ${alreadyMissed ? "late" : "at-risk"}`,
      detail: draft.text,
      output: { purchase_order_id: po.id, days_to_deadline: daysToDeadline },
      severity: alreadyMissed ? "critical" : "watch",
      status: "pending_review",
    });
    if (runErr) {
      console.error("Failed to record agent run:", runErr);
      continue;
    }

    results.push({ po: po.id, vendor: vendor?.name, daysToDeadline, draftSource: draft.source });
  }

  return Response.json({ processed: results.length, results });
});
