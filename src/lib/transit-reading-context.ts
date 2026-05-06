import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateTransitsForDate, calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import { calculateMajorTransitArcs } from '@/lib/astrology/major-transits';
import { buildNatalSummary } from '@/lib/astrology/domain-types';
import type { NatalChart } from '@/lib/astrology/types';
import { interpretTransits } from '@/lib/interpret';
import { listSecureLifeSignals } from '@/lib/astrology/secure-life-signals';
import { buildAstrologyJudgment } from '@/lib/astrology/judgment';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';

export type ReadingContext = {
  chart: NatalChart;
  date: string;
  todayTransits: ReturnType<typeof calculateTransitsForDate>;
  lookAheadTransits: ReturnType<typeof calculateTransitsForRange>;
  guidance: ReturnType<typeof interpretTransits>;
  majorArcs: ReturnType<typeof calculateMajorTransitArcs>['arcs'];
  activeMajorArcs: ReturnType<typeof calculateMajorTransitArcs>['arcs'];
  upcomingMajorArcs: ReturnType<typeof calculateMajorTransitArcs>['arcs'];
  memory: MajorWaveMemoryInput;
  judgment: AstrologyJudgment;
};

type DbClient = Pick<SupabaseClient, 'from' | 'rpc'>;

export async function buildReadingContext(client: DbClient, userId: string, now = new Date()): Promise<ReadingContext> {
  const [chartResult, reportResult, natalReadingResult] = await Promise.all([
    client
      .from('natal_charts')
      .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
      .eq('user_id', userId)
      .single(),
    client
      .from('onboarding_reports')
      .select('report_json')
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('natal_readings')
      .select('reading_json')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (chartResult.error) throw chartResult.error;
  if (!chartResult.data?.placements_json || !chartResult.data?.angles_json) {
    throw new Error('Natal chart not found');
  }

  const chart: NatalChart = {
    placements: chartResult.data.placements_json,
    angles: chartResult.data.angles_json,
    houses: chartResult.data.houses_json ?? [],
    aspects: chartResult.data.aspects_json,
    metadata: chartResult.data.metadata_json,
  };

  const todayTransits = calculateTransitsForDate(now, chart);
  const todayRef = new Date(`${todayTransits.date}T12:00:00Z`);
  const tomorrowRef = new Date(todayRef);
  tomorrowRef.setUTCDate(tomorrowRef.getUTCDate() + 1);
  const lookAheadTransits = calculateTransitsForRange(tomorrowRef, 7, chart);
  const guidance = interpretTransits(todayTransits.transits, buildNatalSummary(chart));
  const { arcs: majorArcs } = calculateMajorTransitArcs(chart, {
    centerDate: now,
    pastDays: 150,
    futureDays: 240,
  });
  const activeMajorArcs = majorArcs.filter((arc) => arc.activeToday);
  const upcomingMajorArcs = majorArcs.filter((arc) => !arc.activeToday);
  const lifeSignals = await listSecureLifeSignals(client, { userId, limit: 12 }).catch(() => []);
  const memory = {
    report: (reportResult.data?.report_json ?? null) as MajorWaveMemoryInput['report'],
    natalReading: natalReadingResult.data?.reading_json ?? null,
    lifeSignals,
  } satisfies MajorWaveMemoryInput;
  const judgment = buildAstrologyJudgment({
    date: todayTransits.date,
    chart,
    todayTransits,
    majorArcs,
    guidance,
    memory,
  });

  return {
    chart,
    date: todayTransits.date,
    todayTransits,
    lookAheadTransits,
    guidance,
    majorArcs,
    activeMajorArcs,
    upcomingMajorArcs,
    memory,
    judgment,
  };
}
