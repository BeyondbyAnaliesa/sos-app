import { describe, expect, it } from 'vitest';
import {
  buildDispositorChain,
  buildNatalProjection,
  buildSimpleReception,
  buildSectContext,
  classifyAngularity,
  getBasicDignity,
  getChartRuler,
  getHouseLifeArea,
  getSignRulers,
} from '@/lib/astrology/natal-projection';
import type { NatalChart } from '@/lib/astrology/types';

const chart: NatalChart = {
  placements: [
    { key: 'sun', label: 'Sun', sign: 'Aries', degree: 8, minute: 0, speed: 1, retrograde: false, warning: null, longitude: 8 },
    { key: 'venus', label: 'Venus', sign: 'Libra', degree: 14, minute: 0, speed: 1.1, retrograde: false, warning: null, longitude: 194 },
    { key: 'saturn', label: 'Saturn', sign: 'Libra', degree: 8, minute: 0, speed: 0.1, retrograde: false, warning: null, longitude: 188 },
    { key: 'uranus', label: 'Uranus', sign: 'Scorpio', degree: 5, minute: 0, speed: 0.02, retrograde: false, warning: null, longitude: 215 },
  ],
  angles: {
    ascendant: { sign: 'Aquarius', degree: 5, minute: 0, longitude: 305 },
    midheaven: { sign: 'Scorpio', degree: 20, minute: 0, longitude: 230 },
  },
  houses: [300, 330, 0, 30, 60, 90, 120, 150, 180, 210, 240, 270],
  aspects: [
    { type: 'opposition', between: ['Saturn', 'Sun'], angle: 180, orb: 0 },
  ],
  metadata: {
    jdUt: 0,
    timeExact: true,
    coordinates: { latitude: 0, longitude: 0 },
    warnings: { houses: null },
  },
};

describe('natal projection helpers', () => {
  it('detects chart ruler using modern and traditional ascendant rulers', () => {
    expect(getChartRuler(chart)).toMatchObject({
      ascSign: 'Aquarius',
      modernRuler: 'Uranus',
      traditionalRuler: 'Saturn',
      modernPlacement: { ruler: 'Uranus', sign: 'Scorpio', house: 10 },
      traditionalPlacement: { ruler: 'Saturn', sign: 'Libra', house: 9 },
    });

    const saturnProjection = buildNatalProjection({ chart, targetKey: 'saturn', targetLabel: 'Saturn' });
    const uranusProjection = buildNatalProjection({ chart, targetKey: 'uranus', targetLabel: 'Uranus' });

    expect(saturnProjection.targetIsTraditionalChartRuler).toBe(true);
    expect(saturnProjection.targetIsModernChartRuler).toBe(false);
    expect(uranusProjection.targetIsModernChartRuler).toBe(true);
    expect(uranusProjection.targetIsTraditionalChartRuler).toBe(false);
  });

  it('maps houses, dignity, and sect with explicit limitations', () => {
    const projection = buildNatalProjection({ chart, targetKey: 'saturn', targetLabel: 'Saturn', repeatedLifeAreaSignalCount: 3 });

    expect(getHouseLifeArea(9)).toMatchObject({
      house: 9,
      axisHouse: 3,
      label: 'beliefs, higher education, long travel, publishing, law, worldview',
    });
    expect(getSignRulers('Libra')).toEqual({ modernRuler: 'Venus', traditionalRuler: 'Venus' });
    expect(classifyAngularity('saturn', 9)).toBe('cadent');
    expect(getBasicDignity('Saturn', 'Libra')).toMatchObject({ condition: 'exaltation' });
    expect(buildSectContext(chart, 'Saturn')).toMatchObject({
      chartSect: 'night',
      basis: 'sun_house_relative_to_horizon',
      sunHouse: 3,
      targetCondition: 'out_of_sect',
    });
    expect(projection).toMatchObject({
      targetHouse: 9,
      angularity: 'cadent',
      repeatedLifeAreaSignalCount: 3,
      dignity: { condition: 'exaltation' },
      sect: {
        chartSect: 'night',
        targetCondition: 'out_of_sect',
      },
      signRuler: {
        sign: 'Libra',
        modernRuler: 'Venus',
        traditionalRuler: 'Venus',
        traditionalRulerPlacement: { ruler: 'Venus', sign: 'Libra', house: 9 },
      },
      dispositors: [
        {
          system: 'modern',
          finalRuler: 'Venus',
          termination: 'self_ruled',
          steps: [{ sourceSign: 'Libra', ruler: 'Venus', rulerSign: 'Libra', rulerHouse: 9 }],
        },
        {
          system: 'traditional',
          finalRuler: 'Venus',
          termination: 'self_ruled',
          steps: [{ sourceSign: 'Libra', ruler: 'Venus', rulerSign: 'Libra', rulerHouse: 9 }],
        },
      ],
      natalAspects: [{ otherBody: 'Sun', aspect: 'opposition', orb: 0 }],
    });
    expect(projection.limitations).toContain('Natal projection in this slice is deterministic and limited to chart data already stored on the natal chart.');
    expect(projection.limitations).toContain('Rulership/dispositorship depth v1 is intentionally bounded to chart ruler placement, sign rulers, and short modern/traditional sign-ruler chains only.');
  });

  it('builds bounded dispositor chains and fences limitations explicitly', () => {
    const chain = buildDispositorChain({ chart, sign: 'Scorpio', chartRuler: getChartRuler(chart), system: 'modern' });

    expect(chain).toMatchObject({
      system: 'modern',
      finalRuler: 'Pluto',
      termination: 'missing_ruler_placement',
      steps: [{ sourceSign: 'Scorpio', ruler: 'Pluto', rulerSign: null, rulerHouse: null }],
    });
    expect(chain.limitations).toContain('Dispositor depth v1 follows sign rulers from stored natal placements only; it does not add sect, house-strength, term, face, combustion, or reception weighting.');
  });

  it('detects one-way and mutual sign-rulership reception conservatively', () => {
    expect(buildSimpleReception({
      sourceLabel: 'Saturn',
      sourceSign: 'Libra',
      counterpartLabel: 'Venus',
      counterpartSign: 'Capricorn',
      system: 'traditional',
    })).toMatchObject({
      status: 'mutual',
      direction: 'both',
      sourceInCounterpartRulership: true,
      counterpartInSourceRulership: true,
    });

    expect(buildSimpleReception({
      sourceLabel: 'Saturn',
      sourceSign: 'Taurus',
      counterpartLabel: 'Venus',
      counterpartSign: 'Libra',
      system: 'traditional',
    })).toMatchObject({
      status: 'one_way',
      direction: 'transit_to_natal',
      sourceInCounterpartRulership: true,
      counterpartInSourceRulership: false,
    });
  });

  it('fences sect when birth time or safe houses are unavailable', () => {
    const unknownSect = buildSectContext({
      ...chart,
      metadata: {
        ...chart.metadata,
        timeExact: false,
      },
    }, 'Saturn');

    expect(unknownSect).toMatchObject({
      chartSect: 'unknown',
      basis: 'unavailable',
      targetCondition: 'unknown',
    });
    expect(unknownSect.limitations).toContain('Birth time is not exact, so day/night sect is fenced instead of guessed.');
  });

  it('treats ascendant as an angle target', () => {
    const projection = buildNatalProjection({ chart, targetKey: 'ascendant', targetLabel: 'Ascendant' });

    expect(projection.targetType).toBe('angle');
    expect(projection.targetIsAngle).toBe(true);
    expect(projection.angularity).toBe('angle');
    expect(projection.targetHouse).toBe(1);
    expect(projection.chartRuler.modernRuler).toBe('Uranus');
  });
});
