import { describe, expect, it } from 'vitest';
import { buildAstrologyJudgment } from '@/lib/astrology/judgment';
import { CURRENT_SKY_LUNATION_FIXTURES } from '@/lib/astrology/__tests__/fixtures/current-sky-lunation-fixtures';
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

describe('buildAstrologyJudgment', () => {
  it('builds a tiered judgment with receipts, memory linkage, and real current-sky events', () => {
    const judgment = buildAstrologyJudgment({
      date: '2026-05-06',
      chart,
      todayTransits: { date: '2026-05-06', transits: [{ transitPlanet: 'Moon', aspect: 'trine', natalPlanet: 'sun', orb: 1.2 }] },
      majorArcs,
      guidance: [],
      memory,
    });

    expect(judgment.foreground[0]?.id).toBe('saturn-opposition-venus');
    expect(judgment.foreground[0]?.receipts[0]).toMatchObject({
      transitPlanet: 'Saturn',
      aspect: 'opposition',
      natalTarget: 'venus',
      natalHouse: 4,
      exactDate: '2026-05-14',
      passCount: 2,
      natalProjection: {
        targetLabel: 'Venus',
        targetHouse: 4,
        angularity: 'angular',
        targetIsAngle: false,
        targetIsModernChartRuler: false,
        house: {
          house: 4,
          label: 'home, family of origin, roots, private life, foundation',
        },
        dignity: {
          condition: 'domicile',
        },
      },
      meaningFactors: {
        transitBody: {
          label: 'Saturn',
        },
        aspect: {
          label: 'Opposition',
        },
        natalTarget: {
          label: 'Venus',
        },
        house: {
          label: 'House 4',
        },
        defaultDemands: expect.arrayContaining(['restructuring', 'pressure']),
        combinedKeywords: expect.arrayContaining(['structure', 'relationships', 'home']),
      },
      arcLifecycle: {
        durationDays: 92,
        totalPasses: 2,
        currentPass: 1,
        watchNextDate: '2026-05-14',
        watchNextType: 'exact_hit',
        memoryLinkage: {
          matchedSignalCount: 1,
          confidence: 'low',
        },
      },
    });
    expect(judgment.foreground[0]?.receipts[0].memorySummary).toContain('family');
    expect(judgment.currentSky.status).toBe('collective-scan-v1');
    expect(judgment.currentSky.events.length).toBeGreaterThan(0);
    expect(judgment.currentSky.events[0]?.scope).toBe('collective');
    expect(judgment.currentSky.limitations).toContain('Rarity and consequence scores are heuristic and explicitly do not claim historical proof.');
    expect(judgment.foreground[0]?.receipts[0]?.currentSkyRarity?.status).toBe('not_computed');
    expect(judgment.activatedLifeAreas).toContain('home, family of origin, roots, private life, foundation');
    expect(judgment.foreground[0]?.scope).toMatch(/personal|both/);
    expect(judgment.foreground[0]?.collectiveBridge).toMatchObject({
      collectiveEvent: {
        bodies: expect.arrayContaining(['Saturn']),
      },
    });
    expect(judgment.foreground[0]?.receipts[0]?.collectiveBridge?.limitations).toContain('Bridge matching is heuristic and only covers body/body-pair, phase, natal target, and limited life-area context.');

    const dailySignal = judgment.background.find((signal) => signal.source === 'daily_transit')
      ?? judgment.supporting.find((signal) => signal.source === 'daily_transit')
      ?? judgment.foreground.find((signal) => signal.source === 'daily_transit');
    expect(dailySignal?.receipts[0]?.meaningFactors).toMatchObject({
      transitBody: {
        label: 'Moon',
      },
      aspect: {
        label: 'Trine',
      },
      natalTarget: {
        label: 'Sun',
      },
    });
  });

  it('carries eclipse and lunation collective events through the judgment pipeline on known 2025 fixtures', () => {
    const judgment = buildAstrologyJudgment({
      date: CURRENT_SKY_LUNATION_FIXTURES.solarEclipse2025.date,
      chart,
      todayTransits: {
        date: CURRENT_SKY_LUNATION_FIXTURES.solarEclipse2025.date,
        transits: [{ transitPlanet: 'Sun', aspect: 'conjunction', natalPlanet: 'sun', orb: 1.1 }],
      },
      majorArcs: [],
      guidance: [],
      memory,
    });

    const eclipse = judgment.currentSky.events.find((event) => event.kind === 'eclipse');
    const lunation = judgment.currentSky.events.find((event) => event.kind === 'lunation');
    expect(eclipse).toMatchObject({
      sign: 'Aries',
      bodies: ['Sun', 'Moon', 'North Node'],
    });
    expect(lunation).toMatchObject({
      sign: 'Aries',
      bodies: ['Sun', 'Moon'],
    });
    expect(judgment.currentSky.events.some((event) => event.kind === 'eclipse')).toBe(true);
    expect(judgment.currentSky.events.some((event) => event.kind === 'lunation')).toBe(true);
    expect(eclipse?.rarity.status).toBe('computed');
    expect(eclipse?.rarity.recurrence?.scanWindowDays).toBe(400);
    expect(judgment.currentSky.limitations).toContain('Historical-gap enrichment is currently bounded to lunation/eclipse event-class lookbacks only.');
  });
});
