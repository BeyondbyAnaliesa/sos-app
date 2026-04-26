export const runtime = 'nodejs';

/**
 * /api/astrology/memory-status
 *
 * Operator-facing GET endpoint for inspecting the SOS transit-memory spine health.
 * Returns aggregate stats without user PII: arc counts by state, signal volume,
 * and the last 7 memory sync run records (with per-user timing + arc distributions
 * stored inside their metrics_json from runTransitMemorySync).
 *
 * Authentication:
 *   Bearer ${CRON_SECRET}  — same secret used by /api/astrology/memory-sync
 *
 * Usage:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        https://<your-app>/api/astrology/memory-status | jq
 *
 * What you can learn from the response:
 *   arcs.active          — how many transit arcs are live right now across all users
 *   arcs.dormant         — how many arcs have closed (transit passed)
 *   arcs.total           — cumulative arc history
 *   signals.last30Days   — life signal entries created in the past 30 days
 *   recentRuns           — last 7 sync jobs: status, timing, errors, per_user_timing p50/p95
 *   recentRuns[n].metrics_json.per_user_timing.p95_ms  — slowest-user sync latency
 *   recentRuns[n].metrics_json.per_user_arcs.max_arcs  — highest arc count seen in a single user's sync
 */

import { getMemorySpineStats } from '@/lib/astrology/memory-store';
import { logError } from '@/lib/logger';
import { warnIfCronSecretMissing, checkRequiredEnvVars } from '@/lib/env-check';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cronSecret = process.env.CRON_SECRET;
  return !!(cronSecret && bearer === cronSecret);
}

export async function GET(request: Request) {
  warnIfCronSecretMissing('/api/astrology/memory-status');

  if (!isAuthorized(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const stats = await getMemorySpineStats();
    const envCheck = checkRequiredEnvVars();

    // Summarize the most recent run's key metrics for quick scanning
    const latestRun = stats.recentRuns[0] ?? null;
    const latestRunSummary = latestRun
      ? {
          run_date:           latestRun.run_date,
          status:             latestRun.status,
          charts_processed:   latestRun.charts_processed,
          snapshots_created:  latestRun.snapshots_created,
          arcs_touched:       latestRun.arcs_created_or_updated,
          errors_count:       latestRun.errors_count,
          duration_ms:        (latestRun.metrics_json as Record<string, unknown>)?.duration_ms ?? null,
          per_user_timing:    (latestRun.metrics_json as Record<string, unknown>)?.per_user_timing ?? null,
          per_user_arcs:      (latestRun.metrics_json as Record<string, unknown>)?.per_user_arcs ?? null,
          // trigger_type: 'vercel_cron' proves the Vercel scheduler fired;
          // 'bearer' means the run was manually invoked via Bearer token.
          // cron_hits: subsequent cron hits on the same day are appended here
          // by the idempotency gate so both daily schedules can be confirmed.
          trigger_type:       (latestRun.metrics_json as Record<string, unknown>)?.trigger_type ?? null,
          cron_hits:          (latestRun.metrics_json as Record<string, unknown>)?.cron_hits ?? null,
          completed_at:       latestRun.completed_at,
        }
      : null;

    return Response.json({
      ok: true,
      queriedAt: stats.queriedAt,
      envCheck: {
        allPresent: envCheck.ok,
        missing: envCheck.missing,
        vars: envCheck.status,
      },
      arcs: stats.arcs,
      signals: stats.signals,
      latestRun: latestRunSummary,
      recentRuns: stats.recentRuns.map((run) => ({
        id:                 run.id,
        run_date:           run.run_date,
        status:             run.status,
        charts_processed:   run.charts_processed,
        snapshots_created:  run.snapshots_created,
        arcs_touched:       run.arcs_created_or_updated,
        errors_count:       run.errors_count,
        metrics_json:       run.metrics_json,
        started_at:         run.started_at,
        completed_at:       run.completed_at,
      })),
    });
  } catch (err) {
    logError(err, { route: '/api/astrology/memory-status' });
    return new Response('Something went wrong', { status: 500 });
  }
}
