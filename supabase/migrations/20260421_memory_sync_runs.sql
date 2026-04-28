create table if not exists public.memory_sync_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  charts_total integer not null default 0,
  charts_processed integer not null default 0,
  snapshots_created integer not null default 0,
  arcs_created_or_updated integer not null default 0,
  errors_count integer not null default 0,
  metrics_json jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_date)
);

create index if not exists idx_memory_sync_runs_date
  on public.memory_sync_runs (run_date desc);

alter table public.memory_sync_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'memory_sync_runs' and policyname = 'memory_sync_runs_service_read'
  ) then
    create policy memory_sync_runs_service_read on public.memory_sync_runs
      for select
      using (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'memory_sync_runs' and policyname = 'memory_sync_runs_service_write'
  ) then
    create policy memory_sync_runs_service_write on public.memory_sync_runs
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
