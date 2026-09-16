-- Vendors (stub filled in), purchase requisitions, purchase orders, cargo
-- items. This is the pipeline the brainstorm doc describes: requisition
-- -> procurement -> packing/segregation -> containerization -> shipment.

create type public.cargo_category as enum ('fuel', 'food', 'medical', 'spares', 'instruments');
create type public.requisition_status as enum ('draft', 'submitted', 'approved', 'converted_to_po', 'rejected');
create type public.po_status as enum ('draft', 'sent', 'acknowledged', 'on-track', 'at-risk', 'late', 'delivered', 'cancelled');

alter table public.vendors
  add column organization_id uuid not null references public.organizations (id),
  add column name text not null,
  add column category text not null,
  add column location text,
  add column performance_score numeric(5, 2) not null default 0 check (performance_score between 0 and 100),
  add column created_by uuid references auth.users (id),
  add column created_at timestamptz not null default now(),
  add column updated_at timestamptz not null default now();

create table public.purchase_requisitions (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid not null references public.expeditions (id),
  station_id uuid not null references public.stations (id),
  requested_by uuid not null references public.profiles (id),
  items jsonb not null default '[]'::jsonb,
  status public.requisition_status not null default 'draft',
  packing_deadline date not null,
  -- Set when an AI agent (Reorder Forecaster) drafted this rather than a
  -- human — the requisition itself still goes through the same approval
  -- flow as a manually-created one; see ai_agent_runs for the drafting record.
  drafted_by_agent_run_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.purchase_requisitions.items is
  '[{"name": "Aviation turbine fuel", "category": "fuel", "quantity": 5000, "unit": "L"}, ...]';

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  requisition_id uuid not null references public.purchase_requisitions (id),
  vendor_id uuid not null references public.vendors (id),
  items_summary text not null,
  packing_deadline date not null,
  committed_delivery_date date,
  status public.po_status not null default 'draft',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.purchase_orders is
  'packing_deadline is denormalized from the requisition on purpose: the Vendor Deadline Watcher agent and every vendor-portal query filter on it directly and should not need to join requisitions for the one field they care about.';

create table public.cargo_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id),
  name text not null,
  category public.cargo_category not null,
  quantity numeric not null,
  unit text not null,
  weight_kg numeric,
  volume_m3 numeric,
  -- Null until the item is assigned to a shipment during containerization.
  shipment_id uuid,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vendors_touch_updated_at before update on public.vendors
  for each row execute function public.touch_updated_at();
create trigger purchase_requisitions_touch_updated_at before update on public.purchase_requisitions
  for each row execute function public.touch_updated_at();
create trigger purchase_orders_touch_updated_at before update on public.purchase_orders
  for each row execute function public.touch_updated_at();
create trigger cargo_items_touch_updated_at before update on public.cargo_items
  for each row execute function public.touch_updated_at();

create trigger purchase_requisitions_audit after insert or update or delete on public.purchase_requisitions
  for each row execute function public.log_audit_event();
create trigger purchase_orders_audit after insert or update or delete on public.purchase_orders
  for each row execute function public.log_audit_event();
create trigger cargo_items_audit after insert or update or delete on public.cargo_items
  for each row execute function public.log_audit_event();

alter table public.vendors enable row level security;
alter table public.purchase_requisitions enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.cargo_items enable row level security;

-- vendors: command staff/leadership see every vendor; a vendor user sees
-- only its own row. No field access — the brainstorm doc's vendor portal
-- boundary ("no NCPOR internal clutter") cuts the other way too.
create policy vendors_select_command_staff
  on public.vendors for select
  using (public.is_leadership_or_command_staff());

create policy vendors_select_own
  on public.vendors for select
  using (id = public.current_vendor_id());

create policy vendors_write_command_staff
  on public.vendors for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- purchase_requisitions: pre-PO internal planning documents — command
-- staff/leadership full visibility; a field user can see and create
-- requisitions for their own station; vendors never see this table.
create policy purchase_requisitions_select_command_staff
  on public.purchase_requisitions for select
  using (public.is_leadership_or_command_staff());

create policy purchase_requisitions_select_own_station
  on public.purchase_requisitions for select
  using (
    public.current_role() = 'field'
    and station_id = public.current_station_id()
  );

create policy purchase_requisitions_insert_own_station
  on public.purchase_requisitions for insert
  with check (
    public.is_command_staff()
    or (public.current_role() = 'field' and station_id = public.current_station_id())
  );

create policy purchase_requisitions_write_command_staff
  on public.purchase_requisitions for update
  using (public.is_command_staff())
  with check (public.is_command_staff());

create policy purchase_requisitions_delete_command_staff
  on public.purchase_requisitions for delete
  using (public.is_command_staff());

-- purchase_orders: command staff/leadership full CRUD. A vendor can read
-- and update (status/delivery fields, enforced at the application layer —
-- RLS grants row access, not column access) only its own POs. A field
-- user can read POs tied to a requisition from their own station.
create policy purchase_orders_select_command_staff
  on public.purchase_orders for select
  using (public.is_leadership_or_command_staff());

create policy purchase_orders_select_own_vendor
  on public.purchase_orders for select
  using (vendor_id = public.current_vendor_id());

create policy purchase_orders_select_own_station
  on public.purchase_orders for select
  using (
    public.current_role() = 'field'
    and exists (
      select 1 from public.purchase_requisitions pr
      where pr.id = purchase_orders.requisition_id
        and pr.station_id = public.current_station_id()
    )
  );

create policy purchase_orders_update_own_vendor
  on public.purchase_orders for update
  using (vendor_id = public.current_vendor_id())
  with check (vendor_id = public.current_vendor_id());

create policy purchase_orders_write_command_staff
  on public.purchase_orders for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- cargo_items: visibility follows the parent PO's visibility rules.
create policy cargo_items_select_command_staff
  on public.cargo_items for select
  using (public.is_leadership_or_command_staff());

create policy cargo_items_select_own_vendor
  on public.cargo_items for select
  using (
    exists (
      select 1 from public.purchase_orders po
      where po.id = cargo_items.purchase_order_id
        and po.vendor_id = public.current_vendor_id()
    )
  );

create policy cargo_items_select_own_station
  on public.cargo_items for select
  using (
    public.current_role() = 'field'
    and exists (
      select 1 from public.purchase_orders po
      join public.purchase_requisitions pr on pr.id = po.requisition_id
      where po.id = cargo_items.purchase_order_id
        and pr.station_id = public.current_station_id()
    )
  );

create policy cargo_items_write_command_staff
  on public.cargo_items for all
  using (public.is_command_staff())
  with check (public.is_command_staff());
