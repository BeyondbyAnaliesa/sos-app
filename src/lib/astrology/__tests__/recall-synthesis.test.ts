/**
 * recall-synthesis.test.ts
 *
 * Deterministic tests for synthesizeRecallPattern().
 *
 * All tests pass an explicit asOfDate so the function behaves
 * as a true pure function (no Date.now() clock side-effects).
 *
 * Evidence-boundary guards are marked "GUARD" and test that the function
 * never returns labels unsupported by the structured input data.
 */

import { describe, it, expect } from 'vitest';
import { synthesizeRecallPattern } from '../pure-fns';

const TODAY = '2026-04-25';

// ── Fixture arcs ──────────────────────────────────────────────────────────────

/** Return-family arc: recurrence_count 2 */
const ARC_RETURNING = {
  transit_planet: 'Jupiter',
  aspect_type: 'trine',
  natal_target: 'Venus',
  state: 'returning',
  recurrence_count: 2,
  first_active_date: '2026-04-20', // 5 days before TODAY
};

/** Fresh arc, recently started (2 days ago) — no prior occurrence */
const ARC_NEWLY_ACTIVE = {
  transit_planet: 'Venus',
  aspect_type: 'sextile',
  natal_target: 'Moon',
  state: 'approaching',
  recurrence_count: 1,
  first_active_date: '2026-04-23', // 2 days before TODAY
};

/** Older arc, started 24 days ago — not newly active within default threshold */
const ARC_OLD = {
  transit_planet: 'Saturn',
  aspect_type: 'square',
  natal_target: 'Sun',
  state: 'approaching',
  recurrence_count: 1,
  first_active_date: '2026-04-01', // 24 days before TODAY
};

/** Arc with no first_active_date (missing field) */
const ARC_NO_DATE = {
  transit_planet: 'Mars',
  aspect_type: 'opposition',
  natal_target: 'Moon',
  state: 'exact',
  recurrence_count: 1,
  first_active_date: null,
};

// ── Fixture domains ───────────────────────────────────────────────────────────

/** High-signal domain: above the recurring_domain threshold (>= 3) */
const DOMAIN_HIGH = { domain: 'work', signalCount: 5, arcCount: 2 };

/** Low-signal domain: below the recurring_domain threshold */
const DOMAIN_LOW = { domain: 'relationships', signalCount: 2, arcCount: 1 };

/** Exactly at threshold */
const DOMAIN_AT_THRESHOLD = { domain: 'health', signalCount: 3, arcCount: 1 };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('synthesizeRecallPattern — patternLabel: returning', () => {
  it('labels as returning when an active arc has recurrence_count 2', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('returning');
    expect(r.returningArcCount).toBe(1);
  });

  it('returning takes priority over recurring_domain', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [DOMAIN_HIGH],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('returning');
  });

  it('returning takes priority over newly_active', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_RETURNING, ARC_NEWLY_ACTIVE],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('returning');
  });

  it('counts multiple returning arcs correctly', () => {
    const arc2 = { ...ARC_RETURNING, natal_target: 'Mars', recurrence_count: 3 };
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_RETURNING, arc2],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.returningArcCount).toBe(2);
    expect(r.patternLabel).toBe('returning');
  });

  it('evidenceSentence for returning references transit identity and recurrence_count', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.evidenceSentence).toMatch(/Jupiter trine Venus/);
    expect(r.evidenceSentence).toMatch(/occurrence 2/);
    expect(r.evidenceSentence).toMatch(/recurrence_count/);
  });
});

describe('synthesizeRecallPattern — patternLabel: recurring_domain', () => {
  it('labels as recurring_domain when top domain has signalCount >= 3 and no returning arc', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_OLD],
      recurringDomains: [DOMAIN_HIGH],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('recurring_domain');
    expect(r.dominantDomain).toBe('work');
    expect(r.dominantDomainSignalCount).toBe(5);
  });

  it('labels as recurring_domain when signalCount is exactly 3 (at-threshold)', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [DOMAIN_AT_THRESHOLD],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('recurring_domain');
  });

  it('dominantDomain is the first element (highest signalCount) from recurringDomains', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [DOMAIN_HIGH, DOMAIN_LOW],
      asOfDate: TODAY,
    });
    expect(r.dominantDomain).toBe('work');
    expect(r.dominantDomainSignalCount).toBe(5);
    expect(r.patternLabel).toBe('recurring_domain');
  });

  it('evidenceSentence for recurring_domain references domain name, signal count, arc count', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [DOMAIN_HIGH],
      asOfDate: TODAY,
    });
    expect(r.evidenceSentence).toMatch(/work/);
    expect(r.evidenceSentence).toMatch(/5/);
    expect(r.evidenceSentence).toMatch(/60-day/);
  });
});

describe('synthesizeRecallPattern — patternLabel: newly_active', () => {
  it('labels as newly_active when an arc started within threshold and no stronger pattern', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_NEWLY_ACTIVE], // 2 days before TODAY
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('newly_active');
    expect(r.newlyActiveArcCount).toBe(1);
  });

  it('newly_active includes arc started exactly on threshold day', () => {
    const arcOnBoundary = {
      ...ARC_NEWLY_ACTIVE,
      first_active_date: '2026-04-22', // exactly 3 days before TODAY
    };
    const r = synthesizeRecallPattern({
      activeArcs: [arcOnBoundary],
      recurringDomains: [],
      asOfDate: TODAY,
      newlyActiveDaysThreshold: 3,
    });
    expect(r.patternLabel).toBe('newly_active');
    expect(r.newlyActiveArcCount).toBe(1);
  });

  it('respects custom newlyActiveDaysThreshold', () => {
    // ARC_OLD started 24 days ago — within a threshold of 30
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_OLD],
      recurringDomains: [],
      asOfDate: TODAY,
      newlyActiveDaysThreshold: 30,
    });
    expect(r.patternLabel).toBe('newly_active');
    expect(r.newlyActiveArcCount).toBe(1);
  });

  it('evidenceSentence for newly_active references transit identity and state', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_NEWLY_ACTIVE],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.evidenceSentence).toMatch(/Venus sextile Moon/);
    expect(r.evidenceSentence).toMatch(/approaching/);
  });
});

describe('synthesizeRecallPattern — patternLabel: quiet', () => {
  it('labels as quiet when no arcs and no domains', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('quiet');
    expect(r.returningArcCount).toBe(0);
    expect(r.dominantDomain).toBeNull();
    expect(r.dominantDomainSignalCount).toBe(0);
    expect(r.newlyActiveArcCount).toBe(0);
  });

  it('labels as quiet when only old arcs and below-threshold domains', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_OLD],
      recurringDomains: [DOMAIN_LOW],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('quiet');
  });
});

describe('synthesizeRecallPattern — BAD OUTPUT guards', () => {
  it('GUARD: 0 active arcs must not produce returning label', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).not.toBe('returning');
    expect(r.returningArcCount).toBe(0);
  });

  it('GUARD: arc with recurrence_count 1 must not count as returning', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_OLD], // recurrence_count: 1
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.returningArcCount).toBe(0);
    expect(r.patternLabel).not.toBe('returning');
  });

  it('GUARD: 0 domains must not produce recurring_domain label', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).not.toBe('recurring_domain');
    expect(r.dominantDomain).toBeNull();
    expect(r.dominantDomainSignalCount).toBe(0);
  });

  it('GUARD: signalCount 2 must not trigger recurring_domain label', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [DOMAIN_LOW], // signalCount: 2
      asOfDate: TODAY,
    });
    expect(r.patternLabel).not.toBe('recurring_domain');
  });

  it('GUARD: arc beyond threshold must not count as newly_active', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_OLD], // 24 days ago, default threshold 3
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.newlyActiveArcCount).toBe(0);
    expect(r.patternLabel).not.toBe('newly_active');
  });

  it('GUARD: arc with null first_active_date must not count as newly_active', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_NO_DATE],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.newlyActiveArcCount).toBe(0);
    expect(r.patternLabel).not.toBe('newly_active');
  });

  it('GUARD: quiet evidenceSentence must not claim a pattern exists', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.evidenceSentence).toMatch(/No recurring pattern/);
    // Must not accidentally reference transit identity or counts
    expect(r.evidenceSentence).not.toMatch(/occurrence \d/);
    expect(r.evidenceSentence).not.toMatch(/signals across/);
    expect(r.evidenceSentence).not.toMatch(/recurrence_count/);
  });

  it('GUARD: returning evidenceSentence must not claim exactness without exact evidence', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    // Should say "occurrence 2" not claim exact crossings
    expect(r.evidenceSentence).not.toMatch(/exact crossing/);
  });
});

describe('synthesizeRecallPattern — field integrity and idempotency', () => {
  it('always returns all required fields', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [DOMAIN_HIGH],
      asOfDate: TODAY,
    });
    expect(r).toHaveProperty('patternLabel');
    expect(r).toHaveProperty('returningArcCount');
    expect(r).toHaveProperty('dominantDomain');
    expect(r).toHaveProperty('dominantDomainSignalCount');
    expect(r).toHaveProperty('newlyActiveArcCount');
    expect(r).toHaveProperty('evidenceSentence');
    expect(typeof r.evidenceSentence).toBe('string');
    expect(r.evidenceSentence.length).toBeGreaterThan(0);
  });

  it('idempotent: same input always produces identical output', () => {
    const params = {
      activeArcs: [ARC_RETURNING, ARC_NEWLY_ACTIVE],
      recurringDomains: [DOMAIN_HIGH, DOMAIN_LOW],
      asOfDate: TODAY,
    };
    const r1 = synthesizeRecallPattern(params);
    const r2 = synthesizeRecallPattern(params);
    expect(r1).toEqual(r2);
  });

  it('returningArcCount and newlyActiveArcCount are both non-negative integers', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.returningArcCount).toBeGreaterThanOrEqual(0);
    expect(r.newlyActiveArcCount).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(r.returningArcCount)).toBe(true);
    expect(Number.isInteger(r.newlyActiveArcCount)).toBe(true);
  });

  it('patternLabel is always one of the four valid values', () => {
    const valid = new Set(['returning', 'recurring_domain', 'newly_active', 'quiet']);
    const cases = [
      { activeArcs: [ARC_RETURNING], recurringDomains: [] },
      { activeArcs: [ARC_OLD], recurringDomains: [DOMAIN_HIGH] },
      { activeArcs: [ARC_NEWLY_ACTIVE], recurringDomains: [] },
      { activeArcs: [], recurringDomains: [] },
    ];
    for (const c of cases) {
      const r = synthesizeRecallPattern({ ...c, asOfDate: TODAY });
      expect(valid.has(r.patternLabel)).toBe(true);
    }
  });
});
