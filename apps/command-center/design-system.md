# POLARIS Design System

Formalized from the **Arctic Command** prototype direction (see `app/proto/*`
for the other 3 directions, kept as visual references). This is the system
the Command Center, Field App and Vendor Portal all build on — the tokens
and components below live in `app/globals.css` and `components/ui/*` today;
they graduate mechanically into `packages/ui` when Prompt 3 stands up the
Turborepo monorepo (a file move, not a rewrite).

## Design principles

- **Serious, high-trust, government-tech.** Deep navy + ice-blue, crisp
  bordered panels, restrained motion. Not a startup dashboard template.
- **Every screen answers "what happens if the window closes on us."**
  Status is never decorative — the semantic color system exists because
  real safety/logistics alerts run through it.
- **Human-in-the-loop is visible, not hidden.** `AlertCard` always shows
  Approve / Edit / Dismiss until a human acts — see AI Automation
  Architecture, TRD §5.

## Typography

Three typefaces, one job each:

| Token (Tailwind utility) | Typeface | Use for |
|---|---|---|
| `font-heading` / `font-display` | Source Serif 4 | Section titles, page headings — the "ministry," not "SaaS" signal |
| `font-sans` (default) | IBM Plex Sans | Body copy, labels, UI chrome |
| `font-mono` | IBM Plex Mono | Numbers, quantities, dates, IDs (POs, shipment IDs) — anything the eye needs to scan and compare |

Loaded globally in `app/layout.tsx`. Type scale is Tailwind's default scale;
we don't override it — headings use `text-xl`/`text-2xl` + `font-heading`,
body is `text-sm`, captions/eyebrows are `text-[11px] uppercase tracking-wide`.

## Color tokens

Every pair below was checked with a WCAG 2.1 relative-luminance contrast
calculator. As of the Prompt 3 quality pass this is no longer a one-off,
throwaway check — `packages/ui/src/contrast.test.ts` parses the real
tokens out of `globals.css` and re-verifies every pair below (light, dark
and `.hc`) on every `npm test` run, so a future token edit that breaks AA
fails CI instead of shipping silently. Where the obvious choice failed,
the token was changed; the table documents what and why, not just the
final answer.

### Base (light mode, default)

| Token | Value | Use |
|---|---|---|
| `--background` | `#F3F5F7` | App background |
| `--card` | `#FFFFFF` | Panel/card surface |
| `--foreground` | `#0B1E33` | Primary text (16.83:1 on white) |
| `--foreground-muted` | `#2B3E4E` | Secondary body text (11.04:1) |
| `--foreground-subtle` | `#5E7284` | Captions, eyebrows (4.98:1 on white, 4.56:1 on app bg — both pass AA) |
| `--muted-foreground` | `#586B7D` | Text on `--muted` panels (4.63:1). **Known failure caught and fixed:** originally shared `--foreground-subtle`'s `#5E7284` — that only reaches 4.19:1 against `--muted` specifically (it was never checked against that pairing, only against `background`/white), so the contrast test added in the Prompt 3 quality pass caught it and it was darkened slightly. |
| `--border` | `#D8E0E6` | **Decorative divider only.** 1.34:1 — do not rely on this alone to convey an interactive boundary (WCAG 1.4.11) |
| `--border-strong` / `--input` | `#6B7E8C` | Input/button/focusable-element outlines — 4.21:1, clears the 3:1 non-text threshold |
| `--primary` | `#0B1E33` | Buttons, active nav, sidebar |
| `--accent` | `#4FA8D8` | **Decorative only** — large chips, icons on dark surfaces. Fails as small text on white (2.65:1) |
| `--accent-ink` | `#1D6FA0` | The accent color safe to use as **text, icon or focus ring on a light surface** (5.48:1) |
| `--ring` | `var(--accent-ink)` | Focus ring (light mode) |

### Semantic status (success / warning / critical / info)

Each has a `-subtle` tinted-badge pair and a bare solid-fill pair:

| Tone | Solid fg/bg | Subtle bg / subtle fg |
|---|---|---|
| Success | white on `#0B6B3A` (6.61:1) | `#E8F5EC` / `#0B6B3A` (5.88:1) |
| Warning | white on `#8A5300` (6.33:1) | `#FDF3DE` / `#8A5300` (5.74:1) |
| Critical | white on `#B3261E` (6.54:1) | `#FBEAE9` / `#B3261E` (5.62:1) |
| Info | white on `#1D6FA0` (5.48:1) | `#E9F2F8` / `#1D6FA0` (~5:1) |

**Known failure caught and fixed:** the original warning tint
(`#9A6A00` text on `#FDF3DE`) measured 4.30:1 — just under AA. Darkened to
`#8A5300` (5.74:1) before it shipped anywhere.

### Dark mode (`.dark`)

Full parallel token set, not just an inverted filter — background `#0B1520`,
foreground `#E7EEF3` (15.69:1), semantic colors brightened for a dark
ground (e.g. success `#3DDC97`, 10.40:1) and `--border-strong` moved to
`#7E93A1` (5.76:1; the naive inverted guess, `#4A6273`, only hit 2.88:1
and was rejected).

### High-contrast mode (`.hc`) — Field App

Not "dark mode with different names." Pure black/white plus **one** safety
accent, for outdoor glare and gloved use:

- `--background: #FFFFFF`, `--foreground: #0A0A0A` (19.80:1)
- `--accent: #FF6A00` with **black** foreground (`#0A0A0A`, 6.90:1) — white
  text on this orange fails AA (2.87:1), so warning is the one status color
  whose foreground flips relative to every other tone
- `--accent-ink: #B84D00` (5.12:1 on white) — **known failure caught and
  fixed:** this token originally reused the bright `--accent` value
  directly, which is exactly the same 2.87:1 failure as above but this
  time as *text*, not a fill — components like `timeline-step` and
  `map-panel` render `text-accent-ink` for links/current-state labels, and
  in every other mode `--accent-ink` is specifically the "safe as text"
  variant (see the base table above). A deeper safety-orange keeps the
  same hue while actually passing AA — worth catching precisely because
  `.hc` is the Field App's own accessibility mode.
- `--border` / `--border-strong`: `#0A0A0A` at 3–4px — never rely on a
  hairline in this mode
- `--radius: 1rem` — bigger corner radius reads as "big friendly touch
  target" at a glance, matching the touch-target rule below

Apply with `className="hc"` on a container (see
`components/proto/field-first` for the reference implementation, which
predates this token and will migrate onto it in Prompt 3).

## Spacing & radius

Spacing: Tailwind's default 4px-based scale, unmodified — no need to
reinvent it. Radius: crisp and restrained, not "pill everything":

| Token | Value | Use |
|---|---|---|
| `--radius` (base) | `0.375rem` | Cards, panels, table containers |
| `--radius-sm` / `-md` / `-lg` / `-xl` | derived from base | Buttons, badges, dialogs — see `@theme inline` in `globals.css` |

## Accessibility

- **Focus states:** global `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }` in `globals.css` — every interactive element gets a visible ring, not just form inputs.
- **Touch targets:** Command Center is desktop/mouse-first and isn't held
  to a touch-target minimum. **Anything the Field App reuses must be
  ≥44px tall.** `components/proto/field-first` already builds its own
  buttons at this size (`py-3.5`–`py-5`, comfortably over 44px) rather than
  the shared `Button`/`AlertCard` action row (`size="sm"`, 28px) — when
  Prompt 3 wires the real Field PWA onto these shared components, override
  their size explicitly (e.g. `className="min-h-11 px-4"`) rather than
  using the desktop default.
- **Non-text contrast:** decorative borders (`--border`) are intentionally
  low-contrast; anything conveying an interactive boundary uses
  `--border-strong` instead (≥3:1 in every mode — see tables above).

## Components (`components/ui/*`)

| Component | Purpose |
|---|---|
| `StatusBadge` | Canonical status pill. Exports `resolveStatus(raw)`, the single mapping from ~15 raw data-model strings (`"watch"`, `"at-risk"`, `"overdue"`...) to one of 4 semantic tones — every screen used to reimplement this; now there's one source of truth. `variant="subtle"` (tinted, default) or `"solid"`. |
| `AlertCard` | The one component every AI-agent-drafted action renders through. Always shows Approve / Edit draft / Dismiss for `status="pending_review"`; collapses to a single confirmation line once acted on. `onApprove`/`onEdit`/`onDismiss` are caller-supplied — the card has no opinion on what "approve" does, only that the human-in-the-loop UI is consistent everywhere. |
| `MetricCard` | KPI tile — label, value (mono), optional tone + icon + hint. |
| `TimelineStep` | One step of a vertical stepper (`status: "complete" \| "current" \| "upcoming"`), for expedition-lifecycle-shaped UI. Caller maps a list and sets `isLast` on the final one. |
| `DataTable<T>` | Typed table wrapper over shadcn's `Table` primitives. `columns: {header, accessor, numeric?}[]` — `numeric` renders that column in the mono data typeface. Replaces the raw `<table>` markup every screen used to hand-roll. |
| `MapPanel` | Wrapper for the future MapLibre GL / Mapbox GL integration (TRD §2: voyage route, station digital twin, hazard zones). Ships now with a placeholder grid + simple marker projection (`{id, label, x, y, tone}`, 0–100 panel-relative) so the panel chrome and marker-list API are stable — swapping the placeholder for a real map later only touches this one file. |

All of the above are consumed by `components/proto/arctic-command/dashboard.tsx`
— that file is the reference implementation for how a real screen should be
built on this system (tokens + shared components, no hardcoded hex, no
reimplemented status-pill logic).

## What's intentionally deferred to Prompt 3

- Physical extraction into `packages/ui` (needs a second consumer app to be
  worth the workspace-tooling overhead).
- Migrating Glacier Minimal / Polar Ops Dark / Field-First prototypes onto
  these tokens — they stay as their own self-contained visual references.
- Wiring `MapPanel` to a real MapLibre instance.
