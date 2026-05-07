import type {
  CollectiveSkyHistoricalRarityFact,
  CollectiveSkyHistoricalRecurrence,
} from '@/lib/astrology/judgment-types';

function dedupe(values: string[]) {
  return values.filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
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
