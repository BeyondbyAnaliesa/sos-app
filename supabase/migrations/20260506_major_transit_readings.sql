-- Cached AI readings for major personal transit waves.
-- The app can render deterministic transit structure immediately, then reuse these
-- deeper generated readings until the lifecycle phase or user memory snapshot changes.

create table if not exists public.major_transit_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  arc_key text not null,
  transit_planet text not null,
  aspect_type text not null,
  natal_target text not null,
  lifecycle_start_date date not null,
  lifecycle_end_date date not null,
  phase text not null,
  memory_hash text not null,
  reading_json jsonb not null default '{}'::jsonb,
  prompt_version text not null,
  model text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, arc_key, lifecycle_start_date, lifecycle_end_date, phase, memory_hash)
);

create index if not exists idx_major_transit_readings_user_generated
  on public.major_transit_readings (user_id, generated_at desc);

create index if not exists idx_major_transit_readings_user_arc
  on public.major_transit_readings (user_id, arc_key, lifecycle_start_date, lifecycle_end_date);

alter table public.major_transit_readings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'major_transit_readings'
      and policyname = 'major_transit_readings_owner_select'
  ) then
    create policy major_transit_readings_owner_select on public.major_transit_readings
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'major_transit_readings'
      and policyname = 'major_transit_readings_service_all'
  ) then
    create policy major_transit_readings_service_all on public.major_transit_readings
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
