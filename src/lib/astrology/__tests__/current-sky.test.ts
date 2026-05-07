import { describe, expect, it } from 'vitest';
import { getPlanetaryPositions } from '@/lib/astrology/calculate-transits';
import { buildCollectiveSkyBodyState, scanCurrentSkyFromPositions } from '@/lib/astrology/current-sky';
import { CURRENT_SKY_LUNATION_FIXTURES } from '@/lib/astrology/__tests__/fixtures/current-sky-lunation-fixtures';
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
  it('builds a collective transit-to-transit event with explicit not_computed rarity facts when no recurrence scan exists', () => {
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
      status: 'not_computed',
      confidence: 'none',
      recurrence: null,
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

  it('keeps limitations honest about historical proof and bounded sky systems', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Pluto', 300.4, 0.002),
      body('Saturn', 359.3, 0.015),
    ]);

    expect(currentSky.limitations).toContain('Rarity and consequence scores are heuristic and explicitly do not claim historical proof.');
    expect(currentSky.limitations).toContain('Historical-gap enrichment is currently bounded to lunation/eclipse lookbacks, supported slow-body ingress spacing estimates, supported slow-body station timing/spacing estimates, and near-exact outer-planet aspect window scans only.');
    expect(currentSky.limitations).toContain('Configuration detector v1 only covers sign concentration plus tight T-square/grand-trine major-aspect clusters.');
  });

  it('computes bounded station timing/spacing for supported slow-body near-station events when the local scan can bracket the station window', () => {
    const asOf = new Date('2025-05-04T12:00:00Z');
    const currentSky = scanCurrentSkyFromPositions([
      body('Pluto', 303.82, 0.00007, false),
    ], { date: asOf });
    const station = currentSky.events.find((event) => event.id === 'station:Pluto');

    expect(station?.rarity).toMatchObject({
      status: 'computed',
      confidence: 'bounded',
      recurrence: {
        comparator: 'same_body_station_window_spacing_estimate',
      },
    });
    expect(station?.rarity.recurrence?.priorComparableEventDate).toBeTruthy();
    expect(station?.rarity.recurrence?.nextComparableEventDate).toBeTruthy();
    expect(station?.rarity.recurrence?.spacingDays).toBeGreaterThan(100);
    expect(station?.rarity.limitations.join(' ')).toContain('bounded local station-window estimate');
  });

  it('computes bounded ingress spacing for supported slow direct bodies when an as-of date is available', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Saturn', 0.03, 0.075, false),
      body('Jupiter', 92, 0.08),
    ], { date: new Date('2025-05-25T12:00:00Z') });

    const ingress = currentSky.events.find((event) => event.id === 'ingress:Saturn:post_ingress');

    expect(ingress?.rarity).toMatchObject({
      status: 'computed',
      confidence: 'bounded',
      recurrence: {
        comparator: 'same_body_sign_ingress_spacing_estimate',
        priorComparableEventDate: '2025-05-25',
        nextComparableEventDate: '2026-06-29',
      },
    });
    expect(ingress?.rarity.recurrence?.spacingDays).toBeCloseTo(400, 2);
    expect(ingress?.rarity.limitations.join(' ')).toContain('sign-boundary estimate from current ephemeris/speed');
  });

  it('keeps ingress spacing fenced for unsupported or ambiguous bodies and motion states', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('North Node', 0.8, -0.12, true),
      body('Saturn', 29.8, -0.02, true),
    ], { date: new Date('2025-05-25T12:00:00Z') });

    expect(currentSky.events.find((event) => event.id === 'ingress:North Node:post_ingress')?.rarity).toMatchObject({
      status: 'not_computed',
      confidence: 'none',
    });
    expect(currentSky.events.find((event) => event.id === 'ingress:North Node:post_ingress')?.rarity.limitations.join(' ')).toContain('North Node ingress spacing stays fenced');
    expect(currentSky.events.find((event) => event.id === 'ingress:Saturn:pre_ingress')?.rarity.limitations.join(' ')).toContain('retrograde, reversing, or missing a stable direct speed');
  });

  it('keeps station spacing fenced for unsupported station bodies even when they are near-station', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Mars', 119, 0.01, false),
    ], { date: new Date('2025-01-15T12:00:00Z') });

    expect(currentSky.events.find((event) => event.id === 'station:Mars')?.rarity).toMatchObject({
      status: 'not_computed',
      confidence: 'none',
      assessment: 'unsupported',
      method: 'local_station_window',
    });
    expect(currentSky.events.find((event) => event.id === 'station:Mars')?.rarity.limitations.join(' ')).toContain('supported slow bodies with bounded local station windows');
  });

  it('computes bounded recurrence for a near-exact supported outer-planet aspect with explicit scan receipts', () => {
    const asOf = new Date('2026-02-20T12:00:00Z');
    const currentSky = scanCurrentSkyFromPositions(
      getPlanetaryPositions(asOf).map((position) => buildCollectiveSkyBodyState({
        body: position.label,
        longitude: position.longitude,
        speed: position.speed,
        retrograde: position.retrograde,
      })),
      { date: asOf },
    );

    const aspect = currentSky.events.find((event) => event.id === 'aspect:Saturn:conjunction:Neptune');

    expect(aspect?.rarity).toMatchObject({
      status: 'computed',
      confidence: 'bounded',
      assessment: 'computed_recurrence',
      method: 'bidirectional_scan',
      searchWindowDays: 900,
      recurrence: {
        comparator: 'same_outer_planet_aspect_window',
      },
    });
    expect(aspect?.rarity.recurrence?.priorComparableEventDate).toBeTruthy();
    expect(aspect?.rarity.comparisonCriteria.join(' ')).toContain('bounded ±900-day daily ephemeris scan');
  });

  it('keeps outer-planet aspect recurrence fenced when the live aspect is not yet inside the bounded exact-window comparator', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Saturn', 10, 0.03),
      body('Neptune', 13.4, 0.01),
    ], { date: new Date('2026-02-20T12:00:00Z') });

    expect(currentSky.events.find((event) => event.id === 'aspect:Saturn:conjunction:Neptune')?.rarity).toMatchObject({
      status: 'not_computed',
      assessment: 'bounded_limited',
      method: 'bidirectional_scan',
      searchWindowDays: 900,
    });
    expect(currentSky.events.find((event) => event.id === 'aspect:Saturn:conjunction:Neptune')?.rarity.limitations.join(' ')).toContain('within 2.0° orb');
  });

  it('filters derived nodes and fenced asteroids out of generic current-sky aspect scanning', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Saturn', 10, 0.03),
      body('South Node', 10.1, -0.05, true),
      body('Ceres', 10.2, 0.02),
      body('North Node', 0.4, -0.05, true),
    ], { date: new Date('2026-02-20T12:00:00Z') });

    expect(currentSky.events.some((event) => event.id === 'aspect:Saturn:conjunction:South Node')).toBe(false);
    expect(currentSky.events.some((event) => event.id === 'aspect:Saturn:conjunction:Ceres')).toBe(false);
    expect(currentSky.events.some((event) => event.id === 'ingress:North Node:post_ingress')).toBe(true);
    expect(currentSky.events.some((event) => event.id === 'ingress:South Node:post_ingress')).toBe(false);
  });

  it('detects compact sign concentration as a bounded collective configuration', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Sun', 12, 0.98),
      body('Mercury', 14.4, 1.1),
      body('Saturn', 18.1, 0.05),
      body('Neptune', 19.2, 0.02),
      body('Mars', 92, 0.7),
    ]);

    const cluster = currentSky.events.find((event) => event.kind === 'sign_cluster');

    expect(cluster).toMatchObject({
      kind: 'sign_cluster',
      sign: 'Aries',
      bodies: ['Sun', 'Mercury', 'Saturn', 'Neptune'],
      tier: 'foreground',
      rarity: {
        status: 'not_computed',
        confidence: 'none',
      },
    });
    expect(cluster?.receipts.join(' ')).toContain('Aries count: 4 supported bodies');
    expect(cluster?.limitations.join(' ')).toContain('same-sign concentration');
  });

  it('detects a tight T-square as a major aspect pattern and ranks it above looser single aspects', () => {
    const currentSky = scanCurrentSkyFromPositions([
      body('Jupiter', 10.2, 0.08),
      body('Saturn', 190.8, 0.03),
      body('Mars', 100.6, 0.5),
      body('Venus', 224.5, 1.1),
    ]);

    const pattern = currentSky.events.find((event) => event.id === 't-square:Jupiter:Mars:Saturn');
    const componentSquare = currentSky.events.find((event) => event.id === 'aspect:Jupiter:square:Mars');

    expect(pattern).toMatchObject({
      kind: 'major_aspect_pattern',
      tier: 'foreground',
      bodies: ['Mars', 'Jupiter', 'Saturn'],
      rarity: {
        status: 'not_computed',
      },
    });
    expect(pattern?.summary).toContain('tight T-square');
    expect(pattern?.score ?? 0).toBeGreaterThan(componentSquare?.score ?? 0);
  });

  it('detects 2025 lunations and eclipses from sweph-backed positions with bounded historical gap fields', () => {
    const solarEclipseDate = new Date(`${CURRENT_SKY_LUNATION_FIXTURES.solarEclipse2025.date}T12:00:00Z`);
    const solarEclipseSky = scanCurrentSkyFromPositions(
      getPlanetaryPositions(solarEclipseDate).map((position) => buildCollectiveSkyBodyState({
        body: position.label,
        longitude: position.longitude,
        speed: position.speed,
        retrograde: position.retrograde,
      })),
      { date: solarEclipseDate },
    );

    const eclipse = solarEclipseSky.events.find((event) => event.kind === 'eclipse');
    const lunation = solarEclipseSky.events.find((event) => event.kind === 'lunation');

    expect(eclipse).toMatchObject({
      sign: CURRENT_SKY_LUNATION_FIXTURES.solarEclipse2025.expectSign,
      bodies: ['Sun', 'Moon', 'North Node'],
      aspect: 'conjunction',
      tier: 'foreground',
    });
    expect(eclipse?.rarity).toMatchObject({
      status: 'computed',
      confidence: 'bounded',
      assessment: 'computed_recurrence',
      method: 'historical_scan',
    });
    expect(eclipse?.rarity.historicalGapYears).not.toBeNull();
    expect(eclipse?.rarity.recurrence).toMatchObject({
      comparator: 'same_eclipse_type',
      scanWindowDays: 400,
    });
    expect(eclipse?.limitations.join(' ')).toContain('bounded 400-day backward scan');
    expect(lunation).toMatchObject({
      sign: CURRENT_SKY_LUNATION_FIXTURES.solarEclipse2025.expectSign,
      bodies: ['Sun', 'Moon'],
      aspect: 'conjunction',
    });

    const nonEclipseDate = new Date(`${CURRENT_SKY_LUNATION_FIXTURES.nonEclipseNewMoon2025.date}T12:00:00Z`);
    const nonEclipseSky = scanCurrentSkyFromPositions(
      getPlanetaryPositions(nonEclipseDate).map((position) => buildCollectiveSkyBodyState({
        body: position.label,
        longitude: position.longitude,
        speed: position.speed,
        retrograde: position.retrograde,
      })),
      { date: nonEclipseDate },
    );

    expect(nonEclipseSky.events.some((event) => event.kind === 'lunation')).toBe(true);
    expect(nonEclipseSky.events.some((event) => event.kind === 'eclipse')).toBe(false);
  });
});
