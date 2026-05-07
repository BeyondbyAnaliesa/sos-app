import type { Aspect } from '@/lib/astrology/domain-types';
import type {
  AstrologyCollectiveSkyEvent,
  AstrologyJudgmentCurrentSky,
  CollectiveSkyBodyState,
  JudgmentPhase,
  JudgmentTier,
} from '@/lib/astrology/judgment-types';
import { detectLunationEvents } from '@/lib/astrology/lunation-events';

const SIGNS = [
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

const MAJOR_ASPECTS: Array<{ aspect: Aspect; angle: number; orb: number }> = [
  { aspect: 'conjunction', angle: 0, orb: 8 },
  { aspect: 'sextile', angle: 60, orb: 6 },
  { aspect: 'square', angle: 90, orb: 8 },
  { aspect: 'trine', angle: 120, orb: 8 },
  { aspect: 'opposition', angle: 180, orb: 8 },
];

const BODY_PRIORITY: Record<string, number> = {
  Sun: 0.9,
  Moon: 0.6,
  Mercury: 0.7,
  Venus: 0.8,
  Mars: 1,
  Jupiter: 1.4,
  Saturn: 1.5,
  Uranus: 1.7,
  Neptune: 1.7,
  Pluto: 1.8,
  Chiron: 1.1,
  'North Node': 1,
};

const INGRESS_RARITY: Record<string, number> = {
  Sun: 1,
  Moon: 1,
  Mercury: 2,
  Venus: 2,
  Mars: 2,
  Jupiter: 5,
  Saturn: 6,
  Uranus: 8,
  Neptune: 9,
  Pluto: 10,
  Chiron: 6,
  'North Node': 4,
};

const STATION_THRESHOLDS: Partial<Record<string, number>> = {
  Mercury: 0.2,
  Venus: 0.1,
  Mars: 0.05,
  Jupiter: 0.02,
  Saturn: 0.02,
  Uranus: 0.005,
  Neptune: 0.005,
  Pluto: 0.003,
  Chiron: 0.01,
};

const OUTER_OR_SOCIAL = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);

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

function relativeClassWeight(body: string) {
  return BODY_PRIORITY[body] ?? 0.8;
}

function aspectWeight(aspect: Aspect) {
  switch (aspect) {
    case 'conjunction': return 2;
    case 'opposition': return 1.85;
    case 'square': return 1.75;
    case 'trine': return 1.4;
    case 'sextile': return 1.2;
  }
}

function orbCloseness(orb: number) {
  return Math.max(0.25, 3.4 - Math.min(orb, 8) * 0.42);
}

function buildPairEmphasis(bodyA: string, bodyB: string) {
  const bothOuterOrSocial = OUTER_OR_SOCIAL.has(bodyA) && OUTER_OR_SOCIAL.has(bodyB);
  if (bothOuterOrSocial) return 1.6;
  if (OUTER_OR_SOCIAL.has(bodyA) || OUTER_OR_SOCIAL.has(bodyB)) return 0.9;
  return 0.2;
}

function computeAspectPhase(bodyA: CollectiveSkyBodyState, bodyB: CollectiveSkyBodyState, targetAngle: number, orb: number): { phase: JudgmentPhase; applyingStateKnown: boolean } {
  if (orb <= 0.5) return { phase: 'exact', applyingStateKnown: true };

  const nextDifference = angleDifference(bodyA.longitude + bodyA.speed, bodyB.longitude + bodyB.speed);
  const nextOrb = Math.abs(nextDifference - targetAngle);

  if (Math.abs(nextOrb - orb) <= 0.01) {
    return { phase: 'separating', applyingStateKnown: false };
  }

  return {
    phase: nextOrb < orb ? 'applying' : 'separating',
    applyingStateKnown: true,
  };
}

function eventScore(bodyA: CollectiveSkyBodyState, bodyB: CollectiveSkyBodyState, aspect: Aspect, orb: number, phase: JudgmentPhase) {
  const score =
    relativeClassWeight(bodyA.body) +
    relativeClassWeight(bodyB.body) +
    aspectWeight(aspect) +
    buildPairEmphasis(bodyA.body, bodyB.body) +
    orbCloseness(orb) +
    (phase === 'exact' ? 1.6 : phase === 'applying' ? 0.55 : 0);

  return Number(score.toFixed(2));
}

function rarityScoreForAspect(bodyA: string, bodyB: string, aspect: Aspect, orb: number) {
  const pairBonus = buildPairEmphasis(bodyA, bodyB);
  const conjunctionBonus = aspect === 'conjunction' ? 1.2 : aspect === 'opposition' || aspect === 'square' ? 0.7 : 0.2;
  return Math.min(10, Number((2.4 + pairBonus * 2 + conjunctionBonus + (orb <= 0.5 ? 1.2 : orb <= 2 ? 0.6 : 0)).toFixed(2)));
}

function consequenceScoreForAspect(bodyA: string, bodyB: string, aspect: Aspect, orb: number, phase: JudgmentPhase) {
  const hardAspectBonus = aspect === 'square' || aspect === 'opposition' || aspect === 'conjunction' ? 1.1 : 0.5;
  return Math.min(10, Number((2.1 + relativeClassWeight(bodyA) + relativeClassWeight(bodyB) + hardAspectBonus + orbCloseness(orb) * 0.55 + (phase === 'exact' ? 0.9 : 0)).toFixed(2)));
}

function buildAspectEvent(bodyA: CollectiveSkyBodyState, bodyB: CollectiveSkyBodyState, aspect: Aspect, angle: number, orb: number): AstrologyCollectiveSkyEvent {
  const { phase, applyingStateKnown } = computeAspectPhase(bodyA, bodyB, angle, orb);
  const score = eventScore(bodyA, bodyB, aspect, orb, phase);
  const rarityLimitations = [
    'Rarity score is heuristic in this slice and does not claim historical frequency.',
    'Historical gap data is not computed yet.',
  ];
  const consequenceLimitations = [
    'Consequence score is a deterministic weight, not a backtested outcome model.',
  ];

  return {
    id: `aspect:${bodyA.body}:${aspect}:${bodyB.body}`,
    kind: 'transit_aspect',
    tier: tierFromScore(score),
    score,
    scope: 'collective',
    bodies: [bodyA.body, bodyB.body],
    aspect,
    orb: Number(orb.toFixed(2)),
    phase,
    applyingStateKnown,
    sign: bodyA.sign === bodyB.sign ? bodyA.sign : null,
    exactnessBand: exactnessBand(orb),
    rarity: {
      score: rarityScoreForAspect(bodyA.body, bodyB.body, aspect, orb),
      basis: 'heuristic',
      limitations: rarityLimitations,
      historicalGapYears: null,
    },
    consequence: {
      score: consequenceScoreForAspect(bodyA.body, bodyB.body, aspect, orb, phase),
      basis: 'heuristic',
      limitations: consequenceLimitations,
      historicalGapYears: null,
    },
    summary: `${bodyA.body} ${aspect} ${bodyB.body} is active in the live sky.`,
    receipts: [
      `${bodyA.body}: ${bodyA.sign} ${bodyA.degree.toFixed(2)}°, speed ${bodyA.speed.toFixed(3)}°/day${bodyA.retrograde ? ' Rx' : ''}`,
      `${bodyB.body}: ${bodyB.sign} ${bodyB.degree.toFixed(2)}°, speed ${bodyB.speed.toFixed(3)}°/day${bodyB.retrograde ? ' Rx' : ''}`,
      `${aspect} orb ${orb.toFixed(2)}°, phase ${phase}${applyingStateKnown ? '' : ' (phase confidence limited)'}`,
    ],
    limitations: [
      'Exact peak timestamp is not solved in this slice; phase is inferred from one-day speed deltas.',
    ],
  };
}

function buildStationEvent(body: CollectiveSkyBodyState, threshold: number): AstrologyCollectiveSkyEvent {
  const score = Number((relativeClassWeight(body.body) + 3.2 + (OUTER_OR_SOCIAL.has(body.body) ? 1.6 : 0)).toFixed(2));
  const stationType = body.retrograde ? 'station_proximity_before_direct' : 'station_proximity_before_retrograde';
  return {
    id: `station:${body.body}`,
    kind: 'station_proximity',
    tier: tierFromScore(score),
    score,
    scope: 'collective',
    bodies: [body.body],
    aspect: null,
    orb: null,
    phase: null,
    applyingStateKnown: false,
    sign: body.sign,
    exactnessBand: null,
    rarity: {
      score: Math.min(10, Number((4 + relativeClassWeight(body.body) + (OUTER_OR_SOCIAL.has(body.body) ? 2 : 0.5)).toFixed(2))),
      basis: 'heuristic',
      limitations: [
        'Station rarity is heuristic in this slice and does not include historical recurrence analysis.',
      ],
      historicalGapYears: null,
    },
    consequence: {
      score: Math.min(10, Number((4.2 + relativeClassWeight(body.body) + (OUTER_OR_SOCIAL.has(body.body) ? 1.8 : 0.4)).toFixed(2))),
      basis: 'heuristic',
      limitations: [
        'Near-station consequence is based on current speed threshold only.',
      ],
      historicalGapYears: null,
    },
    summary: `${body.body} is moving slowly enough to qualify as near-station in the live sky scan.`,
    receipts: [
      `${body.body}: ${body.sign} ${body.degree.toFixed(2)}°, speed ${body.speed.toFixed(3)}°/day`,
      `Station threshold used: ±${threshold.toFixed(3)}°/day`,
      `Direction state: ${body.retrograde ? 'retrograde' : 'direct'} (${stationType})`,
    ],
    limitations: [
      'This slice detects near-station conditions, not the exact station timestamp/window.',
    ],
  };
}

function buildIngressEvent(body: CollectiveSkyBodyState, direction: 'pre_ingress' | 'post_ingress', degreesFromBoundary: number): AstrologyCollectiveSkyEvent {
  const ingressBase = INGRESS_RARITY[body.body] ?? 2;
  const score = Number((2.5 + relativeClassWeight(body.body) + ingressBase * 0.45 + orbCloseness(degreesFromBoundary)).toFixed(2));
  return {
    id: `ingress:${body.body}:${direction}`,
    kind: 'sign_ingress_proximity',
    tier: tierFromScore(score),
    score,
    scope: 'collective',
    bodies: [body.body],
    aspect: null,
    orb: Number(degreesFromBoundary.toFixed(2)),
    phase: null,
    applyingStateKnown: false,
    sign: body.sign,
    exactnessBand: exactnessBand(degreesFromBoundary),
    rarity: {
      score: Math.min(10, Number((ingressBase + (direction === 'post_ingress' ? 0.3 : 0)).toFixed(2))),
      basis: 'heuristic',
      limitations: [
        'Ingress rarity uses fixed body-class weights and does not compute prior-ingress history yet.',
      ],
      historicalGapYears: null,
    },
    consequence: {
      score: Math.min(10, Number((2.8 + relativeClassWeight(body.body) + ingressBase * 0.4).toFixed(2))),
      basis: 'heuristic',
      limitations: [
        'Ingress consequence score is structural weighting, not a historical outcome claim.',
      ],
      historicalGapYears: null,
    },
    summary: `${body.body} is within ${degreesFromBoundary.toFixed(2)}° of a sign boundary (${direction}).`,
    receipts: [
      `${body.body}: ${body.sign} ${body.degree.toFixed(2)}°`,
      `Boundary state: ${direction}`,
      `Degrees from boundary: ${degreesFromBoundary.toFixed(2)}°`,
    ],
    limitations: [
      'This slice flags sign-boundary pressure but does not compute exact ingress timestamps.',
    ],
  };
}

export function buildCollectiveSkyBodyState(input: {
  body: string;
  longitude: number;
  speed: number;
  retrograde: boolean;
}): CollectiveSkyBodyState {
  const normalized = normalizeLongitude(input.longitude);
  const signIndex = Math.floor(normalized / 30);
  return {
    body: input.body,
    sign: SIGNS[signIndex],
    degree: Number((normalized - signIndex * 30).toFixed(2)),
    longitude: normalized,
    speed: input.speed,
    retrograde: input.retrograde,
  };
}

export function scanCurrentSkyFromPositions(positions: CollectiveSkyBodyState[], options?: { date?: Date | null }): AstrologyJudgmentCurrentSky {
  const events: AstrologyCollectiveSkyEvent[] = [];

  events.push(...detectLunationEvents({ positions, date: options?.date ?? null }));

  for (let index = 0; index < positions.length; index += 1) {
    const body = positions[index];
    const threshold = STATION_THRESHOLDS[body.body];
    if (threshold != null && Math.abs(body.speed) <= threshold) {
      events.push(buildStationEvent(body, threshold));
    }

    if (body.degree >= 28) {
      events.push(buildIngressEvent(body, 'pre_ingress', 30 - body.degree));
    } else if (body.degree <= 2) {
      events.push(buildIngressEvent(body, 'post_ingress', body.degree));
    }

    for (let inner = index + 1; inner < positions.length; inner += 1) {
      const other = positions[inner];
      const difference = angleDifference(body.longitude, other.longitude);
      const match = MAJOR_ASPECTS.find((candidate) => Math.abs(difference - candidate.angle) <= candidate.orb);
      if (!match) continue;
      const orb = Math.abs(difference - match.angle);
      events.push(buildAspectEvent(body, other, match.aspect, match.angle, orb));
    }
  }

  const sortedEvents = events
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const rarityDiff = b.rarity.score - a.rarity.score;
      if (rarityDiff !== 0) return rarityDiff;
      return (a.orb ?? 999) - (b.orb ?? 999);
    })
    .slice(0, 12);

  const lead = sortedEvents[0] ?? null;
  const summary = lead
    ? `${lead.summary} ${sortedEvents.length > 1 ? `${sortedEvents.length - 1} additional collective sky events also cleared the current scan.` : ''}`
    : 'No major collective current-sky events cleared the scan thresholds for this slice.';

  return {
    status: 'collective-scan-v1',
    summary,
    scannedBodies: positions.map((position) => position.body),
    events: sortedEvents,
    limitations: [
      'Current sky scan covers Tier 1 transit-to-transit major aspects, near-stations, sign-boundary proximity, and lunation/eclipse detection only.',
      'Rarity and consequence scores are heuristic and explicitly do not claim historical proof.',
      'Historical-gap enrichment is currently bounded to lunation/eclipse event-class lookbacks only.',
      'No multi-body configuration detector is included in this slice.',
    ],
  };
}
