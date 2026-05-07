import { getPlanetaryPositions } from '@/lib/astrology/calculate-transits';
import type {
  AstrologyCollectiveSkyEvent,
  CollectiveSkyBodyState,
  JudgmentPhase,
  JudgmentTier,
} from '@/lib/astrology/judgment-types';

const LUNATION_ORB_DEGREES = 5;
const ECLIPSE_NODE_AXIS_ORB_DEGREES = 13;
const LUNATION_HISTORY_SCAN_DAYS = 45;
const ECLIPSE_HISTORY_SCAN_DAYS = 400;

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function angleDifference(a: number, b: number) {
  const raw = Math.abs(normalizeLongitude(a) - normalizeLongitude(b)) % 360;
  return raw > 180 ? 360 - raw : raw;
}

function signedShortestDistance(a: number, b: number) {
  const delta = ((normalizeLongitude(a) - normalizeLongitude(b) + 540) % 360) - 180;
  return delta === -180 ? 180 : delta;
}

function exactnessBand(orb: number | null): 'exact' | 'near_exact' | 'wide' | null {
  if (orb == null) return null;
  if (orb <= 0.5) return 'exact';
  if (orb <= 2) return 'near_exact';
  return 'wide';
}

function tierFromScore(score: number): JudgmentTier {
  if (score >= 6.5) return 'foreground';
  if (score >= 4.5) return 'supporting';
  if (score >= 2.8) return 'background';
  return 'noise';
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

function toCollectiveBodyState(label: string, longitude: number, speed: number, retrograde: boolean): CollectiveSkyBodyState {
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

  const normalized = normalizeLongitude(longitude);
  const signIndex = Math.floor(normalized / 30);

  return {
    body: label,
    sign: signs[signIndex],
    degree: Number((normalized - signIndex * 30).toFixed(2)),
    longitude: normalized,
    speed,
    retrograde,
  };
}

function classifyLunationContext(positions: CollectiveSkyBodyState[]) {
  const sun = positions.find((position) => position.body === 'Sun');
  const moon = positions.find((position) => position.body === 'Moon');
  const northNode = positions.find((position) => position.body === 'North Node');

  if (!sun || !moon || !northNode) return null;

  const sunMoonDifference = angleDifference(sun.longitude, moon.longitude);
  const newMoonOrb = Math.abs(sunMoonDifference);
  const fullMoonOrb = Math.abs(sunMoonDifference - 180);
  const isNewMoon = newMoonOrb <= LUNATION_ORB_DEGREES;
  const isFullMoon = fullMoonOrb <= LUNATION_ORB_DEGREES;

  if (!isNewMoon && !isFullMoon) return null;

  const targetAngle = isNewMoon ? 0 : 180;
  const lunationOrb = isNewMoon ? newMoonOrb : fullMoonOrb;
  const nodeDistance = Math.abs(signedShortestDistance(moon.longitude, northNode.longitude));
  const nodeAxisOrb = Math.min(nodeDistance, Math.abs(nodeDistance - 180));
  const lunationType = isNewMoon ? 'new_moon' : 'full_moon';
  const eclipseType = isNewMoon ? 'solar_eclipse' : 'lunar_eclipse';
  const { phase, applyingStateKnown } = computeAspectPhase(sun, moon, targetAngle, lunationOrb);

  return {
    sun,
    moon,
    northNode,
    sign: sun.sign,
    lunationType,
    eclipseType,
    lunationOrb: Number(lunationOrb.toFixed(2)),
    nodeAxisOrb: Number(nodeAxisOrb.toFixed(2)),
    isEclipse: nodeAxisOrb <= ECLIPSE_NODE_AXIS_ORB_DEGREES,
    phase,
    applyingStateKnown,
    exactnessBand: exactnessBand(lunationOrb),
  };
}

function classifyLunationContextFromDate(date: Date) {
  const positions = getPlanetaryPositions(date).map((position) => toCollectiveBodyState(position.label, position.longitude, position.speed, position.retrograde));
  return classifyLunationContext(positions);
}

function scanHistoricalGapYears(params: {
  date: Date | null;
  mode: 'lunation' | 'eclipse';
  matcher: (candidate: NonNullable<ReturnType<typeof classifyLunationContext>>) => boolean;
}) {
  if (!params.date) {
    return {
      historicalGapYears: null,
      limitations: ['Historical-gap scan was skipped because no as-of date was provided to the current-sky scanner.'],
    };
  }

  const limitDays = params.mode === 'eclipse' ? ECLIPSE_HISTORY_SCAN_DAYS : LUNATION_HISTORY_SCAN_DAYS;

  for (let day = 1; day <= limitDays; day += 1) {
    const priorDate = new Date(params.date);
    priorDate.setUTCDate(priorDate.getUTCDate() - day);
    const candidate = classifyLunationContextFromDate(priorDate);
    if (!candidate || !params.matcher(candidate)) continue;

    return {
      historicalGapYears: Number((day / 365.25).toFixed(2)),
      limitations: [
        `Historical gap only measures the prior detected ${params.mode} inside a bounded ${limitDays}-day backward scan.`,
        params.mode === 'eclipse'
          ? 'This does not claim Saros-family continuity or exact eclipse-series history.'
          : 'This does not claim annual sign-family recurrence beyond the bounded backward scan.',
      ],
    };
  }

  return {
    historicalGapYears: null,
    limitations: [`No prior comparable ${params.mode} was found inside the bounded ${limitDays}-day backward scan.`],
  };
}

export function detectLunationEvents(params: {
  positions: CollectiveSkyBodyState[];
  date?: Date | null;
}): AstrologyCollectiveSkyEvent[] {
  const context = classifyLunationContext(params.positions);
  if (!context) return [];

  const lunationHistory = scanHistoricalGapYears({
    date: params.date ?? null,
    mode: 'lunation',
    matcher: (candidate) => candidate.lunationType === context.lunationType,
  });

  const lunationScore = Number((9.2 + (context.lunationType === 'full_moon' ? 0.2 : 0) + (context.exactnessBand === 'exact' ? 1 : context.exactnessBand === 'near_exact' ? 0.5 : 0.15)).toFixed(2));
  const lunationEvent: AstrologyCollectiveSkyEvent = {
    id: `lunation:${context.lunationType}:${context.sign}`,
    kind: 'lunation',
    tier: tierFromScore(lunationScore),
    score: lunationScore,
    scope: 'collective',
    bodies: ['Sun', 'Moon'],
    aspect: context.lunationType === 'new_moon' ? 'conjunction' : 'opposition',
    orb: context.lunationOrb,
    phase: context.phase,
    applyingStateKnown: context.applyingStateKnown,
    sign: context.sign,
    exactnessBand: context.exactnessBand,
    rarity: {
      score: Number((4.8 + (context.exactnessBand === 'exact' ? 0.5 : 0)).toFixed(2)),
      basis: 'heuristic',
      limitations: [
        'Lunation rarity is event-class weighting plus bounded prior-event spacing, not a full historical frequency engine.',
        ...lunationHistory.limitations,
      ],
      historicalGapYears: lunationHistory.historicalGapYears,
    },
    consequence: {
      score: Number((5.4 + (context.lunationType === 'full_moon' ? 0.2 : 0) + (context.exactnessBand === 'exact' ? 0.7 : 0)).toFixed(2)),
      basis: 'heuristic',
      limitations: [
        'Lunation consequence is deterministic event weighting and does not claim outcome prediction.',
        ...lunationHistory.limitations,
      ],
      historicalGapYears: lunationHistory.historicalGapYears,
    },
    summary: `${context.lunationType === 'new_moon' ? 'New Moon' : 'Full Moon'} pressure is active in ${context.sign}.`,
    receipts: [
      `Sun: ${context.sun.sign} ${context.sun.degree.toFixed(2)}°, speed ${context.sun.speed.toFixed(3)}°/day`,
      `Moon: ${context.moon.sign} ${context.moon.degree.toFixed(2)}°, speed ${context.moon.speed.toFixed(3)}°/day`,
      `${context.lunationType === 'new_moon' ? 'Sun/Moon conjunction' : 'Sun/Moon opposition'} orb ${context.lunationOrb.toFixed(2)}°, phase ${context.phase}`,
      `North Node axis distance: ${context.nodeAxisOrb.toFixed(2)}°`,
    ],
    limitations: [
      'Lunation detection uses Sun/Moon angular proximity at the scan timestamp; it does not solve the exact peak minute.',
      ...lunationHistory.limitations,
    ],
  };

  if (!context.isEclipse) return [lunationEvent];

  const eclipseHistory = scanHistoricalGapYears({
    date: params.date ?? null,
    mode: 'eclipse',
    matcher: (candidate) => candidate.isEclipse && candidate.eclipseType === context.eclipseType,
  });

  const eclipseScore = Number((11 + (context.exactnessBand === 'exact' ? 1 : 0.55) + Math.max(0, (ECLIPSE_NODE_AXIS_ORB_DEGREES - context.nodeAxisOrb) * 0.07)).toFixed(2));
  const eclipseEvent: AstrologyCollectiveSkyEvent = {
    id: `eclipse:${context.eclipseType}:${context.sign}`,
    kind: 'eclipse',
    tier: tierFromScore(eclipseScore),
    score: eclipseScore,
    scope: 'collective',
    bodies: ['Sun', 'Moon', 'North Node'],
    aspect: context.lunationType === 'new_moon' ? 'conjunction' : 'opposition',
    orb: context.lunationOrb,
    phase: context.phase,
    applyingStateKnown: context.applyingStateKnown,
    sign: context.sign,
    exactnessBand: context.exactnessBand,
    rarity: {
      score: Number((7.2 + Math.max(0, (ECLIPSE_NODE_AXIS_ORB_DEGREES - context.nodeAxisOrb) * 0.07)).toFixed(2)),
      basis: 'heuristic',
      limitations: [
        'Eclipse rarity uses node-axis proximity plus bounded prior-event spacing only.',
        ...eclipseHistory.limitations,
      ],
      historicalGapYears: eclipseHistory.historicalGapYears,
    },
    consequence: {
      score: Number((7.4 + (context.exactnessBand === 'exact' ? 0.6 : 0.25)).toFixed(2)),
      basis: 'heuristic',
      limitations: [
        'Eclipse consequence is deterministic weighting from lunation tightness and node-axis proximity, not a historical outcome model.',
        ...eclipseHistory.limitations,
      ],
      historicalGapYears: eclipseHistory.historicalGapYears,
    },
    summary: `${context.eclipseType === 'solar_eclipse' ? 'Solar eclipse' : 'Lunar eclipse'} conditions are active in ${context.sign}.`,
    receipts: [
      ...lunationEvent.receipts,
      `Eclipse rule: node-axis distance ${context.nodeAxisOrb.toFixed(2)}° ≤ ${ECLIPSE_NODE_AXIS_ORB_DEGREES.toFixed(2)}°`,
    ],
    limitations: [
      'Eclipse detection is deterministic from Sun/Moon/Node geometry at the scan timestamp and does not model visibility path or Saros lineage.',
      ...eclipseHistory.limitations,
    ],
  };

  return [eclipseEvent, lunationEvent];
}
