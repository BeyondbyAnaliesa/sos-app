import { buildAstrologyChannelBrief } from '@/lib/astrology/channel-brief';
import { buildAstrologyJudgment } from '@/lib/astrology/judgment';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';

export const DEFAULT_CHANNEL_BRIEF_FIXTURE_ID = 'internal-demo';

const chart: NatalChart = {
  placements: [
    { key: 'sun', label: 'Sun', sign: 'Aries', degree: 12, minute: 0, speed: 1, retrograde: false, warning: null, longitude: 12 },
    { key: 'venus', label: 'Venus', sign: 'Libra', degree: 18, minute: 0, speed: 1, retrograde: false, warning: null, longitude: 198 },
  ],
  angles: {
    ascendant: { sign: 'Cancer', degree: 10, minute: 0, longitude: 100 },
    midheaven: { sign: 'Pisces', degree: 5, minute: 0, longitude: 335 },
  },
  houses: [100, 130, 160, 190, 220, 250, 280, 310, 340, 10, 40, 70],
  aspects: [],
  metadata: {
    jdUt: 0,
    timeExact: true,
    coordinates: { latitude: 0, longitude: 0 },
    warnings: { houses: null },
  },
};

const majorArcs: MajorTransitArc[] = [
  {
    key: 'saturn-opposition-venus',
    transit: { transitPlanet: 'Saturn', aspect: 'opposition', natalPlanet: 'venus', orb: 0.3 },
    startDate: '2026-05-01',
    endDate: '2026-08-01',
    peakDate: '2026-05-14',
    peakOrb: 0.1,
    todayOrb: 0.3,
    phase: 'peaking',
    activeToday: true,
    daysUntilPeak: 8,
    totalDays: 92,
    visibleDates: ['2026-05-06'],
    exactHits: [{ date: '2026-05-14', orb: 0.1, kind: 'exact' }],
    stations: [{ date: '2026-06-20', kind: 'retrograde', degree: 18, sign: 'Aries' }],
    activeRunCount: 2,
    context: {
      targetLabel: 'Venus',
      targetSign: 'Libra',
      targetHouse: 4,
      targetDegree: 18,
      lifeArea: 'home, family, roots, privacy, and emotional ground',
    },
  },
];

const memory: MajorWaveMemoryInput = {
  report: { themes: ['relationships', 'home'], chartReading: 'Direct and relational.', lookAhead: 'Watch partnership pressure.' },
  natalReading: 'Natal Venus themes matter here.',
  lifeSignals: [
    {
      content_text: 'Fixture only: recurring pressure around home and partnership priorities.',
      themes_json: ['family conflict', 'partnership'],
      emotions_json: ['frustration'],
      life_domain: 'home',
      signal_timestamp: '2026-05-04T12:00:00Z',
    },
  ],
};

export function buildAstrologyChannelBriefFixture(date = '2026-05-06') {
  const judgment = buildAstrologyJudgment({
    date,
    chart,
    todayTransits: { date, transits: [{ transitPlanet: 'Moon', aspect: 'trine', natalPlanet: 'sun', orb: 1.2 }] },
    majorArcs,
    guidance: [],
    memory,
  });
  const channelBrief = buildAstrologyChannelBrief(judgment);

  if (channelBrief.computedSkyFacts.computed.length === 0) {
    channelBrief.computedSkyFacts.computed.push({
      eventId: 'fixture:station:Saturn',
      kind: 'station_proximity',
      bodies: ['Saturn'],
      aspect: null,
      sign: 'Aries',
      exactnessBand: 'near_exact',
      summary: 'Fixture-only preserved computed station spacing fact for downstream export coverage.',
      recurrence: {
        comparator: 'same_body_station_window_spacing_estimate',
        scanWindowDays: 400,
        priorComparableEventDate: '2025-09-01',
        nextComparableEventDate: '2026-06-20',
        spacingDays: 292,
        spacingYears: 0.8,
      },
      historicalGapYears: 0.8,
      limitations: ['Fixture-only bounded station spacing sample for internal export coverage.'],
      receipts: ['Saturn station sample'],
    });
  }

  return {
    fixtureId: DEFAULT_CHANNEL_BRIEF_FIXTURE_ID,
    date,
    channelBrief,
  };
}
