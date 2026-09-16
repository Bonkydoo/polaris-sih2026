# POLARIS Supabase project

## Local development

```bash
# from the repo root
supabase start          # boots Postgres/Auth/Storage/Studio in Docker
cp .env.example apps/command-center/.env.local
# fill in NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY /
# SUPABASE_SERVICE_ROLE_KEY from the `supabase start` output (also visible
# any time via `supabase status`)
npm run db:seed         # creates orgs, demo users, stations, expedition,
                         # inventory, POs, shipments, sample AI agent runs
```

`supabase start` requires Docker Desktop running. `supabase stop` shuts the
local stack down; `supabase db reset` drops and re-applies every migration
in `migrations/` from scratch (does **not** re-run `seed.ts` — run
`npm run db:seed` again after a reset).

## Demo logins

Seeded by `seed.ts`, all sharing one password (`polaris-demo-2026`):

| Role | Email |
|---|---|
| admin | admin@polaris-demo.ncpor.gov.in |
| ops | ops@polaris-demo.ncpor.gov.in |
| field | field@polaris-demo.ncpor.gov.in |
| vendor | vendor@polaris-demo.ncpor.gov.in |
| leadership | leadership@polaris-demo.ncpor.gov.in |

## Data model & RLS

Every table's access rules are defined in its own migration file, next to
the `create table` statement — read `migrations/*.sql` top to bottom for
the actual source of truth. The short version:

- **`profiles.role` + `organization_id` + `station_id` + `vendor_id`** is
  the entire scoping surface. Every RLS policy checks one or more of
  these via the `SECURITY DEFINER` helper functions in
  `20260916150003_helper_functions.sql` (`current_role()`,
  `current_org_id()`, `current_station_id()`, `current_vendor_id()`,
  `is_command_staff()`, `is_leadership_or_command_staff()`).
- **admin/ops** ("command staff") can read and write almost everything.
- **leadership** reads everything command staff reads, writes nothing.
- **field** is scoped to their own `station_id` — inventory, personnel,
  incidents, check-ins, purchase requisitions for their station only.
- **vendor** is scoped to their own `vendor_id` — only their own vendor
  record and the POs/cargo/shipments tied to it. Never sees stations'
  internal data, other vendors, or the AI Command Layer.
- **`audit_log`** has no insert/update/delete policy for any role — the
  only writer is the `log_audit_event()` trigger (itself
  `SECURITY DEFINER`), attached to every table where a state change
  matters for compliance (personnel, procurement, cargo, shipments,
  inventory, consumption, incidents, check-ins).
- **`inventory.quantity`** is derived, not directly written by the Field
  App — inserting a `consumption_logs` row triggers
  `apply_consumption_log()`, which decrements it. This is the one write
  path the offline-sync queue actually needs to reconcile.

## Regenerating types

`packages/supabase-client/src/database.types.ts` is hand-written to match
these migrations (see the comment at the top of that file). Once a project
is running (local or cloud-linked), regenerate the real thing:

```bash
cd packages/supabase-client
npm run gen-types
```

## Deploying to a cloud project

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push         # applies migrations/*.sql to the cloud project
npm run db:seed          # against the cloud project this time — make sure
                          # .env.local points at it, not local Postgres
```
