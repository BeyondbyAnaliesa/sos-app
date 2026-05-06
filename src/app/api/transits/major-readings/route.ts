export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateMajorTransitArcs } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import { listSecureLifeSignals } from '@/lib/astrology/secure-life-signals';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import { getOrCreateMajorTransitAiReadings } from '@/lib/major-transit-ai-reading';
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

    const lifeSignals = await listSecureLifeSignals(supabase, { userId: user.id, limit: 12 }).catch(() => []);
    const memory: MajorWaveMemoryInput = {
      report: (reportResult.data?.report_json ?? null) as MajorWaveMemoryInput['report'],
      natalReading: natalReadingResult.data?.reading_json ?? null,
      lifeSignals,
    };

    const { arcs } = calculateMajorTransitArcs(chart, {
      centerDate: new Date(),
      pastDays: 150,
      futureDays: 240,
    });
    const selected = [
      ...arcs.filter((arc) => arc.activeToday).slice(0, 8),
      ...arcs.filter((arc) => !arc.activeToday).slice(0, 6),
    ];

    const readings = await getOrCreateMajorTransitAiReadings({
      userId: user.id,
      arcs: selected,
      chart,
      memory,
      onPartial: 'throw',
    });

    return NextResponse.json({ count: Object.keys(readings).length, readings });
  } catch (error) {
    logError(error, { route: '/api/transits/major-readings' });
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
