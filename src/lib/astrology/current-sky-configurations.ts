import type {
  AstrologyCollectiveSkyEvent,
  CollectiveSkyBodyState,
  JudgmentTier,
} from '@/lib/astrology/judgment-types';
import { buildNotComputedHistoricalRarityFact } from '@/lib/astrology/rarity-facts';
import { supportsCurrentSkyConfiguration } from '@/lib/astrology/object-inventory';

type PatternAspect = 'square' | 'opposition' | 'trine';
type PatternMatch = {
  aspect: PatternAspect;
  orb: number;
};

const PATTERN_SUPPORT = new Set([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]);

const SLOW_OR_SOCIAL = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);
const LUMINARIES = new Set(['Sun', 'Moon']);
const BODY_ORDER = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
] as const;
const BODY_RANK = new Map<string, number>(BODY_ORDER.map((body, index) => [body, index]));
const PATTERN_ORB_LIMIT = 3;

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function angleDifference(a: number, b: number) {
  const raw = Math.abs(normalizeLongitude(a) - normalizeLongitude(b)) % 360;
  return raw > 180 ? 360 - raw : raw;
}

function tierFromScore(score: number): JudgmentTier {
  if (score >= 6.5) return 'foreground';
  if (score >= 4.5) return 'supporting';
  if (score >= 2.8) return 'background';
  return 'noise';
}

function exactnessBand(orb: number | null) {
  if (orb == null) return null;
  if (orb <= 0.5) return 'exact';
  if (orb <= 2) return 'near_exact';
  return 'wide';
}

function sortBodies(bodies: CollectiveSkyBodyState[]) {
  return [...bodies].sort((a, b) => {
    const rankDiff = (BODY_RANK.get(a.body) ?? 999) - (BODY_RANK.get(b.body) ?? 999);
    if (rankDiff !== 0) return rankDiff;
    return a.longitude - b.longitude;
  });
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSignClusterEvents(positions: CollectiveSkyBodyState[]): AstrologyCollectiveSkyEvent[] {
  const buckets = new Map<string, CollectiveSkyBodyState[]>();
  for (const position of positions) {
    if (!supportsCurrentSkyConfiguration(position.body)) continue;
    const existing = buckets.get(position.sign) ?? [];
    existing.push(position);
    buckets.set(position.sign, existing);
  }

  const events: AstrologyCollectiveSkyEvent[] = [];

  for (const [sign, bodies] of buckets.entries()) {
    const sortedBodies = sortBodies(bodies);
    const slowCount = sortedBodies.filter((body) => SLOW_OR_SOCIAL.has(body.body)).length;
    const nonLuminaryCount = sortedBodies.filter((body) => !LUMINARIES.has(body.body)).length;
    const qualifies = sortedBodies.length >= 4 || (sortedBodies.length === 3 && slowCount >= 1 && nonLuminaryCount >= 2);
    if (!qualifies) continue;

    const spread = Number((Math.max(...sortedBodies.map((body) => body.degree)) - Math.min(...sortedBodies.map((body) => body.degree))).toFixed(2));
    const score = Number((6 + sortedBodies.length * 0.7 + slowCount * 0.45 + Math.max(0, 3 - Math.min(spread, 12)) * 0.12).toFixed(2));
    const rarityScore = Number((4 + sortedBodies.length * 0.45 + slowCount * 0.35).toFixed(2));
    const consequenceScore = Number((4.9 + sortedBodies.length * 0.55 + slowCount * 0.4).toFixed(2));
    const bodyLabels = sortedBodies.map((body) => body.body);

    events.push({
      id: `sign-cluster:${sign}:${bodyLabels.join('-')}`,
      kind: 'sign_cluster',
      tier: tierFromScore(score),
      score,
      scope: 'collective',
      bodies: bodyLabels,
      aspect: null,
      orb: spread,
      phase: null,
      applyingStateKnown: false,
      sign,
      exactnessBand: exactnessBand(spread),
      rarity: buildNotComputedHistoricalRarityFact({
        score: rarityScore,
        assessment: 'heuristic_only',
        method: 'none',
        comparisonCriteria: ['No bounded historical sign-concentration scan is configured in this slice.'],
        limitations: [
          'Sign-cluster rarity is heuristic in this slice and does not claim historical frequency.',
          'No historical sign-concentration scan is computed yet.',
        ],
      }),
      consequence: {
        score: Math.min(10, consequenceScore),
        basis: 'heuristic',
        limitations: [
          'Sign-cluster consequence is a structural weighting from body concentration only.',
        ],
        historicalGapYears: null,
      },
      summary: `${sign} sign concentration is active with ${bodyLabels.join(', ')} stacked in the same sign.`,
      receipts: [
        `${sign} count: ${sortedBodies.length} supported bodies`,
        ...sortedBodies.slice(0, 5).map((body) => `${body.body}: ${body.sign} ${body.degree.toFixed(2)}°${body.retrograde ? ' Rx' : ''}`),
        `Degree spread inside ${sign}: ${spread.toFixed(2)}°`,
      ],
      limitations: [
        'Configuration detector v1 only treats compact same-sign concentration as a collective cluster; it does not model houses, dispositors, or element balance.',
      ],
    });
  }

  return events
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

function matchPatternAspect(bodyA: CollectiveSkyBodyState, bodyB: CollectiveSkyBodyState): PatternMatch | null {
  const difference = angleDifference(bodyA.longitude, bodyB.longitude);
  const candidates: Array<{ aspect: PatternAspect; angle: number }> = [
    { aspect: 'square', angle: 90 },
    { aspect: 'opposition', angle: 180 },
    { aspect: 'trine', angle: 120 },
  ];

  for (const candidate of candidates) {
    const orb = Math.abs(difference - candidate.angle);
    if (orb <= PATTERN_ORB_LIMIT) {
      return {
        aspect: candidate.aspect,
        orb: Number(orb.toFixed(2)),
      };
    }
  }

  return null;
}

function pairKey(a: string, b: string) {
  return [a, b].sort().join('::');
}

function buildPatternMatrix(positions: CollectiveSkyBodyState[]) {
  const supported = positions.filter((position) => PATTERN_SUPPORT.has(position.body));
  const matrix = new Map<string, PatternMatch>();

  for (let index = 0; index < supported.length; index += 1) {
    for (let inner = index + 1; inner < supported.length; inner += 1) {
      const match = matchPatternAspect(supported[index], supported[inner]);
      if (match) {
        matrix.set(pairKey(supported[index].body, supported[inner].body), match);
      }
    }
  }

  return { supported, matrix };
}

function buildMajorAspectPatternEvents(positions: CollectiveSkyBodyState[]): AstrologyCollectiveSkyEvent[] {
  const { supported, matrix } = buildPatternMatrix(positions);
  const events: AstrologyCollectiveSkyEvent[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < supported.length; index += 1) {
    for (let inner = index + 1; inner < supported.length; inner += 1) {
      const opposition = matrix.get(pairKey(supported[index].body, supported[inner].body));
      if (opposition?.aspect !== 'opposition') continue;

      for (const apex of supported) {
        if (apex.body === supported[index].body || apex.body === supported[inner].body) continue;
        const squareA = matrix.get(pairKey(apex.body, supported[index].body));
        const squareB = matrix.get(pairKey(apex.body, supported[inner].body));
        if (squareA?.aspect !== 'square' || squareB?.aspect !== 'square') continue;

        const bodies = [apex, supported[index], supported[inner]];
        const slowCount = bodies.filter((body) => SLOW_OR_SOCIAL.has(body.body)).length;
        const maxOrb = Math.max(opposition.orb, squareA.orb, squareB.orb);
        const avgOrb = average([opposition.orb, squareA.orb, squareB.orb]);
        if (slowCount < 1 || maxOrb > PATTERN_ORB_LIMIT || avgOrb > 2.4) continue;

        const key = `t-square:${[apex.body, supported[index].body, supported[inner].body].sort().join(':')}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const score = Number((8.4 + slowCount * 0.4 + Math.max(0, 3 - avgOrb) * 0.45).toFixed(2));
        events.push({
          id: key,
          kind: 'major_aspect_pattern',
          tier: tierFromScore(score),
          score,
          scope: 'collective',
          bodies: [apex.body, supported[index].body, supported[inner].body],
          aspect: null,
          orb: Number(avgOrb.toFixed(2)),
          phase: null,
          applyingStateKnown: false,
          sign: null,
          exactnessBand: exactnessBand(avgOrb),
          rarity: buildNotComputedHistoricalRarityFact({
            score: Number((6.2 + slowCount * 0.35 + Math.max(0, 3 - maxOrb) * 0.2).toFixed(2)),
            assessment: 'heuristic_only',
            method: 'none',
            comparisonCriteria: ['No bounded historical multi-body configuration scan is configured in this slice.'],
            limitations: [
              'Major-aspect-pattern rarity is heuristic in this slice and does not claim historical frequency.',
              'No historical multi-body configuration scan is computed yet.',
            ],
          }),
          consequence: {
            score: Math.min(10, Number((6.8 + slowCount * 0.35 + Math.max(0, 3 - avgOrb) * 0.25).toFixed(2))),
            basis: 'heuristic',
            limitations: [
              'Major-aspect-pattern consequence is structural weighting from tight major-aspect geometry only.',
            ],
            historicalGapYears: null,
          },
          summary: `A tight T-square links ${apex.body}, ${supported[index].body}, and ${supported[inner].body} in the live sky.`,
          receipts: [
            `${supported[index].body} opposite ${supported[inner].body} orb ${opposition.orb.toFixed(2)}°`,
            `${apex.body} square ${supported[index].body} orb ${squareA.orb.toFixed(2)}°`,
            `${apex.body} square ${supported[inner].body} orb ${squareB.orb.toFixed(2)}°`,
            `Average pattern orb ${avgOrb.toFixed(2)}°`,
          ],
          limitations: [
            'Configuration detector v1 only flags tight T-squares from square/opposition geometry; no minor aspects, midpoint work, or house projection is included.',
          ],
        });
      }
    }
  }

  for (let a = 0; a < supported.length; a += 1) {
    for (let b = a + 1; b < supported.length; b += 1) {
      for (let c = b + 1; c < supported.length; c += 1) {
        const bodyA = supported[a];
        const bodyB = supported[b];
        const bodyC = supported[c];
        const trineAB = matrix.get(pairKey(bodyA.body, bodyB.body));
        const trineAC = matrix.get(pairKey(bodyA.body, bodyC.body));
        const trineBC = matrix.get(pairKey(bodyB.body, bodyC.body));
        if (trineAB?.aspect !== 'trine' || trineAC?.aspect !== 'trine' || trineBC?.aspect !== 'trine') continue;

        const bodies = [bodyA, bodyB, bodyC];
        const slowCount = bodies.filter((body) => SLOW_OR_SOCIAL.has(body.body)).length;
        const avgOrb = average([trineAB.orb, trineAC.orb, trineBC.orb]);
        const maxOrb = Math.max(trineAB.orb, trineAC.orb, trineBC.orb);
        if (slowCount < 1 || maxOrb > PATTERN_ORB_LIMIT || avgOrb > 2.4) continue;

        const orderedBodies = sortBodies(bodies);
        const key = `grand-trine:${orderedBodies.map((body) => body.body).join(':')}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const score = Number((7.7 + slowCount * 0.35 + Math.max(0, 3 - avgOrb) * 0.35).toFixed(2));
        events.push({
          id: key,
          kind: 'major_aspect_pattern',
          tier: tierFromScore(score),
          score,
          scope: 'collective',
          bodies: orderedBodies.map((body) => body.body),
          aspect: null,
          orb: Number(avgOrb.toFixed(2)),
          phase: null,
          applyingStateKnown: false,
          sign: null,
          exactnessBand: exactnessBand(avgOrb),
          rarity: buildNotComputedHistoricalRarityFact({
            score: Number((5.7 + slowCount * 0.3 + Math.max(0, 3 - maxOrb) * 0.18).toFixed(2)),
            assessment: 'heuristic_only',
            method: 'none',
            comparisonCriteria: ['No bounded historical multi-body configuration scan is configured in this slice.'],
            limitations: [
              'Major-aspect-pattern rarity is heuristic in this slice and does not claim historical frequency.',
              'No historical multi-body configuration scan is computed yet.',
            ],
          }),
          consequence: {
            score: Math.min(10, Number((5.8 + slowCount * 0.25 + Math.max(0, 3 - avgOrb) * 0.2).toFixed(2))),
            basis: 'heuristic',
            limitations: [
              'Major-aspect-pattern consequence is structural weighting from tight major-aspect geometry only.',
            ],
            historicalGapYears: null,
          },
          summary: `A tight grand trine links ${orderedBodies.map((body) => body.body).join(', ')} in the live sky.`,
          receipts: [
            `${bodyA.body} trine ${bodyB.body} orb ${trineAB.orb.toFixed(2)}°`,
            `${bodyA.body} trine ${bodyC.body} orb ${trineAC.orb.toFixed(2)}°`,
            `${bodyB.body} trine ${bodyC.body} orb ${trineBC.orb.toFixed(2)}°`,
            `Average pattern orb ${avgOrb.toFixed(2)}°`,
          ],
          limitations: [
            'Configuration detector v1 only flags tight grand trines from trine geometry; no element weighting beyond exact aspect structure is added.',
          ],
        });
      }
    }
  }

  return events
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.orb ?? 999) - (b.orb ?? 999);
    })
    .slice(0, 3);
}

export function detectCurrentSkyConfigurations(positions: CollectiveSkyBodyState[]) {
  return [
    ...buildMajorAspectPatternEvents(positions),
    ...buildSignClusterEvents(positions),
  ];
}
