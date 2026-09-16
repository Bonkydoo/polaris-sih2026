-- Incidents, check-ins, hazard zones, weather snapshots — the safety-
-- operations surface. Note checkins deliberately has no "overdue" column:
-- overdue is a derived state (now() - max(checkin_at) past a hazard-aware
-- threshold), computed by the Safety Escalation agent, not stored — a
-- stored status would just go stale between agent runs.

create type public.incident_type as enum ('safety', 'medical', 'logistics');
create type public.incident_severity as enum ('low', 'medium', 'high', 'critical');
create type public.incident_status as enum ('open', 'investigating', 'resolved');
create type public.hazard_type as enum ('crevasse', 'wildlife', 'whiteout-risk');

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations (id),
  expedition_id uuid references public.expeditions (id),
  type public.incident_type not null,
  severity public.incident_severity not null,
  status public.incident_status not null default 'open',
  title text not null,
  description text,
  -- Append-only structured timeline: [{"at": "...", "note": "...", "actor_id": "..."}]
  timeline jsonb not null default '[]'::jsonb,
  reported_by uuid not null references public.profiles (id),
  -- Set when the Safety Escalation agent raised this automatically rather
  -- than a human filing a report.
  raised_by_agent_run_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hazard_zones (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations (id),
  name text not null,
  type public.hazard_type not null,
  geometry extensions.geography(polygon, 4326) not null,
  risk_notes text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  personnel_id uuid not null references public.personnel (id),
  checkin_at timestamptz not null default now(),
  location extensions.geography(point, 4326),
  hazard_zone_id uuid references public.hazard_zones (id),
  is_sos boolean not null default false,
  notes text,
  recorded_offline boolean not null default false,
  created_at timestamptz not null default now()
);
create index checkins_personnel_idx on public.checkins (personnel_id, checkin_at desc);

create table public.weather_snapshots (
  id uuid primary key default gen_random_uuid(),
  station_id uuid references public.stations (id),
  shipment_id uuid references public.shipments (id),
  source text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  risk_score numeric not null check (risk_score between 0 and 100),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  constraint weather_snapshots_target check (
    (station_id is not null) or (shipment_id is not null)
  )
);
comment on table public.weather_snapshots is
  'Ingested by the mocked weather feed today (TRD External/Mocked Feeds); swapping in a real provider only changes what writes rows here.';

create trigger incidents_touch_updated_at before update on public.incidents
  for each row execute function public.touch_updated_at();
create trigger hazard_zones_touch_updated_at before update on public.hazard_zones
  for each row execute function public.touch_updated_at();

create trigger incidents_audit after insert or update or delete on public.incidents
  for each row execute function public.log_audit_event();
create trigger checkins_audit after insert on public.checkins
  for each row execute function public.log_audit_event();

alter table public.incidents enable row level security;
alter table public.hazard_zones enable row level security;
alter table public.checkins enable row level security;
alter table public.weather_snapshots enable row level security;

-- incidents: command staff/leadership full; field reads and files
-- incidents for their own station; vendors never see this table.
create policy incidents_select_command_staff
  on public.incidents for select
  using (public.is_leadership_or_command_staff());

create policy incidents_select_own_station
  on public.incidents for select
  using (
    public.current_role() = 'field'
    and station_id = public.current_station_id()
  );

create policy incidents_insert_own_station
  on public.incidents for insert
  with check (
    public.is_command_staff()
    or (public.current_role() = 'field' and station_id = public.current_station_id())
  );

create policy incidents_update_command_staff
  on public.incidents for update
  using (public.is_command_staff())
  with check (public.is_command_staff());

create policy incidents_delete_command_staff
  on public.incidents for delete
  using (public.is_command_staff());

-- hazard_zones: reference/safety data for a station — command
-- staff/leadership full; field reads their own station's zones.
create policy hazard_zones_select_command_staff
  on public.hazard_zones for select
  using (public.is_leadership_or_command_staff());

create policy hazard_zones_select_own_station
  on public.hazard_zones for select
  using (
    public.current_role() = 'field'
    and station_id = public.current_station_id()
  );

create policy hazard_zones_write_command_staff
  on public.hazard_zones for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- checkins: a field user reads check-ins for their own station (safety
-- awareness among station-mates) and inserts only their own; command
-- staff/leadership read everything for cross-station monitoring.
create policy checkins_select_command_staff
  on public.checkins for select
  using (public.is_leadership_or_command_staff());

create policy checkins_select_own_station
  on public.checkins for select
  using (
    public.current_role() = 'field'
    and exists (
      select 1 from public.personnel p
      where p.id = checkins.personnel_id
        and p.station_id = public.current_station_id()
    )
  );

create policy checkins_insert_own
  on public.checkins for insert
  with check (
    exists (
      select 1 from public.personnel p
      where p.id = checkins.personnel_id and p.user_id = auth.uid()
    )
  );

-- weather_snapshots: operationally useful, low sensitivity — every NCPOR
-- role (not vendor) can read; writes are command-staff or the ingestion
-- job (which uses the service role and bypasses RLS entirely).
create policy weather_snapshots_select_ncpor
  on public.weather_snapshots for select
  using (public.current_role() in ('admin', 'ops', 'field', 'leadership'));

create policy weather_snapshots_write_command_staff
  on public.weather_snapshots for all
  using (public.is_command_staff())
  with check (public.is_command_staff());
