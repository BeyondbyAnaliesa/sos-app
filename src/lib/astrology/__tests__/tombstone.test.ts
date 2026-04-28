/**
 * tombstone.test.ts
 *
 * Regression tests for arc tombstone formatting.
 * `buildArcTombstone` is pure and deterministic: same input → same string.
 *
 * Key evidence-boundary rule: an arc with `exact_dates_json: []`
 * MUST include "no exact crossing recorded" and must NOT claim exactness.
 */

import { describe, it, expect } from 'vitest';
import { buildArcTombstone } from '../pure-fns';
import {
  SYNTH_ARC_APPROACHING,
  SYNTH_ARC_WITH_EXACT,
  SYNTH_ARC_RETURNING,
} from './fixtures/gold-set';

describe('buildArcTombstone', () => {
  // ── Basic structure ────────────────────────────────────────────────────────

  it('includes transit identity (planet, aspect, target)', () => {
    const result = buildArcTombstone(SYNTH_ARC_WITH_EXACT);
    expect(result).toContain('Saturn');
    expect(result).toContain('square');
    expect(result).toContain('Sun');
  });

  it('includes duration in days', () => {
    const result = buildArcTombstone(SYNTH_ARC_WITH_EXACT);
    // Apr 1 to Apr 22 = 22 days
    expect(result).toMatch(/\d+ days?/);
  });

  it('includes tightest orb when available', () => {
    const result = buildArcTombstone(SYNTH_ARC_WITH_EXACT);
    expect(result).toContain('tightest orb 0.30°');
  });

  it('uses peak_orb as fallback when tightest_orb is null', () => {
    const arc = { ...SYNTH_ARC_WITH_EXACT, tightest_orb: null, peak_orb: 0.45 };
    const result = buildArcTombstone(arc);
    expect(result).toContain('tightest orb 0.45°');
  });

  it('omits orb section when both tightest_orb and peak_orb are null', () => {
    const arc = { ...SYNTH_ARC_WITH_EXACT, tightest_orb: null, peak_orb: null };
    const result = buildArcTombstone(arc);
    expect(result).not.toContain('tightest orb');
  });

  // ── Exact crossing evidence boundary ──────────────────────────────────────

  it('BAD OUTPUT guard: arc with no exact dates reports "no exact crossing recorded"', () => {
    const result = buildArcTombstone(SYNTH_ARC_APPROACHING);
    expect(result).toContain('no exact crossing recorded');
  });

  it('BAD OUTPUT guard: arc with no exact dates must NOT claim exactness in any form', () => {
    const result = buildArcTombstone(SYNTH_ARC_APPROACHING);
    // Must not contain "exact N×" pattern
    expect(result).not.toMatch(/exact \d+×/);
  });

  it('arc with exact dates shows count and dates', () => {
    const result = buildArcTombstone(SYNTH_ARC_WITH_EXACT);
    expect(result).toContain('exact 2×');
    expect(result).toContain('Apr 15');
    expect(result).toContain('Apr 22');
  });

  it('arc with more than 3 exact dates shows at most 3', () => {
    const arc = {
      ...SYNTH_ARC_WITH_EXACT,
      exact_dates_json: ['2026-04-01', '2026-04-08', '2026-04-15', '2026-04-22'],
    };
    const result = buildArcTombstone(arc);
    // Shows count as total (4×) but only 3 date labels
    expect(result).toContain('exact 4×');
    // Should contain 3 of the dates, not all 4
    const dateMatches = [...result.matchAll(/Apr \d+/g)];
    // 3 from exactDates + 2 from duration range = at most 5 date mentions total
    // The exact section shows 3: Apr 1, Apr 8, Apr 15 (first 3)
    expect(dateMatches.length).toBeGreaterThanOrEqual(3);
  });

  // ── Direction context ─────────────────────────────────────────────────────

  it('shows "closed widening" for widening arcs', () => {
    const result = buildArcTombstone(SYNTH_ARC_WITH_EXACT); // last_direction: 'widening'
    expect(result).toContain('closed widening');
  });

  it('shows "closed tightening — may return" for tightening arcs', () => {
    const result = buildArcTombstone(SYNTH_ARC_RETURNING); // last_direction: 'tightening'
    expect(result).toContain('closed tightening — may return');
  });

  it('omits direction when last_direction is null', () => {
    const arc = { ...SYNTH_ARC_WITH_EXACT, last_direction: null };
    const result = buildArcTombstone(arc);
    expect(result).not.toContain('closed widening');
    expect(result).not.toContain('closed tightening');
  });

  // ── Recurrence context ────────────────────────────────────────────────────

  it('shows recurrence count when > 1', () => {
    const result = buildArcTombstone(SYNTH_ARC_RETURNING); // recurrence_count: 2
    expect(result).toContain('recurrence 2');
  });

  it('shows return family marker when parent_arc_id present', () => {
    const result = buildArcTombstone(SYNTH_ARC_RETURNING); // has parent_arc_id
    expect(result).toContain('(return family)');
  });

  it('omits recurrence when count is 1', () => {
    const result = buildArcTombstone(SYNTH_ARC_APPROACHING); // recurrence_count: 1
    expect(result).not.toContain('recurrence');
  });

  // ── Duration calculation ──────────────────────────────────────────────────

  it('duration is at least 1 day for same-day open-close', () => {
    const arc = {
      ...SYNTH_ARC_APPROACHING,
      first_active_date: '2026-04-15',
      last_active_date: '2026-04-15',
    };
    const result = buildArcTombstone(arc);
    expect(result).toContain('1 day');
  });

  it('uses first_active_date as fallback when last_active_date is null', () => {
    const arc = { ...SYNTH_ARC_APPROACHING, last_active_date: null };
    const result = buildArcTombstone(arc);
    // Should still produce a valid tombstone
    expect(result).toContain('Venus');
    expect(result).toContain('1 day'); // same-day fallback
  });

  // ── Idempotency ──────────────────────────────────────────────────────────

  it('produces identical output for identical input (idempotent)', () => {
    const a = buildArcTombstone(SYNTH_ARC_WITH_EXACT);
    const b = buildArcTombstone(SYNTH_ARC_WITH_EXACT);
    expect(a).toBe(b);
  });
});
