-- Vendor Portal: compliance document metadata + the Storage bucket that
-- holds the actual files. Brainstorm doc §4 pillar 5: "document/compliance
-- upload (customs, MSDS, quality certs)".

create type public.document_type as enum ('customs', 'msds', 'quality_cert', 'other');

create table public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id),
  purchase_order_id uuid references public.purchase_orders (id),
  document_type public.document_type not null,
  file_name text not null,
  -- Storage object path, always "<vendor_id>/<uuid>-<file_name>" — the
  -- vendor_id folder prefix is what the storage.objects RLS policies
  -- below actually check, not this column (this is just for display /
  -- generating signed URLs).
  storage_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create trigger compliance_documents_audit after insert or delete on public.compliance_documents
  for each row execute function public.log_audit_event();

alter table public.compliance_documents enable row level security;

create policy compliance_documents_select_command_staff
  on public.compliance_documents for select
  using (public.is_leadership_or_command_staff());

create policy compliance_documents_select_own_vendor
  on public.compliance_documents for select
  using (vendor_id = public.current_vendor_id());

create policy compliance_documents_insert_own_vendor
  on public.compliance_documents for insert
  with check (vendor_id = public.current_vendor_id() and uploaded_by = auth.uid());

create policy compliance_documents_delete_own_vendor
  on public.compliance_documents for delete
  using (vendor_id = public.current_vendor_id());

-- Storage: a private bucket, path convention "<vendor_id>/<file>". RLS on
-- storage.objects checks the first path segment (storage.foldername
-- splits "name" on "/") against the caller's own vendor_id — the same
-- boundary as every other vendor-scoped table, just expressed against
-- Storage's own object model instead of a regular column.
insert into storage.buckets (id, name, public)
values ('vendor-documents', 'vendor-documents', false)
on conflict (id) do nothing;

create policy vendor_documents_select_own
  on storage.objects for select
  using (
    bucket_id = 'vendor-documents'
    and (
      public.is_leadership_or_command_staff()
      or (storage.foldername(name))[1] = public.current_vendor_id()::text
    )
  );

create policy vendor_documents_insert_own
  on storage.objects for insert
  with check (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1] = public.current_vendor_id()::text
  );

create policy vendor_documents_delete_own
  on storage.objects for delete
  using (
    bucket_id = 'vendor-documents'
    and (storage.foldername(name))[1] = public.current_vendor_id()::text
  );
