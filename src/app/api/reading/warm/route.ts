export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { buildReadingContext } from '@/lib/transit-reading-context';
import { getOrCreateDailyAiReading } from '@/lib/daily-ai-reading';
import { getOrCreateMajorTransitAiReadings } from '@/lib/major-transit-ai-reading';
import { logError } from '@/lib/logger';

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

type WarmRequestBody = {
  userId?: string;
  limit?: number;
  daily?: boolean;
  major?: boolean;
};

async function resolveUserIds(admin: ReturnType<typeof createAdminClient>, requestedUserId?: string, limit = 10) {
  if (requestedUserId) return [requestedUserId];

  const { data, error } = await admin
    .from('natal_charts')
    .select('user_id')
    .limit(Math.max(1, Math.min(limit, 25)));

  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.user_id as string).filter(Boolean))];
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({})) as WarmRequestBody;
    const admin = createAdminClient();
    const userIds = await resolveUserIds(admin, body.userId, body.limit ?? 10);
    const runDaily = body.daily !== false;
    const runMajor = body.major !== false;
    const results: Array<Record<string, unknown>> = [];

    for (const userId of userIds) {
      try {
        const context = await buildReadingContext(admin, userId);
        const activeMajorArcs = context.activeMajorArcs.slice(0, 8);
        const upcomingMajorArcs = context.upcomingMajorArcs.slice(0, 4);
        const selectedMajorArcs = [...activeMajorArcs, ...upcomingMajorArcs];

        let dailyGenerated = false;
        let majorCount = 0;

        if (runDaily) {
          const daily = await getOrCreateDailyAiReading({
            userId,
            date: context.date,
            chart: context.chart,
            todayTransits: context.todayTransits,
            lookAheadTransits: context.lookAheadTransits,
            majorArcs: selectedMajorArcs,
            guidance: context.guidance,
            memory: context.memory,
            judgment: context.judgment,
          });
          dailyGenerated = Boolean(daily);
        }

        if (runMajor) {
          const readings = await getOrCreateMajorTransitAiReadings({
            userId,
            arcs: selectedMajorArcs,
            chart: context.chart,
            memory: context.memory,
            onPartial: 'throw',
            maxGenerate: 1,
          });
          majorCount = Object.keys(readings).length;
        }

        results.push({ userId, ok: true, date: context.date, dailyGenerated, majorCount });
      } catch (error) {
        logError(error, { route: '/api/reading/warm', userId });
        results.push({ userId, ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json({ ok: true, processed: results.length, results });
  } catch (error) {
    logError(error, { route: '/api/reading/warm' });
    return NextResponse.json({
      error: 'Something went wrong',
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
