create table if not exists public.aeon_usage_monthly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  month_key text not null,
  first_touch_month_key text not null,
  monthly_turns_used integer not null default 0,
  onboarding_bonus_turns_used integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create index if not exists idx_aeon_usage_monthly_user_month
  on public.aeon_usage_monthly (user_id, month_key desc);

alter table public.aeon_usage_monthly enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'aeon_usage_monthly' and policyname = 'aeon_usage_monthly_owner_all'
  ) then
    create policy aeon_usage_monthly_owner_all on public.aeon_usage_monthly
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'aeon_usage_monthly' and policyname = 'aeon_usage_monthly_service_all'
  ) then
    create policy aeon_usage_monthly_service_all on public.aeon_usage_monthly
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
