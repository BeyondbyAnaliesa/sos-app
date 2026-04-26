/**
 * explainability-note.test.ts
 *
 * Deterministic tests for buildExplainabilityNote().
 *
 * All tests use explicit asOfDate to behave as true pure functions
 * (no Date.now() clock side-effects).
 *
 * Bad-output guards are marked "GUARD" and verify that the function
 * never returns explanations unsupported by stored fields.
 *
 * Priority logic mirrors buildMemoryCue in page.tsx and reading/daily/page.tsx:
 *   1. Returning arc (recurrence_count ≥ 2 / state === 'returning')
 *   2. Dominant arc with multi-day presence (daysActive ≥ 3)
 *   3. Recurring domain pattern
 *   4. Fallback → hasExplanation: false
 */

import { describe, it, expect } from 'vitest';
import { buildExplainabilityNote } from '../pure-fns';

const TODAY = '2026-04-25';

// ── Fixture arcs ──────────────────────────────────────────────────────────────

/** Return-family arc: recurrence_count 2, active 5 days, has tightest_orb */
const ARC_RETURNING = {
  transit_planet: 'Jupiter',
  aspect_type: 'trine',
  natal_target: 'Venus',
  state: 'returning',
  recurrence_count: 2,
  first_active_date: '2026-04-20', // 5 days before TODAY
  tightest_orb: 0.42,
};

/** Return-family arc with recurrence_count 3, no tightest_orb */
const ARC_RETURNING_3 = {
  transit_planet: 'Saturn',
  aspect_type: 'sextile',
  natal_target: 'Moon',
  state: 'returning',
  recurrence_count: 3,
  first_active_date: '2026-04-22',
  tightest_orb: null,
};

/** Dominant arc: started 7 days ago (qualifies as multi-day), has tightest_orb */
const ARC_DOMINANT_7D = {
  transit_planet: 'Mars',
  aspect_type: 'square',
  natal_target: 'Sun',
  state: 'exact',
  recurrence_count: 1,
  first_active_date: '2026-04-18', // 7 days before TODAY
  tightest_orb: 1.05,
};

/** Dominant arc: started 1 day ago (below the 3-day threshold — daysActive = 2) */
const ARC_DOMINANT_2D = {
  transit_planet: 'Venus',
  aspect_type: 'sextile',
  natal_target: 'Mercury',
  state: 'approaching',
  recurrence_count: 1,
  first_active_date: '2026-04-24', // 1 calendar day before TODAY → daysActive = 2 (inclusive count)
  tightest_orb: null,
};

/** Arc with no first_active_date */
const ARC_NO_DATE = {
  transit_planet: 'Neptune',
  aspect_type: 'trine',
  natal_target: 'Ascendant',
  state: 'approaching',
  recurrence_count: 1,
  first_active_date: null,
  tightest_orb: null,
};

/** Arc with recurrence_count 1 (the absolute minimum — NOT a returning arc) */
const ARC_RECURRENCE_1 = {
  transit_planet: 'Mercury',
  aspect_type: 'conjunction',
  natal_target: 'Mars',
  state: 'approaching',
  recurrence_count: 1,
  first_active_date: '2026-04-20',
  tightest_orb: null,
};

// ── Fixture domains ───────────────────────────────────────────────────────────

const DOMAIN_HEALTH_5 = { domain: 'health', signalCount: 5, arcCount: 2 };
const DOMAIN_CAREER_3 = { domain: 'career', signalCount: 3, arcCount: 1 };
const DOMAIN_QUIET_1  = { domain: 'relationships', signalCount: 1, arcCount: 1 };

// ─────────────────────────────────────────────────────────────────────────────
// Priority 1: Returning arc
// ─────────────────────────────────────────────────────────────────────────────

describe('buildExplainabilityNote — returning arc (priority 1)', () => {
  it('returns hasExplanation: true for a returning arc', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(true);
  });

  it('explanationLine starts with "Surfaced because:"', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.explanationLine).toMatch(/^Surfaced because:/);
  });

  it('includes recurrence count in evidenceBasis', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('recurrence 2'))).toBe(true);
  });

  it('includes days-active in evidenceBasis when first_active_date is present', () => {
    // ARC_RETURNING started 2026-04-20, today is 2026-04-25 → 6 days
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('days'))).toBe(true);
  });

  it('includes tightest orb in evidenceBasis when tightest_orb is non-null', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('0.42°'))).toBe(true);
  });

  it('omits tightest orb from evidenceBasis when tightest_orb is null', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING_3],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('orb'))).toBe(false);
  });

  it('handles recurrence_count 3 correctly', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING_3],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('recurrence 3'))).toBe(true);
  });

  it('returning arc takes priority over a multi-day dominant arc', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_DOMINANT_7D, ARC_RETURNING],
      recurringDomains: [DOMAIN_HEALTH_5],
      asOfDate: TODAY,
    });
    // returning arc is in position 1 but priority logic should find it
    expect(result.hasExplanation).toBe(true);
    expect(result.evidenceBasis.some((e) => e.includes('recurrence'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Priority 2: Dominant multi-day arc
// ─────────────────────────────────────────────────────────────────────────────

describe('buildExplainabilityNote — dominant multi-day arc (priority 2)', () => {
  it('returns hasExplanation: true for a dominant 7-day arc', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_DOMINANT_7D],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(true);
  });

  it('includes days-active in evidenceBasis', () => {
    // ARC_DOMINANT_7D started 2026-04-18, today is 2026-04-25 → 8 days
    const result = buildExplainabilityNote({
      activeArcs: [ARC_DOMINANT_7D],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('days'))).toBe(true);
  });

  it('includes arc state in evidenceBasis', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_DOMINANT_7D],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('state:'))).toBe(true);
  });

  it('includes tightest_orb when present', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_DOMINANT_7D],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('1.05°'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Priority 3: Recurring domain
// ─────────────────────────────────────────────────────────────────────────────

describe('buildExplainabilityNote — recurring domain (priority 3)', () => {
  it('returns hasExplanation: true for a recurring domain', () => {
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [DOMAIN_HEALTH_5],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(true);
  });

  it('includes domain name and signal count in evidenceBasis', () => {
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [DOMAIN_HEALTH_5],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('health'))).toBe(true);
    expect(result.evidenceBasis.some((e) => e.includes('5 signals'))).toBe(true);
  });

  it('includes arc count in evidenceBasis', () => {
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [DOMAIN_HEALTH_5],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('arc'))).toBe(true);
  });

  it('uses the first (top) domain from the sorted list', () => {
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [DOMAIN_HEALTH_5, DOMAIN_CAREER_3],
      asOfDate: TODAY,
    });
    // health is first (highest signalCount) — evidence should reference health
    expect(result.evidenceBasis.some((e) => e.includes('health'))).toBe(true);
    expect(result.evidenceBasis.some((e) => e.includes('career'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fallback / quiet state
// ─────────────────────────────────────────────────────────────────────────────

describe('buildExplainabilityNote — quiet/fallback state', () => {
  it('returns hasExplanation: false for empty arcs and domains', () => {
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(false);
  });

  it('returns empty explanationLine for quiet state', () => {
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.explanationLine).toBe('');
  });

  it('returns empty evidenceBasis for quiet state', () => {
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis).toHaveLength(0);
  });

  it('returns hasExplanation: false when arc has no first_active_date and no domain', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_NO_DATE],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BAD OUTPUT guards
// ─────────────────────────────────────────────────────────────────────────────

describe('buildExplainabilityNote — BAD OUTPUT guards', () => {
  it('GUARD: recurrence_count 1 must NOT produce a returning explanation', () => {
    // recurrence_count 1 means no prior occurrence — must not claim "recurrence"
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RECURRENCE_1],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.evidenceBasis.some((e) => e.includes('recurrence'))).toBe(false);
  });

  it('GUARD: arc below 3-day threshold must not produce explanation', () => {
    // ARC_DOMINANT_2D started only 2 days ago — below the multi-day threshold
    const result = buildExplainabilityNote({
      activeArcs: [ARC_DOMINANT_2D],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(false);
  });

  it('GUARD: hasExplanation false → explanationLine must be empty string', () => {
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(false);
    expect(result.explanationLine).toBe('');
  });

  it('GUARD: domain explanation must not reference arc transit internals (planet/aspect)', () => {
    // Domain-based explanation should only reference domain labels, signalCount, arcCount
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [DOMAIN_HEALTH_5],
      asOfDate: TODAY,
    });
    // Verify no transit-planet / aspect claims leak into explanation
    const combined = result.evidenceBasis.join(' ');
    expect(combined).not.toMatch(/trine|square|sextile|conjunction|opposition|Jupiter|Saturn|Mars/);
  });

  it('GUARD: explanation for quiet domain (signalCount=1, no arcs) — uses domain if any', () => {
    // Even a low-signal domain (1 signal) produces an explanation if it's the only domain
    const result = buildExplainabilityNote({
      activeArcs: [],
      recurringDomains: [DOMAIN_QUIET_1],
      asOfDate: TODAY,
    });
    // Should still produce explanation (domain branch fires for any non-empty recurringDomains)
    expect(result.hasExplanation).toBe(true);
    expect(result.evidenceBasis.some((e) => e.includes('1 signal'))).toBe(true);
  });

  it('GUARD: hasExplanation true → explanationLine must start with "Surfaced because:"', () => {
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(result.hasExplanation).toBe(true);
    expect(result.explanationLine.startsWith('Surfaced because:')).toBe(true);
  });

  it('GUARD: returning arc explanation must not claim exactness unless exact_dates are present', () => {
    // ARC_RETURNING has tightest_orb 0.42° (under 0.5°) but we only surface tightest_orb,
    // never claim "exact crossing" from tightest_orb alone — that would require exact_dates_json.
    const result = buildExplainabilityNote({
      activeArcs: [ARC_RETURNING],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    const combined = result.evidenceBasis.join(' ');
    // Must not claim exactness — only allowed to state the orb value
    expect(combined).not.toMatch(/exact crossing|reached exact|exact hit/i);
  });

  it('GUARD: idempotency — same input always produces same output', () => {
    const params = {
      activeArcs: [ARC_RETURNING],
      recurringDomains: [DOMAIN_HEALTH_5],
      asOfDate: TODAY,
    };
    const r1 = buildExplainabilityNote(params);
    const r2 = buildExplainabilityNote(params);
    expect(r1).toEqual(r2);
  });
});
