-- Stations (forward-declared as a stub in core_tables so profiles could
-- FK to it), expeditions, personnel and travel batches.

create type public.station_region as enum ('antarctica', 'arctic');
create type public.expedition_status as enum ('planning', 'active', 'transit', 'closed');
create type public.training_status as enum ('complete', 'in-progress', 'overdue');
create type public.quarantine_status as enum ('cleared', 'in-progress', 'not-required');
create type public.travel_mode as enum ('sea', 'air');

alter table public.stations
  add column organization_id uuid not null references public.organizations (id),
  add column code text not null unique,
  add column name text not null,
  add column region public.station_region not null,
  add column station_type text not null,
  add column coordinates extensions.geography(point, 4326),
  add column personnel_capacity integer not null default 0,
  add column created_by uuid references auth.users (id),
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

create table public.expeditions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  code text not null unique,
  name text not null,
  season_label text not null,
  window_open date not null,
  window_close date not null,
  status public.expedition_status not null default 'planning',
  vessel text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expeditions_window_valid check (window_close > window_open)
);
comment on table public.expeditions is
  'e.g. 46-ISEA. Deliberately not tied to a single station_id (unlike the TRD sketch) — an expedition-to-station join table scales to multi-station, multi-expedition seasons per the NFR requirement.';

-- Many-to-many: an expedition can span multiple stations (46-ISEA covers
-- both Bharati and Maitri); a station recurs across many expeditions.
create table public.expedition_stations (
  expedition_id uuid not null references public.expeditions (id) on delete cascade,
  station_id uuid not null references public.stations (id) on delete cascade,
  primary key (expedition_id, station_id)
);

create table public.personnel (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid not null references public.expeditions (id),
  user_id uuid not null references public.profiles (id),
  station_id uuid not null references public.stations (id),
  role_title text not null,
  training_status public.training_status not null default 'in-progress',
  quarantine_status public.quarantine_status not null default 'not-required',
  batch_label text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expedition_id, user_id)
);

create table public.travel_batches (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid not null references public.expeditions (id),
  batch_code text not null,
  mode public.travel_mode not null,
  transit_legs jsonb not null default '[]'::jsonb,
  departure_date date,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expedition_id, batch_code)
);
comment on column public.travel_batches.transit_legs is
  'Ordered array of {"from": "Goa", "to": "Cape Town", "date": "2026-12-05"} — flexible enough for sea vs. air routing without a separate legs table.';

create table public.travel_batch_members (
  travel_batch_id uuid not null references public.travel_batches (id) on delete cascade,
  personnel_id uuid not null references public.personnel (id) on delete cascade,
  primary key (travel_batch_id, personnel_id)
);

create trigger stations_touch_updated_at before update on public.stations
  for each row execute function public.touch_updated_at();
create trigger expeditions_touch_updated_at before update on public.expeditions
  for each row execute function public.touch_updated_at();
create trigger personnel_touch_updated_at before update on public.personnel
  for each row execute function public.touch_updated_at();
create trigger travel_batches_touch_updated_at before update on public.travel_batches
  for each row execute function public.touch_updated_at();

create trigger personnel_audit after insert or update or delete on public.personnel
  for each row execute function public.log_audit_event();

alter table public.stations enable row level security;
alter table public.expeditions enable row level security;
alter table public.expedition_stations enable row level security;
alter table public.personnel enable row level security;
alter table public.travel_batches enable row level security;
alter table public.travel_batch_members enable row level security;

-- stations: reference data, low sensitivity — any authenticated member of
-- an org (NCPOR staff or a vendor) can read it; writes are command-staff only.
create policy stations_select_authenticated
  on public.stations for select
  using (auth.uid() is not null);

create policy stations_write_command_staff
  on public.stations for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- expeditions: leadership/command staff see everything; a field user sees
-- expeditions that include their assigned station. Vendors never see this
-- table directly (they get deadline info scoped through purchase_orders).
create policy expeditions_select_command_staff
  on public.expeditions for select
  using (public.is_leadership_or_command_staff());

create policy expeditions_select_field_own_station
  on public.expeditions for select
  using (
    public.current_role() = 'field'
    and exists (
      select 1 from public.expedition_stations es
      where es.expedition_id = expeditions.id
        and es.station_id = public.current_station_id()
    )
  );

create policy expeditions_write_command_staff
  on public.expeditions for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

create policy expedition_stations_select
  on public.expedition_stations for select
  using (
    public.is_leadership_or_command_staff()
    or station_id = public.current_station_id()
  );

create policy expedition_stations_write_command_staff
  on public.expedition_stations for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- personnel: a field user sees their own record and their station's
-- roster; command staff/leadership see everyone.
create policy personnel_select_command_staff
  on public.personnel for select
  using (public.is_leadership_or_command_staff());

create policy personnel_select_own_station
  on public.personnel for select
  using (
    public.current_role() = 'field'
    and station_id = public.current_station_id()
  );

create policy personnel_write_command_staff
  on public.personnel for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

create policy travel_batches_select_command_staff
  on public.travel_batches for select
  using (public.is_leadership_or_command_staff());

create policy travel_batches_select_own_member
  on public.travel_batches for select
  using (
    exists (
      select 1 from public.travel_batch_members m
      join public.personnel p on p.id = m.personnel_id
      where m.travel_batch_id = travel_batches.id and p.user_id = auth.uid()
    )
  );

create policy travel_batches_write_command_staff
  on public.travel_batches for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

create policy travel_batch_members_select
  on public.travel_batch_members for select
  using (
    public.is_leadership_or_command_staff()
    or exists (
      select 1 from public.personnel p
      where p.id = travel_batch_members.personnel_id and p.user_id = auth.uid()
    )
  );

create policy travel_batch_members_write_command_staff
  on public.travel_batch_members for all
  using (public.is_command_staff())
  with check (public.is_command_staff());
