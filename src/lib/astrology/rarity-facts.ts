import type {
  CollectiveSkyHistoricalRarityFact,
  CollectiveSkyHistoricalRecurrence,
} from '@/lib/astrology/judgment-types';

function dedupe(values: string[]) {
  return values.filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
}

const SLOW_BODY_INGRESS_SUPPORT = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']);

function shiftIsoDate(date: Date, dayDelta: number) {
  return new Date(date.getTime() + dayDelta * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function buildNotComputedHistoricalRarityFact(params: {
  score: number;
  limitations: string[];
}): CollectiveSkyHistoricalRarityFact {
  return {
    score: Number(params.score.toFixed(2)),
    basis: 'heuristic',
    status: 'not_computed',
    confidence: 'none',
    recurrence: null,
    limitations: dedupe(params.limitations),
    historicalGapYears: null,
  };
}

export function buildBoundedHistoricalRarityFact(params: {
  score: number;
  recurrence: CollectiveSkyHistoricalRecurrence;
  limitations: string[];
}): CollectiveSkyHistoricalRarityFact {
  return {
    score: Number(params.score.toFixed(2)),
    basis: 'heuristic',
    status: 'computed',
    confidence: 'bounded',
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

  if (!params.date) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      limitations: [
        'Ingress spacing was not computed because no as-of date was provided to the current-sky scanner.',
        ...baseLimitations,
      ],
    });
  }

  if (params.body === 'North Node') {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      limitations: [
        'North Node ingress spacing stays fenced in this slice because the current scanner does not model node ingress timing conservatively enough.',
        ...baseLimitations,
      ],
    });
  }

  if (!SLOW_BODY_INGRESS_SUPPORT.has(params.body)) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
      limitations: [
        'Ingress spacing is only estimated in this slice for supported slow direct bodies already represented in the current-sky scanner.',
        ...baseLimitations,
      ],
    });
  }

  if (!Number.isFinite(params.speed) || params.speed <= 0 || params.retrograde) {
    return buildNotComputedHistoricalRarityFact({
      score: params.score,
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
