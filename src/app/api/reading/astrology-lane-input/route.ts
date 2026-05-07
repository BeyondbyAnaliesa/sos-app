export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { buildAstrologyChannelBriefFixture, DEFAULT_CHANNEL_BRIEF_FIXTURE_ID } from '@/lib/astrology/channel-brief-fixture';
import { buildAstrologyChannelBriefPreview } from '@/lib/astrology/channel-brief-preview';
import {
  buildAstrologyLaneInputBundleFromPreview,
  buildAstrologyLaneInputExport,
  isAstrologyLaneKey,
} from '@/lib/astrology/lane-input-adapter';
import { warnIfCronSecretMissing } from '@/lib/env-check';
import { logError } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/server';
import { buildReadingContext } from '@/lib/transit-reading-context';

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

function parseDate(value: string | null) {
  if (!value) return new Date();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: Request) {
  warnIfCronSecretMissing('/api/reading/astrology-lane-input');

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fixtureId = searchParams.get('fixture');
    const userId = searchParams.get('userId');
    const dateParam = searchParams.get('date');
    const requestedLane = searchParams.get('lane');
    const date = parseDate(dateParam);

    if (!date) {
      return NextResponse.json({ error: 'Use date=YYYY-MM-DD.' }, { status: 400 });
    }

    if (requestedLane && !isAstrologyLaneKey(requestedLane)) {
      return NextResponse.json({ error: 'Use lane=socials, lane=substack, or lane=aeonLore.' }, { status: 400 });
    }

    const lane = isAstrologyLaneKey(requestedLane) ? requestedLane : null;

    if (fixtureId && fixtureId !== DEFAULT_CHANNEL_BRIEF_FIXTURE_ID) {
      return NextResponse.json({ error: `Unknown fixture. Use fixture=${DEFAULT_CHANNEL_BRIEF_FIXTURE_ID}.` }, { status: 400 });
    }

    if (!fixtureId && !userId) {
      return NextResponse.json({ error: `Provide userId or fixture=${DEFAULT_CHANNEL_BRIEF_FIXTURE_ID}.` }, { status: 400 });
    }

    if (fixtureId) {
      const fixture = buildAstrologyChannelBriefFixture(date.toISOString().slice(0, 10));
      const preview = buildAstrologyChannelBriefPreview({
        mode: 'fixture',
        date: fixture.date,
        fixtureId: fixture.fixtureId,
        channelBrief: fixture.channelBrief,
      });
      const bundle = buildAstrologyLaneInputBundleFromPreview(preview);

      return NextResponse.json({
        ok: true,
        export: buildAstrologyLaneInputExport(bundle, lane),
      });
    }

    const admin = createAdminClient();
    const context = await buildReadingContext(admin, userId as string, date);
    const preview = buildAstrologyChannelBriefPreview({
      mode: 'live_user',
      date: context.date,
      userId: userId as string,
      channelBrief: context.channelBrief,
    });
    const bundle = buildAstrologyLaneInputBundleFromPreview(preview);

    return NextResponse.json({
      ok: true,
      export: buildAstrologyLaneInputExport(bundle, lane),
    });
  } catch (error) {
    logError(error, { route: '/api/reading/astrology-lane-input' });
    return NextResponse.json({
      error: 'Something went wrong',
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
