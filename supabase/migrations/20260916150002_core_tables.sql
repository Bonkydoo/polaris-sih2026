-- Core multi-tenant boundary: organizations, profiles (role/org/station/
-- vendor membership on top of auth.users), and the immutable audit log.

create type public.org_type as enum ('ncpor', 'ministry', 'vendor');
create type public.user_role as enum ('admin', 'ops', 'field', 'vendor', 'leadership');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.org_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.organizations is
  'Multi-tenant boundary. One row for NCPOR, one for the Ministry (leadership view), one per vendor company.';

-- Stations are referenced by profiles below but defined fully in the
-- expedition-tables migration; declare a forward table here so the FK
-- can exist without reordering the whole schema. Kept minimal on purpose.
create table public.stations (
  id uuid primary key default gen_random_uuid()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id),
  role public.user_role not null,
  full_name text not null,
  -- Set only for role = 'field': scopes station-level RLS.
  station_id uuid references public.stations (id),
  -- Set only for role = 'vendor': scopes vendor-portal RLS. Redundant
  -- with organization_id (a vendor's org row) but kept explicit because
  -- it's the join point every vendor-scoped policy actually needs.
  vendor_id uuid references public.vendors (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_field_has_station
    check (role <> 'field' or station_id is not null),
  constraint profiles_vendor_has_vendor_id
    check (role <> 'vendor' or vendor_id is not null)
);
comment on table public.profiles is
  'One row per auth.users member. role + organization_id + station_id + vendor_id are the entire RLS scoping surface — see supabase/README.md.';

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id),
  action text not null check (action in ('insert', 'update', 'delete')),
  entity_table text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
comment on table public.audit_log is
  'Immutable, append-only. Populated by public.log_audit_event() triggers — never written to directly by application code.';

create index audit_log_entity_idx on public.audit_log (entity_table, entity_id);
create index audit_log_actor_idx on public.audit_log (actor_id);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;
