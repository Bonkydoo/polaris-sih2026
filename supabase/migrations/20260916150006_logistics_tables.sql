-- Shipments, station inventory, and the consumption log that's the one
-- write path Field App users have into inventory (quantity is derived,
-- not directly editable, via the trigger at the bottom of this file).

create type public.shipment_mode as enum ('sea_vessel', 'air_charter', 'helicopter');
create type public.shipment_status as enum ('scheduled', 'in-transit', 'arrived', 'delayed');

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid not null references public.expeditions (id),
  destination_station_id uuid not null references public.stations (id),
  mode public.shipment_mode not null,
  route text not null,
  current_leg text,
  current_position extensions.geography(point, 4326),
  eta timestamptz,
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),
  status public.shipment_status not null default 'scheduled',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.shipments.current_position is
  'Populated by the AIS/vessel-position feed once wired up (TRD External/Mocked Feeds) — nullable until then, and always nullable for air/helicopter legs without live tracking.';

alter table public.cargo_items
  add constraint cargo_items_shipment_id_fkey
  foreign key (shipment_id) references public.shipments (id);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations (id),
  name text not null,
  category public.cargo_category not null,
  quantity numeric not null default 0,
  unit text not null,
  consumption_rate_per_day numeric not null default 0,
  reorder_threshold_days integer not null default 60,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (station_id, name)
);

create table public.consumption_logs (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.inventory (id),
  quantity_used numeric not null check (quantity_used > 0),
  logged_at timestamptz not null default now(),
  logged_by uuid not null references public.profiles (id),
  -- Set by the Field PWA's background-sync queue when a log entry was
  -- recorded offline and reconciled later — the one field the offline
  -- conflict-resolution logic (TRD NFR) actually needs to distinguish.
  recorded_offline boolean not null default false
);

-- Consumption logging is the field write-path into inventory; keep
-- quantity as a derived value so nobody can silently overwrite stock
-- counts without leaving a consumption_logs trail.
create or replace function public.apply_consumption_log()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.inventory
  set quantity = greatest(quantity - new.quantity_used, 0),
      updated_at = now()
  where id = new.inventory_id;
  return new;
end;
$$;

create trigger consumption_logs_apply after insert on public.consumption_logs
  for each row execute function public.apply_consumption_log();

create trigger shipments_touch_updated_at before update on public.shipments
  for each row execute function public.touch_updated_at();
create trigger inventory_touch_updated_at before update on public.inventory
  for each row execute function public.touch_updated_at();

create trigger shipments_audit after insert or update or delete on public.shipments
  for each row execute function public.log_audit_event();
create trigger inventory_audit after insert or update or delete on public.inventory
  for each row execute function public.log_audit_event();
create trigger consumption_logs_audit after insert on public.consumption_logs
  for each row execute function public.log_audit_event();

alter table public.shipments enable row level security;
alter table public.inventory enable row level security;
alter table public.consumption_logs enable row level security;

-- shipments: command staff/leadership full; field reads shipments bound
-- for their station; vendor reads shipments carrying any of its cargo.
create policy shipments_select_command_staff
  on public.shipments for select
  using (public.is_leadership_or_command_staff());

create policy shipments_select_own_station
  on public.shipments for select
  using (
    public.current_role() = 'field'
    and destination_station_id = public.current_station_id()
  );

create policy shipments_select_own_vendor_cargo
  on public.shipments for select
  using (
    exists (
      select 1 from public.cargo_items ci
      join public.purchase_orders po on po.id = ci.purchase_order_id
      where ci.shipment_id = shipments.id
        and po.vendor_id = public.current_vendor_id()
    )
  );

create policy shipments_write_command_staff
  on public.shipments for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- inventory: command staff/leadership full; field reads and (via the
-- consumption_logs insert policy below, not directly) writes only their
-- own station's stock.
create policy inventory_select_command_staff
  on public.inventory for select
  using (public.is_leadership_or_command_staff());

create policy inventory_select_own_station
  on public.inventory for select
  using (
    public.current_role() = 'field'
    and station_id = public.current_station_id()
  );

create policy inventory_write_command_staff
  on public.inventory for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- consumption_logs: field can log consumption only for their own
-- station's inventory, and only as themselves.
create policy consumption_logs_select_command_staff
  on public.consumption_logs for select
  using (public.is_leadership_or_command_staff());

create policy consumption_logs_select_own_station
  on public.consumption_logs for select
  using (
    public.current_role() = 'field'
    and exists (
      select 1 from public.inventory i
      where i.id = consumption_logs.inventory_id
        and i.station_id = public.current_station_id()
    )
  );

create policy consumption_logs_insert_own_station
  on public.consumption_logs for insert
  with check (
    logged_by = auth.uid()
    and exists (
      select 1 from public.inventory i
      where i.id = consumption_logs.inventory_id
        and i.station_id = public.current_station_id()
    )
  );
