import { describe, expect, it } from 'vitest';
import { buildMacroConfigurationsFromCurrentSky } from '@/lib/astrology/macro-configuration-graph';
import { buildNotComputedHistoricalRarityFact } from '@/lib/astrology/rarity-facts';
import type {
  AstrologyCollectiveSkyEvent,
  AstrologyJudgmentCurrentSky,
} from '@/lib/astrology/judgment-types';

function event(overrides: Partial<AstrologyCollectiveSkyEvent> & Pick<AstrologyCollectiveSkyEvent, 'id' | 'kind' | 'bodies' | 'summary'>): AstrologyCollectiveSkyEvent {
  return {
    id: overrides.id,
    kind: overrides.kind,
    tier: overrides.tier ?? 'foreground',
    score: overrides.score ?? 8,
    scope: 'collective',
    bodies: overrides.bodies,
    aspect: overrides.aspect ?? null,
    orb: overrides.orb ?? null,
    phase: overrides.phase ?? null,
    applyingStateKnown: overrides.applyingStateKnown ?? false,
    sign: overrides.sign ?? null,
    exactnessBand: overrides.exactnessBand ?? null,
    rarity: overrides.rarity ?? buildNotComputedHistoricalRarityFact({
      score: 5,
      limitations: ['test rarity'],
    }),
    consequence: overrides.consequence ?? {
      score: 5,
      basis: 'heuristic',
      limitations: ['test consequence'],
      historicalGapYears: null,
    },
    summary: overrides.summary,
    receipts: overrides.receipts ?? ['test receipt'],
    limitations: overrides.limitations ?? ['test limitation'],
  };
}

function currentSky(events: AstrologyCollectiveSkyEvent[]): AstrologyJudgmentCurrentSky {
  return {
    status: 'collective-scan-v1',
    summary: 'test sky',
    scannedBodies: ['Saturn', 'Neptune', 'Uranus', 'Pluto', 'North Node', 'Sun', 'Moon'],
    events,
    limitations: ['test'],
  };
}

describe('buildMacroConfigurationsFromCurrentSky', () => {
  it('groups supported current-sky events into stable macro configuration ids', () => {
    const configurations = buildMacroConfigurationsFromCurrentSky(currentSky([
      event({ id: 'ingress:Saturn:post_ingress', kind: 'sign_ingress_proximity', bodies: ['Saturn'], sign: 'Aries', summary: 'Saturn entered Aries.' }),
      event({ id: 'ingress:Neptune:post_ingress', kind: 'sign_ingress_proximity', bodies: ['Neptune'], sign: 'Aries', summary: 'Neptune entered Aries.' }),
      event({ id: 'aspect:Saturn:conjunction:Neptune', kind: 'transit_aspect', bodies: ['Saturn', 'Neptune'], aspect: 'conjunction', sign: 'Aries', summary: 'Saturn conjunct Neptune.' }),
      event({ id: 'ingress:Uranus:post_ingress', kind: 'sign_ingress_proximity', bodies: ['Uranus'], sign: 'Gemini', summary: 'Uranus entered Gemini.' }),
      event({ id: 'aspect:Uranus:square:North Node', kind: 'transit_aspect', bodies: ['Uranus', 'North Node'], aspect: 'square', summary: 'Uranus square North Node.' }),
      event({ id: 'ingress:Pluto:post_ingress', kind: 'sign_ingress_proximity', bodies: ['Pluto'], sign: 'Aquarius', summary: 'Pluto entered Aquarius.' }),
      event({ id: 'eclipse:solar_eclipse:Aries', kind: 'eclipse', bodies: ['Sun', 'Moon', 'North Node'], aspect: 'conjunction', sign: 'Aries', summary: 'Solar eclipse in Aries.' }),
      event({ id: 'station:Saturn', kind: 'station_proximity', bodies: ['Saturn'], sign: 'Aries', summary: 'Saturn near-station.' }),
      event({ id: 'station:Neptune', kind: 'station_proximity', bodies: ['Neptune'], sign: 'Aries', summary: 'Neptune near-station.' }),
    ]), '2026-05-08');

    expect(configurations.map((configuration) => configuration.id)).toEqual([
      'macro:lunation-trigger:saturn-neptune-aries',
      'macro:outer-ingress:saturn-neptune-aries',
      'macro:lunation-trigger:uranus-square-nodes',
      'macro:nodal:uranus-square-nodes',
      'macro:outer-ingress:uranus-in-gemini',
      'macro:outer-ingress:pluto-in-aquarius',
      'macro:station-stack:slow-body-pressure-window',
    ]);
    expect(configurations.find((configuration) => configuration.id === 'macro:outer-ingress:saturn-neptune-aries')).toMatchObject({
      kind: 'outer_planet_sign_ingress',
      eventIds: expect.arrayContaining([
        'ingress:Saturn:post_ingress',
        'ingress:Neptune:post_ingress',
        'aspect:Saturn:conjunction:Neptune',
      ]),
      landscape: {
        topicKey: 'saturn-neptune-aries',
      },
    });
    expect(configurations.find((configuration) => configuration.id === 'macro:station-stack:slow-body-pressure-window')?.eventIds).toEqual([
      'station:Neptune',
      'station:Saturn',
    ]);
  });

  it('does not fabricate macro configurations when family support is absent', () => {
    const configurations = buildMacroConfigurationsFromCurrentSky(currentSky([
      event({ id: 'lunation:new_moon:Taurus', kind: 'lunation', bodies: ['Sun', 'Moon'], aspect: 'conjunction', sign: 'Taurus', summary: 'New Moon in Taurus.' }),
      event({ id: 'aspect:Jupiter:trine:Mars', kind: 'transit_aspect', bodies: ['Jupiter', 'Mars'], aspect: 'trine', summary: 'Jupiter trine Mars.' }),
    ]), '2026-05-08');

    expect(configurations).toEqual([]);
  });

  it('keeps macro rarity fenced as not_computed for slice 1 receipts', () => {
    const [configuration] = buildMacroConfigurationsFromCurrentSky(currentSky([
      event({ id: 'ingress:Uranus:post_ingress', kind: 'sign_ingress_proximity', bodies: ['Uranus'], sign: 'Gemini', summary: 'Uranus entered Gemini.' }),
    ]), '2026-05-08');

    expect(configuration).toMatchObject({
      id: 'macro:outer-ingress:uranus-in-gemini',
      rarity: {
        status: 'not_computed',
        confidence: 'none',
        historicalGapYears: null,
        recurrenceWindow: {
          priorComparableDate: null,
          nextComparableDate: null,
          scanWindowDays: null,
        },
      },
    });
    expect(configuration.rarity.limitations.join(' ')).toContain('fenced in slice 1');
  });
});
