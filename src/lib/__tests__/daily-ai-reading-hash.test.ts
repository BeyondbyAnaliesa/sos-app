import { describe, expect, it } from 'vitest';
import { buildDailyAiReadingMemoryHash } from '@/lib/daily-ai-reading';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';

const chart: Parameters<typeof buildDailyAiReadingMemoryHash>[0]['chart'] = {
  placements: [
    {
      key: 'sun',
      label: 'Sun',
      sign: 'Aries',
      degree: 12,
      minute: 0,
      retrograde: false,
      longitude: 12,
    },
  ],
  angles: {
    ascendant: { sign: 'Leo', degree: 8, minute: 0, longitude: 128 },
    midheaven: { sign: 'Taurus', degree: 22, minute: 0, longitude: 52 },
  },
  houses: [],
  aspects: [],
  metadata: null,
};

const baseJudgment: AstrologyJudgment = {
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
    limitations: [],
  },
  receipts: [],
};

describe('buildDailyAiReadingMemoryHash', () => {
  it('stays stable for the same date even if live todayTransits drift intraday', () => {
    const base = {
      date: '2026-05-06',
      chart,
      majorArcs: [],
      guidance: [],
      memory: { report: null, natalReading: null, lifeSignals: [] },
    } as const;

    const morningHash = buildDailyAiReadingMemoryHash({
      ...base,
      todayTransits: {
        date: '2026-05-06',
        transits: [
          { transitPlanet: 'Moon', aspect: 'square', natalPlanet: 'sun', orb: 0.12 },
          { transitPlanet: 'Mercury', aspect: 'trine', natalPlanet: 'ascendant', orb: 1.4 },
        ],
      },
    });

    const laterHash = buildDailyAiReadingMemoryHash({
      ...base,
      todayTransits: {
        date: '2026-05-06',
        transits: [
          { transitPlanet: 'Moon', aspect: 'trine', natalPlanet: 'sun', orb: 2.91 },
        ],
      },
    });

    expect(laterHash).toBe(morningHash);
  });

  it('changes when the judgment changes', () => {
    const common = {
      date: '2026-05-06',
      chart,
      todayTransits: { date: '2026-05-06', transits: [] },
      majorArcs: [],
      guidance: [],
      memory: { report: null, natalReading: null, lifeSignals: [] },
    } as const;

    expect(buildDailyAiReadingMemoryHash({ ...common, judgment: baseJudgment })).not.toBe(
      buildDailyAiReadingMemoryHash({
        ...common,
        judgment: { ...baseJudgment, mainStory: 'Changed story' },
      }),
    );
  });

  it('changes when collective bridge facts change inside the judgment snapshot', () => {
    const common = {
      date: '2026-05-06',
      chart,
      todayTransits: { date: '2026-05-06', transits: [] },
      majorArcs: [],
      guidance: [],
      memory: { report: null, natalReading: null, lifeSignals: [] },
    } as const;

    const withBridge: AstrologyJudgment = {
      ...baseJudgment,
      foreground: [
        {
          id: 'saturn-square-sun',
          tier: 'foreground',
          scope: 'both',
          source: 'major_arc',
          title: 'Saturn square Sun',
          summary: 'Main signal',
          lifeAreas: ['identity'],
          demand: 'restructuring',
          score: 4.2,
          collectiveBridge: {
            collectiveEvent: {
              id: 'aspect:Saturn:conjunction:Neptune',
              kind: 'transit_aspect',
              bodies: ['Saturn', 'Neptune'],
              aspect: 'conjunction',
              tier: 'foreground',
              score: 8.9,
            },
            matchReasons: ['Collective event includes transit body Saturn.'],
            bridgeStrengthScore: 2.4,
            bridgeStrengthTier: 'supporting',
            promoteScopeToBoth: true,
            limitations: ['heuristic'],
          },
          receipts: [],
          supportNotes: [],
        },
      ],
      receipts: [],
    };

    expect(buildDailyAiReadingMemoryHash({ ...common, judgment: withBridge })).not.toBe(
      buildDailyAiReadingMemoryHash({
        ...common,
        judgment: {
          ...withBridge,
          foreground: [
            {
              ...withBridge.foreground[0],
              collectiveBridge: {
                ...withBridge.foreground[0]!.collectiveBridge!,
                bridgeStrengthScore: 2.8,
              },
            },
          ],
        },
      }),
    );
  });

  it('still changes when the reading date changes', () => {
    const common = {
      chart,
      todayTransits: { date: '2026-05-06', transits: [] },
      majorArcs: [],
      guidance: [],
      memory: { report: null, natalReading: null, lifeSignals: [] },
    } as const;

    expect(buildDailyAiReadingMemoryHash({ ...common, date: '2026-05-06' })).not.toBe(
      buildDailyAiReadingMemoryHash({ ...common, date: '2026-05-07' }),
    );
  });
});
