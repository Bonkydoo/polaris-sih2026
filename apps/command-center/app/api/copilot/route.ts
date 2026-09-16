import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-5";

// The Command Copilot's retrieval today is direct context injection —
// recent agent runs, open incidents, the latest drafted report — rather
// than pgvector similarity search. That's a deliberate call, not a
// shortcut: report_embeddings exists and is indexed (see
// supabase/migrations/20260916150008_ai_tables.sql) for when there's
// enough historical report/SOP volume that "just pass everything recent"
// stops being sufficient context. At today's data volume, the fully
// wired vector search wouldn't retrieve anything a direct query doesn't
// already give more cheaply. Swap point: replace gatherContext() with an
// embed-the-question + match report_embeddings query once that's true.
async function gatherContext(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const [expeditionRes, agentRunsRes, incidentsRes, reportRes] = await Promise.all([
    supabase.from("expeditions").select("*").eq("status", "active").limit(1).maybeSingle(),
    supabase.from("ai_agent_runs").select("agent_type, title, detail, severity, status, created_at").order("created_at", { ascending: false }).limit(15),
    supabase.from("incidents").select("title, severity, status, station_id, stations(name)").eq("status", "open"),
    supabase.from("ai_agent_runs").select("title, output, created_at").eq("agent_type", "report_drafter").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  return {
    expedition: expeditionRes.data,
    recentAgentRuns: agentRunsRes.data ?? [],
    openIncidents: incidentsRes.data ?? [],
    latestReport: (reportRes.data?.output as { report?: string } | null)?.report ?? null,
  };
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["admin", "ops", "leadership"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ configured: false });
  }

  const { question, history } = (await request.json()) as {
    question: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const context = await gatherContext(supabase);

  const systemPrompt = `You are the Command Copilot inside POLARIS, NCPOR's polar expedition logistics platform. Command staff ask you natural-language planning questions ("what happens to the fuel budget if Maitri's departure moves up a week?"). Answer using ONLY the context provided below — if something isn't in the context, say so rather than guessing. Be concise and operational, not conversational filler. No markdown headers.

CONTEXT
Active expedition: ${context.expedition ? `${context.expedition.name} (${context.expedition.code}), window closes ${context.expedition.window_close}` : "none"}

Recent AI agent activity:
${context.recentAgentRuns.map((r) => `- [${r.agent_type}, ${r.severity}, ${r.status}] ${r.title}: ${r.detail}`).join("\n") || "none"}

Open safety incidents:
${context.openIncidents.map((i) => `- [${i.severity}] ${i.title} at ${(i.stations as { name?: string } | null)?.name ?? "unknown station"}`).join("\n") || "none"}

Latest status report:
${context.latestReport ?? "none drafted yet"}`;

  const messages = [...(history ?? []), { role: "user" as const, content: question }];

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Claude API error ${res.status}: ${errText}`);
      return NextResponse.json({ error: "The Copilot's model call failed. Try again shortly." }, { status: 502 });
    }

    const data = await res.json();
    const text = data.content
      ?.filter((block: { type: string }) => block.type === "text")
      .map((block: { text: string }) => block.text)
      .join("\n")
      .trim();

    return NextResponse.json({ configured: true, answer: text ?? "No response generated." });
  } catch (err) {
    console.error("Copilot call threw:", err);
    return NextResponse.json({ error: "The Copilot's model call failed. Try again shortly." }, { status: 502 });
  }
}
