export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateTransitsForDate, calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import { calculateMajorTransitArcs } from '@/lib/astrology/major-transits';
import { buildNatalSummary } from '@/lib/astrology/domain-types';
import type { NatalChart } from '@/lib/astrology/types';
import { interpretTransits } from '@/lib/interpret';
import { listSecureLifeSignals } from '@/lib/astrology/secure-life-signals';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import { getOrCreateDailyAiReading } from '@/lib/daily-ai-reading';
import { logError } from '@/lib/logger';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [chartResult, reportResult, natalReadingResult] = await Promise.all([
      supabase
        .from('natal_charts')
        .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('onboarding_reports')
        .select('report_json')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('natal_readings')
        .select('reading_json')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    if (!chartResult.data?.placements_json || !chartResult.data?.angles_json) {
      return NextResponse.json({ error: 'Natal chart not found' }, { status: 400 });
    }

    const chart: NatalChart = {
      placements: chartResult.data.placements_json,
      angles: chartResult.data.angles_json,
      houses: chartResult.data.houses_json ?? [],
      aspects: chartResult.data.aspects_json,
      metadata: chartResult.data.metadata_json,
    };

    const now = new Date();
    const todayTransits = calculateTransitsForDate(now, chart);
    const todayRef = new Date(`${todayTransits.date}T12:00:00Z`);
    const tomorrowRef = new Date(todayRef);
    tomorrowRef.setUTCDate(tomorrowRef.getUTCDate() + 1);
    const lookAheadTransits = calculateTransitsForRange(tomorrowRef, 7, chart);
    const guidance = interpretTransits(todayTransits.transits, buildNatalSummary(chart));
    const { arcs } = calculateMajorTransitArcs(chart, { centerDate: now, pastDays: 150, futureDays: 240 });
    const selectedArcs = [
      ...arcs.filter((arc) => arc.activeToday).slice(0, 8),
      ...arcs.filter((arc) => !arc.activeToday).slice(0, 4),
    ];

    const lifeSignals = await listSecureLifeSignals(supabase, { userId: user.id, limit: 12 }).catch(() => []);
    const memory: MajorWaveMemoryInput = {
      report: (reportResult.data?.report_json ?? null) as MajorWaveMemoryInput['report'],
      natalReading: natalReadingResult.data?.reading_json ?? null,
      lifeSignals,
    };

    const reading = await getOrCreateDailyAiReading({
      userId: user.id,
      date: todayTransits.date,
      chart,
      todayTransits,
      lookAheadTransits,
      majorArcs: selectedArcs,
      guidance,
      memory,
    });

    return NextResponse.json({ reading });
  } catch (error) {
    logError(error, { route: '/api/reading/daily' });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
