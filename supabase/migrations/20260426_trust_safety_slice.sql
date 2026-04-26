-- 20260426_trust_safety_slice.sql
-- Trust / safety + auditability slice (build map item #3).
-- Safe to re-run (all statements are idempotent).

-- ── Life-signal deduplication ────────────────────────────────────────────────
-- Prevents duplicate signal rows for the same journal entry + extraction slot
-- on reruns. Source_entry_id is a uuid when the signal comes from a journal entry.
-- source_index distinguishes multiple signals extracted from one entry.
-- The partial index only covers rows that have a source_entry_id so free-form
-- signals without a source anchor are unaffected.

create unique index if not exists idx_life_signals_source_entry_index
  on public.life_signals (user_id, source_entry_id, source_index)
  where source_entry_id is not null
    and source_index   is not null;

-- ── transit_arc_events: per-arc-per-date-per-type uniqueness ─────────────────
-- Arc events are append-only by design (multiple state_changed events on the same
-- day are theoretically valid). We only deduplicate exact_hit and created events,
-- which should fire at most once per arc per date in correct operation.
-- Rather than a hard unique constraint (which would break legitimate multi-event
-- days), we rely on application-level guards (orb check for exact_hit,
-- created-only-when-no-existing-arc). No new DB constraint needed here.

-- ── Repair-run audit trail column ────────────────────────────────────────────
-- Tracks whether an arc was last modified by a manual repair operation.
-- NULL means the arc has only ever been touched by the normal sync path.
alter table public.transit_arcs
  add column if not exists repaired_at   timestamptz,
  add column if not exists repair_reason text;

-- ── Snapshot idempotency: skipped-count tracking ─────────────────────────────
-- Records how many snapshot writes were skipped because the hash matched
-- an existing row. Stored inside metrics_json; no schema change needed.
-- (Noted here for documentation of the expectation.)

-- ── RLS for transit_arcs new columns ─────────────────────────────────────────
-- New columns on transit_arcs are covered by existing RLS on that table.
-- No policy changes required.
