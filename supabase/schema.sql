create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  timezone text,
  subscription_status text default 'inactive',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.birth_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_date date not null,
  time_exact boolean not null default false,
  time_value time,
  location_text text not null,
  lat numeric(9,6),
  lng numeric(9,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.natal_charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  placements_json jsonb not null,
  aspects_json jsonb not null,
  generated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_text text not null,
  entry_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.journal_reflections (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  ai_response text not null,
  model text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_transits (
  id uuid primary key default gen_random_uuid(),
  transit_date date not null unique,
  transit_summary text not null,
  structured_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive',
  price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.birth_data enable row level security;
alter table public.natal_charts enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_reflections enable row level security;
alter table public.daily_transits enable row level security;
alter table public.subscriptions enable row level security;

create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);

create policy "birth_data select own" on public.birth_data for select using (auth.uid() = user_id);
create policy "birth_data insert own" on public.birth_data for insert with check (auth.uid() = user_id);
create policy "birth_data update own" on public.birth_data for update using (auth.uid() = user_id);
create policy "birth_data delete own" on public.birth_data for delete using (auth.uid() = user_id);

create policy "natal_charts select own" on public.natal_charts for select using (auth.uid() = user_id);
create policy "natal_charts insert own" on public.natal_charts for insert with check (auth.uid() = user_id);
create policy "natal_charts update own" on public.natal_charts for update using (auth.uid() = user_id);

create policy "journal_entries select own" on public.journal_entries for select using (auth.uid() = user_id);
create policy "journal_entries insert own" on public.journal_entries for insert with check (auth.uid() = user_id);
create policy "journal_entries update own" on public.journal_entries for update using (auth.uid() = user_id);
create policy "journal_entries delete own" on public.journal_entries for delete using (auth.uid() = user_id);

create policy "journal_reflections select own" on public.journal_reflections
for select using (
  exists (
    select 1 from public.journal_entries
    where public.journal_entries.id = journal_reflections.entry_id
    and public.journal_entries.user_id = auth.uid()
  )
);
create policy "journal_reflections insert own" on public.journal_reflections
for insert with check (
  exists (
    select 1 from public.journal_entries
    where public.journal_entries.id = journal_reflections.entry_id
    and public.journal_entries.user_id = auth.uid()
  )
);

create policy "daily_transits readable by authenticated users" on public.daily_transits
for select using (auth.role() = 'authenticated');

create policy "subscriptions select own" on public.subscriptions for select using (auth.uid() = user_id);
create policy "subscriptions insert own" on public.subscriptions for insert with check (auth.uid() = user_id);
create policy "subscriptions update own" on public.subscriptions for update using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
