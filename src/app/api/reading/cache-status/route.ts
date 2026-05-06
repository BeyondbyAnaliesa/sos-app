export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { buildReadingContext } from '@/lib/transit-reading-context';
import { getDailyAiReadingCacheStatus } from '@/lib/daily-ai-reading';
import { getMajorTransitAiReadingsCacheStatus } from '@/lib/major-transit-ai-reading';
import { logError } from '@/lib/logger';
import { warnIfCronSecretMissing } from '@/lib/env-check';

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

async function resolveUserIds(admin: ReturnType<typeof createAdminClient>, requestedUserId?: string | null, limit = 5) {
  if (requestedUserId) return [requestedUserId];

  const { data, error } = await admin
    .from('natal_charts')
    .select('user_id')
    .limit(Math.max(1, Math.min(limit, 25)));

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.user_id as string).filter(Boolean))];
}

export async function GET(request: Request) {
  warnIfCronSecretMissing('/api/reading/cache-status');

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const limit = Number(searchParams.get('limit') ?? '5');
    const admin = createAdminClient();
    const userIds = await resolveUserIds(admin, requestedUserId, limit);
    const users = [] as Array<Record<string, unknown>>;
    let dailyHits = 0;
    let dailyMisses = 0;
    let majorHits = 0;
    let majorMisses = 0;

    for (const userId of userIds) {
      try {
        const context = await buildReadingContext(admin, userId);
        const selectedMajorArcs = [
          ...context.activeMajorArcs.slice(0, 8),
          ...context.upcomingMajorArcs.slice(0, 4),
        ];

        const daily = await getDailyAiReadingCacheStatus({
          userId,
          date: context.date,
          chart: context.chart,
          todayTransits: context.todayTransits,
          majorArcs: selectedMajorArcs,
          guidance: context.guidance,
          memory: context.memory,
          judgment: context.judgment,
        });

        const major = await getMajorTransitAiReadingsCacheStatus({
          userId,
          arcs: selectedMajorArcs,
          memory: context.memory,
          chart: context.chart,
        });

        if (daily.exactMatch) dailyHits += 1;
        else dailyMisses += 1;

        for (const entry of major) {
          if (entry.exactMatch) majorHits += 1;
          else majorMisses += 1;
        }

        const lifeSignals = context.memory.lifeSignals ?? [];
        const latestSignalAt = lifeSignals
          .map((signal) => signal.signal_timestamp)
          .filter((value): value is string => Boolean(value))
          .sort()
          .at(-1) ?? null;

        users.push({
          userId,
          ok: true,
          date: context.date,
          memory: {
            reportSaved: Boolean(context.memory.report),
            natalReadingSaved: Boolean(context.memory.natalReading),
            lifeSignalCount: lifeSignals.length,
            latestSignalAt,
          },
          daily: {
            rowExists: Boolean(daily.latest),
            status: daily.exactMatch ? 'hit' : 'miss',
            expectedHash: daily.expectedHash,
            priorReadingCount: daily.priorReadingCount,
            latest: daily.latest,
          },
          major: {
            selectedArcCount: major.length,
            hitCount: major.filter((entry) => entry.exactMatch).length,
            missCount: major.filter((entry) => !entry.exactMatch).length,
            latestGeneratedAt: major
              .map((entry) => entry.latest?.generatedAt)
              .filter((value): value is string => Boolean(value))
              .sort()
              .at(-1) ?? null,
            entries: major,
          },
        });
      } catch (error) {
        users.push({
          userId,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      queriedAt: new Date().toISOString(),
      summary: {
        processedUsers: users.length,
        dailyHits,
        dailyMisses,
        majorHits,
        majorMisses,
      },
      users,
    });
  } catch (error) {
    logError(error, { route: '/api/reading/cache-status' });
    return NextResponse.json({
      error: 'Something went wrong',
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
