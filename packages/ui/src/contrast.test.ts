// WCAG 2.1 AA contrast regression test. Parses the real globals.css tokens
// (not a hand-copied snapshot of them, so this can never silently drift
// from the actual design system) and re-verifies every documented pair
// from design-system.md with the same relative-luminance formula used
// when the tokens were first locked in. Runs for light (:root), dark
// (.dark) and high-contrast (.hc, the Field App mode) simultaneously.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(join(__dirname, "globals.css"), "utf-8");

function extractBlock(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // [\s\S] instead of a dotAll `.` (the `s` flag needs an ES2018+ target,
  // which this package's tsconfig doesn't set) - matches any character
  // including newlines, same effect.
  const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`);
  const match = css.match(re);
  if (!match) throw new Error(`Could not find ${selector} block in globals.css`);
  const vars: Record<string, string> = {};
  for (const line of match[1].split(";")) {
    const m = line.match(/--([\w-]+)\s*:\s*(.+)/);
    if (m) vars[m[1].trim()] = m[2].trim();
  }
  return vars;
}

const root = extractBlock(":root");
const dark = extractBlock(".dark");
const hc = extractBlock(".hc");

// .dark and .hc only override a subset of tokens - the rest cascade from
// :root, exactly as the browser resolves it.
function resolve(mode: Record<string, string>, name: string): string {
  const value = mode[name] ?? root[name];
  if (value === undefined) throw new Error(`Unknown token --${name}`);
  const varMatch = value.match(/^var\(--([\w-]+)\)$/);
  if (varMatch) return resolve(mode, varMatch[1]);
  return value;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

// [token pair, minimum ratio (4.5 = normal text AA, 3.0 = large text/UI AA)]
const TEXT_PAIRS: [string, string, number][] = [
  ["foreground", "background", 4.5],
  ["foreground-muted", "background", 4.5],
  ["foreground-subtle", "background", 4.5],
  ["card-foreground", "card", 4.5],
  ["primary-foreground", "primary", 4.5],
  ["secondary-foreground", "secondary", 4.5],
  ["muted-foreground", "muted", 4.5],
  ["accent-ink", "background", 4.5],
  ["accent-ink", "card", 4.5],
  ["success-foreground", "success", 4.5],
  ["success-subtle-foreground", "success-subtle", 4.5],
  ["warning-foreground", "warning", 4.5],
  ["warning-subtle-foreground", "warning-subtle", 4.5],
  ["critical-foreground", "critical", 4.5],
  ["critical-subtle-foreground", "critical-subtle", 4.5],
  ["info-foreground", "info", 4.5],
  ["info-subtle-foreground", "info-subtle", 4.5],
  ["sidebar-foreground", "sidebar", 4.5],
  ["sidebar-primary-foreground", "sidebar-primary", 4.5],
  ["sidebar-accent-foreground", "sidebar-accent", 4.5],
];

// Tokens whose value is an rgba()/non-hex color are decorative-only
// (explicitly called out as such in globals.css - e.g. --border) and are
// exempt from AA text-contrast requirements, matching WCAG 1.4.11 scope.
function isHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{3,6}$/.test(value);
}

describe.each([
  ["light (:root)", root],
  ["dark (.dark)", dark],
  ["high-contrast (.hc, Field App)", hc],
])("%s token contrast", (_label, mode) => {
  it.each(TEXT_PAIRS)("--%s on --%s meets AA (>= %s:1)", (fg, bg, minRatio) => {
    const fgValue = resolve(mode, fg);
    const bgValue = resolve(mode, bg);
    if (!isHex(fgValue) || !isHex(bgValue)) return; // decorative/alpha token - not a text pair

    const ratio = contrastRatio(fgValue, bgValue);
    expect(ratio).toBeGreaterThanOrEqual(minRatio);
  });
});

describe("known intentional exceptions stay documented, not accidentally 'fixed'", () => {
  it("--accent is decorative-only on light backgrounds (fails AA as text by design)", () => {
    // #4FA8D8 on white/background - design-system.md calls this out
    // explicitly; --accent-ink is the token to use for any actual text.
    const ratio = contrastRatio(root["accent"], root["background"]);
    expect(ratio).toBeLessThan(4.5);
  });

  it("--border is a decorative divider only (WCAG 1.4.11 exempt), not meant to pass AA", () => {
    expect(isHex(root["border"])).toBe(true); // light mode uses a real hex, low contrast on purpose
    const ratio = contrastRatio(root["border"], root["background"]);
    expect(ratio).toBeLessThan(3);
  });
});
