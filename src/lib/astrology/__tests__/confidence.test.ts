/**
 * confidence.test.ts
 *
 * Regression tests for the retrieval confidence tiering logic.
 * `computeConfidenceTier` is a pure function of arc + domain counts.
 *
 * These tests guard against silent regressions in the tier boundaries.
 * Product surfaces rely on this tier to decide how strongly to surface memory.
 */

import { describe, it, expect } from 'vitest';
import { computeConfidenceTier } from '../pure-fns';

describe('computeConfidenceTier', () => {
  // ── 'none' tier ──────────────────────────────────────────────────────────

  it('none: no arcs, no domains, no recent history', () => {
    expect(computeConfidenceTier({ activeArcsCount: 0, recurringDomainsCount: 0, recentArcsCount: 0 })).toBe('none');
  });

  // ── 'low' tier ───────────────────────────────────────────────────────────

  it('low: recent arc history but no active arcs or domains', () => {
    expect(computeConfidenceTier({ activeArcsCount: 0, recurringDomainsCount: 0, recentArcsCount: 1 })).toBe('low');
  });

  it('low: multiple recent arcs, still no active or domains', () => {
    expect(computeConfidenceTier({ activeArcsCount: 0, recurringDomainsCount: 0, recentArcsCount: 5 })).toBe('low');
  });

  // ── 'medium' tier ────────────────────────────────────────────────────────

  it('medium: exactly 1 active arc, no domains', () => {
    expect(computeConfidenceTier({ activeArcsCount: 1, recurringDomainsCount: 0, recentArcsCount: 0 })).toBe('medium');
  });

  it('medium: no active arcs but 1 recurring domain', () => {
    expect(computeConfidenceTier({ activeArcsCount: 0, recurringDomainsCount: 1, recentArcsCount: 0 })).toBe('medium');
  });

  it('medium: 1 active arc with domain (not yet high — needs ≥2 arcs)', () => {
    expect(computeConfidenceTier({ activeArcsCount: 1, recurringDomainsCount: 1, recentArcsCount: 0 })).toBe('medium');
  });

  // ── 'high' tier ──────────────────────────────────────────────────────────

  it('high: 2+ active arcs AND 1+ recurring domain', () => {
    expect(computeConfidenceTier({ activeArcsCount: 2, recurringDomainsCount: 1, recentArcsCount: 0 })).toBe('high');
  });

  it('high: many active arcs and many domains', () => {
    expect(computeConfidenceTier({ activeArcsCount: 5, recurringDomainsCount: 3, recentArcsCount: 10 })).toBe('high');
  });

  // ── BAD OUTPUT guard tests ────────────────────────────────────────────────

  it('BAD OUTPUT guard: 1 active arc + 0 domains must NOT be high', () => {
    const result = computeConfidenceTier({ activeArcsCount: 1, recurringDomainsCount: 0, recentArcsCount: 0 });
    expect(result).not.toBe('high');
  });

  it('BAD OUTPUT guard: 2 active arcs but 0 domains must NOT be high', () => {
    const result = computeConfidenceTier({ activeArcsCount: 2, recurringDomainsCount: 0, recentArcsCount: 0 });
    expect(result).not.toBe('high');
    expect(result).toBe('medium');
  });

  it('BAD OUTPUT guard: 0 active arcs + 0 domains + recent arcs must NOT be medium', () => {
    const result = computeConfidenceTier({ activeArcsCount: 0, recurringDomainsCount: 0, recentArcsCount: 3 });
    expect(result).not.toBe('medium');
    expect(result).not.toBe('high');
  });

  it('BAD OUTPUT guard: completely empty state must NOT be low or above', () => {
    const result = computeConfidenceTier({ activeArcsCount: 0, recurringDomainsCount: 0, recentArcsCount: 0 });
    expect(result).toBe('none');
  });

  // ── Tier ordering ─────────────────────────────────────────────────────────

  it('tier order: more signals → same or higher confidence', () => {
    const c1 = computeConfidenceTier({ activeArcsCount: 0, recurringDomainsCount: 0, recentArcsCount: 0 });
    const c2 = computeConfidenceTier({ activeArcsCount: 0, recurringDomainsCount: 0, recentArcsCount: 1 });
    const c3 = computeConfidenceTier({ activeArcsCount: 1, recurringDomainsCount: 0, recentArcsCount: 1 });
    const c4 = computeConfidenceTier({ activeArcsCount: 2, recurringDomainsCount: 1, recentArcsCount: 1 });

    const tierOrder = ['none', 'low', 'medium', 'high'];
    const idx = (t: string) => tierOrder.indexOf(t);

    expect(idx(c1)).toBeLessThan(idx(c2));
    expect(idx(c2)).toBeLessThan(idx(c3));
    expect(idx(c3)).toBeLessThan(idx(c4));
  });
});
