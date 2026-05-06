import { describe, expect, it } from 'vitest';
import { scanCurrentSkyFromPositions } from '@/lib/astrology/current-sky';
import type { CollectiveSkyBodyState } from '@/lib/astrology/judgment-types';

function body(body: string, longitude: number, speed: number, retrograde = false): CollectiveSkyBodyState {
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ] as const;
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);

  return {
    body,
    sign: signs[signIndex],
    degree: Number((normalized - signIndex * 30).toFixed(2)),
    longitude: normalized,
    speed,
    retrograde,
  };
}

describe('scanCurrentSkyFromPositions', () => {
  it('builds a collective transit-to-transit event with structured heuristic fields', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Saturn', 10, 0.03),
      body('Neptune', 10.2, 0.01),
      body('Jupiter', 92, 0.08),
    ]);

    expect(currentSky.status).toBe('collective-scan-v1');
    expect(currentSky.events[0]).toMatchObject({
      kind: 'transit_aspect',
      bodies: ['Saturn', 'Neptune'],
      aspect: 'conjunction',
      phase: 'exact',
      applyingStateKnown: true,
      tier: 'foreground',
    });
    expect(currentSky.events[0]?.rarity).toMatchObject({
      basis: 'heuristic',
      historicalGapYears: null,
    });
    expect(currentSky.events[0]?.limitations).toContain('Exact peak timestamp is not solved in this slice; phase is inferred from one-day speed deltas.');
  });

  it('scores exact or near-exact collective aspects above wider ones', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Saturn', 10, 0.03),
      body('Neptune', 10.1, 0.01),
      body('Jupiter', 100, 0.08),
      body('Uranus', 104.8, 0.03),
    ]);

    const exactEvent = currentSky.events.find((event) => event.id === 'aspect:Saturn:conjunction:Neptune');
    const widerEvent = currentSky.events.find((event) => event.id === 'aspect:Jupiter:conjunction:Uranus');

    expect(exactEvent).toBeTruthy();
    expect(widerEvent).toBeTruthy();
    expect(exactEvent!.score).toBeGreaterThan(widerEvent!.score);
    expect(exactEvent!.rarity.score).toBeGreaterThanOrEqual(widerEvent!.rarity.score);
  });

  it('keeps limitations honest about historical proof and missing sky systems', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Pluto', 300.4, 0.002),
      body('Saturn', 359.3, 0.015),
    ]);

    expect(currentSky.limitations).toContain('Rarity and consequence scores are heuristic and explicitly do not claim historical proof.');
    expect(currentSky.limitations).toContain('No historical-gap engine, lunation/eclipses, or multi-body configuration detector is included in this slice.');
  });
});
