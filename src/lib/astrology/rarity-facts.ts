import { getPlanetaryPositions } from '@/lib/astrology/calculate-transits';
import { addDays, diffDays, findStationsInRange } from '@/lib/astrology/major-transits';
import type {
  CollectiveSkyHistoricalRarityFact,
  CollectiveSkyHistoricalRecurrence,
} from '@/lib/astrology/judgment-types';
import type { Aspect } from '@/lib/astrology/domain-types';

function dedupe(values: string[]) {
  return values.filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
}

const SLOW_BODY_INGRESS_SUPPORT = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);
const SLOW_BODY_STATION_SUPPORT = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);
const OUTER_ASPECT_SUPPORT = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);
const STATION_SCAN_WINDOWS: Partial<Record<string, number>> = {
  Jupiter: 220,
  Saturn: 220,
  Uranus: 220,
  Neptune: 220,
  Pluto: 220,
};
const OUTER_ASPECT_SCAN_WINDOW_DAYS = 900;
const OUTER_ASPECT_COMPARABLE_ORB = 2;

function shiftIsoDate(date: Date, dayDelta: number) {
  return new Date(date.getTime() + dayDelta * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function angleDifference(a: number, b: number) {
  const raw = Math.abs(normalizeLongitude(a) - normalizeLongitude(b)) % 360;
  return raw > 180 ? 360 - raw : raw;
}

function aspectAngle(aspect: Aspect) {
  switch (aspect) {
    case 'conjunction': return 0;
    case 'sextile': return 60;
    case 'square': return 90;
    case 'trine': return 120;
    case 'opposition': return 180;
  }
}

function buildCriteria(criteria: string[]) {
  return dedupe(criteria);
}

export function buildNotComputedHistoricalRarityFact(params: {
  score: number;
  limitations: string[];
  assessment?: CollectiveSkyHistoricalRarityFact['assessment'];
  method?: CollectiveSkyHistoricalRarityFact['method'];
  searchWindowDays?: number | null;
  comparisonCriteria?: string[];
}): CollectiveSkyHistoricalRarityFact {
  return {
    score: Number(params.score.toFixed(2)),
    basis: 'heuristic',
    status: 'not_computed',
    confidence: 'none',
    assessment: params.assessment ?? 'heuristic_only',
    method: params.method ?? 'none',
    searchWindowDays: params.searchWindowDays ?? null,
    comparisonCriteria: buildCriteria(params.comparisonCriteria ?? []),
    recurrence: null,
    limitations: dedupe(params.limitations),
    historicalGapYears: null,
  };
}

export function buildBoundedHistoricalRarityFact(params: {
  score: number;
  recurrence: CollectiveSkyHistoricalRecurrence;
  limitations: string[];
  method?: CollectiveSkyHistoricalRarityFact['method'];
  comparisonCriteria?: string[];
}): CollectiveSkyHistoricalRarityFact {
  return {
    score: Number(params.score.toFixed(2)),
    basis: 'heuristic',
    status: 'computed',
    confidence: 'bounded',
    assessment: 'computed_recurrence',
    method: params.method ?? 'historical_scan',
    searchWindowDays: params.recurrence.scanWindowDays,
    comparisonCriteria: buildCriteria(params.comparisonCriteria ?? []),
    recurrence: params.recurrence,
    limitations: dedupe(params.limitations),
    historicalGapYears: params.recurrence.spacingYears,
  };
}

export function buildSlowBodyIngressHistoricalRarityFact(params: {
  score: number;
  body: string;
  degree: number;
  speed: number;
  retrograde: boolean;
  date: Date | null;
  limitations?: string[];
}): CollectiveSkyHistoricalRarityFact {
  const baseLimitations = params.limitations ?? [];
  const comparisonCriteria = [
    'Same body sign-ingress spacing estimate from current sign degree and direct speed.',
    'Only supported slow bodies with a stable direct speed qualify.',
  ];

  if (!params.date) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'spacing_estimate',
      comparisonCriteria,
      limitations: [
        'Ingress spacing was not computed because no as-of date was provided to the current-sky scanner.',
        ...baseLimitations,
      ],
    });
  }

  if (params.body === 'North Node') {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'unsupported',
      method: 'spacing_estimate',
      comparisonCriteria,
      limitations: [
        'North Node ingress spacing stays fenced in this slice because the current scanner does not model node ingress timing conservatively enough.',
        ...baseLimitations,
      ],
    });
  }

  if (!SLOW_BODY_INGRESS_SUPPORT.has(params.body)) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'unsupported',
      method: 'spacing_estimate',
      comparisonCriteria,
      limitations: [
        'Ingress spacing is only estimated in this slice for supported slow direct bodies already represented in the current-sky scanner.',
        ...baseLimitations,
      ],
    });
  }

  if (!Number.isFinite(params.speed) || params.speed <= 0 || params.retrograde) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'spacing_estimate',
      comparisonCriteria,
      limitations: [
        'Ingress spacing is fenced when the body is retrograde, reversing, or missing a stable direct speed for a bounded estimate.',
        ...baseLimitations,
      ],
    });
  }

  const daysSincePriorIngress = params.degree / params.speed;
  const daysUntilNextIngress = (30 - params.degree) / params.speed;
  const spacingDays = Number((daysSincePriorIngress + daysUntilNextIngress).toFixed(2));

  return buildBoundedHistoricalRarityFact({
    score: params.score,
    method: 'spacing_estimate',
    comparisonCriteria,
    recurrence: {
      comparator: 'same_body_sign_ingress_spacing_estimate',
      scanWindowDays: Math.max(1, Math.ceil(spacingDays)),
      priorComparableEventDate: shiftIsoDate(params.date, -daysSincePriorIngress),
      nextComparableEventDate: shiftIsoDate(params.date, daysUntilNextIngress),
      spacingDays,
      spacingYears: Number((spacingDays / 365.25).toFixed(2)),
    },
    limitations: [
      'Ingress spacing is a bounded sign-boundary estimate from current ephemeris/speed, not a full historical frequency engine.',
      'Prior/next ingress dates are estimated from current sign position and instantaneous direct speed only.',
      ...baseLimitations,
    ],
  });
}

export function buildSlowBodyStationHistoricalRarityFact(params: {
  score: number;
  body: string;
  retrograde: boolean;
  date: Date | null;
  limitations?: string[];
}): CollectiveSkyHistoricalRarityFact {
  const baseLimitations = params.limitations ?? [];
  const comparisonCriteria = [
    'Adjacent alternating station pair for the same body inside a bounded local scan window.',
    'Daily ephemeris station detection only; no intraday exact timestamp solve.',
  ];

  if (!params.date) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'local_station_window',
      comparisonCriteria,
      limitations: [
        'Station spacing was not computed because no as-of date was provided to the current-sky scanner.',
        ...baseLimitations,
      ],
    });
  }

  if (!SLOW_BODY_STATION_SUPPORT.has(params.body)) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'unsupported',
      method: 'local_station_window',
      comparisonCriteria,
      limitations: [
        'Station spacing is only estimated in this slice for supported slow bodies with bounded local station windows.',
        ...baseLimitations,
      ],
    });
  }

  const windowDays = STATION_SCAN_WINDOWS[params.body];
  if (!windowDays) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'unsupported',
      method: 'local_station_window',
      comparisonCriteria,
      limitations: [
        'Station spacing stays fenced because no bounded station scan window is configured for this body.',
        ...baseLimitations,
      ],
    });
  }

  const targetKind = params.retrograde ? 'direct' : 'retrograde';
  const asOfIso = params.date.toISOString().slice(0, 10);
  const startIso = addDays(params.date, -windowDays).toISOString().slice(0, 10);
  const endIso = addDays(params.date, windowDays).toISOString().slice(0, 10);
  const stations = findStationsInRange(startIso, endIso, params.body);
  const targetStation = stations
    .filter((station) => station.kind === targetKind)
    .sort((a, b) => Math.abs(diffDays(a.date, asOfIso)) - Math.abs(diffDays(b.date, asOfIso)))[0] ?? null;

  if (!targetStation) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'local_station_window',
      searchWindowDays: windowDays,
      comparisonCriteria,
      limitations: [
        `No ${targetKind} station was found for ${params.body} inside the bounded ±${windowDays}-day local scan window.`,
        ...baseLimitations,
      ],
    });
  }

  const targetIndex = stations.findIndex((station) => station.date === targetStation.date && station.kind === targetStation.kind);
  const priorStation = targetIndex > 0 ? stations[targetIndex - 1] : null;

  if (!priorStation) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'local_station_window',
      searchWindowDays: windowDays,
      comparisonCriteria,
      limitations: [
        `A prior adjacent station was not found for ${params.body} before the estimated ${targetKind} station inside the bounded local scan window.`,
        ...baseLimitations,
      ],
    });
  }

  if (priorStation.kind === targetStation.kind) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'local_station_window',
      searchWindowDays: windowDays,
      comparisonCriteria,
      limitations: [
        `${params.body} station spacing stays fenced because the bounded local scan did not produce an alternating adjacent station pair.`,
        ...baseLimitations,
      ],
    });
  }

  const spacingDays = Number(Math.abs(diffDays(targetStation.date, priorStation.date)).toFixed(2));

  return buildBoundedHistoricalRarityFact({
    score: params.score,
    method: 'local_station_window',
    comparisonCriteria,
    recurrence: {
      comparator: 'same_body_station_window_spacing_estimate',
      scanWindowDays: windowDays,
      priorComparableEventDate: priorStation.date,
      nextComparableEventDate: targetStation.date,
      spacingDays,
      spacingYears: Number((spacingDays / 365.25).toFixed(2)),
    },
    limitations: [
      'Station spacing is a bounded local station-window estimate, not a full historical frequency engine.',
      'The computed dates come from daily ephemeris sign-change detection around the as-of date and may be off by about a day.',
      `This only covers supported slow-body ${priorStation.kind}→${targetStation.kind} station intervals around the current station window.`,
      ...baseLimitations,
    ],
  });
}

function getPairOrbOnDate(date: Date, bodyA: string, bodyB: string, aspect: Aspect) {
  const positions = getPlanetaryPositions(date);
  const first = positions.find((position) => position.label === bodyA);
  const second = positions.find((position) => position.label === bodyB);
  if (!first || !second) return null;
  return Math.abs(angleDifference(first.longitude, second.longitude) - aspectAngle(aspect));
}

function scanAspectWindows(params: {
  date: Date;
  bodyA: string;
  bodyB: string;
  aspect: Aspect;
  scanWindowDays: number;
  candidateOrb: number;
}) {
  const events: Array<{ date: string; orb: number }> = [];
  let active: Array<{ date: string; orb: number }> = [];

  const flush = () => {
    if (active.length === 0) return;
    const best = [...active].sort((a, b) => a.orb - b.orb)[0]!;
    events.push(best);
    active = [];
  };

  for (let delta = -params.scanWindowDays; delta <= params.scanWindowDays; delta += 1) {
    const day = addDays(params.date, delta);
    const iso = day.toISOString().slice(0, 10);
    const orb = getPairOrbOnDate(day, params.bodyA, params.bodyB, params.aspect);
    if (orb != null && orb <= params.candidateOrb) {
      active.push({ date: iso, orb: Number(orb.toFixed(2)) });
    } else {
      flush();
    }
  }
  flush();

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export function buildOuterPlanetAspectHistoricalRarityFact(params: {
  score: number;
  bodyA: string;
  bodyB: string;
  aspect: Aspect;
  orb: number;
  date: Date | null;
  limitations?: string[];
}): CollectiveSkyHistoricalRarityFact {
  const baseLimitations = params.limitations ?? [];
  const comparisonCriteria = [
    `Same ${params.bodyA}/${params.bodyB} ${params.aspect} recurrence inside a bounded ±${OUTER_ASPECT_SCAN_WINDOW_DAYS}-day daily ephemeris scan.`,
    `Comparable window requires the pair to tighten to ≤${OUTER_ASPECT_COMPARABLE_ORB.toFixed(1)}° orb.`,
  ];

  if (!params.date) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'bidirectional_scan',
      comparisonCriteria,
      limitations: [
        'Outer-planet aspect recurrence was not computed because no as-of date was provided to the current-sky scanner.',
        ...baseLimitations,
      ],
    });
  }

  if (!OUTER_ASPECT_SUPPORT.has(params.bodyA) || !OUTER_ASPECT_SUPPORT.has(params.bodyB)) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'unsupported',
      method: 'bidirectional_scan',
      comparisonCriteria,
      limitations: [
        'Historical aspect recurrence is only scanned in this slice for Jupiter/Saturn/Uranus/Neptune/Pluto pairs.',
        ...baseLimitations,
      ],
    });
  }

  if (params.orb > OUTER_ASPECT_COMPARABLE_ORB) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'bidirectional_scan',
      searchWindowDays: OUTER_ASPECT_SCAN_WINDOW_DAYS,
      comparisonCriteria,
      limitations: [
        `Historical aspect recurrence stays fenced unless the live ${params.bodyA}/${params.bodyB} ${params.aspect} is within ${OUTER_ASPECT_COMPARABLE_ORB.toFixed(1)}° orb.`,
        ...baseLimitations,
      ],
    });
  }

  const windows = scanAspectWindows({
    date: params.date,
    bodyA: params.bodyA,
    bodyB: params.bodyB,
    aspect: params.aspect,
    scanWindowDays: OUTER_ASPECT_SCAN_WINDOW_DAYS,
    candidateOrb: OUTER_ASPECT_COMPARABLE_ORB,
  });

  const asOfIso = params.date.toISOString().slice(0, 10);
  const currentIndex = windows.findIndex((event) => event.date === asOfIso);
  const anchorIndex = currentIndex >= 0
    ? currentIndex
    : windows.findIndex((event) => Math.abs(diffDays(event.date, asOfIso)) <= 7);

  if (anchorIndex < 0) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'bidirectional_scan',
      searchWindowDays: OUTER_ASPECT_SCAN_WINDOW_DAYS,
      comparisonCriteria,
      limitations: [
        `No comparable ${params.bodyA}/${params.bodyB} ${params.aspect} exact-window event was found near the as-of date inside the bounded scan.`,
        ...baseLimitations,
      ],
    });
  }

  const anchor = windows[anchorIndex]!;
  const prior = anchorIndex > 0 ? windows[anchorIndex - 1] : null;
  const next = anchorIndex < windows.length - 1 ? windows[anchorIndex + 1] : null;

  if (!prior) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      assessment: 'bounded_limited',
      method: 'bidirectional_scan',
      searchWindowDays: OUTER_ASPECT_SCAN_WINDOW_DAYS,
      comparisonCriteria,
      limitations: [
        `No prior comparable ${params.bodyA}/${params.bodyB} ${params.aspect} exact-window event was found inside the bounded ±${OUTER_ASPECT_SCAN_WINDOW_DAYS}-day scan.`,
        ...baseLimitations,
      ],
    });
  }

  const spacingDays = Number(Math.abs(diffDays(anchor.date, prior.date)).toFixed(2));
  return buildBoundedHistoricalRarityFact({
    score: params.score,
    method: 'bidirectional_scan',
    comparisonCriteria,
    recurrence: {
      comparator: 'same_outer_planet_aspect_window',
      scanWindowDays: OUTER_ASPECT_SCAN_WINDOW_DAYS,
      priorComparableEventDate: prior.date,
      nextComparableEventDate: next?.date ?? null,
      spacingDays,
      spacingYears: Number((spacingDays / 365.25).toFixed(2)),
    },
    limitations: [
      'Outer-planet aspect recurrence is a bounded daily exact-window scan, not a full multi-century aspect history engine.',
      'Comparable events are reduced to the tightest day inside each ≤2° orb window, so timing can drift by about a day.',
      ...baseLimitations,
    ],
  });
}
