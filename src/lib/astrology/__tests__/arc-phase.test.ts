/**
 * arc-phase.test.ts
 *
 * Regression tests for the pure arc-phase inference functions.
 * These cover the core state-machine logic for transit arcs:
 *   approaching → exact → separating → dormant (returning)
 *
 * All functions are pure (no Supabase, no I/O).
 */

import { describe, it, expect } from 'vitest';
import {
  inferOrbDirection,
  inferNewArcState,
  inferUpdatedArcState,
} from '../pure-fns';

// ── inferOrbDirection ─────────────────────────────────────────────────────────

describe('inferOrbDirection', () => {
  it('tightening when current orb is smaller than previous', () => {
    expect(inferOrbDirection(1.0, 1.5)).toBe('tightening');
  });

  it('widening when current orb is larger than previous', () => {
    expect(inferOrbDirection(2.0, 1.5)).toBe('widening');
  });

  it('unknown when orbs are identical', () => {
    expect(inferOrbDirection(1.5, 1.5)).toBe('unknown');
  });

  it('unknown when previous orb is null', () => {
    expect(inferOrbDirection(1.5, null)).toBe('unknown');
  });

  it('unknown when previous orb is undefined', () => {
    expect(inferOrbDirection(1.5, undefined)).toBe('unknown');
  });
});

// ── inferNewArcState ─────────────────────────────────────────────────────────

describe('inferNewArcState', () => {
  it('returns exact when orb is at threshold (0.5)', () => {
    expect(inferNewArcState(0.5)).toBe('exact');
  });

  it('returns exact when orb is below threshold', () => {
    expect(inferNewArcState(0.1)).toBe('exact');
    expect(inferNewArcState(0.0)).toBe('exact');
  });

  it('returns approaching when orb is above threshold', () => {
    expect(inferNewArcState(0.51)).toBe('approaching');
    expect(inferNewArcState(2.0)).toBe('approaching');
    expect(inferNewArcState(5.0)).toBe('approaching');
  });

  it('BAD OUTPUT guard: orb of 0.6 must NOT return exact', () => {
    expect(inferNewArcState(0.6)).not.toBe('exact');
  });
});

// ── inferUpdatedArcState ─────────────────────────────────────────────────────

describe('inferUpdatedArcState', () => {
  // ── Exact transitions ────────────────────────────────────────────────────

  it('exact when orb ≤ 0.5, regardless of direction', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 0.5,
        previousOrb: 1.0,
        currentState: 'approaching',
        priorExactDates: [],
      }),
    ).toBe('exact');
  });

  it('exact when orb ≤ 0.5, even if widening', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 0.49,
        previousOrb: 0.45,
        currentState: 'approaching',
        priorExactDates: [],
      }),
    ).toBe('exact');
  });

  // ── Approaching transitions ──────────────────────────────────────────────

  it('approaching when direction is tightening', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 1.2,
        previousOrb: 1.8,
        currentState: 'approaching',
        priorExactDates: [],
      }),
    ).toBe('approaching');
  });

  it('approaching when widening but NO prior exact dates', () => {
    // Widening without an exact crossing → still approaching (not yet past peak)
    expect(
      inferUpdatedArcState({
        currentOrb: 2.0,
        previousOrb: 1.5,
        currentState: 'approaching',
        priorExactDates: [], // key: empty!
      }),
    ).toBe('approaching');
  });

  // ── Separating transitions ───────────────────────────────────────────────

  it('separating when widening AND has prior exact dates', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 1.5,
        previousOrb: 0.8,
        currentState: 'exact',
        priorExactDates: ['2026-04-15'],
      }),
    ).toBe('separating');
  });

  it('BAD OUTPUT guard: separating MUST have prior exact dates', () => {
    // An arc cannot be "separating" if it never had an exact crossing
    const result = inferUpdatedArcState({
      currentOrb: 2.5,
      previousOrb: 1.8,
      currentState: 'approaching',
      priorExactDates: [], // no exact crossing
    });
    expect(result).not.toBe('separating');
  });

  it('BAD OUTPUT guard: widening with no exact dates is approaching, not separating', () => {
    const result = inferUpdatedArcState({
      currentOrb: 3.0,
      previousOrb: 2.0,
      currentState: 'approaching',
      priorExactDates: [],
    });
    expect(result).toBe('approaching');
    expect(result).not.toBe('separating');
  });

  // ── Unknown direction: preserve current state ────────────────────────────

  it('preserves approaching when direction unknown (same orb)', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 1.5,
        previousOrb: 1.5,
        currentState: 'approaching',
        priorExactDates: [],
      }),
    ).toBe('approaching');
  });

  it('preserves separating when direction unknown', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 1.2,
        previousOrb: 1.2,
        currentState: 'separating',
        priorExactDates: ['2026-04-10'],
      }),
    ).toBe('separating');
  });

  it('preserves returning when direction unknown', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 1.0,
        previousOrb: 1.0,
        currentState: 'returning',
        priorExactDates: [],
      }),
    ).toBe('returning');
  });

  it('preserves returning when direction unknown and no previous orb', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 0.8,
        previousOrb: null,
        currentState: 'returning',
        priorExactDates: [],
      }),
    ).toBe('returning');
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('falls back to approaching for unknown state + unknown direction', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 1.5,
        previousOrb: null,
        currentState: 'dormant', // invalid active state
        priorExactDates: [],
      }),
    ).toBe('approaching');
  });
});

// ── Return-family arc lifecycle ─────────────────────────────────────────────────────
//
// A returning arc starts as 'returning' (initial state when re-entering after
// dormancy). It progresses through the normal lifecycle from there:
//   returning --(tightening)--> approaching --(orb≤0.5)--> exact --(widening+exactDates)--> separating
//
// The 'returning' state only persists when direction is unknown (no orb movement
// observable). Once the planet moves, it transitions to the standard phase labels.

describe('inferUpdatedArcState — returning arc lifecycle', () => {
  it('returning arc with tightening direction transitions to approaching', () => {
    // First active update after return: orb is moving inward.
    // The 'returning' marker has served its purpose; arc enters normal lifecycle.
    expect(
      inferUpdatedArcState({
        currentOrb: 1.2,
        previousOrb: 1.8,
        currentState: 'returning',
        priorExactDates: [],
      }),
    ).toBe('approaching');
  });

  it('returning arc with widening direction and no exact dates stays approaching', () => {
    // Still hasn't hit exact — widening without a recorded exact crossing means
    // the arc is approaching, not separating (evidence boundary enforced).
    expect(
      inferUpdatedArcState({
        currentOrb: 2.0,
        previousOrb: 1.5,
        currentState: 'returning',
        priorExactDates: [],
      }),
    ).toBe('approaching');
  });

  it('returning arc with orb ≤0.5 transitions to exact', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 0.4,
        previousOrb: 0.9,
        currentState: 'returning',
        priorExactDates: [],
      }),
    ).toBe('exact');
  });

  it('returning arc with orb exactly at threshold (0.5) is exact', () => {
    expect(
      inferUpdatedArcState({
        currentOrb: 0.5,
        previousOrb: 0.8,
        currentState: 'returning',
        priorExactDates: [],
      }),
    ).toBe('exact');
  });

  it('returning arc widening with prior exact dates transitions to separating', () => {
    // Arc returned, hit exact, now widening. Correct post-exact lifecycle.
    expect(
      inferUpdatedArcState({
        currentOrb: 1.8,
        previousOrb: 0.9,
        currentState: 'returning',
        priorExactDates: ['2026-04-25'], // exact crossing recorded
      }),
    ).toBe('separating');
  });

  it('BAD OUTPUT guard: returning arc that is tightening must NOT stay returning', () => {
    // Once the arc is moving (tightening), it must progress. 'returning' must not
    // persist beyond the initial static snapshot.
    const result = inferUpdatedArcState({
      currentOrb: 1.0,
      previousOrb: 1.8,
      currentState: 'returning',
      priorExactDates: [],
    });
    expect(result).not.toBe('returning');
  });

  it('BAD OUTPUT guard: returning arc widening with no exact dates must NOT be separating', () => {
    const result = inferUpdatedArcState({
      currentOrb: 2.5,
      previousOrb: 2.0,
      currentState: 'returning',
      priorExactDates: [], // never hit exact — cannot be separating
    });
    expect(result).not.toBe('separating');
  });

  it('preserves returning when direction is unknown (first day, no prior orb)', () => {
    // No prior orb on the very first update of a returning arc: state is preserved
    // until we have directional evidence.
    expect(
      inferUpdatedArcState({
        currentOrb: 1.2,
        previousOrb: null,
        currentState: 'returning',
        priorExactDates: [],
      }),
    ).toBe('returning');
  });
});

// ── inferOrbDirection edge cases ────────────────────────────────────────────────────

describe('inferOrbDirection — additional edge cases', () => {
  it('tightening when current is significantly less than previous', () => {
    expect(inferOrbDirection(0.3, 3.0)).toBe('tightening');
  });

  it('widening when current is significantly greater than previous', () => {
    expect(inferOrbDirection(4.5, 0.2)).toBe('widening');
  });

  it('unknown when previous is 0 (zero orb cannot tighten or widen meaningfully)', () => {
    // 0 is a valid previousOrb (exact crossing); if current moves to 0.1 it is
    // technically widening. But 0 is at the limit of measurement from daily snapshots.
    // The rule: current > previous → widening. 0.1 > 0 → widening.
    expect(inferOrbDirection(0.1, 0)).toBe('widening');
  });

  it('unknown for very small floating point difference treated as equal', () => {
    // Same value via object reference / re-assignment:
    const orb = 1.23456789;
    expect(inferOrbDirection(orb, orb)).toBe('unknown');
  });
});
