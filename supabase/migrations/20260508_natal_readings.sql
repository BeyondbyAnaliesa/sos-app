-- Cached AI-generated natal readings created after onboarding.

create table if not exists public.natal_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_json jsonb not null default '{}'::jsonb,
  prompt_version text not null,
  model text not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_natal_readings_user_generated
  on public.natal_readings (user_id, generated_at desc);

alter table public.natal_readings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'natal_readings'
      and policyname = 'natal_readings_owner_select'
  ) then
    create policy natal_readings_owner_select on public.natal_readings
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'natal_readings'
      and policyname = 'natal_readings_service_all'
  ) then
    create policy natal_readings_service_all on public.natal_readings
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
