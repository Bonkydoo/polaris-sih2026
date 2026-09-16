-- Cargo Reconciliation (TRD §5) needs something to diff the manifest
-- against — "what was scanned in at the station." That's this column:
-- null until a field user physically checks the item in, at which point
-- it holds the actual received quantity (which may differ from the
-- manifest, which is exactly the discrepancy this agent flags).
alter table public.cargo_items
  add column received_quantity numeric,
  add column received_at timestamptz,
  add column received_by uuid references public.profiles (id);

-- A field user can record receipt of cargo destined for their own
-- station — the one write a field role gets into cargo_items, alongside
-- the read policies already defined in the procurement-tables migration.
create policy cargo_items_update_receiving_own_station
  on public.cargo_items for update
  using (
    public.current_role() = 'field'
    and exists (
      select 1 from public.shipments s
      where s.id = cargo_items.shipment_id
        and s.destination_station_id = public.current_station_id()
    )
  )
  with check (
    public.current_role() = 'field'
    and exists (
      select 1 from public.shipments s
      where s.id = cargo_items.shipment_id
        and s.destination_station_id = public.current_station_id()
    )
  );
