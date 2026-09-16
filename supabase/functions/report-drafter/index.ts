// Report Drafter — weekly cron, or on-demand (just invoke the function
// directly; it takes no parameters that vary by trigger source).
// Assembles expedition status, cargo utilisation and safety summary into
// a ready-to-review MoES-style report. Always writes the full report
// text to ai_agent_runs.output.report even on the fallback path — the
// fallback is a clean bulleted summary rather than prose, but it's still
// a complete, reviewable document.
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { draftWithClaude } from "../_shared/claude.ts";

Deno.serve(async () => {
  const supabase = supabaseAdmin();

  const { data: expedition } = await supabase
    .from("expeditions")
    .select("*")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!expedition) return Response.json({ error: "No active expedition" }, { status: 404 });

  const [stationsRes, inventoryRes, shipmentsRes, incidentsRes, posRes] = await Promise.all([
    supabase.from("stations").select("id, name"),
    supabase.from("inventory").select("name, quantity, consumption_rate_per_day, reorder_threshold_days, stations(name)"),
    supabase.from("shipments").select("mode, status, route"),
    supabase.from("incidents").select("title, severity, status").eq("status", "open"),
    supabase.from("purchase_orders").select("status"),
  ]);

  const flaggedItems = (inventoryRes.data ?? []).filter((i) => {
    const days = i.consumption_rate_per_day > 0 ? i.quantity / i.consumption_rate_per_day : Infinity;
    return days <= i.reorder_threshold_days;
  });

  const poCounts = (posRes.data ?? []).reduce<Record<string, number>>((acc, po) => {
    acc[po.status] = (acc[po.status] ?? 0) + 1;
    return acc;
  }, {});

  const facts = {
    expedition: expedition.name,
    windowClose: expedition.window_close,
    stations: stationsRes.data?.length ?? 0,
    shipmentsInTransit: (shipmentsRes.data ?? []).filter((s) => s.status === "in-transit").length,
    shipmentsDelayed: (shipmentsRes.data ?? []).filter((s) => s.status === "delayed").length,
    inventoryFlags: flaggedItems.map((i) => `${i.name} (${(i.stations as { name: string } | null)?.name})`),
    openIncidents: (incidentsRes.data ?? []).map((i) => `${i.title} [${i.severity}]`),
    poStatusBreakdown: poCounts,
  };

  const fallbackReport = [
    `POLARIS Expedition Status Report — ${expedition.name}`,
    `Generated ${new Date().toDateString()}`,
    "",
    `Season window closes ${facts.windowClose}.`,
    `Stations active: ${facts.stations}. Shipments in transit: ${facts.shipmentsInTransit}, delayed: ${facts.shipmentsDelayed}.`,
    `Inventory items inside reorder threshold: ${facts.inventoryFlags.length}${facts.inventoryFlags.length ? " — " + facts.inventoryFlags.join(", ") : ""}.`,
    `Open safety incidents: ${facts.openIncidents.length}${facts.openIncidents.length ? " — " + facts.openIncidents.join(", ") : ""}.`,
    `Purchase order pipeline: ${Object.entries(facts.poStatusBreakdown)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ")}.`,
  ].join("\n");

  const draft = await draftWithClaude({
    system:
      "You are the Report Drafter agent inside POLARIS. Write a clean, government-appropriate status report (expedition status, cargo utilisation, safety summary) from the structured facts given, suitable for a MoES/leadership review. Plain text, section headers as short capitalized lines, no markdown syntax, 200-350 words.",
    prompt: `Facts: ${JSON.stringify(facts, null, 2)}`,
    fallback: fallbackReport,
    maxTokens: 700,
  });

  const { error: runErr } = await supabase.from("ai_agent_runs").insert({
    agent_type: "report_drafter",
    trigger: "weekly_cron",
    input_ref: { expedition_id: expedition.id },
    title: `Weekly Status Report — ${expedition.name}, ${new Date().toDateString()}`,
    detail: draft.text.split("\n").slice(0, 3).join(" ").slice(0, 280),
    output: { report: draft.text, facts },
    severity: facts.openIncidents.length > 0 || facts.inventoryFlags.length > 0 ? "watch" : "info",
    status: "pending_review",
  });
  if (runErr) return Response.json({ error: runErr.message }, { status: 500 });

  return Response.json({ ok: true, source: draft.source });
});
