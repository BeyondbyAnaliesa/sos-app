import { describe, expect, it } from 'vitest';
import { buildAstrologyJudgment } from '@/lib/astrology/judgment';
import { buildAstrologyJudgmentPromptSnapshot } from '@/lib/astrology/judgment-prompt-snapshot';
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

const memory: MajorWaveMemoryInput = {
  report: { themes: ['relationships'], chartReading: 'Direct.', lookAhead: 'Watch structure.' },
  natalReading: 'Natal Venus matters here.',
  lifeSignals: [],
};

describe('buildAstrologyJudgmentPromptSnapshot', () => {
  it('preserves compact rarity classification metadata without dumping full historical receipts', () => {
    const judgment = buildAstrologyJudgment({
      date: '2026-02-20',
      chart,
      todayTransits: { date: '2026-02-20', transits: [] },
      majorArcs: [],
      guidance: [],
      memory,
    });

    const snapshot = buildAstrologyJudgmentPromptSnapshot(judgment);
    const aspect = snapshot.currentSky.events.find((event) => event.id === 'aspect:Saturn:conjunction:Neptune');

    expect(aspect?.rarity).toMatchObject({
      status: 'computed',
      assessment: 'computed_recurrence',
      method: 'bidirectional_scan',
    });
    expect(Object.keys(aspect?.rarity ?? {})).not.toContain('comparisonCriteria');
    expect(snapshot.currentSky.events.length).toBeLessThanOrEqual(4);
  });

  it('carries compact macro sky and personal landing facts without exposing full internal receipts', () => {
    const judgment = buildAstrologyJudgment({
      date: '2025-05-25',
      chart,
      todayTransits: { date: '2025-05-25', transits: [] },
      majorArcs: [
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
      ],
      guidance: [],
      memory: {
        ...memory,
        lifeSignals: [
          {
            content_text: 'Fixture only: recurring pressure around home and partnership priorities.',
            themes_json: ['family conflict', 'partnership'],
            emotions_json: ['frustration'],
            life_domain: 'home',
            signal_timestamp: '2026-05-04T12:00:00Z',
          },
        ],
      },
    });

    const snapshot = buildAstrologyJudgmentPromptSnapshot(judgment);

    expect(snapshot.macrocosm.configurations[0]).toMatchObject({
      id: 'macro:outer-ingress:saturn-neptune-aries',
      landscapeStatus: expect.any(String),
      recurrence: {
        status: expect.any(String),
        assessment: expect.any(String),
      },
    });
    expect(snapshot.leadSignals[0]?.macroBridge).toMatchObject({
      configurationId: 'macro:outer-ingress:saturn-neptune-aries',
      manifestationClass: expect.any(String),
      decisionPressure: expect.any(String),
      memoryLinks: {
        matchedSignalCount: expect.any(Number),
      },
    });
    expect(JSON.stringify(snapshot)).not.toContain('consensusSummary');
    expect(JSON.stringify(snapshot)).not.toContain('saturatedClaims');
  });
});
