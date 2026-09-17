import { describe, expect, it } from "vitest";
import { extractClaudeText } from "./claude-logic.ts";

describe("extractClaudeText", () => {
  it("joins and trims text blocks from a real Claude response", () => {
    const result = extractClaudeText({ content: [{ type: "text", text: "  Hello there.  " }] }, "fallback text");
    expect(result).toEqual({ text: "Hello there.", source: "claude" });
  });

  it("joins multiple text blocks with newlines", () => {
    const result = extractClaudeText(
      { content: [{ type: "text", text: "First." }, { type: "text", text: "Second." }] },
      "fallback text"
    );
    expect(result).toEqual({ text: "First.\nSecond.", source: "claude" });
  });

  it("ignores non-text content blocks", () => {
    const result = extractClaudeText(
      { content: [{ type: "tool_use" }, { type: "text", text: "Only this." }] },
      "fallback text"
    );
    expect(result).toEqual({ text: "Only this.", source: "claude" });
  });

  it("falls back when content is empty", () => {
    const result = extractClaudeText({ content: [] }, "fallback text");
    expect(result).toEqual({ text: "fallback text", source: "fallback" });
  });

  it("falls back when content is missing entirely", () => {
    const result = extractClaudeText({}, "fallback text");
    expect(result).toEqual({ text: "fallback text", source: "fallback" });
  });

  it("falls back when the only text block is blank/whitespace", () => {
    const result = extractClaudeText({ content: [{ type: "text", text: "   " }] }, "fallback text");
    expect(result).toEqual({ text: "fallback text", source: "fallback" });
  });
});
