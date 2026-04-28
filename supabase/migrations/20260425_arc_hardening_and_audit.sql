-- 20260425_arc_hardening_and_audit.sql
-- Adds snapshot metadata for no-op detection, arc phase-truth fields,
-- return-family linkage, and the transit_arc_events append-only audit table.
-- Safe to re-run (all statements are idempotent).

-- ── transit_daily_snapshots ──────────────────────────────────────────────────
-- hash:        SHA-256 prefix of the normalized transit key+orb set.
--              Used for no-op detection on same-day reruns.
-- source:      Origin of the snapshot: cron | journal | backfill | repair.
-- timezone:    IANA timezone used to resolve the user's local snapshot_date.
-- computed_at: When the transit computation ran (may differ from created_at
--              on same-day reruns or repairs).

alter table public.transit_daily_snapshots
  add column if not exists hash        text,
  add column if not exists source      text not null default 'cron',
  add column if not exists timezone    text,
  add column if not exists computed_at timestamptz;

-- ── transit_arcs ─────────────────────────────────────────────────────────────
-- last_direction: tightening | widening | unknown
--                 Inferred from prior vs current orb on each reconcile pass.
-- tightest_orb:   Smallest orb ever recorded for this arc lifecycle.
--                 Distinct from peak_orb to preserve explicit naming from spec.
-- parent_arc_id:  Links a returning arc to the prior-cycle arc (Slice B usage).

alter table public.transit_arcs
  add column if not exists last_direction text,
  add column if not exists tightest_orb  numeric(6,2),
  add column if not exists parent_arc_id uuid references public.transit_arcs(id);

-- Backfill tightest_orb from existing peak_orb for rows that already exist.
update public.transit_arcs
  set tightest_orb = peak_orb
  where tightest_orb is null
    and peak_orb is not null;

-- ── transit_arc_events ───────────────────────────────────────────────────────
-- Append-only lifecycle audit trail for arcs.
-- event_type values:
--   created | exact_hit | state_changed | returned | closed | retagged | repaired
-- payload_json carries diff/context at the time of emission.

create table if not exists public.transit_arc_events (
  id             uuid        primary key default gen_random_uuid(),
  transit_arc_id uuid        not null references public.transit_arcs(id) on delete cascade,
  event_type     text        not null,
  event_date     date        not null,
  payload_json   jsonb       not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists idx_transit_arc_events_arc_date
  on public.transit_arc_events (transit_arc_id, created_at desc);

create index if not exists idx_transit_arc_events_date
  on public.transit_arc_events (event_date desc);

-- ── Retrieval-support indexes ────────────────────────────────────────────────
create index if not exists idx_transit_arcs_user_first_active
  on public.transit_arcs (user_id, first_active_date desc);

create index if not exists idx_transit_arcs_user_last_active
  on public.transit_arcs (user_id, last_active_date desc);

create index if not exists idx_life_signals_user_domain
  on public.life_signals (user_id, life_domain, signal_timestamp desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.transit_arc_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'transit_arc_events'
      and policyname = 'transit_arc_events_service_all'
  ) then
    create policy transit_arc_events_service_all on public.transit_arc_events
      for all
      using     (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
