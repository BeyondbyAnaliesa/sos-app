import { describe, expect, it } from 'vitest';
import { buildNatalProjection, classifyAngularity, getBasicDignity, getChartRuler, getHouseLifeArea } from '@/lib/astrology/natal-projection';
import type { NatalChart } from '@/lib/astrology/types';

const chart: NatalChart = {
  placements: [
    { key: 'sun', label: 'Sun', sign: 'Aries', degree: 8, minute: 0, speed: 1, retrograde: false, warning: null, longitude: 8 },
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
    expect(getChartRuler(chart)).toEqual({
      ascSign: 'Aquarius',
      modernRuler: 'Uranus',
      traditionalRuler: 'Saturn',
    });

    const saturnProjection = buildNatalProjection({ chart, targetKey: 'saturn', targetLabel: 'Saturn' });
    const uranusProjection = buildNatalProjection({ chart, targetKey: 'uranus', targetLabel: 'Uranus' });

    expect(saturnProjection.targetIsTraditionalChartRuler).toBe(true);
    expect(saturnProjection.targetIsModernChartRuler).toBe(false);
    expect(uranusProjection.targetIsModernChartRuler).toBe(true);
    expect(uranusProjection.targetIsTraditionalChartRuler).toBe(false);
  });

  it('maps houses and dignity with explicit limitations', () => {
    const projection = buildNatalProjection({ chart, targetKey: 'saturn', targetLabel: 'Saturn', repeatedLifeAreaSignalCount: 3 });

    expect(getHouseLifeArea(9)).toMatchObject({
      house: 9,
      axisHouse: 3,
      label: 'beliefs, higher education, long travel, publishing, law, worldview',
    });
    expect(classifyAngularity('saturn', 9)).toBe('cadent');
    expect(getBasicDignity('Saturn', 'Libra')).toMatchObject({ condition: 'exaltation' });
    expect(projection).toMatchObject({
      targetHouse: 9,
      angularity: 'cadent',
      repeatedLifeAreaSignalCount: 3,
      dignity: { condition: 'exaltation' },
      natalAspects: [{ otherBody: 'Sun', aspect: 'opposition', orb: 0 }],
    });
    expect(projection.limitations).toContain('Natal projection in this slice is deterministic and limited to chart data already stored on the natal chart.');
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
