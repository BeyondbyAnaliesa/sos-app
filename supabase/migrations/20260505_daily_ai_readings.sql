-- Cached AI-generated daily readings from the full SOS memory spine.

create table if not exists public.daily_ai_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_date date not null,
  memory_hash text not null,
  reading_json jsonb not null default '{}'::jsonb,
  prompt_version text not null,
  model text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reading_date, memory_hash)
);

create index if not exists idx_daily_ai_readings_user_date
  on public.daily_ai_readings (user_id, reading_date desc);

alter table public.daily_ai_readings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_ai_readings'
      and policyname = 'daily_ai_readings_owner_select'
  ) then
    create policy daily_ai_readings_owner_select on public.daily_ai_readings
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_ai_readings'
      and policyname = 'daily_ai_readings_service_all'
  ) then
    create policy daily_ai_readings_service_all on public.daily_ai_readings
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
