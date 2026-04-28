/**
 * anticipatory-positioning.test.ts
 *
 * Deterministic tests for scanApproachingArcPeaks.
 *
 * Evidence boundary rules enforced here:
 * - Only 'approaching' arcs qualify
 * - Key matching is strict label equality
 * - willReachExact requires orb <= 0.5 in the scan window — never inferred
 * - arcs with no forward window match are excluded
 * - arcs with peak orb > maxPeakOrb are excluded
 * - empty input → empty output, no fabrication
 */

import { describe, it, expect } from 'vitest';
import { scanApproachingArcPeaks } from '../pure-fns';

// ── Shared test fixtures ──────────────────────────────────────────────────────

/** Build a minimal approaching arc fixture */
function approachingArc(
  planet: string,
  aspect: string,
  target: string,
  last_orb?: number | null,
  tightest_orb?: number | null,
) {
  return {
    transit_planet: planet,
    aspect_type: aspect,
    natal_target: target,
    state: 'approaching',
    last_orb: last_orb ?? null,
    tightest_orb: tightest_orb ?? null,
  };
}

/** Build a minimal upcoming transit fixture for one day */
function transitDay(
  date: string,
  entries: Array<{ planet: string; aspect: string; target: string; orb: number }>,
) {
  return {
    date,
    transits: entries.map((e) => ({
      transitPlanet: e.planet,
      aspect: e.aspect,
      natalPlanet: e.target,
      orb: e.orb,
    })),
  };
}

// ── Basic inclusion ────────────────────────────────────────────────────────────

describe('scanApproachingArcPeaks — basic inclusion', () => {
  it('includes approaching arc whose orb tightens in the forward window', () => {
    const arcs = [approachingArc('Jupiter', 'trine', 'Venus', 1.8)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 1.5 }]),
      transitDay('2026-04-27', [{ planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.8 }]),
      transitDay('2026-04-28', [{ planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.4 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(1);
    expect(result[0].transit_planet).toBe('Jupiter');
    expect(result[0].aspect_type).toBe('trine');
    expect(result[0].natal_target).toBe('Venus');
  });

  it('returns the correct projectedPeakOrb and projectedPeakDate', () => {
    const arcs = [approachingArc('Mars', 'conjunct', 'Moon', 1.2)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Mars', aspect: 'conjunct', target: 'Moon', orb: 1.0 }]),
      transitDay('2026-04-27', [{ planet: 'Mars', aspect: 'conjunct', target: 'Moon', orb: 0.3 }]), // min
      transitDay('2026-04-28', [{ planet: 'Mars', aspect: 'conjunct', target: 'Moon', orb: 0.6 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result[0].projectedPeakOrb).toBe(0.3);
    expect(result[0].projectedPeakDate).toBe('2026-04-27');
  });

  it('computes daysUntilPeak as 1-indexed from first scan element', () => {
    const arcs = [approachingArc('Saturn', 'square', 'Sun', 1.5)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Saturn', aspect: 'square', target: 'Sun', orb: 1.3 }]),
      transitDay('2026-04-27', [{ planet: 'Saturn', aspect: 'square', target: 'Sun', orb: 0.9 }]),
      transitDay('2026-04-28', [{ planet: 'Saturn', aspect: 'square', target: 'Sun', orb: 0.5 }]), // min
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    // min is at index 2 → daysUntilPeak = 3
    expect(result[0].daysUntilPeak).toBe(3);
  });

  it('uses stored last_orb as currentOrb when available', () => {
    const arcs = [approachingArc('Neptune', 'sextile', 'Mars', 1.7, 1.9)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Neptune', aspect: 'sextile', target: 'Mars', orb: 1.4 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    // last_orb = 1.7 (stored), not the scan orb
    expect(result[0].currentOrb).toBe(1.7);
  });

  it('falls back to tightest_orb when last_orb is null', () => {
    const arcs = [approachingArc('Uranus', 'opposition', 'Moon', null, 1.6)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Uranus', aspect: 'opposition', target: 'Moon', orb: 1.4 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result[0].currentOrb).toBe(1.6);
  });

  it('uses forward scan orb as currentOrb when both last_orb and tightest_orb are null', () => {
    const arcs = [approachingArc('Venus', 'trine', 'Saturn', null, null)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Venus', aspect: 'trine', target: 'Saturn', orb: 1.1 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result[0].currentOrb).toBe(1.1);
  });
});

// ── Exact threshold ────────────────────────────────────────────────────────────

describe('scanApproachingArcPeaks — willReachExact', () => {
  it('willReachExact: true when projected peak orb <= 0.5', () => {
    const arcs = [approachingArc('Jupiter', 'trine', 'Venus', 1.2)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.5 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result[0].willReachExact).toBe(true);
    expect(result[0].projectedPeakOrb).toBe(0.5);
  });

  it('willReachExact: true when projected peak orb is 0.0 exactly', () => {
    const arcs = [approachingArc('Mars', 'conjunct', 'Moon', 0.8)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Mars', aspect: 'conjunct', target: 'Moon', orb: 0.0 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result[0].willReachExact).toBe(true);
  });

  it('willReachExact: false when projected peak orb is 0.51', () => {
    const arcs = [approachingArc('Saturn', 'square', 'Sun', 1.5)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Saturn', aspect: 'square', target: 'Sun', orb: 0.51 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result[0].willReachExact).toBe(false);
  });

  it('willReachExact: false when orb stays above 0.5 throughout entire window', () => {
    const arcs = [approachingArc('Neptune', 'trine', 'Venus', 1.5)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Neptune', aspect: 'trine', target: 'Venus', orb: 1.2 }]),
      transitDay('2026-04-27', [{ planet: 'Neptune', aspect: 'trine', target: 'Venus', orb: 0.9 }]),
      transitDay('2026-04-28', [{ planet: 'Neptune', aspect: 'trine', target: 'Venus', orb: 0.7 }]),
      transitDay('2026-04-29', [{ planet: 'Neptune', aspect: 'trine', target: 'Venus', orb: 0.6 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result[0].willReachExact).toBe(false);
    expect(result[0].projectedPeakOrb).toBe(0.6);
  });
});

// ── Exclusion rules (bad-output guards) ───────────────────────────────────────

describe('scanApproachingArcPeaks — bad-output guards', () => {
  it('never includes a separating arc', () => {
    const arcs = [{
      transit_planet: 'Jupiter', aspect_type: 'trine', natal_target: 'Venus',
      state: 'separating', last_orb: 0.3,
    }];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.4 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('never includes an exact arc', () => {
    const arcs = [{
      transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Moon',
      state: 'exact', last_orb: 0.2,
    }];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Mars', aspect: 'conjunct', target: 'Moon', orb: 0.1 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('never includes a returning arc', () => {
    const arcs = [{
      transit_planet: 'Saturn', aspect_type: 'square', natal_target: 'Sun',
      state: 'returning', last_orb: 1.5, tightest_orb: null,
    }];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Saturn', aspect: 'square', target: 'Sun', orb: 1.2 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('never includes a dormant arc', () => {
    const arcs = [{
      transit_planet: 'Venus', aspect_type: 'sextile', natal_target: 'Mars',
      state: 'dormant', last_orb: 0.5,
    }];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Venus', aspect: 'sextile', target: 'Mars', orb: 0.4 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('excludes arc with no match in forward window', () => {
    const arcs = [approachingArc('Pluto', 'quincunx', 'Jupiter', 1.8)];
    const upcoming = [
      // Different transit present — Pluto quincunx Jupiter NOT in window
      transitDay('2026-04-26', [{ planet: 'Mercury', aspect: 'sextile', target: 'Venus', orb: 0.9 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('excludes arc whose min orb in window exceeds maxPeakOrb', () => {
    const arcs = [approachingArc('Neptune', 'opposition', 'Sun', 3.5)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Neptune', aspect: 'opposition', target: 'Sun', orb: 2.8 }]),
      transitDay('2026-04-27', [{ planet: 'Neptune', aspect: 'opposition', target: 'Sun', orb: 2.5 }]),
    ];
    // Default maxPeakOrb = 2.0 — both days are above it
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('includes arc when custom maxPeakOrb is high enough', () => {
    const arcs = [approachingArc('Neptune', 'opposition', 'Sun', 3.5)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Neptune', aspect: 'opposition', target: 'Sun', orb: 2.5 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming, maxPeakOrb: 3.0 });
    expect(result).toHaveLength(1);
    expect(result[0].projectedPeakOrb).toBe(2.5);
  });

  it('key matching is strict — partial key match does not count as match', () => {
    const arcs = [approachingArc('Jupiter', 'trine', 'Venus', 1.5)];
    // Same planet but different aspect
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Jupiter', aspect: 'sextile', target: 'Venus', orb: 0.8 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('key matching is strict — different natal target is excluded', () => {
    const arcs = [approachingArc('Mars', 'conjunct', 'Moon', 1.2)];
    // Same planet + aspect but different natal target
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Mars', aspect: 'conjunct', target: 'Sun', orb: 0.4 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty activeArcs', () => {
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.8 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: [], upcomingTransits: upcoming });
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty upcomingTransits', () => {
    const arcs = [approachingArc('Jupiter', 'trine', 'Venus', 1.5)];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: [] });
    expect(result).toHaveLength(0);
  });

  it('returns empty array for all-empty inputs', () => {
    const result = scanApproachingArcPeaks({ activeArcs: [], upcomingTransits: [] });
    expect(result).toHaveLength(0);
  });
});

// ── Multi-arc and ordering ─────────────────────────────────────────────────────

describe('scanApproachingArcPeaks — multi-arc + ordering', () => {
  it('returns multiple approaching arcs sorted by peak date ascending', () => {
    const arcs = [
      approachingArc('Jupiter', 'trine', 'Venus', 1.5),
      approachingArc('Mars', 'conjunct', 'Moon', 1.8),
    ];
    const upcoming = [
      transitDay('2026-04-26', [
        { planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.8 },
        { planet: 'Mars', aspect: 'conjunct', target: 'Moon', orb: 1.6 },
      ]),
      transitDay('2026-04-27', [
        { planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.9 },
        { planet: 'Mars', aspect: 'conjunct', target: 'Moon', orb: 0.6 }, // Mars peaks later
      ]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(2);
    // Jupiter peaks on 04-26, Mars on 04-27 — Jupiter first
    expect(result[0].transit_planet).toBe('Jupiter');
    expect(result[1].transit_planet).toBe('Mars');
  });

  it('picks the day with the actual minimum orb, not just the first day', () => {
    const arcs = [approachingArc('Saturn', 'trine', 'Jupiter', 1.5)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Saturn', aspect: 'trine', target: 'Jupiter', orb: 0.9 }]),
      transitDay('2026-04-27', [{ planet: 'Saturn', aspect: 'trine', target: 'Jupiter', orb: 0.3 }]), // real min
      transitDay('2026-04-28', [{ planet: 'Saturn', aspect: 'trine', target: 'Jupiter', orb: 0.6 }]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result[0].projectedPeakOrb).toBe(0.3);
    expect(result[0].projectedPeakDate).toBe('2026-04-27');
    expect(result[0].daysUntilPeak).toBe(2);
  });

  it('only approaching arcs from a mixed-state arc list are included', () => {
    const arcs = [
      approachingArc('Jupiter', 'trine', 'Venus', 1.5),
      { transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Moon', state: 'separating', last_orb: 0.3 },
      { transit_planet: 'Saturn', aspect_type: 'square', natal_target: 'Sun', state: 'exact', last_orb: 0.1 },
    ];
    const upcoming = [
      transitDay('2026-04-26', [
        { planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.9 },
        { planet: 'Mars', aspect: 'conjunct', target: 'Moon', orb: 0.5 },
        { planet: 'Saturn', aspect: 'square', target: 'Sun', orb: 0.2 },
      ]),
    ];
    const result = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(result).toHaveLength(1);
    expect(result[0].transit_planet).toBe('Jupiter');
  });
});

// ── Idempotency ────────────────────────────────────────────────────────────────

describe('scanApproachingArcPeaks — idempotency', () => {
  it('same input always produces identical output', () => {
    const arcs = [approachingArc('Jupiter', 'trine', 'Venus', 1.2)];
    const upcoming = [
      transitDay('2026-04-26', [{ planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.4 }]),
    ];
    const r1 = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    const r2 = scanApproachingArcPeaks({ activeArcs: arcs, upcomingTransits: upcoming });
    expect(r1).toEqual(r2);
  });
});
