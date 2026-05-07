import { describe, expect, it } from 'vitest';
import { buildAstrologyChannelBrief } from '@/lib/astrology/channel-brief';
import { buildAstrologyJudgment } from '@/lib/astrology/judgment';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';

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
      content_text: 'I keep circling the same family and relationship conflict at home.',
      themes_json: ['family conflict', 'partnership'],
      emotions_json: ['frustration'],
      life_domain: 'home',
      signal_timestamp: '2026-05-04T12:00:00Z',
    },
  ],
};

describe('buildAstrologyChannelBrief', () => {
  it('includes receipts, timing, limitations, and preserves the collective bridge', () => {
    const judgment = buildAstrologyJudgment({
      date: '2026-05-06',
      chart,
      todayTransits: { date: '2026-05-06', transits: [{ transitPlanet: 'Moon', aspect: 'trine', natalPlanet: 'sun', orb: 1.2 }] },
      majorArcs,
      guidance: [],
      memory,
    });

    const brief = buildAstrologyChannelBrief(judgment);

    expect(brief.status).toBe('astrology-channel-brief-v1');
    expect(brief.receipts[0]).toMatchObject({
      signalId: 'saturn-opposition-venus',
      transitPlanet: 'Saturn',
      aspect: 'opposition',
      targetLabel: 'Venus',
      exactDate: '2026-05-14',
      bridge: {
        eventId: expect.any(String),
        matchReasons: expect.arrayContaining([expect.any(String)]),
      },
      rarityHistoricalGapYears: null,
    });
    expect(brief.timing.windowLabel).toContain('2026-05-14');
    expect(brief.limitations).toContain('Historical rarity claims remain unavailable unless the engine computes them explicitly.');
    expect(brief.personalRelevance.bridge).toMatchObject({
      eventId: expect.any(String),
      matchReasons: expect.arrayContaining([expect.any(String)]),
    });
  });

  it('does not insert poetic filler or fake rarity claims into channel guidance', () => {
    const judgment = buildAstrologyJudgment({
      date: '2026-05-06',
      chart,
      todayTransits: { date: '2026-05-06', transits: [{ transitPlanet: 'Moon', aspect: 'trine', natalPlanet: 'sun', orb: 1.2 }] },
      majorArcs,
      guidance: [],
      memory,
    });

    const brief = buildAstrologyChannelBrief(judgment);
    const serialized = JSON.stringify(brief).toLowerCase();

    expect(serialized).not.toContain('trust the pause');
    expect(serialized).not.toContain('big shifts');
    expect(serialized).not.toContain('the stars are aligning');
    expect(brief.limitations).toContain('Historical rarity claims remain unavailable unless the engine computes them explicitly.');
    expect(brief.receipts.every((receipt) => receipt.rarityHistoricalGapYears === null)).toBe(true);
  });
});
