-- SOS memory foundation
-- Creates the first durable rails for transit arcs, daily snapshots, life signals,
-- and their linkage. This is scaffolding only, not the full pattern engine.

create extension if not exists pgcrypto;

create table if not exists public.transit_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  snapshot_date date not null,
  transits_json jsonb not null default '[]'::jsonb,
  active_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create index if not exists idx_transit_daily_snapshots_user_date
  on public.transit_daily_snapshots (user_id, snapshot_date desc);

create table if not exists public.transit_arcs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  transit_planet text not null,
  transit_sign text,
  natal_target text not null,
  natal_sign text,
  aspect_type text not null,
  aspect_nature text,
  first_active_date date not null,
  exact_dates_json jsonb not null default '[]'::jsonb,
  last_active_date date,
  state text not null default 'approaching',
  recurrence_count integer not null default 1,
  peak_orb numeric(6,2),
  last_orb numeric(6,2),
  house_axis text,
  themes_json jsonb not null default '[]'::jsonb,
  tombstone_summary text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transit_arcs_user_state
  on public.transit_arcs (user_id, state, updated_at desc);

create index if not exists idx_transit_arcs_user_target
  on public.transit_arcs (user_id, natal_target, transit_planet, aspect_type);

create table if not exists public.life_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source text not null,
  source_entry_id uuid,
  source_message_id uuid,
  source_index integer,
  source_start integer,
  source_end integer,
  signal_timestamp timestamptz not null default now(),
  content_text text,
  content_json jsonb,
  signal_kind text not null default 'mixed',
  themes_json jsonb not null default '[]'::jsonb,
  entities_json jsonb not null default '[]'::jsonb,
  emotions_json jsonb not null default '[]'::jsonb,
  life_domain text,
  privacy_class text not null default 'standard',
  status text not null default 'open',
  active_transits_json jsonb not null default '[]'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_life_signals_user_time
  on public.life_signals (user_id, signal_timestamp desc);

create index if not exists idx_life_signals_user_source
  on public.life_signals (user_id, source, signal_timestamp desc);

create table if not exists public.life_signal_transit_tags (
  id uuid primary key default gen_random_uuid(),
  life_signal_id uuid not null references public.life_signals(id) on delete cascade,
  transit_arc_id uuid not null references public.transit_arcs(id) on delete cascade,
  tag_source text not null default 'auto',
  confidence numeric(4,3),
  created_at timestamptz not null default now(),
  unique (life_signal_id, transit_arc_id)
);

create index if not exists idx_life_signal_transit_tags_signal
  on public.life_signal_transit_tags (life_signal_id);

create index if not exists idx_life_signal_transit_tags_arc
  on public.life_signal_transit_tags (transit_arc_id);

alter table public.transit_daily_snapshots enable row level security;
alter table public.transit_arcs enable row level security;
alter table public.life_signals enable row level security;
alter table public.life_signal_transit_tags enable row level security;

-- User-owned read/write policies.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transit_daily_snapshots' and policyname = 'transit_daily_snapshots_owner_all'
  ) then
    create policy transit_daily_snapshots_owner_all on public.transit_daily_snapshots
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'transit_arcs' and policyname = 'transit_arcs_owner_all'
  ) then
    create policy transit_arcs_owner_all on public.transit_arcs
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'life_signals' and policyname = 'life_signals_owner_all'
  ) then
    create policy life_signals_owner_all on public.life_signals
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'life_signal_transit_tags' and policyname = 'life_signal_transit_tags_owner_all'
  ) then
    create policy life_signal_transit_tags_owner_all on public.life_signal_transit_tags
      for all
      using (
        exists (
          select 1
          from public.life_signals ls
          where ls.id = life_signal_id and ls.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.life_signals ls
          where ls.id = life_signal_id and ls.user_id = auth.uid()
        )
      );
  end if;
end $$;
