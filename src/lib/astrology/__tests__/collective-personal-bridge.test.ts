import { describe, expect, it } from 'vitest';
import { buildCollectivePersonalBridge } from '@/lib/astrology/collective-personal-bridge';
import type { AstrologyCollectiveSkyEvent, AstrologyJudgmentReceipt } from '@/lib/astrology/judgment-types';

const saturnCollectiveEvent: AstrologyCollectiveSkyEvent = {
  id: 'aspect:Saturn:conjunction:Neptune',
  kind: 'transit_aspect',
  tier: 'foreground',
  score: 8.9,
  scope: 'collective',
  bodies: ['Saturn', 'Neptune'],
  aspect: 'conjunction',
  orb: 0.2,
  phase: 'exact',
  applyingStateKnown: true,
  sign: 'Aries',
  exactnessBand: 'exact',
  rarity: {
    score: 8.4,
    basis: 'heuristic',
    limitations: ['Historical gap not solved.'],
    historicalGapYears: null,
  },
  consequence: {
    score: 8.7,
    basis: 'heuristic',
    limitations: ['Consequence is heuristic.'],
    historicalGapYears: null,
  },
  summary: 'Saturn conjunct Neptune is active in the live sky.',
  receipts: [],
  limitations: ['Exact peak timestamp is not solved in this slice; phase is inferred from one-day speed deltas.'],
};

function buildReceipt(overrides: Partial<AstrologyJudgmentReceipt> = {}): AstrologyJudgmentReceipt {
  return {
    transitPlanet: 'Saturn',
    aspect: 'opposition',
    natalTarget: 'venus',
    targetLabel: 'Venus',
    orb: 0.3,
    phase: 'exact',
    transitSign: 'Aries',
    transitDegree: 18,
    natalSign: 'Libra',
    natalHouse: 4,
    lifeArea: 'home, family of origin, roots, private life, foundation',
    exactDate: '2026-05-14',
    peakDate: '2026-05-14',
    startDate: '2026-05-01',
    endDate: '2026-08-01',
    passCount: 2,
    currentPass: 1,
    stations: [],
    memorySummary: null,
    natalProjection: {
      targetKey: 'venus',
      targetLabel: 'Venus',
      targetType: 'planet',
      targetSign: 'Libra',
      targetDegree: 18,
      targetHouse: 4,
      house: {
        house: 4,
        label: 'home, family of origin, roots, private life, foundation',
        axisHouse: 10,
        axisLabel: 'career, public reputation, authority, achievement, legacy',
      },
      angularity: 'angular',
      chartRuler: {
        ascSign: 'Cancer',
        modernRuler: 'Moon',
        traditionalRuler: null,
      },
      targetIsModernChartRuler: false,
      targetIsTraditionalChartRuler: false,
      targetIsAngle: false,
      dignity: {
        condition: 'domicile',
        limitations: [],
      },
      natalAspects: [],
      repeatedLifeAreaSignalCount: 0,
      limitations: [],
    },
    meaningFactors: null,
    arcLifecycle: null,
    ...overrides,
  };
}

describe('buildCollectivePersonalBridge', () => {
  it('promotes a major personal Saturn signal into a collective-personal bridge when the sky event is also Saturn-led', () => {
    const bridge = buildCollectivePersonalBridge(buildReceipt(), [saturnCollectiveEvent]);

    expect(bridge).toMatchObject({
      collectiveEvent: {
        id: 'aspect:Saturn:conjunction:Neptune',
        kind: 'transit_aspect',
        bodies: ['Saturn', 'Neptune'],
        tier: 'foreground',
      },
      bridgeStrengthTier: 'supporting',
      promoteScopeToBoth: true,
    });
    expect(bridge?.bridgeStrengthScore).toBeGreaterThanOrEqual(2.25);
    expect(bridge?.matchReasons).toEqual(expect.arrayContaining([
      'Collective event includes transit body Saturn.',
      'Timing phase aligns (exact).',
    ]));
  });

  it('leaves unmatched collective events unbridged so they stay collective-only', () => {
    const bridge = buildCollectivePersonalBridge(buildReceipt({ transitPlanet: 'Mars', aspect: 'trine', phase: 'separating' }), [saturnCollectiveEvent]);

    expect(bridge).toBeNull();
  });

  it('states heuristic limitations explicitly when house/life-area or phase matching is limited', () => {
    const bridge = buildCollectivePersonalBridge(buildReceipt(), [{
      ...saturnCollectiveEvent,
      id: 'station:Saturn',
      kind: 'station_proximity',
      aspect: null,
      phase: null,
      exactnessBand: null,
    }]);

    expect(bridge?.limitations).toEqual(expect.arrayContaining([
      'Bridge matching is heuristic and only covers body/body-pair, phase, natal target, and limited life-area context.',
      'Collective current-sky events are not projected into houses in this slice, so house/life-area matching stays chart-only.',
      'This collective event has no phase field, so phase alignment could not be tested.',
    ]));
  });
});
