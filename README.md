# POLARIS

NCPOR Integrated Polar Expedition Logistics and Asset Management System —
built for SIH 2026, Problem Statement 26062.

A Supabase-backed Turborepo monorepo: three apps with deliberately
different architectures, a 7-agent AI Command Layer that degrades
gracefully with no API key, and Row Level Security as the single real
access boundary everywhere (never a client-side check).

## Apps

| App | Port | Architecture | Who uses it |
|---|---|---|---|
| `apps/command-center` | 3000 | Next.js SSR, cookie-based auth (`@supabase/ssr`) | NCPOR admin/ops/leadership — expedition overview, cargo, inventory, personnel, AI activity review, Command Copilot |
| `apps/field-pwa` | 3002 | Next.js static export, zero server, offline-first PWA | Field personnel at a station — stock, team check-ins, SOS, works with no connectivity |
| `apps/vendor-portal` | 3003 | Next.js SSR, same auth pattern as command-center | External vendors — acknowledge POs, update delivery status, upload compliance documents |

Each app's own README/AGENTS.md has the architecture-specific detail
(field-pwa's offline story in particular is worth reading before touching
it). `apps/command-center/design-system.md` is the design token
reference all three apps share via `packages/ui`.

## AI Command Layer

Seven agents (`supabase/functions/README.md`) — reorder forecasting,
vendor deadline watching, weather contingency planning, safety escalation
(SOS + missed check-ins), cargo reconciliation, weekly report drafting,
and a Command Copilot chat. Every agent writes `pending_review` rows;
nothing executes autonomously.

**No Anthropic API key is required to run or demo this system.** Every
agent's detection logic (what's low on stock, what's late, who missed a
check-in) is deterministic and always runs. Only the natural-language
write-up depends on `ANTHROPIC_API_KEY`; without it, every agent falls
back to a clear template sentence instead (`supabase/functions/_shared/claude.ts`).

## Live deployment

| App | URL |
|---|---|
| Command Center | https://command-center-gray-nine.vercel.app |
| Field PWA | https://field-pwa-six.vercel.app |
| Vendor Portal | https://vendor-portal-smoky-omega.vercel.app |

Backed by a production Supabase project (`polaris-production`, Mumbai
`ap-south-1`) with all migrations applied, the 7 Edge Functions deployed,
and `pg_cron` schedules live (reorder/vendor-deadline nightly, weather
every 6h, safety + cargo hourly, report weekly). Demo accounts below work
on all three. No Anthropic API key is set in production — agents use their
template fallback text, exactly as documented above.

Each app is its own Vercel project with Root Directory `apps/<name>`;
deploy from the repo root (`.vercelignore` keeps `node_modules`/`.next`
out of the upload):

```bash
VERCEL_ORG_ID=<team> VERCEL_PROJECT_ID=<project> vercel --prod --yes
```

### Demo walkthrough (about 5 minutes)

1. **Vendor Portal** — sign in as the vendor. The aviation-fuel PO shows
   *At Risk* against its packing deadline; set a committed delivery date
   and status. Upload a compliance document under Documents.
2. **Command Center** (ops) — Expedition Overview shows the season
   countdown, station status and in-transit shipments. Inventory flags
   the low-diesel item at Bharati; Cargo & Freight shows the PO pipeline.
3. **AI Activity** — agent-drafted actions (reorder requisition, vendor
   escalation, contingency briefs) wait for human review. Approve or
   dismiss one; nothing executes on its own.
4. **Field PWA** (field user, on a phone or narrow window) — Stock, Team,
   and the SOS button. Turn the network off (DevTools, Offline), log a
   consumption entry, and watch the pending badge count up; go back online
   and it drains.
5. **Back in the Command Center** — press SOS in the Field PWA, then the
   Safety Escalation agent raises an incident on its next run (hourly; to
   show it immediately, POST to the `safety-escalation` function directly
   — see `supabase/functions/README.md`).

## Setup

```bash
nvm use            # Node 24, see .nvmrc
npm install
npx supabase start # local Postgres + Auth + Storage + Studio, via Docker
npm run db:seed    # demo org, stations, vendors, 5 demo users, sample data
```

`.env.local` (repo root) and each app's own `.env.local` need
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — `npx
supabase start` prints these; the root also needs
`SUPABASE_SERVICE_ROLE_KEY` for the seed script and the RLS integration
tests.

### Demo accounts

Password for all: `polaris-demo-2026`

| Email | Role | App |
|---|---|---|
| `admin@polaris-demo.ncpor.gov.in` | admin | Command Center |
| `ops@polaris-demo.ncpor.gov.in` | ops | Command Center |
| `leadership@polaris-demo.ncpor.gov.in` | leadership | Command Center |
| `field@polaris-demo.ncpor.gov.in` | field (Bharati station) | Field PWA |
| `vendor@polaris-demo.ncpor.gov.in` | vendor (Antarctic Fuel Logistics) | Vendor Portal |

## Running

```bash
npm run dev --workspace command-center   # or field-pwa / vendor-portal
```

Or use `.claude/launch.json` with the Claude Code browser preview, which
already has all three wired up.

## Testing

```bash
npm test                # fast unit tests - agent decision logic, the
                         # Field PWA offline-sync engine, WCAG AA token
                         # contrast. No external dependency, safe to run
                         # anywhere.
npm run test:integration # RLS policy tests - requires `supabase start`
                         # running locally. Signs in as each demo role and
                         # asserts what it can and can't read/write
                         # against the real Postgres RLS engine.
npx turbo run typecheck lint build  # every workspace
```

`npm test` currently covers:

- **Agent logic** (`supabase/functions/*/logic.test.ts`) — the pure
  decision functions each Edge Function is built on (reorder thresholds,
  missed-checkin severity, cargo mismatch classification, PO escalation
  status, weather risk scoring), plus the Claude-response/fallback
  extraction logic that backs the no-API-key guarantee above.
- **Field PWA offline sync** (`apps/field-pwa/lib/sync.test.ts`) — the
  outbox queue and reconnect-drain algorithm against a real Dexie
  instance (via `fake-indexeddb`), covering retry counting and the
  5-attempt failure ceiling. This is the automated complement to manually
  verified airplane-mode testing in a real browser; see
  `apps/field-pwa/README.md`.
- **WCAG 2.1 AA token contrast** (`packages/ui/src/contrast.test.ts`) —
  parses the live `globals.css` tokens (light, dark, and `.hc` high-contrast
  Field App mode) and re-checks every documented pair from
  `design-system.md` on every run, so a future token edit that breaks AA
  fails here instead of shipping silently.

`npm run test:integration` (`supabase/tests/rls.integration.test.ts`)
signs in as the field, vendor, ops, and leadership demo users against a
real local Supabase and asserts cross-tenant/cross-role isolation: a
field user can't see another station's inventory/personnel/incidents or
write an incident for a station they don't belong to; a vendor can't see
another vendor's row, POs, or update another vendor's PO; `audit_log` and
`ai_agent_runs` reject both field and vendor entirely; `profiles` is
scoped to self unless you're command staff/leadership in the same org.

## Repo layout

```
apps/
  command-center/   NCPOR command staff + leadership
  field-pwa/         Field personnel, offline-first
  vendor-portal/     External vendors
packages/
  ui/                Shared shadcn/Base UI components + design tokens
  supabase-client/   Typed Supabase client factories + generated DB types
supabase/
  migrations/        Schema + RLS, applied in order
  functions/         The 7-agent AI Command Layer (Deno Edge Functions)
  tests/             RLS integration tests
  seed.ts            Demo org/stations/vendors/users/data
```
