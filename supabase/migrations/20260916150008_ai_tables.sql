-- The AI Command Layer's own state: every autonomous agent run, and the
-- pgvector store the Command Copilot retrieves over (past reports, SOPs,
-- incident logs — TRD §5 Command Copilot).

create type public.agent_type as enum (
  'reorder_forecaster',
  'vendor_deadline_watcher',
  'weather_contingency_planner',
  'cargo_reconciliation',
  'safety_escalation',
  'report_drafter',
  'command_copilot'
);
create type public.agent_run_status as enum ('pending_review', 'approved', 'dismissed');
create type public.agent_run_severity as enum ('info', 'watch', 'critical');

create table public.ai_agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_type public.agent_type not null,
  -- What woke the agent up: 'nightly_cron' | 'on_po_update' | 'on_weather_snapshot'
  -- | 'on_shipment_arrived' | 'on_missed_checkin' | 'weekly_cron' | 'on_demand'.
  trigger text not null,
  -- Loose pointer to whatever the agent acted on, e.g.
  -- {"purchase_order_id": "..."} or {"inventory_id": "...", "station_id": "..."}.
  -- Deliberately not a foreign key: different agent types point at
  -- different tables, and the row must survive even if that source row
  -- is later deleted (the draft/alert is the audit record).
  input_ref jsonb not null default '{}'::jsonb,
  title text not null,
  detail text not null,
  -- The structured draft itself when the agent produced one (a
  -- requisition payload, an escalation email body, a contingency plan) —
  -- null for agent types that only alert without drafting anything.
  output jsonb,
  severity public.agent_run_severity not null default 'info',
  status public.agent_run_status not null default 'pending_review',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.ai_agent_runs is
  'status starts pending_review for every row and only ever moves to approved/dismissed by a human — see TRD §5: "nothing autonomous ever executes a real-world action without a human clicking Approve first."';

create index ai_agent_runs_status_idx on public.ai_agent_runs (status, created_at desc);

-- Retrieval store for the Command Copilot's RAG over past reports, SOPs
-- and incident logs. embedding dimension matches whichever embedding
-- model apps/command-center's server route is configured to call
-- (Voyage AI's voyage-2 = 1024; change here and in the embedding call
-- together if that ever switches).
create table public.report_embeddings (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  content text not null,
  embedding extensions.vector(1024),
  created_at timestamptz not null default now(),
  unique (source_table, source_id)
);
create index report_embeddings_vector_idx on public.report_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.ai_agent_runs enable row level security;
alter table public.report_embeddings enable row level security;

-- ai_agent_runs / report_embeddings: the AI Command Layer is a Command
-- Center feature (brainstorm doc §5) — command staff and leadership only.
-- Agent *writes* happen from Edge Functions using the service role key,
-- which bypasses RLS entirely, so the only policies needed here are for
-- the human review UI (select + update to approve/dismiss).
create policy ai_agent_runs_select_command_staff
  on public.ai_agent_runs for select
  using (public.is_leadership_or_command_staff());

create policy ai_agent_runs_review_command_staff
  on public.ai_agent_runs for update
  using (public.is_command_staff())
  with check (public.is_command_staff());

create policy report_embeddings_select_command_staff
  on public.report_embeddings for select
  using (public.is_leadership_or_command_staff());
