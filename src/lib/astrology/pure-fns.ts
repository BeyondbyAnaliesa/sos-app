/**
 * pure-fns.ts
 *
 * Pure, side-effect-free functions extracted from the memory stack.
 * These are the high-leverage deterministic behaviors that the eval layer
 * tests directly. No Supabase, no I/O, no env vars.
 *
 * Imported by memory-store.ts and memory-pipeline.ts so a single
 * implementation serves both production and test paths.
 */

import { createHash } from 'crypto';
import type { Transit, DailyTransits } from './domain-types';

// ── Tombstone formatting ──────────────────────────────────────────────────────

export interface ArcTombstoneInput {
  transit_planet: string;
  aspect_type: string;
  natal_target: string;
  first_active_date: string;
  last_active_date?: string | null;
  tightest_orb?: number | null;
  peak_orb?: number | null;
  exact_dates_json?: unknown;
  last_direction?: string | null;
  recurrence_count?: number | null;
  parent_arc_id?: string | null;
}

/**
 * Generate a structured, rule-based tombstone for a closing arc.
 *
 * Evidence discipline:
 * - Every field maps directly to a stored column (no inference).
 * - An arc with `exact_dates_json: []` will read "no exact crossing recorded".
 *   It will NEVER claim exactness.
 * - Idempotent: the same input always produces the same string.
 */
export function buildArcTombstone(arc: ArcTombstoneInput): string {
  const {
    transit_planet,
    aspect_type,
    natal_target,
    first_active_date,
    last_active_date,
    tightest_orb,
    peak_orb,
    exact_dates_json,
    last_direction,
    recurrence_count,
    parent_arc_id,
  } = arc;

  // Use last_active_date (last day actually seen) as close date; fall back to first
  const closeDate = last_active_date ?? first_active_date;

  const formatDate = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const durationDays = Math.max(
    1,
    Math.round(
      (new Date(`${closeDate}T12:00:00Z`).getTime() -
        new Date(`${first_active_date}T12:00:00Z`).getTime()) /
        86400000,
    ) + 1,
  );

  const tightest = tightest_orb ?? peak_orb;
  // Filter: only retain non-empty string items from exact_dates_json.
  // Null, undefined, or non-string entries (possible from corrupt DB state or old pipeline bugs)
  // would produce "Invalid Date" strings via formatDate — violating the evidence-boundary rule
  // that says "NEVER claim exactness" without a parseable date.
  // Filtering them out means: corrupt/null items fall through to "no exact crossing recorded"
  // instead of surfacing misleading date strings in the tombstone.
  const exactDates = Array.isArray(exact_dates_json)
    ? (exact_dates_json as unknown[]).filter(
        (d): d is string => typeof d === 'string' && d.length > 0,
      )
    : [];

  const parts: string[] = [
    `${transit_planet} ${aspect_type} ${natal_target} — ${durationDays} day${durationDays === 1 ? '' : 's'} (${formatDate(first_active_date)}–${formatDate(closeDate)})`,
  ];

  if (tightest != null) parts.push(`tightest orb ${tightest.toFixed(2)}°`);

  if (exactDates.length > 0) {
    const dateList = exactDates.slice(0, 3).map(formatDate).join(', ');
    parts.push(`exact ${exactDates.length}× (${dateList})`);
  } else {
    // Guard: zero exact_dates → "no exact crossing recorded". Never claims exactness.
    parts.push('no exact crossing recorded');
  }

  if (last_direction === 'widening') parts.push('closed widening');
  else if (last_direction === 'tightening') parts.push('closed tightening — may return');

  if (recurrence_count && recurrence_count > 1) {
    parts.push(`recurrence ${recurrence_count}${parent_arc_id ? ' (return family)' : ''}`);
  }

  return parts.join(' · ');
}

// ── Transit-set hash ──────────────────────────────────────────────────────────

/**
 * Compute a 16-char SHA-256 prefix from a sorted, normalized transit set.
 *
 * Properties:
 * - Same transits in any order → same hash (input is sorted before hashing).
 * - Any orb change → different hash (orbs are included with 2 decimal places).
 * - Empty transit set → deterministic hash of the empty string.
 * - Idempotent: pure function of the transit array.
 */
export function computeTransitSetHash(transits: Transit[]): string {
  const normalized = [...transits]
    .sort((a, b) => {
      const ka = `${a.transitPlanet}|${a.aspect}|${a.natalPlanet}`;
      const kb = `${b.transitPlanet}|${b.aspect}|${b.natalPlanet}`;
      return ka.localeCompare(kb);
    })
    .map((t) => `${t.transitPlanet}|${t.aspect}|${t.natalPlanet}|${t.orb.toFixed(2)}`)
    .join(',');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

// ── Arc phase inference ────────────────────────────────────────────────────────

type ActiveArcState = 'approaching' | 'exact' | 'separating' | 'returning';

/**
 * Infer the correct orb-direction label given two consecutive orb readings.
 */
export function inferOrbDirection(
  currentOrb: number,
  previousOrb: number | null | undefined,
): 'tightening' | 'widening' | 'unknown' {
  if (previousOrb == null) return 'unknown';
  if (currentOrb < previousOrb) return 'tightening';
  if (currentOrb > previousOrb) return 'widening';
  return 'unknown'; // identical orb — no movement observable
}

/**
 * Infer the next state for a BRAND-NEW arc (no prior DB row).
 * Handles both the fresh-arc path and the return-family path's state assignment.
 *
 * Rule: only 'exact' when orb ≤ 0.5°; otherwise 'approaching'.
 */
export function inferNewArcState(currentOrb: number): 'approaching' | 'exact' {
  return currentOrb <= 0.5 ? 'exact' : 'approaching';
}

/**
 * Infer the updated state for an EXISTING (already-active) arc.
 *
 * Phase rules:
 * 1. orb ≤ 0.5° → 'exact'  (absolute truth: crossing is at peak)
 * 2. direction tightening → 'approaching'  (moving toward exact)
 * 3. direction widening + prior exact dates → 'separating'  (past the peak, moving away)
 * 4. direction widening + NO prior exact dates → 'approaching'  (widening but never hit exact — still approaching)
 * 5. direction unknown → preserve current active state  (no movement observable; keep prior)
 *
 * Hard constraint: a separating arc MUST have at least one prior exact date.
 * This is enforced at the call site by checking priorExactDates.length.
 */
export function inferUpdatedArcState(params: {
  currentOrb: number;
  previousOrb: number | null | undefined;
  currentState: ActiveArcState | string;
  priorExactDates: string[];
}): ActiveArcState {
  const { currentOrb, previousOrb, currentState, priorExactDates } = params;

  if (currentOrb <= 0.5) return 'exact';

  const dir = inferOrbDirection(currentOrb, previousOrb);

  if (dir === 'tightening') return 'approaching';
  if (dir === 'widening') {
    return priorExactDates.length > 0 ? 'separating' : 'approaching';
  }

  // Unknown direction: preserve current active state, default to approaching
  const active: ActiveArcState[] = ['approaching', 'exact', 'separating', 'returning'];
  if (active.includes(currentState as ActiveArcState)) return currentState as ActiveArcState;
  return 'approaching';
}

// ── Bounded backfill helpers ────────────────────────────────────────────────────

/**
 * Maximum number of days allowed in a single bounded backfill request.
 * Acts as a hard operator safety cap — prevents accidental unbounded sweeps.
 */
export const BACKFILL_MAX_DAYS = 365;

/**
 * Enumerate every date (YYYY-MM-DD) in the closed range [startDate, endDate],
 * inclusive, in ascending chronological order.
 *
 * Uses UTC noon for internal arithmetic to avoid DST boundary edge cases.
 * Pure: no I/O, fully deterministic.
 *
 * @example
 *   enumerateDateRange('2025-01-01', '2025-01-03')
 *   // → ['2025-01-01', '2025-01-02', '2025-01-03']
 */
export function enumerateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00Z`);
  const end     = new Date(`${endDate}T12:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Validate the parameters for a bounded historical backfill call.
 *
 * Enforced rules:
 * - userId must be a non-empty string
 * - startDate and endDate must match YYYY-MM-DD
 * - both dates must be parseable as real calendar dates
 * - startDate ≤ endDate
 * - date span must not exceed maxDays (default: BACKFILL_MAX_DAYS)
 *
 * Returns `{ valid: true }` on success or `{ valid: false, error: string }` on
 * first failure. Pure: no I/O, no side effects.
 */
export function validateBackfillParams(
  userId: unknown,
  startDate: unknown,
  endDate: unknown,
  maxDays = BACKFILL_MAX_DAYS,
): { valid: true } | { valid: false; error: string } {
  if (typeof userId !== 'string' || !userId.trim()) {
    return { valid: false, error: 'backfill requires a single non-empty userId' };
  }

  const isoDateRe = /^\d{4}-\d{2}-\d{2}$/;

  if (typeof startDate !== 'string' || !isoDateRe.test(startDate)) {
    return { valid: false, error: 'startDate must be a YYYY-MM-DD string' };
  }
  if (typeof endDate !== 'string' || !isoDateRe.test(endDate)) {
    return { valid: false, error: 'endDate must be a YYYY-MM-DD string' };
  }

  const startMs = new Date(`${startDate}T12:00:00Z`).getTime();
  const endMs   = new Date(`${endDate}T12:00:00Z`).getTime();

  if (isNaN(startMs)) {
    return { valid: false, error: `startDate is not a valid calendar date: ${startDate}` };
  }
  if (isNaN(endMs)) {
    return { valid: false, error: `endDate is not a valid calendar date: ${endDate}` };
  }
  if (endMs < startMs) {
    return { valid: false, error: 'endDate must be on or after startDate' };
  }

  const dayCount = Math.round((endMs - startMs) / 86_400_000) + 1;
  if (dayCount > maxDays) {
    return {
      valid: false,
      error: `date range of ${dayCount} days exceeds the maximum of ${maxDays} days per backfill request`,
    };
  }

  return { valid: true };
}

// ── Recall pattern synthesis ────────────────────────────────────────────────────

/**
 * Structured output from deterministic recall pattern synthesis.
 * Every field is bounded by structured DB evidence — no inference.
 */
export interface RecallPatternSummary {
  /**
   * The single deterministic pattern label for the current recall state.
   *
   * Hierarchy (strict, first-match wins):
   * - 'returning':        at least one active arc has recurrence_count ≥ 2
   * - 'recurring_domain': top domain has signalCount ≥ 3 (no returning arc)
   * - 'newly_active':    at least one arc started within threshold days (no stronger pattern)
   * - 'quiet':           no qualifying evidence
   */
  patternLabel: 'returning' | 'recurring_domain' | 'newly_active' | 'quiet';

  /** Count of active arcs with recurrence_count ≥ 2 (return-family arcs only) */
  returningArcCount: number;

  /** Top domain by signal count (null if recurringDomains is empty) */
  dominantDomain: string | null;

  /** Signal count for the dominant domain (0 if no recurring domains) */
  dominantDomainSignalCount: number;

  /** Count of arcs whose first_active_date is within newlyActiveDaysThreshold of asOfDate */
  newlyActiveArcCount: number;

  /**
   * One deterministic, evidence-bounded sentence.
   * Draws ONLY from structured DB fields: recurrence_count, signalCount, arcCount,
   * transit_planet / aspect_type / natal_target, state, first_active_date.
   * Never claims exactness or cross-arc inference beyond what is stored.
   */
  evidenceSentence: string;
}

/**
 * Deterministic synthesis of the current recall pattern from already-retrieved structured data.
 *
 * Pure function — no I/O, no DB calls, no date side-effects when asOfDate is provided.
 * Designed to be called with the output of getRelevantTransitMemoryForToday().
 *
 * Evidence discipline:
 * - Input MUST come from structured DB retrieval (activeArcs, recurringDomains)
 * - Pattern labels are strictly bounded by structured counts — no LLM inference
 * - evidenceSentence only references fields directly present in the input
 * - An empty or insufficient evidence state always returns patternLabel 'quiet'
 *
 * @param asOfDate YYYY-MM-DD reference date for newlyActive computation.
 *   Defaults to today via Date.now() — always pass an explicit value in tests.
 * @param newlyActiveDaysThreshold Days since first_active_date to count as newly active (default 3).
 */
export function synthesizeRecallPattern(params: {
  activeArcs: Array<{
    transit_planet: string;
    aspect_type: string;
    natal_target: string;
    state: string;
    recurrence_count?: number | null;
    first_active_date?: string | null;
  }>;
  recurringDomains: Array<{
    domain: string;
    signalCount: number;
    arcCount: number;
  }>;
  asOfDate?: string;
  newlyActiveDaysThreshold?: number;
}): RecallPatternSummary {
  const { activeArcs, recurringDomains, asOfDate, newlyActiveDaysThreshold = 3 } = params;

  const refMs = asOfDate
    ? new Date(`${asOfDate}T12:00:00Z`).getTime()
    : Date.now();

  // ── Returning arc count ──────────────────────────────────────────────────
  // Strictly evidence-bound: recurrence_count ≥ 2 means the return-family
  // creation path in reconcileTransitArcsFromSnapshot has fired at least once.
  const returningArcCount = activeArcs.filter(
    (a) => (a.recurrence_count ?? 1) >= 2,
  ).length;

  // ── Dominant domain ──────────────────────────────────────────────────────
  // recurringDomains is already sorted by signalCount desc from getRecurringDomains().
  const dominantDomain = recurringDomains[0]?.domain ?? null;
  const dominantDomainSignalCount = recurringDomains[0]?.signalCount ?? 0;

  // ── Newly active arcs ────────────────────────────────────────────────────
  // An arc is 'newly active' if its first_active_date is within the threshold window.
  const newlyActiveArcCount = activeArcs.filter((a) => {
    if (!a.first_active_date) return false;
    const startMs = new Date(`${a.first_active_date}T12:00:00Z`).getTime();
    const daysSinceStart = Math.round((refMs - startMs) / 86_400_000);
    return daysSinceStart >= 0 && daysSinceStart <= newlyActiveDaysThreshold;
  }).length;

  // ── Pattern label hierarchy (first-match, strict) ───────────────────────
  let patternLabel: RecallPatternSummary['patternLabel'];
  if (returningArcCount >= 1) {
    patternLabel = 'returning';
  } else if (dominantDomainSignalCount >= 3) {
    patternLabel = 'recurring_domain';
  } else if (newlyActiveArcCount >= 1) {
    patternLabel = 'newly_active';
  } else {
    patternLabel = 'quiet';
  }

  // ── Evidence sentence ────────────────────────────────────────────────────
  // Each case references only the fields that drove its label — no inference.
  let evidenceSentence: string;
  switch (patternLabel) {
    case 'returning': {
      const arc = activeArcs.find((a) => (a.recurrence_count ?? 1) >= 2)!;
      evidenceSentence = `${arc.transit_planet} ${arc.aspect_type} ${arc.natal_target} is active for occurrence ${arc.recurrence_count ?? 2} — recurrence_count ≥ 2 in the arc record.`;
      break;
    }
    case 'recurring_domain': {
      const d = recurringDomains[0];
      evidenceSentence = `${d.domain}: ${d.signalCount} linked signal${
        d.signalCount === 1 ? '' : 's'
      } across ${d.arcCount} arc${d.arcCount === 1 ? '' : 's'} (60-day window).`;
      break;
    }
    case 'newly_active': {
      const arc = activeArcs.find((a) => {
        if (!a.first_active_date) return false;
        const startMs = new Date(`${a.first_active_date}T12:00:00Z`).getTime();
        const days = Math.round((refMs - startMs) / 86_400_000);
        return days >= 0 && days <= newlyActiveDaysThreshold;
      })!;
      evidenceSentence = `${arc.transit_planet} ${arc.aspect_type} ${arc.natal_target} entered the active arc window within ${newlyActiveDaysThreshold} days (state: ${arc.state}).`;
      break;
    }
    case 'quiet':
    default:
      evidenceSentence = 'No recurring pattern found in current arc or domain evidence.';
      break;
  }

  return {
    patternLabel,
    returningArcCount,
    dominantDomain,
    dominantDomainSignalCount,
    newlyActiveArcCount,
    evidenceSentence,
  };
}

// ── Cross-modal journal × chart linkage ──────────────────────────────────────────

/**
 * Structured output from deterministic journal × arc-domain linkage.
 * Every field is bounded by extracted signal labels and stored domain evidence.
 */
export interface JournalArcLinkage {
  /**
   * Domains present in both the current journal entry's extracted signals
   * (lifeDomain or themes) AND the recurring domain arc evidence in the DB.
   * Only includes domains whose signalCount meets the minimum threshold.
   */
  overlappingDomains: Array<{
    domain: string;
    signalCount: number;
    arcCount: number;
  }>;

  /** True if at least one domain overlap was found meeting the evidence threshold */
  hasOverlap: boolean;

  /**
   * One evidence-bounded sentence, drawn only from domain labels, signalCount, arcCount.
   * Empty string when hasOverlap is false — never claims overlap when there is none.
   * Never claims arc-level detail (no transit_planet / exactness claims).
   */
  overlapSentence: string;
}

/**
 * Deterministic cross-modal linkage: find life-domains present in both
 * the current journal entry's extracted signals and the recurring domain
 * arc evidence already retrieved from the DB.
 *
 * Evidence discipline:
 * - Domain matching is strict label equality only — no semantic inference.
 * - Themes are treated as secondary domain hints (same label space as lifeDomain).
 * - Only recurringDomains entries with signalCount >= minDomainSignalCount are included.
 * - Empty/no-overlap state always returns hasOverlap: false, overlapSentence: ''.
 * - overlapSentence never references arc internals (transit_planet, exactness, etc).
 *
 * Pure function — no I/O, deterministic for any fixed input.
 *
 * @param minDomainSignalCount Minimum prior signal count in a domain to qualify (default 2).
 */
export function linkJournalSignalsToArcEvidence(params: {
  extractedSignals: Array<{ lifeDomain?: string | null; themes?: string[] }>;
  recurringDomains: Array<{ domain: string; signalCount: number; arcCount: number }>;
  minDomainSignalCount?: number;
}): JournalArcLinkage {
  const { extractedSignals, recurringDomains, minDomainSignalCount = 2 } = params;

  // Collect all domain-candidate labels from this journal entry's signals.
  // lifeDomain is the top matched domain; themes may contain additional domain labels.
  const journalDomains = new Set<string>();
  for (const signal of extractedSignals) {
    if (signal.lifeDomain) journalDomains.add(signal.lifeDomain);
    for (const theme of signal.themes ?? []) {
      journalDomains.add(theme);
    }
  }

  if (journalDomains.size === 0) {
    return { overlappingDomains: [], hasOverlap: false, overlapSentence: '' };
  }

  // Intersect with recurring domains that meet the evidence threshold.
  // Preserve the signalCount-sorted order from recurringDomains (already sorted desc).
  const overlappingDomains = recurringDomains.filter(
    (d) => journalDomains.has(d.domain) && d.signalCount >= minDomainSignalCount,
  );

  if (overlappingDomains.length === 0) {
    return { overlappingDomains: [], hasOverlap: false, overlapSentence: '' };
  }

  // Build evidence sentence referencing only domain labels, signalCount, arcCount.
  // Never mentions transit details, exactness, or cross-arc inference.
  const top = overlappingDomains[0];
  let overlapSentence: string;
  if (overlappingDomains.length === 1) {
    overlapSentence =
      `This entry touches ${top.domain} — a domain with ${
        top.signalCount
      } prior linked signal${
        top.signalCount === 1 ? '' : 's'
      } across ${top.arcCount} arc${
        top.arcCount === 1 ? '' : 's'
      } in your memory.`;
  } else {
    const domainList = overlappingDomains.map((d) => d.domain).join(', ');
    overlapSentence =
      `This entry touches ${domainList} — areas with prior arc-linked signals in your memory` +
      ` (top: ${top.signalCount} signals for ${top.domain}).`;
  }

  return { overlappingDomains, hasOverlap: true, overlapSentence };
}

// ── Anticipatory arc peak scanning ──────────────────────────────────────────────

/**
 * Structured result for a single approaching arc's projected peak within a
 * pre-computed forward transit window.
 *
 * Every field is bounded by either stored arc data or direct ephemeris output.
 * No inference — if the orb doesn't drop to ≤ 0.5° in the scan window,
 * willReachExact is false and no exactness is claimed.
 */
export interface ApproachingArcPeak {
  /** Transit identity — matches the stored arc record exactly */
  transit_planet: string;
  aspect_type: string;
  natal_target: string;

  /** Current orb from stored arc data (last_orb ?? tightest_orb ?? first scan match) */
  currentOrb: number;

  /** Lowest orb found in the forward scan window (from ephemeris, not inference) */
  projectedPeakOrb: number;

  /** Date (YYYY-MM-DD) of the lowest orb in the forward scan */
  projectedPeakDate: string;

  /**
   * Days from the first element of upcomingTransits to the projected peak.
   * 1-indexed: 1 = first scan day (e.g., tomorrow), 2 = day after, etc.
   */
  daysUntilPeak: number;

  /**
   * True ONLY if projectedPeakOrb ≤ 0.5° in the scanned window.
   * The same strict threshold used throughout the arc lifecycle.
   * Never inferred — directly from the ephemeris computation.
   */
  willReachExact: boolean;
}

/**
 * Forward-scan approaching arcs against a pre-computed transit window to find
 * when each arc is projected to reach its tightest point.
 *
 * Evidence discipline:
 * - Only arcs with state exactly 'approaching' are included.
 * - Key matching is strict label equality: transit_planet + aspect_type + natal_target.
 * - projectedPeakOrb/projectedPeakDate come from the forward ephemeris computation only.
 * - willReachExact is true ONLY if projectedPeakOrb ≤ 0.5° — never inferred.
 * - If an arc has no match in the forward window, it is excluded (not faked).
 * - If an arc's min orb in the window exceeds maxPeakOrb, it is excluded.
 * - Returns empty array for empty inputs — never fabricates entries.
 *
 * Pure function — no I/O, deterministic for any fixed input.
 *
 * @param upcomingTransits Pre-computed transit range (e.g., calculateTransitsForRange output).
 *   Caller provides this — scanApproachingArcPeaks has no I/O.
 * @param maxPeakOrb Maximum projected peak orb to report (default 2.0° — filters loose transits).
 */
export function scanApproachingArcPeaks(params: {
  activeArcs: Array<{
    transit_planet: string;
    aspect_type: string;
    natal_target: string;
    state: string;
    last_orb?: number | null;
    tightest_orb?: number | null;
  }>;
  upcomingTransits: Array<{
    date: string;
    transits: Array<{
      transitPlanet: string;
      aspect: string;
      natalPlanet: string;
      orb: number;
    }>;
  }>;
  maxPeakOrb?: number;
}): ApproachingArcPeak[] {
  const { activeArcs, upcomingTransits, maxPeakOrb = 2.0 } = params;

  // Hard guard: only 'approaching' arcs are valid pre-positioning targets.
  // exact/separating/returning/dormant arcs are at or past peak — not anticipatory.
  const approachingArcs = activeArcs.filter((a) => a.state === 'approaching');

  if (approachingArcs.length === 0 || upcomingTransits.length === 0) {
    return [];
  }

  const results: ApproachingArcPeak[] = [];

  for (const arc of approachingArcs) {
    // Scan the forward window for this arc's key — find the day with the lowest orb.
    let minOrb = Infinity;
    let minDate = '';
    let minDayIndex = -1;

    for (let dayIdx = 0; dayIdx < upcomingTransits.length; dayIdx++) {
      const day = upcomingTransits[dayIdx];
      for (const t of day.transits) {
        if (
          t.transitPlanet === arc.transit_planet &&
          t.aspect === arc.aspect_type &&
          t.natalPlanet === arc.natal_target &&
          t.orb < minOrb
        ) {
          minOrb = t.orb;
          minDate = day.date;
          minDayIndex = dayIdx;
        }
      }
    }

    // Arc not found in forward window — skip (may have exited orb, or is not in this range).
    if (minDayIndex === -1) continue;

    // Filter: only report arcs that get tight enough to be meaningful anticipatory context.
    if (minOrb > maxPeakOrb) continue;

    // currentOrb: use stored arc data if available; fallback to first forward match.
    const storedOrb = arc.last_orb ?? arc.tightest_orb;
    const currentOrb = storedOrb != null ? storedOrb : minOrb;

    results.push({
      transit_planet: arc.transit_planet,
      aspect_type: arc.aspect_type,
      natal_target: arc.natal_target,
      currentOrb,
      projectedPeakOrb: minOrb,
      projectedPeakDate: minDate,
      daysUntilPeak: minDayIndex + 1, // 1-indexed: day 0 in array = 1 day ahead
      willReachExact: minOrb <= 0.5,  // strict threshold — never inferred
    });
  }

  // Sort by projected peak date ascending (soonest peak first).
  results.sort((a, b) => a.projectedPeakDate.localeCompare(b.projectedPeakDate));

  return results;
}

// ── Explainability note (user-visible "why am I seeing this?") ─────────────────

/**
 * Structured evidence note explaining why a specific memory cue was surfaced.
 * Every field maps to a stored column — no inference, no prose magic.
 *
 * Mirrors the exact priority logic used in the page-level buildMemoryCue
 * implementations so the explanation always matches the displayed cue text.
 */
export interface ExplainabilityNote {
  /** True when at least one evidence piece supports the displayed cue */
  hasExplanation: boolean;

  /**
   * User-readable evidence line: "Surfaced because: …"
   * Empty string when hasExplanation is false — never claims anything without evidence.
   */
  explanationLine: string;

  /**
   * Individual evidence pieces used to build the line — for deterministic testing.
   * Each element maps to exactly one stored field (recurrence_count, daysActive from
   * first_active_date, tightest_orb, state, signalCount, arcCount).
   * Empty when hasExplanation is false.
   */
  evidenceBasis: string[];
}

/**
 * Build a deterministic, evidence-bounded "why am I seeing this?" note for the
 * user-visible memory cue card.
 *
 * Priority logic is identical to buildMemoryCue (in page.tsx / reading/daily/page.tsx)
 * so the explanation always corresponds to whichever cue branch fired:
 *   1. Returning arc (recurrence_count ≥ 2 OR state === 'returning')
 *   2. Dominant arc with multi-day presence (first_active_date → daysActive ≥ 3)
 *   3. Recurring domain pattern (recurringDomains[0].signalCount > 0)
 *   4. Fallback (no arc evidence) → hasExplanation: false
 *
 * Evidence discipline:
 * - Only fields present in the input are referenced (no transit internals beyond
 *   what came from the caller's already-fetched arcMemory data).
 * - Recurrence claim requires recurrence_count ≥ 2 in the stored record.
 * - Duration claim requires a parseable first_active_date.
 * - Tightest orb only included when tightest_orb is non-null in the stored record.
 * - Domain claim requires a non-empty recurringDomains array.
 * - hasExplanation: false always produces explanationLine: '' and evidenceBasis: [].
 *
 * Pure function — no I/O, deterministic for any fixed input.
 *
 * @param asOfDate YYYY-MM-DD reference date for daysActive computation.
 *   Defaults to Date.now() — always pass an explicit value in tests.
 */
export function buildExplainabilityNote(params: {
  activeArcs: Array<{
    transit_planet: string;
    aspect_type: string;
    natal_target: string;
    state: string;
    recurrence_count?: number | null;
    first_active_date?: string | null;
    tightest_orb?: number | null;
  }>;
  recurringDomains: Array<{
    domain: string;
    signalCount: number;
    arcCount: number;
  }>;
  asOfDate?: string;
}): ExplainabilityNote {
  const { activeArcs, recurringDomains, asOfDate } = params;

  const EMPTY: ExplainabilityNote = { hasExplanation: false, explanationLine: '', evidenceBasis: [] };

  const refMs = asOfDate
    ? new Date(`${asOfDate}T12:00:00Z`).getTime()
    : Date.now();

  // ── Priority 1: Returning arc ─────────────────────────────────────────────
  // Mirrors: buildMemoryCue returning-arc branch
  // Evidence gate: recurrence_count MUST be ≥ 2 in the stored record.
  // Using same guard as buildMemoryCue: state === 'returning' OR recurrence_count > 1.
  const returningArc = activeArcs.find(
    (a) => a.state === 'returning' || (a.recurrence_count ?? 1) > 1,
  );
  if (returningArc) {
    const basis: string[] = [];
    const count = returningArc.recurrence_count ?? 2;
    // Recurrence is the primary evidence — the stored count is the source of truth.
    basis.push(`recurrence ${count} — this pattern has occurred before`);
    // Duration this occurrence: only when first_active_date is parseable.
    if (returningArc.first_active_date) {
      const startMs = new Date(`${returningArc.first_active_date}T12:00:00Z`).getTime();
      const days = Math.max(1, Math.round((refMs - startMs) / 86_400_000) + 1);
      basis.push(`active ${days} day${days === 1 ? '' : 's'} this occurrence`);
    }
    // Tightest orb as precision evidence: only from stored column, never inferred.
    if (returningArc.tightest_orb != null) {
      basis.push(`tightest orb ${Number(returningArc.tightest_orb).toFixed(2)}°`);
    }
    return {
      hasExplanation: true,
      explanationLine: `Surfaced because: ${basis.join(' · ')}`,
      evidenceBasis: basis,
    };
  }

  // ── Priority 2: Dominant arc with multi-day presence ─────────────────────
  // Mirrors: buildMemoryCue dominant-arc branch (daysActive ≥ 3)
  const dominant = activeArcs[0];
  if (dominant?.first_active_date) {
    const startMs = new Date(`${dominant.first_active_date}T12:00:00Z`).getTime();
    const daysActive = Math.max(1, Math.round((refMs - startMs) / 86_400_000) + 1);
    if (daysActive >= 3) {
      const basis: string[] = [
        `active ${daysActive} day${daysActive === 1 ? '' : 's'}`,
        `state: ${dominant.state}`,
      ];
      if (dominant.tightest_orb != null) {
        basis.push(`tightest orb ${Number(dominant.tightest_orb).toFixed(2)}°`);
      }
      return {
        hasExplanation: true,
        explanationLine: `Surfaced because: ${basis.join(' · ')}`,
        evidenceBasis: basis,
      };
    }
  }

  // ── Priority 3: Recurring domain ──────────────────────────────────────────
  // Mirrors: buildMemoryCue recurring-domain branch
  if (recurringDomains.length > 0) {
    const top = recurringDomains[0];
    const basis: string[] = [
      `${top.domain}: ${top.signalCount} signal${top.signalCount === 1 ? '' : 's'} in recent weeks`,
      `${top.arcCount} arc${top.arcCount === 1 ? '' : 's'} linked`,
    ];
    return {
      hasExplanation: true,
      explanationLine: `Surfaced because: ${basis.join(' · ')}`,
      evidenceBasis: basis,
    };
  }

  // Fallback: no arc evidence → no explanation
  return EMPTY;
}

// ── Daily-reading memory cue (pure, testable) ───────────────────────────────────

/**
 * Pure, testable version of the memory-cue string rendered on the Daily Reading
 * page. Extracted from reading/daily/page.tsx so the branch logic is directly
 * unit-testable without needing a Next.js server-component test harness.
 *
 * Priority (first-match wins):
 *   1. Returning arc  (recurrence_count > 1 OR state === 'returning')
 *   2. Dominant arc with multi-day presence (daysActive ≥ 3)
 *   3. Recurring domain pattern  (recurringDomains[0])
 *   4. Signal-based fallback  (themes_json[0] or life_domain)
 *   5. Static fallback
 *
 * Evidence discipline:
 *   - daysActive is bounded by nowMs and the stored first_active_date only.
 *   - recurrence_count gate is identical to buildExplainabilityNote (recurrence > 1).
 *   - State labels are exact strings — no inference beyond stored state field.
 *   - Domain/signal fallback only fires when arc evidence is absent or confidence === 'none'.
 *
 * Pure function — no I/O, no Supabase, no Date.now() side-effects when nowMs is provided.
 * Always pass nowMs in tests; production callers pass Date.now().
 */
export function buildDailyMemoryCue(params: {
  signal?: { life_domain?: string | null; themes_json?: string[] | null } | null;
  arcMemory?: {
    confidence: string;
    activeArcs?: Array<{
      transit_planet: string;
      aspect_type: string;
      natal_target: string;
      state: string;
      recurrence_count?: number | null;
      first_active_date?: string | null;
    }> | null;
    recurringDomains: Array<{ domain: string; signalCount: number; arcCount: number }>;
  } | null;
  /** Milliseconds since Unix epoch for "now". Always pass in tests; production passes Date.now(). */
  nowMs?: number;
}): string {
  const { signal, arcMemory, nowMs } = params;
  const refMs = nowMs ?? Date.now();

  if (arcMemory && arcMemory.confidence !== 'none') {
    const activeArcs = arcMemory.activeArcs ?? [];

    // Priority 1: Returning arc — same sky pattern is back
    const returningArc = activeArcs.find(
      (a) => a.state === 'returning' || (a.recurrence_count ?? 1) > 1,
    );
    if (returningArc) {
      const count = returningArc.recurrence_count ?? 2;
      const countLabel = count === 2 ? 'a second' : count === 3 ? 'a third' : `a ${count}th`;
      return `${returningArc.transit_planet} ${returningArc.aspect_type} ${returningArc.natal_target} is active for ${countLabel} time. A familiar pattern is returning.`;
    }

    // Priority 2: Dominant arc with multi-day presence
    const dominant = activeArcs[0];
    if (dominant?.first_active_date) {
      const startMs = new Date(`${dominant.first_active_date}T12:00:00Z`).getTime();
      const daysActive = Math.max(1, Math.round((refMs - startMs) / 86400000) + 1);
      if (daysActive >= 3) {
        const stateLabel =
          dominant.state === 'exact' ? 'at its peak'
          : dominant.state === 'separating' ? 'now moving through'
          : 'still building';
        return `${dominant.transit_planet} ${dominant.aspect_type} ${dominant.natal_target} has been ${stateLabel} for ${daysActive} days.`;
      }
    }

    // Priority 3: Recurring domain pattern
    if (arcMemory.recurringDomains.length > 0) {
      const top = arcMemory.recurringDomains[0];
      return `Your ${top.domain} area has been consistently activated — ${top.signalCount} signal${top.signalCount === 1 ? '' : 's'} in recent weeks.`;
    }
  }

  // Fallback: signal-based cue (preserves existing pre-arc-memory behavior)
  const theme = signal?.themes_json?.[0];
  const domain = signal?.life_domain;
  if (theme || domain) {
    return `This transit touches a thread you've already been navigating around ${theme ?? domain}.`;
  }

  return "The more you bring to Aeon, the more this stops being a one-day reading and starts becoming context.";
}

// ── Home page memory cue (pure, testable) ───────────────────────────────────────

/**
 * Structured result from the Home-page memory cue card.
 * Distinct from the Daily Reading cue (which returns a plain string) — the Home
 * page renders a two-line card with a headline and a softer body line.
 */
export interface HomeMemoryCue {
  headline: string;
  body: string;
}

/**
 * Pure, testable version of the memory-cue card rendered on the Home page.
 * Extracted from app/page.tsx so the branch logic is directly unit-testable
 * without needing a Next.js server-component harness.
 *
 * Priority (first-match wins):
 *   1. Returning arc         (recurrence_count > 1 OR state === 'returning')
 *   2. Dominant arc multi-day (daysActive ≥ 3, first_active_date required)
 *   3. Recurring domain pattern  (recurringDomains[0])
 *   4. Signal-based fallback     (signal.themes_json[0] or signal.life_domain)
 *   5. Report-theme fallback     (report.themes[0])
 *   6. Static fallback
 *
 * Evidence discipline:
 *   - daysActive is bounded by nowMs and the stored first_active_date only.
 *   - recurrence_count gate is identical to buildDailyMemoryCue (recurrence > 1).
 *   - Arc logic only fires when arcMemory is present and confidence !== 'none'.
 *   - Signal/report fallbacks preserve the original pre-arc-memory behavior.
 *
 * Pure function — no I/O, no Supabase, no Date.now() side-effects when nowMs is provided.
 * Always pass nowMs in tests; production callers pass Date.now().
 */
export function buildHomeMemoryCue(params: {
  signal?: { life_domain?: string | null; content_text?: string | null; themes_json?: string[] | null } | null;
  report?: { themes?: string[] | null } | null;
  arcMemory?: {
    confidence: string;
    activeArcs?: Array<{
      transit_planet: string;
      aspect_type: string;
      natal_target: string;
      state: string;
      recurrence_count?: number | null;
      first_active_date?: string | null;
    }> | null;
    recurringDomains: Array<{ domain: string; signalCount: number; arcCount: number }>;
  } | null;
  /** Milliseconds since Unix epoch for "now". Always pass in tests; production passes Date.now(). */
  nowMs?: number;
}): HomeMemoryCue {
  const { signal, report, arcMemory, nowMs } = params;
  const refMs = nowMs ?? Date.now();

  if (arcMemory && arcMemory.confidence !== 'none') {
    const activeArcs = arcMemory.activeArcs ?? [];

    // Priority 1: Returning arc — highest-value cue: same sky pattern is back
    const returningArc = activeArcs.find(
      (a) => a.state === 'returning' || (a.recurrence_count ?? 1) > 1,
    );
    if (returningArc) {
      const count = returningArc.recurrence_count ?? 2;
      const countLabel = count === 2 ? 'a second' : count === 3 ? 'a third' : `a ${count}th`;
      return {
        headline: 'SOS noticed a familiar pattern returning.',
        body: `${returningArc.transit_planet} ${returningArc.aspect_type} ${returningArc.natal_target} is active for ${countLabel} time.`,
      };
    }

    // Priority 2: Dominant arc with multi-day presence
    const dominant = activeArcs[0];
    if (dominant?.first_active_date) {
      const startMs = new Date(`${dominant.first_active_date}T12:00:00Z`).getTime();
      const daysActive = Math.max(1, Math.round((refMs - startMs) / 86400000) + 1);
      if (daysActive >= 3) {
        const stateLabel =
          dominant.state === 'exact' ? 'at its peak'
          : dominant.state === 'separating' ? 'moving through'
          : 'still building';
        return {
          headline: 'SOS noticed something has been building.',
          body: `${dominant.transit_planet} ${dominant.aspect_type} ${dominant.natal_target} has been ${stateLabel} for ${daysActive} days.`,
        };
      }
    }

    // Priority 3: Recurring domain pattern
    if (arcMemory.recurringDomains.length > 0) {
      const top = arcMemory.recurringDomains[0];
      return {
        headline: 'SOS noticed a pattern in your life.',
        body: `Your ${top.domain} area has been consistently activated — ${top.signalCount} signal${top.signalCount === 1 ? '' : 's'} in recent weeks.`,
      };
    }
  }

  // Priority 4: Signal-based fallback (preserves existing pre-arc-memory behavior)
  const signalTheme = signal?.themes_json?.[0];
  const signalDomain = signal?.life_domain;
  const reportTheme = report?.themes?.[0];

  if (signalTheme || signalDomain) {
    return {
      headline: 'SOS noticed something carrying forward.',
      body: `This looks connected to ${signalTheme ?? signalDomain ?? 'a thread you have been navigating'} — not just today's sky in isolation.`,
    };
  }

  // Priority 5: Report-theme fallback
  if (reportTheme) {
    return {
      headline: 'SOS is already holding one of your core threads.',
      body: `Your reading pointed to ${reportTheme.toLowerCase()}. Aeon can help you work with how that is showing up right now.`,
    };
  }

  // Priority 6: Static fallback
  return {
    headline: 'Aeon gets stronger the more real you are here.',
    body: 'What you share starts turning into context, not just entries. That is where the intelligence deepens.',
  };
}

// ── Home-page state text (pure, testable) ─────────────────────────────────────

/**
 * Minimal structural type for the guidance entries that buildStateText needs.
 * GuidanceResult (from lib/interpret.ts) satisfies this type structurally,
 * so page.tsx can pass GuidanceResult[] without a cross-module import here.
 */
export interface GuidanceSummaryEntry {
  intensity: 'high' | 'medium' | 'low';
  message: string;
}

/**
 * Build the short state-text sentence shown below the LifeWheel on the Home page.
 *
 * Logic:
 * - Sort guidance by intensity (high → medium → low) and take the top entry.
 * - If no top entry or the top is only 'low' intensity → return the quiet-sky fallback.
 * - Otherwise extract the first sentence of the top entry's message.
 *
 * Evidence discipline:
 * - Only reads `intensity` and `message` from each guidance entry.
 * - First-sentence extraction uses `'. '` split — the same period-space delimiter
 *   that `buildMessage` (in lib/interpret.ts) uses between its sentences.
 * - Never returns an empty string: all branches terminate at a non-empty literal
 *   or the message itself as a last resort.
 *
 * Pure function — no I/O, deterministic for any fixed input.
 */
export function buildStateText(guidance: GuidanceSummaryEntry[]): string {
  const top = [...guidance].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return order[a.intensity] - order[b.intensity];
  })[0];

  if (!top || top.intensity === 'low') {
    return 'The sky is relatively quiet today. Better for noticing than forcing.';
  }

  // Extract the first sentence from the message.
  // buildMessage (interpret.ts) joins sentences with a single space after '. ',
  // so splitting on '. ' reliably isolates the first sentence.
  // Fallback to the full message if no period-space delimiter is present
  // (single-sentence messages, or messages that never match the split pattern).
  const firstSentence = top.message.split('. ')[0];
  return firstSentence || top.message;
}

// ── Daily-reading domain-label helpers (pure, testable) ─────────────────────────

/**
 * Human-readable labels for the six life domains surfaced in the daily reading.
 * Exported so tests can verify label mapping without importing from the page component.
 */
export const LIFE_DOMAIN_LABELS: Record<string, string> = {
  relationships: 'your love life',
  career:        'career',
  money:         'finances',
  home:          'home',
  body:          'your body',
  mind:          'your inner world',
  spirit:        'your spiritual life',
};

/**
 * Format a list of domain strings into a readable English phrase for the
 * paywall upgrade CTA on the Daily Reading page.
 *
 * Behaviour:
 * - Unknown domains fall back to their raw string (defensive — all known domains
 *   are in LIFE_DOMAIN_LABELS, but a future domain extension should not crash).
 * - Duplicate domains (or domains that map to the same label) are deduplicated
 *   via Set so the output never reads "your love life and your love life".
 * - At most 3 unique labels are included (keeps the CTA sentence concise).
 * - Empty input → generic fallback phrase.
 *
 * Pure function — no I/O, deterministic for any fixed input.
 */
export function describeHiddenDomains(domains: string[]): string {
  const labels = [
    ...new Set(domains.map((domain) => LIFE_DOMAIN_LABELS[domain] ?? domain)),
  ].slice(0, 3);

  if (labels.length === 0) return 'more of what is moving in your chart';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
}

// ── Arc memory system section (pure, testable) ──────────────────────────────────

/**
 * Minimal structural type for the active arc rows used in buildArcMemorySystemSection.
 * Matches the shape returned by getActiveTransitArcs (memory-store.ts) without
 * creating a circular import.
 */
export interface ActiveArcRow {
  transit_planet: string;
  aspect_type: string;
  natal_target: string;
  state: string;
  first_active_date?: string | null;
  tightest_orb?: number | null;
  recurrence_count?: number | null;
  last_orb?: number | null;
}

/**
 * Minimal structural type for the arcMemory object passed to buildArcMemorySystemSection.
 * Mirrors the return shape of getRelevantTransitMemoryForToday (memory-store.ts) without
 * creating a circular import. Any superset type (such as the DB return) satisfies this.
 */
export interface ArcMemoryInput {
  confidence: 'high' | 'medium' | 'low' | 'none';
  activeArcs?: ActiveArcRow[] | null;
  recurringDomains: Array<{ domain: string; signalCount: number; arcCount: number }>;
}

/**
 * Build a structured arc memory context block for the Aeon system prompt.
 * Extracted from api/journal/chat/route.ts so the string-building logic is
 * directly unit-testable without a Next.js / Supabase harness.
 *
 * Evidence discipline:
 * - Only includes what structured retrieval supports — no inference.
 * - daysActive: bounded by nowMs and stored first_active_date only.
 * - Arc peaks: from ephemeris scan (scanApproachingArcPeaks) — never inferred.
 * - Linkage / pattern: deterministic synthesis only (linkJournalSignalsToArcEvidence,
 *   synthesizeRecallPattern).
 * - Returns '' when arcMemory is null or confidence === 'none'.
 *
 * Output is identical to the former inline function for all equivalent inputs.
 * The only externally visible change is that `synthesizeRecallPattern` now
 * receives an explicit `asOfDate` when `nowMs` is provided, making the pattern
 * section fully deterministic in tests without changing production behaviour
 * (production always passes `nowMs: Date.now()` → the same wall-clock result).
 *
 * Pure function — no I/O, no Supabase, no Date.now() side-effects when nowMs is provided.
 * Always pass nowMs in tests; production callers pass `nowMs: Date.now()`.
 */
export function buildArcMemorySystemSection(params: {
  arcMemory: ArcMemoryInput | null;
  currentSignals?: Array<{ lifeDomain?: string | null; themes?: string[] }>;
  upcomingTransits?: DailyTransits[];
  /** Milliseconds since Unix epoch for "now". Always pass in tests; production passes Date.now(). */
  nowMs?: number;
}): string {
  const { arcMemory, currentSignals, upcomingTransits, nowMs } = params;

  if (!arcMemory || arcMemory.confidence === 'none') return '';

  const refMs = nowMs ?? Date.now();
  const lines: string[] = ['\n\n--- ACTIVE TRANSIT ARC MEMORY ---'];
  const active: ActiveArcRow[] = (arcMemory.activeArcs ?? []) as ActiveArcRow[];

  if (active.length > 0) {
    lines.push("Current transit arcs (from structured memory, not today's computation alone):");
    for (const arc of active.slice(0, 5)) {
      const daysActive = arc.first_active_date
        ? Math.max(1, Math.round((refMs - new Date(`${arc.first_active_date}T12:00:00Z`).getTime()) / 86400000) + 1)
        : null;
      const parts: string[] = [`${arc.transit_planet} ${arc.aspect_type} ${arc.natal_target} \u2014 ${arc.state}`];
      if (daysActive) parts.push(`${daysActive} day${daysActive === 1 ? '' : 's'} active`);
      if (arc.tightest_orb != null) parts.push(`tightest orb ${Number(arc.tightest_orb).toFixed(2)}\u00b0`);
      if ((arc.recurrence_count ?? 1) > 1) parts.push(`recurrence ${arc.recurrence_count} (this pattern has returned)`);
      lines.push(`  \u2022 ${parts.join(' \u00b7 ')}`);
    }
  }

  // ── Anticipatory arc peak scan ───────────────────────────────────────────────
  if (upcomingTransits && upcomingTransits.length > 0 && active.length > 0) {
    const peaks = scanApproachingArcPeaks({
      activeArcs: active,
      upcomingTransits,
    });
    if (peaks.length > 0) {
      lines.push('Approaching arc peaks (next 7 days, from ephemeris scan):');
      for (const p of peaks.slice(0, 3)) {
        const exactLabel = p.willReachExact
          ? `reaches exact (~${p.projectedPeakOrb.toFixed(2)}\u00b0)`
          : `tightest ~${p.projectedPeakOrb.toFixed(2)}\u00b0 \u2014 approaching, not yet exact`;
        lines.push(
          `  \u2022 ${p.transit_planet} ${p.aspect_type} ${p.natal_target} \u2014 ${exactLabel} in ~${p.daysUntilPeak} day${p.daysUntilPeak === 1 ? '' : 's'} (${p.projectedPeakDate})`,
        );
      }
    }
  }

  // ── Recurring domains ────────────────────────────────────────────────────────
  if (arcMemory.recurringDomains.length > 0) {
    lines.push('Recurring life areas (by linked signal count):');
    for (const d of arcMemory.recurringDomains.slice(0, 3)) {
      lines.push(`  \u2022 ${d.domain}: ${d.signalCount} signal${d.signalCount === 1 ? '' : 's'}, ${d.arcCount} arc${d.arcCount === 1 ? '' : 's'}`);
    }
  }

  // ── Cross-modal linkage ──────────────────────────────────────────────────────
  if (currentSignals && currentSignals.length > 0) {
    const linkage = linkJournalSignalsToArcEvidence({
      extractedSignals: currentSignals,
      recurringDomains: arcMemory.recurringDomains,
    });
    if (linkage.hasOverlap) {
      lines.push(`Journal \u00d7 arc overlap: ${linkage.overlapSentence}`);
    }
  }

  // ── Pattern synthesis ────────────────────────────────────────────────────────
  // Pass asOfDate when nowMs is provided so synthesizeRecallPattern is deterministic
  // in tests. Production path (no nowMs) lets synthesizeRecallPattern use Date.now()
  // internally — identical to prior behaviour.
  const asOfDate = nowMs ? new Date(nowMs).toISOString().slice(0, 10) : undefined;
  const pattern = synthesizeRecallPattern({
    activeArcs: active,
    recurringDomains: arcMemory.recurringDomains,
    asOfDate,
  });
  if (pattern.patternLabel !== 'quiet') {
    lines.push(`Recall pattern: ${pattern.patternLabel} \u2014 ${pattern.evidenceSentence}`);
  }

  lines.push(
    'Use this arc context to ground your responses in patterns that are actually present.',
    'Only reference arc patterns when genuinely relevant to what the person is sharing. Do not surface arc data that has no connection to the current conversation.',
  );

  return lines.join('\n');
}

// ── Confidence tiering ─────────────────────────────────────────────────────────

export type ConfidenceTier = 'high' | 'medium' | 'low' | 'none';

/**
 * Compute the retrieval confidence tier from arc and domain counts.
 *
 * Rules:
 * - 'high': ≥2 active arcs AND ≥1 recurring domain  (strong multi-signal overlap)
 * - 'medium': ≥1 active arc OR ≥1 recurring domain  (at least one active signal)
 * - 'low': only recent dormant arcs (recentArcsCount > 0, nothing active)
 * - 'none': no arc history at all
 *
 * Hard constraints (testable guard cases):
 * - 1 active arc with 0 domains must NOT be 'high'
 * - 0 arcs, 0 domains, even with recentArcs must NOT be 'medium' or higher
 */
export function computeConfidenceTier(params: {
  activeArcsCount: number;
  recurringDomainsCount: number;
  recentArcsCount: number;
}): ConfidenceTier {
  const { activeArcsCount, recurringDomainsCount, recentArcsCount } = params;

  if (activeArcsCount >= 2 && recurringDomainsCount >= 1) return 'high';
  if (activeArcsCount >= 1 || recurringDomainsCount >= 1) return 'medium';
  if (recentArcsCount >= 1) return 'low';
  return 'none';
}
