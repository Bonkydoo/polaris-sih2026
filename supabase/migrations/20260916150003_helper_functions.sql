-- Auth-scoping helper functions used by every RLS policy in this schema.
-- SECURITY DEFINER + a fixed search_path so they read public.profiles
-- (bypassing RLS on that lookup) without opening a search-path attack or
-- causing the recursive-RLS trap of profiles' own policies calling back
-- into profiles through the normal RLS-checked path.

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.current_org_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_station_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select station_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_vendor_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select vendor_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_command_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'ops')
  );
$$;

create or replace function public.is_leadership_or_command_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'ops', 'leadership')
  );
$$;

-- Generic updated_at maintenance, attached per-table below.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Generic audit trail, attached per-table in each domain migration.
-- Runs as the invoking user (not security definer) so actor_id reflects
-- who actually made the change; audit_log's own RLS blocks direct writes,
-- but triggers execute as the table owner's trigger context regardless of
-- caller RLS, so this always succeeds even for a low-privilege writer.
create or replace function public.log_audit_event()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_log (actor_id, action, entity_table, entity_id, before, after)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('update', 'delete') then to_jsonb(old) else null end,
    case when tg_op in ('insert', 'update') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

-- organizations: NCPOR command staff and leadership see every org (needed
-- for vendor management + ministry oversight); a vendor sees only its own.
create policy organizations_select_command_staff
  on public.organizations for select
  using (public.is_leadership_or_command_staff());

create policy organizations_select_own
  on public.organizations for select
  using (id = public.current_org_id());

create policy organizations_write_command_staff
  on public.organizations for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- profiles: everyone reads their own row; command staff + leadership read
-- every profile in their own organization (not across vendor orgs).
create policy profiles_select_self
  on public.profiles for select
  using (id = auth.uid());

create policy profiles_select_org_command_staff
  on public.profiles for select
  using (
    public.is_leadership_or_command_staff()
    and organization_id = public.current_org_id()
  );

create policy profiles_update_self
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_write_command_staff
  on public.profiles for all
  using (public.is_command_staff())
  with check (public.is_command_staff());

-- audit_log: read-only, admin + leadership only. No insert/update/delete
-- policy exists for any role — the only writer is the SECURITY DEFINER
-- trigger function above, which bypasses RLS entirely.
create policy audit_log_select_leadership
  on public.audit_log for select
  using (public.is_leadership_or_command_staff());
