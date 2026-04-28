/**
 * hash-idempotency.test.ts
 *
 * Regression tests for the transit-set hash short-circuit mechanism.
 * `computeTransitSetHash` is pure: same sorted transit set → same hash.
 *
 * This is the mechanism that prevents duplicate arc reconciliation
 * when cron fires twice on the same day with unchanged transits.
 */

import { describe, it, expect } from 'vitest';
import { computeTransitSetHash } from '../pure-fns';
import type { Transit } from '../domain-types';

const BASE_TRANSITS: Transit[] = [
  { transitPlanet: 'Venus', aspect: 'sextile', natalPlanet: 'Moon', orb: 0.45 },
  { transitPlanet: 'Saturn', aspect: 'square', natalPlanet: 'Sun', orb: 2.10 },
];

describe('computeTransitSetHash', () => {
  // ── Same input → same output ────────────────────────────────────────────

  it('produces identical hash for identical input (idempotent)', () => {
    const h1 = computeTransitSetHash(BASE_TRANSITS);
    const h2 = computeTransitSetHash(BASE_TRANSITS);
    expect(h1).toBe(h2);
  });

  it('produces a 16-character hex string', () => {
    const h = computeTransitSetHash(BASE_TRANSITS);
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });

  // ── Order independence ─────────────────────────────────────────────────

  it('same hash regardless of transit array order (sorted before hashing)', () => {
    const reversed = [...BASE_TRANSITS].reverse();
    const h1 = computeTransitSetHash(BASE_TRANSITS);
    const h2 = computeTransitSetHash(reversed);
    expect(h1).toBe(h2);
  });

  it('same hash for 3-transit set in different orderings', () => {
    const transits: Transit[] = [
      { transitPlanet: 'Jupiter', aspect: 'trine', natalPlanet: 'Venus', orb: 1.20 },
      { transitPlanet: 'Mars', aspect: 'conjunction', natalPlanet: 'Mercury', orb: 0.80 },
      { transitPlanet: 'Neptune', aspect: 'opposition', natalPlanet: 'Sun', orb: 3.00 },
    ];
    const permutation = [transits[2], transits[0], transits[1]];
    expect(computeTransitSetHash(transits)).toBe(computeTransitSetHash(permutation));
  });

  // ── Change detection ──────────────────────────────────────────────────

  it('different hash when orb changes', () => {
    const changed: Transit[] = [
      { ...BASE_TRANSITS[0], orb: 0.55 }, // orb changed from 0.45 to 0.55
      BASE_TRANSITS[1],
    ];
    expect(computeTransitSetHash(BASE_TRANSITS)).not.toBe(computeTransitSetHash(changed));
  });

  it('different hash when a transit is added', () => {
    const withExtra: Transit[] = [
      ...BASE_TRANSITS,
      { transitPlanet: 'Jupiter', aspect: 'trine', natalPlanet: 'Venus', orb: 1.00 },
    ];
    expect(computeTransitSetHash(BASE_TRANSITS)).not.toBe(computeTransitSetHash(withExtra));
  });

  it('different hash when a transit is removed', () => {
    const subset = BASE_TRANSITS.slice(0, 1);
    expect(computeTransitSetHash(BASE_TRANSITS)).not.toBe(computeTransitSetHash(subset));
  });

  it('different hash when aspect type changes', () => {
    const changed: Transit[] = [
      { ...BASE_TRANSITS[0], aspect: 'trine' },
      BASE_TRANSITS[1],
    ];
    expect(computeTransitSetHash(BASE_TRANSITS)).not.toBe(computeTransitSetHash(changed));
  });

  it('different hash when natal planet changes', () => {
    const changed: Transit[] = [
      { ...BASE_TRANSITS[0], natalPlanet: 'Mars' },
      BASE_TRANSITS[1],
    ];
    expect(computeTransitSetHash(BASE_TRANSITS)).not.toBe(computeTransitSetHash(changed));
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  it('produces deterministic hash for empty transit array', () => {
    const h1 = computeTransitSetHash([]);
    const h2 = computeTransitSetHash([]);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{16}$/);
  });

  it('empty transit set has different hash than non-empty', () => {
    expect(computeTransitSetHash([])).not.toBe(computeTransitSetHash(BASE_TRANSITS));
  });

  it('orbs are compared with 2 decimal precision (0.10 vs 0.11 differ)', () => {
    const a: Transit[] = [{ transitPlanet: 'Venus', aspect: 'sextile', natalPlanet: 'Moon', orb: 0.10 }];
    const b: Transit[] = [{ transitPlanet: 'Venus', aspect: 'sextile', natalPlanet: 'Moon', orb: 0.11 }];
    expect(computeTransitSetHash(a)).not.toBe(computeTransitSetHash(b));
  });

  it('orbs rounded to 2 decimal places: 0.100 and 0.104 both round to "0.10" (same hash)', () => {
    // 0.100.toFixed(2) === "0.10"
    // 0.104.toFixed(2) === "0.10"  (rounds down; 0.105 would round to "0.11")
    // Sub-precision drift within the same 0.01 bucket is intentionally ignored.
    const a: Transit[] = [{ transitPlanet: 'Venus', aspect: 'sextile', natalPlanet: 'Moon', orb: 0.100 }];
    const b: Transit[] = [{ transitPlanet: 'Venus', aspect: 'sextile', natalPlanet: 'Moon', orb: 0.104 }];
    expect(computeTransitSetHash(a)).toBe(computeTransitSetHash(b));
  });
});
