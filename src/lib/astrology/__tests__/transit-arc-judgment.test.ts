import { describe, expect, it } from 'vitest';
import { buildTransitArcJudgment } from '@/lib/astrology/transit-arc-judgment';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';

const chart: NatalChart = {
  placements: [
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

const arc: MajorTransitArc = {
  key: 'saturn-opposition-venus',
  transit: { transitPlanet: 'Saturn', aspect: 'opposition', natalPlanet: 'venus', orb: 0.3 },
  startDate: '2026-05-01',
  endDate: '2026-08-01',
  peakDate: '2026-05-14',
  peakOrb: 0.1,
  todayOrb: 0.3,
  phase: 'building',
  activeToday: true,
  daysUntilPeak: 8,
  totalDays: 92,
  visibleDates: ['2026-05-06'],
  exactHits: [
    { date: '2026-05-14', orb: 0.1, kind: 'exact' },
    { date: '2026-07-09', orb: 0.2, kind: 'closest' },
  ],
  stations: [{ date: '2026-06-20', kind: 'retrograde', degree: 18, sign: 'Aries' }],
  activeRunCount: 2,
  context: {
    targetLabel: 'Venus',
    targetSign: 'Libra',
    targetHouse: 4,
    targetDegree: 18,
    lifeArea: 'home, family, roots, privacy, and emotional ground',
  },
};

const memory: MajorWaveMemoryInput = {
  lifeSignals: [
    {
      content_text: 'Family pressure and relationship tension keep repeating at home.',
      themes_json: ['family', 'relationship'],
      emotions_json: ['pressure'],
      life_domain: 'home',
      signal_timestamp: '2026-05-04T12:00:00Z',
    },
  ],
};

describe('buildTransitArcJudgment', () => {
  it('builds a deterministic lifecycle spine for long arcs', () => {
    const facts = buildTransitArcJudgment({ arc, chart, memory, date: '2026-05-06' });

    expect(facts).toMatchObject({
      durationDays: 92,
      daysActive: 6,
      daysRemaining: 87,
      percentComplete: 6.5,
      durationClass: 'long',
      totalPasses: 2,
      currentPass: 1,
      exactHitCount: 2,
      currentOrb: 0.3,
      phaseLabel: 'building_pass_1',
      phaseDemand: 'prepare',
      watchNextDate: '2026-05-14',
      watchNextType: 'exact_hit',
      memoryLinkage: {
        matchedSignalCount: 1,
        mostRecentSignalDate: '2026-05-04',
        confidence: 'low',
      },
      natalSummary: {
        targetLabel: 'Venus',
        targetHouse: 4,
        angularity: 'angular',
      },
    });
    expect(facts.passSequence).toEqual([
      expect.objectContaining({ passNumber: 1, direction: 'direct', status: 'current' }),
      expect.objectContaining({ passNumber: 2, direction: 'retrograde', status: 'upcoming' }),
    ]);
    expect(facts.stationMarkers[0]).toMatchObject({ kind: 'retrograde', status: 'upcoming', daysFromNow: 45 });
    expect(facts.limitations).toContain('This slice does not claim historical rarity or station precision beyond the stored arc data.');
  });
});
