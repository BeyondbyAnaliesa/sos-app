import { describe, expect, it } from 'vitest';
import { buildAstrologyJudgment } from '@/lib/astrology/judgment';
import { buildAstrologyJudgmentMetadata } from '@/lib/astrology/judgment-metadata';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';
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

describe('buildAstrologyJudgmentMetadata', () => {
  it('stays compact and safe when older cached rows have no enriched receipts', () => {
    const minimal: AstrologyJudgment = {
      date: '2026-05-06',
      foreground: [],
      supporting: [],
      background: [],
      noise: [],
      mainStory: 'Base story',
      practicalDemand: 'Base demand',
      timing: {
        currentPhase: null,
        exactDate: null,
        peakWindowStart: null,
        peakWindowEnd: null,
        nextWatchDate: null,
        activeTransitCount: 0,
      },
      activatedLifeAreas: [],
      currentSky: {
        status: 'collective-scan-v1',
        summary: 'Collective scan',
        scannedBodies: [],
        events: [],
        limitations: ['Current-sky coverage is bounded.'],
      },
      receipts: [],
    };

    expect(buildAstrologyJudgmentMetadata(minimal)).toEqual({
      status: 'astrology-judgment-metadata-v1',
      engineVersions: {
        judgment: 'structured-astrology-judgment-v1',
        currentSky: 'collective-scan-v1',
      },
      signalCounts: {
        foreground: 0,
        supporting: 0,
        background: 0,
        noise: 0,
        total: 0,
        bySource: {
          major_arc: 0,
          daily_transit: 0,
          guidance: 0,
          memory: 0,
        },
      },
      currentSky: {
        eventCount: 0,
        computedFactCount: 0,
        fencedFactCount: 0,
        rarityAssessments: {
          computedRecurrence: 0,
          boundedLimited: 0,
          heuristicOnly: 0,
          unsupported: 0,
        },
      },
      availability: {
        transitDignityReceipts: 0,
        natalDignityReceipts: 0,
        receptionReceipts: 0,
        supportedReceptionReceipts: 0,
        sectReceipts: 0,
        arcLifecycleReceipts: 0,
        collectiveBridgeReceipts: 0,
      },
      lead: {
        signalIds: [],
        currentSkyEventIds: [],
      },
      limitations: ['Current-sky coverage is bounded.'],
    });
  });

  it('summarizes rarity, dignity, reception, sect, and limitations for enriched judgments', () => {
    const judgment = buildAstrologyJudgment({
      date: '2026-05-06',
      chart,
      todayTransits: { date: '2026-05-06', transits: [{ transitPlanet: 'Moon', aspect: 'trine', natalPlanet: 'sun', orb: 1.2 }] },
      majorArcs,
      guidance: [],
      memory,
    });

    const metadata = buildAstrologyJudgmentMetadata(judgment);

    expect(metadata.status).toBe('astrology-judgment-metadata-v1');
    expect(metadata.engineVersions).toEqual({
      judgment: 'structured-astrology-judgment-v1',
      currentSky: 'collective-scan-v1',
    });
    expect(metadata.currentSky.eventCount).toBeGreaterThan(0);
    expect(metadata.currentSky.computedFactCount + metadata.currentSky.fencedFactCount).toBe(metadata.currentSky.eventCount);
    expect(metadata.availability.transitDignityReceipts).toBeGreaterThan(0);
    expect(metadata.availability.natalDignityReceipts).toBeGreaterThan(0);
    expect(metadata.availability.receptionReceipts).toBeGreaterThan(0);
    expect(metadata.availability.sectReceipts).toBeGreaterThan(0);
    expect(metadata.availability.arcLifecycleReceipts).toBeGreaterThan(0);
    expect(metadata.signalCounts.bySource.major_arc).toBeGreaterThan(0);
    expect(metadata.lead.signalIds[0]).toBe('saturn-opposition-venus');
    expect(metadata.limitations.length).toBeGreaterThan(0);
    expect(metadata.limitations.join(' ')).not.toContain('I keep circling');
  });
});
