// Pure part of the Claude response handling, split out of claude.ts so it's
// testable under Node/vitest without Deno.env or a real fetch call. This is
// the exact logic that decides whether a real Claude response is usable or
// whether every agent falls back to its deterministic template text.

export type ClaudeDraftResult = { text: string; source: "claude" | "fallback" };

export function extractClaudeText(
  data: { content?: { type: string; text?: string }[] },
  fallback: string
): ClaudeDraftResult {
  const text = data.content
    ?.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n")
    .trim();

  return text ? { text, source: "claude" } : { text: fallback, source: "fallback" };
}
