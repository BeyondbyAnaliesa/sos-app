export const runtime = 'nodejs';

/**
 * /api/astrology/memory-sync
 *
 * Cron-triggered and manually callable route that runs the daily transit
 * memory sync for all users (or a targeted batch).
 *
 * Vercel Cron calls this route with GET. Manual/operator calls may use POST.
 *
 * Authentication:
 *   Bearer ${CRON_SECRET}  — primary secret for manual and external scheduler calls
 *   Vercel Cron headers     — accepted when CRON_SECRET is not set (Vercel-native)
 *
 * Accepted body (all optional):
 *   targetDate  string      ISO date string (defaults to today)
 *   scope       string      "full" | "batch" | "single_user" (default: "full")
 *   userIds     string[]    specific user IDs (batch/single mode)
 *   limit       number      max users to process in full mode (default: 500)
 *   source      string      audit label (default: "cron")
 *
 * Idempotency:
 *   - For scope="full": skips if a run already completed or is running for today.
 *   - For scope="batch"/"single_user": always processes (repair/rerun use case).
 *   - Per-user snapshot uniqueness is enforced at the DB level regardless of scope.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { createMemorySyncRun, getMemorySyncRunByDate, updateMemorySyncRun } from '@/lib/astrology/memory-store';
import { runTransitMemorySync, runBackfillForUser } from '@/lib/astrology/run-transit-memory-sync';
import { validateBackfillParams } from '@/lib/astrology/pure-fns';
import { getMemorySyncAuthType } from '@/lib/astrology/memory-sync-auth';
import { logError } from '@/lib/logger';
import { warnIfCronSecretMissing } from '@/lib/env-check';

async function handleMemorySync(request: Request) {
  const startedAt = Date.now();
  warnIfCronSecretMissing('/api/astrology/memory-sync');

  try {
    const authType = getMemorySyncAuthType(request, process.env.CRON_SECRET);
    if (!authType) {
      return new Response('Unauthorized', { status: 401 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let body: {
      targetDate?: string;
      scope?: string;
      userIds?: string[];
      /** Single user ID — accepted alongside userIds for backfill scope. */
      userId?: string;
      limit?: number;
      source?: string;
      /** Inclusive start date for scope=backfill (YYYY-MM-DD). */
      startDate?: string;
      /** Inclusive end date for scope=backfill (YYYY-MM-DD). */
      endDate?: string;
    } = {};

    try {
      const text = await request.text();
      if (text.trim()) body = JSON.parse(text);
    } catch {
      // Empty body or non-JSON is fine — all params have defaults
    }

    const scope      = body.scope ?? 'full';
    const userIds    = Array.isArray(body.userIds) && body.userIds.length > 0 ? body.userIds : undefined;
    const limit      = typeof body.limit === 'number' && body.limit > 0 ? body.limit : 500;
    const source     = typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'cron';
    const targetDate = body.targetDate ? new Date(body.targetDate) : new Date();
    const startDate  = typeof body.startDate === 'string' ? body.startDate.trim() : undefined;
    const endDate    = typeof body.endDate === 'string' ? body.endDate.trim() : undefined;

    if (isNaN(targetDate.getTime())) {
      return new Response('Invalid targetDate', { status: 400 });
    }

    // ── Backfill scope ─────────────────────────────────────────────────────────
    // Operator-only repair path: replays missing daily snapshots for exactly
    // one user across a bounded date range. Bypasses the full-sweep idempotency
    // gate (that gate is per-day and would block legitimate historical fills).
    // Idempotency is still guaranteed per-snapshot via the transit-set hash
    // short-circuit in ensureDailyTransitMemory.
    if (scope === 'backfill') {
      // Accept either body.userId (single string) or body.userIds[0] (array-of-one)
      const backfillUserId =
        typeof body.userId === 'string' && body.userId.trim()
          ? body.userId.trim()
          : Array.isArray(body.userIds) && body.userIds.length === 1
          ? body.userIds[0]
          : undefined;

      const validation = validateBackfillParams(backfillUserId, startDate, endDate);
      if (!validation.valid) {
        return new Response(
          `scope=backfill validation error: ${validation.error}`,
          { status: 400 },
        );
      }

      const backfillResult = await runBackfillForUser({
        userId:    backfillUserId as string,
        startDate: startDate as string,
        endDate:   endDate as string,
        source:    source !== 'cron' ? source : 'backfill',
      });

      return Response.json({
        ok:                   backfillResult.ok,
        scope:                'backfill',
        userId:               backfillResult.userId,
        datesAttempted:       backfillResult.datesAttempted,
        snapshotsWritten:     backfillResult.snapshotsWritten,
        snapshotsSkipped:     backfillResult.snapshotsSkipped,
        arcsCreatedOrUpdated: backfillResult.arcsCreatedOrUpdated,
        arcsClosed:           backfillResult.arcsClosed,
        errorsCount:          backfillResult.errorsCount,
        errors:               backfillResult.errors,
        durationMs:           Date.now() - startedAt,
      });
    }

    const runDate = targetDate.toISOString().slice(0, 10);

    // ── Idempotency gate (full-sweep only) ───────────────────────────────────
    // Batch/single reruns bypass this check to support repair workflows.
    if (scope === 'full' && !userIds) {
      const priorRun = await getMemorySyncRunByDate(runDate);
      if (priorRun.data && ['running', 'completed', 'completed_with_errors'].includes(priorRun.data.status)) {
        // Record this hit in the existing run's metrics_json so operators can
        // confirm both scheduled Vercel cron entries (10:05 and 22:05 UTC) are
        // actually reaching the route — not just the first run's trigger.
        const existingMetrics = (priorRun.data.metrics_json as Record<string, unknown>) ?? {};
        const prevHits = Array.isArray(existingMetrics.cron_hits)
          ? (existingMetrics.cron_hits as unknown[])
          : [];
        // Non-blocking — failure here should not affect the 200 response
        updateMemorySyncRun(priorRun.data.id, {
          metrics_json: {
            ...existingMetrics,
            cron_hits: [
              ...prevHits,
              { ts: new Date().toISOString(), trigger_type: authType },
            ],
          },
        }).catch(() => { /* non-fatal: skip-hit recording is best-effort */ });

        return Response.json({
          ok:           true,
          skipped:      true,
          reason:       `memory sync already ${priorRun.data.status} for ${runDate}`,
          runId:        priorRun.data.id,
          trigger_type: authType,
        });
      }
    }

    // ── Create audit record ──────────────────────────────────────────────────
    // For targeted reruns on the same day, we don't force a new run record
    // (the unique constraint on run_date would reject it). Proceed without one.
    let runId: string | null = null;

    const admin = createAdminClient();
    const { data: charts, error: countError } = await admin
      .from('natal_charts')
      .select('user_id', { count: 'exact', head: true });

    const chartCount = countError ? 0 : (charts as unknown as { count: number } | null)?.count ?? 0;

    const runRecord = await createMemorySyncRun({
      run_date:              runDate,
      status:                'running',
      charts_total:          chartCount,
      charts_processed:      0,
      snapshots_created:     0,
      arcs_created_or_updated: 0,
      errors_count:          0,
      // trigger_type distinguishes Vercel-native cron from manual Bearer invocations.
      // cron_hits is appended later by the idempotency gate when a second hit arrives.
      metrics_json:          { scope, source, trigger_type: authType, user_ids: userIds ?? null },
      notes:                 null,
    });

    if (runRecord.error) {
      // Unique constraint violation means a run record already exists for today.
      // This is only expected for targeted reruns — log and continue without runId.
      logError(runRecord.error, { action: 'memory-sync.createRun', runDate, scope });
    } else if (runRecord.data?.id) {
      runId = runRecord.data.id;
    }

    // ── Run the sync ─────────────────────────────────────────────────────────
    const result = await runTransitMemorySync({
      targetDate,
      userIds,
      limit,
      source,
      runId,
    });

    return Response.json({
      ok:                  result.ok,
      runId:               result.runId,
      processedUsers:      result.processedUsers,
      snapshotsUpserted:   result.snapshotsUpserted,
      snapshotsSkipped:    result.snapshotsSkipped,
      arcsCreatedOrUpdated: result.arcsCreatedOrUpdated,
      arcsClosed:          result.arcsClosed,
      errorsCount:         result.errorsCount,
      errors:              result.errors,
      durationMs:          Date.now() - startedAt,
    });
  } catch (err) {
    logError(err, { route: '/api/astrology/memory-sync' });
    return new Response('Something went wrong', { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleMemorySync(request);
}

export async function GET(request: Request) {
  return handleMemorySync(request);
}
