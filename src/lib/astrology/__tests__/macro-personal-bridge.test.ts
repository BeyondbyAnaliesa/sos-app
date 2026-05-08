import { describe, expect, it } from 'vitest';
import { buildMacroPersonalBridge } from '@/lib/astrology/macro-personal-bridge';
import type {
  AstrologyCollectiveBridge,
  AstrologyJudgmentReceipt,
} from '@/lib/astrology/judgment-types';
import type { MacroConfigurationReceipt } from '@/lib/astrology/macrocosm-types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';

const collectiveBridge: AstrologyCollectiveBridge = {
  collectiveEvent: {
    id: 'aspect:Saturn:conjunction:Neptune',
    kind: 'transit_aspect',
    bodies: ['Saturn', 'Neptune'],
    aspect: 'conjunction',
    tier: 'foreground',
    score: 8.8,
  },
  matchReasons: ['Collective event includes transit body Saturn.'],
  bridgeStrengthScore: 2.7,
  bridgeStrengthTier: 'foreground',
  promoteScopeToBoth: true,
  limitations: ['heuristic'],
};

const macroConfiguration: MacroConfigurationReceipt = {
  id: 'macro:outer-ingress:saturn-neptune-aries',
  status: 'macro-configuration-v1',
  kind: 'outer_planet_sign_ingress',
  title: 'Saturn-Neptune Aries ingress cluster',
  summary: 'Saturn and Neptune are clustered in Aries.',
  eventIds: ['aspect:Saturn:conjunction:Neptune'],
  bodies: ['Saturn', 'Neptune'],
  signs: ['Aries'],
  timeWindow: {
    startDate: null,
    peakDate: '2026-05-06',
    endDate: null,
  },
  interpretiveFamily: 'saturn-neptune-aries',
  landscape: {
    status: 'macro-landscape-v1',
    topicKey: 'saturn-neptune-aries',
    statusLabel: 'emerging',
    sourceMapVersion: 'test',
    scanVersion: 'test',
    consensusSummary: 'test',
    saturatedClaims: [],
    openQuestions: [],
    underStudiedAngles: ['home/family restructuring'],
    limitations: [],
  },
  rarity: {
    status: 'not_computed',
    confidence: 'none',
    assessment: 'heuristic_only',
    comparator: 'same_outer_planet_sign_ingress',
    historicalGapYears: null,
    recurrenceWindow: {
      priorComparableDate: null,
      nextComparableDate: null,
      scanWindowDays: null,
    },
    limitations: ['not computed'],
  },
  consequence: {
    score: 8.4,
    basis: 'heuristic',
    limitations: [],
  },
  receipts: [],
  limitations: [],
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
    memorySummary: 'Recurring family pressure keeps surfacing at home.',
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
        modernPlacement: null,
        traditionalPlacement: null,
      },
      signRuler: {
        sign: 'Libra',
        modernRuler: 'Venus',
        traditionalRuler: 'Venus',
        modernRulerPlacement: {
          ruler: 'Venus',
          sign: 'Libra',
          degree: 18,
          house: 4,
          houseContext: {
            house: 4,
            label: 'home, family of origin, roots, private life, foundation',
            axisHouse: 10,
            axisLabel: 'career, public reputation, authority, achievement, legacy',
          },
          angularity: 'angular',
          dignity: { condition: 'domicile', limitations: [] },
          targetIsAngle: false,
        },
        traditionalRulerPlacement: {
          ruler: 'Venus',
          sign: 'Libra',
          degree: 18,
          house: 4,
          houseContext: {
            house: 4,
            label: 'home, family of origin, roots, private life, foundation',
            axisHouse: 10,
            axisLabel: 'career, public reputation, authority, achievement, legacy',
          },
          angularity: 'angular',
          dignity: { condition: 'domicile', limitations: [] },
          targetIsAngle: false,
        },
      },
      dispositors: [],
      sect: {
        chartSect: 'day',
        basis: 'sun_house_relative_to_horizon',
        sunHouse: 9,
        targetCondition: 'out_of_sect',
        limitations: [],
      },
      targetIsModernChartRuler: false,
      targetIsTraditionalChartRuler: false,
      targetIsAngle: false,
      dignity: {
        condition: 'domicile',
        limitations: [],
      },
      natalAspects: [],
      repeatedLifeAreaSignalCount: 2,
      limitations: [],
    },
    reception: null,
    sect: null,
    meaningFactors: null,
    collectiveBridge,
    currentSkyRarity: null,
    arcLifecycle: null,
    ...overrides,
  };
}

const memory: MajorWaveMemoryInput = {
  lifeSignals: [
    {
      content_text: 'Family pressure and relationship strain keep resurfacing at home.',
      themes_json: ['family pressure', 'relationship strain'],
      emotions_json: ['stress'],
      life_domain: 'home',
      signal_timestamp: '2026-05-04T12:00:00Z',
    },
  ],
};

describe('buildMacroPersonalBridge', () => {
  it('maps a supported macro configuration into a deterministic personal bridge', () => {
    const bridge = buildMacroPersonalBridge({
      receipt: buildReceipt(),
      macroConfigurations: [macroConfiguration],
      memory,
    });

    expect(bridge).toMatchObject({
      configurationId: 'macro:outer-ingress:saturn-neptune-aries',
      bridgeStrengthTier: 'foreground',
      manifestationClass: 'loud',
      decisionPressure: 'immediate',
      activationArea: expect.arrayContaining(['home, family of origin, roots, private life, foundation']),
      memoryLinks: {
        matchedSignalCount: 1,
        matchedThemes: expect.arrayContaining(['family pressure']),
      },
    });
    expect(bridge?.natalTargets.map((target) => target.targetType)).toEqual(expect.arrayContaining(['planet', 'house_ruler', 'house_axis']));
  });

  it('omits macroBridge when the receipt has no deterministic macro-body support', () => {
    const bridge = buildMacroPersonalBridge({
      receipt: buildReceipt({ transitPlanet: 'Mars', collectiveBridge: null }),
      macroConfigurations: [macroConfiguration],
      memory,
    });

    expect(bridge).toBeNull();
  });

  it('keeps saturated landscape cases inspectable without pretending novelty', () => {
    const bridge = buildMacroPersonalBridge({
      receipt: buildReceipt(),
      macroConfigurations: [{
        ...macroConfiguration,
        landscape: {
          ...macroConfiguration.landscape!,
          statusLabel: 'saturated',
        },
      }],
      memory,
    });

    expect(bridge?.limitations).toContain(
      'Landscape status for macro:outer-ingress:saturn-neptune-aries is saturated; this bridge can explain personal landing, not claim novelty.',
    );
  });
});
