/**
 * runTransitMemorySync — reusable transit memory sync service.
 *
 * This is the single orchestration entry-point for Slice A of the scheduler +
 * persistent transit memory spec. It handles user resolution, date targeting,
 * per-user `ensureDailyTransitMemory` calls, and sync-run audit updates.
 *
 * The route handler is responsible for:
 *   - authentication
 *   - idempotency gating (skip if full run already completed today)
 *   - creating the memory_sync_runs record and obtaining a runId
 *
 * This service is responsible for:
 *   - resolving the user list from natal_charts (all, limited, or targeted)
 *   - processing each user's transit snapshot + arc reconciliation
 *   - updating the audit record with final counters
 *   - returning a typed result for the route to relay as JSON
 */

import { createAdminClient } from '@/lib/supabase/server';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { ensureDailyTransitMemory } from '@/lib/astrology/memory-pipeline';
import { updateMemorySyncRun } from '@/lib/astrology/memory-store';
import { enumerateDateRange, validateBackfillParams } from '@/lib/astrology/pure-fns';
import { logError } from '@/lib/logger';

export interface TransitMemorySyncParams {
  /** The date to compute transits for. Defaults to today (server-local). */
  targetDate?: Date;
  /**
   * When provided, only these user IDs are processed (repair/batch mode).
   * When omitted, all users with natal charts are processed up to `limit`.
   */
  userIds?: string[];
  /**
   * Maximum number of charts to process when processing all users.
   * Ignored when `userIds` is provided.
   */
  limit?: number;
  /** Describes the trigger source for snapshot audit trail. */
  source?: string;
  /**
   * ID of an existing memory_sync_runs record to update with final stats.
   * When null/undefined, stats are logged but no DB audit record is updated.
   */
  runId?: string | null;
}

export interface TransitMemorySyncResult {
  ok: boolean;
  runId: string | null;
  processedUsers: number;
  snapshotsUpserted: number;
  /** Number of users whose snapshot+arc writes were skipped because the transit-set hash matched. */
  snapshotsSkipped: number;
  arcsCreatedOrUpdated: number;
  arcsClosed: number;
  errorsCount: number;
  errors: Array<{ userId: string; error: string }>;
  durationMs: number;
}

export async function runTransitMemorySync(
  params: TransitMemorySyncParams = {},
): Promise<TransitMemorySyncResult> {
  const startedAt = Date.now();
  const {
    targetDate = new Date(),
    userIds,
    limit = 500,
    source = 'cron',
    runId = null,
  } = params;

  const admin = createAdminClient();

  // ── Resolve chart list ────────────────────────────────────────────────────
  let query = admin
    .from('natal_charts')
    .select('user_id, placements_json, angles_json, houses_json, aspects_json, metadata_json');

  if (userIds && userIds.length > 0) {
    query = query.in('user_id', userIds);
  } else {
    // Limit applies only to full-sweep mode to keep job duration bounded.
    query = query.limit(limit);
  }

  const { data: charts, error: chartError } = await query;
  if (chartError) {
    throw new Error(`runTransitMemorySync: failed to load natal charts — ${chartError.message}`);
  }

  const chartList = charts ?? [];

  // ── Process each user ─────────────────────────────────────────────────────
  let processed = 0;
  let snapshotsUpserted = 0;
  let snapshotsSkipped = 0;
  let arcsCreatedOrUpdated = 0;
  let arcsClosed = 0;
  let errorsCount = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  // Per-user timing and arc-count distributions (for p50/p95 observability)
  const perUserDurationsMs: number[] = [];
  const perUserArcCounts: number[] = [];

  for (const chart of chartList) {
    try {
      const richChart: RichChart = {
        placements: chart.placements_json,
        angles:     chart.angles_json,
        houses:     chart.houses_json ?? [],
        aspects:    chart.aspects_json,
        metadata:   chart.metadata_json,
      };

      const userStart = Date.now();
      const result = await ensureDailyTransitMemory({
        userId: chart.user_id,
        richChart,
        date: targetDate,
        source,
      });
      perUserDurationsMs.push(Date.now() - userStart);
      perUserArcCounts.push(result.arcsCreatedOrUpdated);

      processed          += 1;
      snapshotsUpserted  += result.snapshotCreated ? 1 : 0;
      snapshotsSkipped   += result.snapshotSkipped ? 1 : 0;
      arcsCreatedOrUpdated += result.arcsCreatedOrUpdated;
      arcsClosed         += result.staleArcCount;
    } catch (err) {
      errorsCount += 1;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ userId: chart.user_id, error: msg });
      logError(err, { action: 'runTransitMemorySync.processUser', userId: chart.user_id });
    }
  }

  const durationMs = Date.now() - startedAt;
  const finalStatus =
    processed === 0 && errorsCount > 0 ? 'failed'
    : errorsCount > 0                  ? 'completed_with_errors'
    :                                    'completed';

  // ── Per-user timing / arc-count distributions ──────────────────────────
  function pct(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[idx];
  }

  const timingStats = perUserDurationsMs.length > 0
    ? {
        min_ms: Math.min(...perUserDurationsMs),
        max_ms: Math.max(...perUserDurationsMs),
        p50_ms: pct(perUserDurationsMs, 50),
        p95_ms: pct(perUserDurationsMs, 95),
        count:  perUserDurationsMs.length,
      }
    : null;

  const arcStats = perUserArcCounts.length > 0
    ? {
        min_arcs: Math.min(...perUserArcCounts),
        max_arcs: Math.max(...perUserArcCounts),
        avg_arcs: Math.round(perUserArcCounts.reduce((a, b) => a + b, 0) / perUserArcCounts.length),
        total_arcs_touched: arcsCreatedOrUpdated,
      }
    : null;

  // ── Update audit record ────────────────────────────────────────────
  if (runId) {
    const updateResult = await updateMemorySyncRun(runId, {
      completed_at:         new Date().toISOString(),
      status:               finalStatus,
      charts_total:         chartList.length,
      charts_processed:     processed,
      snapshots_created:    snapshotsUpserted,
      arcs_created_or_updated: arcsCreatedOrUpdated,
      errors_count:         errorsCount,
      metrics_json: {
        source,
        duration_ms:        durationMs,
        avg_ms_per_chart:   chartList.length > 0
          ? Math.round(durationMs / chartList.length)
          : 0,
        per_user_timing:    timingStats,
        per_user_arcs:      arcStats,
        // Cap error list to avoid bloating the record on bulk failures
        errors:             errors.slice(0, 20),
      },
    });

    if (updateResult.error) {
      logError(updateResult.error, { action: 'runTransitMemorySync.updateRun', runId });
    }
  }

  return {
    ok:                  finalStatus !== 'failed',
    runId,
    processedUsers:      processed,
    snapshotsUpserted,
    snapshotsSkipped,
    arcsCreatedOrUpdated,
    arcsClosed,
    errorsCount,
    errors,
    durationMs,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Bounded historical backfill — single user, explicit date range
// ────────────────────────────────────────────────────────────────────────────

export interface BackfillForUserParams {
  /** The single user to backfill. Exactly one required. */
  userId: string;
  /** Inclusive start date, YYYY-MM-DD. */
  startDate: string;
  /** Inclusive end date, YYYY-MM-DD. Must be ≥ startDate. Max span: BACKFILL_MAX_DAYS. */
  endDate: string;
  /** Audit label written to each snapshot’s source column. Default: 'backfill'. */
  source?: string;
}

export interface BackfillForUserResult {
  ok: boolean;
  userId: string;
  /** Total number of dates in the requested range. */
  datesAttempted: number;
  /** Snapshots newly written (not previously in DB). */
  snapshotsWritten: number;
  /**
   * Snapshots skipped because the transit-set hash already matched the stored
   * snapshot. Genuine idempotency proof: no DB mutations occurred for these dates.
   */
  snapshotsSkipped: number;
  arcsCreatedOrUpdated: number;
  arcsClosed: number;
  errorsCount: number;
  errors: Array<{ date: string; error: string }>;
  durationMs: number;
}

/**
 * Replay missing daily transit snapshots for a single user across a bounded
 * date range, sequentially and safely.
 *
 * Safety guarantees:
 * - One user at a time (caller must supply exactly one userId).
 * - Sequential date iteration — no parallel fanout.
 * - Fully idempotent: dates already computed at the same hash are skipped
 *   immediately in `ensureDailyTransitMemory`; no double writes.
 * - Hard-bounded by BACKFILL_MAX_DAYS (validated via `validateBackfillParams`).
 * - No cursor/resume in this slice: the hash short-circuit is the sole
 *   idempotency guarantee. Safe to re-call with the same range.
 *
 * Source label written to each snapshot: 'backfill' (override via `source`).
 */
export async function runBackfillForUser(
  params: BackfillForUserParams,
): Promise<BackfillForUserResult> {
  const startedAt = Date.now();
  const { userId, startDate, endDate, source = 'backfill' } = params;

  // ── Validate inputs ────────────────────────────────────────────────
  const validation = validateBackfillParams(userId, startDate, endDate);
  if (!validation.valid) {
    throw new Error(`runBackfillForUser: ${validation.error}`);
  }

  const admin = createAdminClient();

  // ── Resolve natal chart ─────────────────────────────────────────────
  const { data: chartData, error: chartError } = await admin
    .from('natal_charts')
    .select('user_id, placements_json, angles_json, houses_json, aspects_json, metadata_json')
    .eq('user_id', userId)
    .single();

  if (chartError || !chartData) {
    const detail = chartError ? ` — ${chartError.message}` : '';
    throw new Error(`runBackfillForUser: natal chart not found for user ${userId}${detail}`);
  }

  const richChart: RichChart = {
    placements: chartData.placements_json,
    angles:     chartData.angles_json,
    houses:     chartData.houses_json ?? [],
    aspects:    chartData.aspects_json,
    metadata:   chartData.metadata_json,
  };

  // ── Process dates sequentially ─────────────────────────────────────────
  // Intentionally sequential: no parallel fanout — avoids write storms and
  // makes errors attributable to specific dates.
  const dates = enumerateDateRange(startDate, endDate);

  let snapshotsWritten    = 0;
  let snapshotsSkipped    = 0;
  let arcsCreatedOrUpdated = 0;
  let arcsClosed           = 0;
  let errorsCount          = 0;
  const errors: Array<{ date: string; error: string }> = [];

  for (const dateStr of dates) {
    try {
      // Use UTC noon to keep the transit computation deterministic and avoid
      // date-boundary drift across server time zones.
      const targetDate = new Date(`${dateStr}T12:00:00Z`);

      const result = await ensureDailyTransitMemory({
        userId,
        richChart,
        date: targetDate,
        source,
      });

      snapshotsWritten     += result.snapshotCreated  ? 1 : 0;
      snapshotsSkipped     += result.snapshotSkipped  ? 1 : 0;
      arcsCreatedOrUpdated += result.arcsCreatedOrUpdated;
      arcsClosed           += result.staleArcCount;
    } catch (err) {
      errorsCount += 1;
      const msg = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ date: dateStr, error: msg });
      logError(err, { action: 'runBackfillForUser.processDate', userId, date: dateStr });
      // Continue to the next date — a single-day failure should not abort the
      // whole backfill. Caller can re-run with the same range to retry.
    }
  }

  const durationMs = Date.now() - startedAt;

  return {
    ok:                  errorsCount < dates.length, // at least some dates succeeded
    userId,
    datesAttempted:      dates.length,
    snapshotsWritten,
    snapshotsSkipped,
    arcsCreatedOrUpdated,
    arcsClosed,
    errorsCount,
    errors,
    durationMs,
  };
}
