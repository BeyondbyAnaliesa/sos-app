/**
 * stability-guards.test.ts
 *
 * Focused stability / edge-case regression guards.
 *
 * These tests cover failure modes NOT addressed by the per-function test files:
 *
 *   1. buildArcTombstone: corrupt exact_dates_json (null/non-string items)
 *      Fix: pure-fns.ts filters exact_dates_json to string-only items before
 *      calling formatDate, preventing "Invalid Date" strings in tombstone output.
 *
 *   2. synthesizeRecallPattern: future first_active_date
 *      No code change needed — daysSinceStart >= 0 guard already handles it.
 *      Test documents the intended behavior and guards against accidental regression.
 *
 *   3. synthesizeRecallPattern: arc started exactly today (daysSinceStart = 0)
 *      Arc started today IS within the newly_active threshold.
 *
 *   4. buildExplainabilityNote: returning arc with null first_active_date
 *      Correct code path: duration claim is skipped when first_active_date is null.
 *      Test guards that recurrence evidence still fires without crashing.
 *
 * All tests are deterministic: explicit asOfDate, explicit fixture data,
 * no I/O, no Supabase, no Date.now() side-effects.
 */

import { describe, it, expect } from 'vitest';
import { buildArcTombstone, synthesizeRecallPattern, buildExplainabilityNote } from '../pure-fns';

const TODAY = '2026-04-25';
const TOMORROW = '2026-04-26';

// ── 1. buildArcTombstone — corrupt exact_dates_json ──────────────────────────
//
// Pre-fix behavior: [null, null] was cast as string[] → formatDate(null) →
//   new Date("nullT12:00:00Z").toLocaleDateString(...) → "Invalid Date"
//   → tombstone body: "exact 2× (Invalid Date, Invalid Date)"
//
// Post-fix behavior: non-string items are filtered out before formatDate is called.
//   [null, null] → [] → "no exact crossing recorded"
//   ["2026-04-15", null] → ["2026-04-15"] → "exact 1× (Apr 15)"
//

const BASE_ARC = {
  transit_planet: 'Jupiter',
  aspect_type: 'trine',
  natal_target: 'Venus',
  first_active_date: '2026-04-10',
  last_active_date: '2026-04-20',
  tightest_orb: 0.48,
  peak_orb: null,
  last_direction: null as null,
  recurrence_count: null as null,
  parent_arc_id: null as null,
};

describe('buildArcTombstone — corrupt exact_dates_json guard', () => {
  it('GUARD: [null, null] must NOT produce "Invalid Date" in tombstone', () => {
    const result = buildArcTombstone({
      ...BASE_ARC,
      exact_dates_json: [null, null],
    });
    // Must not contain the "Invalid Date" string from a failed toLocaleDateString call
    expect(result).not.toContain('Invalid Date');
  });

  it('GUARD: [null, null] falls back to "no exact crossing recorded"', () => {
    const result = buildArcTombstone({
      ...BASE_ARC,
      exact_dates_json: [null, null],
    });
    // All null items filtered → empty date list → evidence-boundary fallback fires
    expect(result).toContain('no exact crossing recorded');
  });

  it('GUARD: [null, null] must NOT claim exactness', () => {
    const result = buildArcTombstone({
      ...BASE_ARC,
      exact_dates_json: [null, null],
    });
    // Must not produce "exact N×" pattern (that would be a false exactness claim)
    expect(result).not.toMatch(/exact \d+×/);
  });

  it('GUARD: mixed array ["2026-04-15", null] keeps the valid date, discards null', () => {
    const result = buildArcTombstone({
      ...BASE_ARC,
      exact_dates_json: ['2026-04-15', null],
    });
    // One valid date → "exact 1×" with the valid date label
    expect(result).toContain('exact 1×');
    expect(result).toContain('Apr 15');
    expect(result).not.toContain('Invalid Date');
  });

  it('GUARD: [null, "2026-04-22", null] keeps only the valid date', () => {
    const result = buildArcTombstone({
      ...BASE_ARC,
      exact_dates_json: [null, '2026-04-22', null],
    });
    // Two null items filtered; one valid date remains
    expect(result).toContain('exact 1×');
    expect(result).toContain('Apr 22');
    expect(result).not.toContain('Invalid Date');
  });

  it('GUARD: empty-string items are filtered (not valid date strings)', () => {
    const result = buildArcTombstone({
      ...BASE_ARC,
      exact_dates_json: ['', '2026-04-15'],
    });
    // '' is filtered; only "2026-04-15" remains
    expect(result).toContain('exact 1×');
    expect(result).not.toContain('Invalid Date');
  });

  it('GUARD: non-string items (number, object) are filtered', () => {
    const result = buildArcTombstone({
      ...BASE_ARC,
      exact_dates_json: [42, { date: '2026-04-15' }, '2026-04-20'],
    });
    // Number and object filtered; only the string "2026-04-20" remains
    expect(result).toContain('exact 1×');
    expect(result).toContain('Apr 20');
    expect(result).not.toContain('Invalid Date');
  });

  it('idempotent: same corrupt input always produces same (safe) output', () => {
    const arc = { ...BASE_ARC, exact_dates_json: [null, null] };
    const r1 = buildArcTombstone(arc);
    const r2 = buildArcTombstone(arc);
    expect(r1).toBe(r2);
    expect(r1).not.toContain('Invalid Date');
  });

  it('regression: fully valid exact_dates_json still works correctly after the filter', () => {
    const result = buildArcTombstone({
      ...BASE_ARC,
      exact_dates_json: ['2026-04-14', '2026-04-18'],
    });
    expect(result).toContain('exact 2×');
    expect(result).toContain('Apr 14');
    expect(result).toContain('Apr 18');
    expect(result).not.toContain('no exact crossing recorded');
  });
});

// ── 2. synthesizeRecallPattern — future first_active_date ─────────────────────
//
// An arc with a first_active_date in the future must NOT be counted as
// newly_active. daysSinceStart would be negative → filtered by >= 0 check.
//

describe('synthesizeRecallPattern — future first_active_date guard', () => {
  it('GUARD: arc with first_active_date in the future is NOT counted as newly_active', () => {
    const futureArc = {
      transit_planet: 'Neptune',
      aspect_type: 'trine',
      natal_target: 'Sun',
      state: 'approaching',
      recurrence_count: 1,
      first_active_date: TOMORROW, // future relative to TODAY
    };
    const r = synthesizeRecallPattern({
      activeArcs: [futureArc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    // daysSinceStart = -1 (day before asOfDate) → filtered by >= 0
    expect(r.newlyActiveArcCount).toBe(0);
    expect(r.patternLabel).toBe('quiet');
  });

  it('GUARD: future arc does not drive patternLabel to newly_active', () => {
    const futureArc = {
      transit_planet: 'Uranus',
      aspect_type: 'square',
      natal_target: 'Moon',
      state: 'approaching',
      recurrence_count: 1,
      first_active_date: '2027-01-01', // far future
    };
    const r = synthesizeRecallPattern({
      activeArcs: [futureArc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).not.toBe('newly_active');
    expect(r.newlyActiveArcCount).toBe(0);
  });
});

// ── 3. synthesizeRecallPattern — arc started today (daysSinceStart = 0) ───────
//
// An arc started exactly on asOfDate (daysSinceStart = 0) should count as
// newly_active: the window is inclusive of day 0 (daysSinceStart >= 0 && <= threshold).
//

describe('synthesizeRecallPattern — arc started today (daysSinceStart = 0)', () => {
  it('arc started exactly on asOfDate counts as newly_active', () => {
    const todayArc = {
      transit_planet: 'Venus',
      aspect_type: 'sextile',
      natal_target: 'Mars',
      state: 'approaching',
      recurrence_count: 1,
      first_active_date: TODAY, // same as asOfDate → daysSinceStart = 0
    };
    const r = synthesizeRecallPattern({
      activeArcs: [todayArc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.newlyActiveArcCount).toBe(1);
    expect(r.patternLabel).toBe('newly_active');
  });

  it('evidenceSentence for today-started arc references transit identity', () => {
    const todayArc = {
      transit_planet: 'Venus',
      aspect_type: 'sextile',
      natal_target: 'Mars',
      state: 'approaching',
      recurrence_count: 1,
      first_active_date: TODAY,
    };
    const r = synthesizeRecallPattern({
      activeArcs: [todayArc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.evidenceSentence).toMatch(/Venus sextile Mars/);
    expect(r.evidenceSentence).toMatch(/approaching/);
  });
});

// ── 4. buildExplainabilityNote — returning arc with null first_active_date ────
//
// A returning arc (recurrence_count ≥ 2) with first_active_date: null must:
// - Still fire Priority 1 (returning arc branch)
// - Include recurrence evidence
// - NOT crash
// - NOT include a duration claim (since first_active_date is null)
//

describe('buildExplainabilityNote — returning arc with null first_active_date', () => {
  it('returning arc with null first_active_date still produces hasExplanation: true', () => {
    const arc = {
      transit_planet: 'Saturn',
      aspect_type: 'square',
      natal_target: 'Sun',
      state: 'returning',
      recurrence_count: 2,
      first_active_date: null as null,
      tightest_orb: null as null,
    };
    const result = buildExplainabilityNote({
      activeArcs: [arc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(true);
  });

  it('returning arc with null first_active_date includes recurrence in evidenceBasis', () => {
    const arc = {
      transit_planet: 'Saturn',
      aspect_type: 'square',
      natal_target: 'Sun',
      state: 'returning',
      recurrence_count: 2,
      first_active_date: null as null,
      tightest_orb: null as null,
    };
    const result = buildExplainabilityNote({
      activeArcs: [arc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('recurrence 2'))).toBe(true);
  });

  it('GUARD: returning arc with null first_active_date does NOT include duration claim', () => {
    const arc = {
      transit_planet: 'Saturn',
      aspect_type: 'square',
      natal_target: 'Sun',
      state: 'returning',
      recurrence_count: 2,
      first_active_date: null as null,
      tightest_orb: null as null,
    };
    const result = buildExplainabilityNote({
      activeArcs: [arc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    // Duration claim requires parseable first_active_date — must be absent here
    expect(result.evidenceBasis.some((e) => e.includes('active') && e.includes('day'))).toBe(false);
  });

  it('GUARD: returning arc with null first_active_date does not crash and returns valid output', () => {
    const arc = {
      transit_planet: 'Jupiter',
      aspect_type: 'conjunction',
      natal_target: 'Mercury',
      state: 'returning',
      recurrence_count: 3,
      first_active_date: null as null,
      tightest_orb: null as null,
    };
    // Must not throw
    expect(() => buildExplainabilityNote({
      activeArcs: [arc],
      recurringDomains: [],
      asOfDate: TODAY,
    })).not.toThrow();

    const result = buildExplainabilityNote({
      activeArcs: [arc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(true);
    expect(result.explanationLine).toMatch(/^Surfaced because:/);
    expect(result.evidenceBasis.length).toBeGreaterThan(0);
  });
});
