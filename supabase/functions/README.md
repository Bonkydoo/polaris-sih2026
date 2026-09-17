# POLARIS AI Command Layer — Edge Functions

Seven agents from the TRD (§5), six as scheduled Edge Functions and one
(Command Copilot) as a Next.js API route instead — see the note at the
bottom for why.

| Function | Trigger | What it does |
|---|---|---|
| `reorder-forecaster` | Nightly cron | Drafts a `purchase_requisitions` row when an inventory item's days-remaining crosses 75% of its reorder threshold |
| `vendor-deadline-watcher` | Nightly cron | Flags POs trending past the *packing* deadline (not shipping date), drafts an escalation, updates PO status |
| `weather-feed-simulator` | Every 6h cron | Mocked weather provider — writes `weather_snapshots`. **Swap point** for a real feed: see the comment at the top of `weather-feed-simulator/index.ts` |
| `weather-contingency-planner` | Every 6h cron (after the simulator) | Reads high-risk snapshots, cross-references shipments/POs at that station, drafts a contingency brief |
| `safety-escalation` | Hourly cron | Raises an incident for any SOS check-in (immediate) or a check-in missed past 12h |
| `cargo-reconciliation` | Hourly cron | Diffs `cargo_items.quantity` (manifest) against `received_quantity` (scanned in) for arrived shipments |
| `report-drafter` | Weekly cron | Assembles expedition/cargo/safety status into a full report, stored in `ai_agent_runs.output.report` |

Every function writes rows with `status: 'pending_review'` — nothing here
ever executes a real-world action on its own; a human approves or
dismisses from the AI Activity page. See `_shared/claude.ts` for the
no-API-key fallback: every agent's detection logic (what's low on stock,
what's late, who missed a check-in) always runs; only the natural-language
drafting depends on `ANTHROPIC_API_KEY` being set, and falls back to a
clear template when it isn't.

## Local testing

Each function's decision logic (thresholds, severity, date math — the
part that's actually worth regression-testing) lives in a sibling
`logic.ts`, deliberately written with zero Deno APIs so it runs under
plain Node/vitest without a Deno install or a live Supabase connection.
`index.ts` imports from it rather than duplicating it inline:

```bash
npm test               # from the repo root — runs every logic.test.ts
```

For the full request/response path against a real local Supabase (what
the pure unit tests can't cover — the actual DB round-trip, RLS, and the
no-API-key fallback wired end to end):

```bash
supabase functions serve --env-file .env.local --no-verify-jwt
# in another terminal:
curl -X POST http://127.0.0.1:54321/functions/v1/reorder-forecaster
```

## Deploying + scheduling

```bash
supabase functions deploy reorder-forecaster vendor-deadline-watcher \
  weather-feed-simulator weather-contingency-planner safety-escalation \
  cargo-reconciliation report-drafter
supabase secrets set ANTHROPIC_API_KEY=sk-...   # optional — see above
```

Schedule with `pg_cron` + `pg_net` (both available on Supabase's managed
Postgres). Store the service-role key in Vault rather than inlining it —
inlining it puts it in plaintext in `cron.job` and everyone's query logs:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<service-role-key>', 'service_role_key');

select cron.schedule('reorder-forecaster-nightly', '0 2 * * *', $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/reorder-forecaster',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    )
  );
$$);
-- repeat for each function with its own schedule from the table above.
```

For a quick hackathon demo where Vault setup is overkill, the pragmatic
alternative is deploying the relevant functions with
`supabase functions deploy <name> --no-verify-jwt` and keeping their URLs
unpublished — acceptable for a demo, not for production (the real
security boundary, RLS, is intact either way; this only affects who can
*trigger* an agent run, not what data it can touch).

## Why Command Copilot isn't an Edge Function

The other six run headless, on a schedule, with no human in the loop
until review time — exactly what Edge Functions are for. Command Copilot
is the opposite: synchronous, user-initiated, needs the caller's session
to check their role, and its answer needs to render in the Command Center
UI immediately. `apps/command-center/app/api/copilot/route.ts` does that
more directly than round-tripping through a separate Edge Function would.
