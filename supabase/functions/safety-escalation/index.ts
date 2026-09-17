// Safety Escalation — cron-scanned (ideally also wired to a checkins
// insert webhook for instant SOS handling; cron alone still catches an
// SOS within one run). Two triggers in one function: an explicit SOS
// check-in, or a missed check-in past a threshold.
//
// The 12h missed-checkin threshold is a flat constant for now — a truly
// "hazard-aware" threshold (TRD wording) would shorten near a mapped
// hazard_zone or in whiteout conditions; that needs richer location
// tracking than checkins.location alone gives us today. Documented, not
// silently approximated.
import { supabaseAdmin } from "../_shared/supabase-admin.ts";
import { draftWithClaude } from "../_shared/claude.ts";
import { hoursSinceCheckin, isMissedCheckin, missedCheckinSeverity } from "./logic.ts";

const MISSED_CHECKIN_HOURS = 12;

Deno.serve(async () => {
  const supabase = supabaseAdmin();
  const results: Record<string, unknown>[] = [];

  // --- SOS check-ins: always immediate, always critical. ---
  const { data: sosCheckins } = await supabase
    .from("checkins")
    .select("*, personnel(id, role_title, station_id, stations(name), profiles:user_id(full_name))")
    .eq("is_sos", true)
    .order("checkin_at", { ascending: false });

  for (const checkin of sosCheckins ?? []) {
    const { data: existing } = await supabase
      .from("ai_agent_runs")
      .select("id")
      .eq("agent_type", "safety_escalation")
      .contains("input_ref", { checkin_id: checkin.id })
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const personnel = checkin.personnel as {
      id: string;
      role_title: string;
      station_id: string;
      stations?: { name: string };
      profiles?: { full_name: string };
    } | null;
    if (!personnel) continue;

    await raiseIncident(supabase, {
      stationId: personnel.station_id,
      title: `SOS — ${personnel.profiles?.full_name ?? "Personnel"}`,
      severity: "critical",
      detailFallback: `${personnel.profiles?.full_name ?? "A team member"} (${personnel.role_title}) triggered an SOS check-in at ${personnel.stations?.name ?? "station"}. Immediate response required per emergency SOP.`,
      claudePrompt: `Personnel: ${personnel.profiles?.full_name}, role ${personnel.role_title}, station ${personnel.stations?.name}. SOS triggered at ${checkin.checkin_at}. Notes: ${checkin.notes ?? "none"}.`,
      agentRunTrigger: "on_missed_checkin",
      inputRef: { checkin_id: checkin.id, personnel_id: personnel.id },
      titlePrefix: "SOS",
    });
    results.push({ type: "sos", personnel: personnel.profiles?.full_name });
  }

  // --- Missed check-ins past threshold. ---
  const { data: personnel } = await supabase
    .from("personnel")
    .select("id, role_title, station_id, stations(name), profiles:user_id(full_name)");

  for (const p of personnel ?? []) {
    const { data: lastCheckin } = await supabase
      .from("checkins")
      .select("checkin_at")
      .eq("personnel_id", p.id)
      .order("checkin_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const hoursSince = hoursSinceCheckin(lastCheckin?.checkin_at ?? null, new Date());
    if (!isMissedCheckin(hoursSince, MISSED_CHECKIN_HOURS)) continue;

    const { data: existing } = await supabase
      .from("ai_agent_runs")
      .select("id")
      .eq("agent_type", "safety_escalation")
      .eq("status", "pending_review")
      .contains("input_ref", { personnel_id: p.id, type: "missed_checkin" })
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    const station = p.stations as { name: string } | null;
    const profile = p.profiles as { full_name: string } | null;

    await raiseIncident(supabase, {
      stationId: p.station_id,
      title: `Missed check-in — ${profile?.full_name ?? "Personnel"}`,
      severity: missedCheckinSeverity(hoursSince),
      detailFallback: `${profile?.full_name ?? "A team member"} (${p.role_title}) has not checked in for ${Math.round(hoursSince)} hours — past the ${MISSED_CHECKIN_HOURS}h threshold. Suggested next step: attempt radio contact, then dispatch a buddy check per the field-movement SOP.`,
      claudePrompt: `Personnel: ${profile?.full_name}, role ${p.role_title}, station ${station?.name}. Hours since last check-in: ${Math.round(hoursSince)}. Threshold: ${MISSED_CHECKIN_HOURS}h.`,
      agentRunTrigger: "on_missed_checkin",
      inputRef: { personnel_id: p.id, type: "missed_checkin" },
      titlePrefix: "Missed check-in",
    });
    results.push({ type: "missed_checkin", personnel: profile?.full_name, hoursSince: Math.round(hoursSince) });
  }

  return Response.json({ processed: results.length, results });
});

async function raiseIncident(
  supabase: ReturnType<typeof supabaseAdmin>,
  opts: {
    stationId: string;
    title: string;
    severity: "critical" | "high";
    detailFallback: string;
    claudePrompt: string;
    agentRunTrigger: string;
    inputRef: Record<string, unknown>;
    titlePrefix: string;
  }
) {
  const { data: reporter } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["admin", "ops"])
    .limit(1)
    .maybeSingle();

  const { data: incident, error: incErr } = await supabase
    .from("incidents")
    .insert({
      station_id: opts.stationId,
      type: "safety",
      severity: opts.severity,
      status: "open",
      title: opts.title,
      timeline: [{ at: new Date().toISOString(), note: "Auto-raised by Safety Escalation agent" }],
      reported_by: reporter?.id,
    })
    .select("id")
    .single();
  if (incErr || !incident) {
    console.error("Failed to raise incident:", incErr);
    return;
  }

  const draft = await draftWithClaude({
    system:
      "You are the Safety Escalation agent inside POLARIS, a polar expedition safety system. Write one short, direct paragraph (2-3 sentences) stating the situation and the immediate next step per standard SOP. No markdown, no dramatization — this is operational, not narrative.",
    prompt: opts.claudePrompt,
    fallback: opts.detailFallback,
    maxTokens: 200,
  });

  const { data: agentRun } = await supabase
    .from("ai_agent_runs")
    .insert({
      agent_type: "safety_escalation",
      trigger: opts.agentRunTrigger,
      input_ref: { ...opts.inputRef, incident_id: incident.id },
      title: `${opts.titlePrefix} — incident raised`,
      detail: draft.text,
      output: { incident_id: incident.id },
      severity: "critical",
      status: "pending_review",
    })
    .select("id")
    .single();

  if (agentRun) {
    await supabase.from("incidents").update({ raised_by_agent_run_id: agentRun.id }).eq("id", incident.id);
  }
}
