// Thin wrapper over the Claude Messages API (plain fetch — no SDK needed
// in Deno). Every agent's *detection* logic (what's low on stock, what PO
// is late, who missed a check-in) runs with or without this working; only
// the natural-language drafting depends on it. If ANTHROPIC_API_KEY isn't
// set, or the call fails for any reason, callers get `fallback` back
// instead — the pipeline still writes a row to ai_agent_runs so the demo
// stays fully functional. Swap point for a real key: set
// ANTHROPIC_API_KEY as a secret (`supabase secrets set`); nothing else
// changes.

import { extractClaudeText, type ClaudeDraftResult } from "./claude-logic.ts";

const MODEL = "claude-sonnet-5";

export type { ClaudeDraftResult };

export async function draftWithClaude(params: {
  system: string;
  prompt: string;
  fallback: string;
  maxTokens?: number;
}): Promise<ClaudeDraftResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return { text: params.fallback, source: "fallback" };
  }

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
        max_tokens: params.maxTokens ?? 512,
        system: params.system,
        messages: [{ role: "user", content: params.prompt }],
      }),
    });

    if (!res.ok) {
      console.error(`Claude API error ${res.status}: ${await res.text()}`);
      return { text: params.fallback, source: "fallback" };
    }

    const data = await res.json();
    return extractClaudeText(data, params.fallback);
  } catch (err) {
    console.error("Claude API call threw:", err);
    return { text: params.fallback, source: "fallback" };
  }
}
