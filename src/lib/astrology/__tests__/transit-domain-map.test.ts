/**
 * transit-domain-map.test.ts
 *
 * Tests for the Transit Room free-tier logic (H-1):
 *   - getTransitDomainLabel   — domain key → user-facing label
 *   - partitionTransitRoomGuidance — free/paid content partitioning
 *
 * All tests are fully deterministic: no I/O, no Supabase, no Date.now() calls.
 *
 * Covers the four test requirements from sos-decisions-2026-04-27.md (H-1):
 *   1. Free user: visible.length === 1, locked.length > 0, each locked has a domain label
 *   2. Paid user: locked.length === 0, all active transits visible
 *   3. Domain mapping returns expected labels for known inputs
 *   4. Unlock CTA is shown for free users only (paid users redirect to /calendar —
 *      tested indirectly: partitionTransitRoomGuidance(paid=true) → locked = [],
 *      and the Transit Room page only renders for free users via redirect guard)
 */

import { describe, it, expect } from 'vitest';
import {
  getTransitDomainLabel,
  partitionTransitRoomGuidance,
  TRANSIT_ROOM_DOMAIN_LABELS,
} from '../transit-domain-map';
import type { GuidanceResult } from '@/lib/interpret';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeGuidance(domain: string, intensity: 'high' | 'medium' | 'low'): GuidanceResult {
  return {
    domain: domain as GuidanceResult['domain'],
    title:  domain.charAt(0).toUpperCase() + domain.slice(1),
    message: `Test message for ${domain}`,
    intensity,
    summary: `Transit active for ${domain}`,
  };
}

const HIGH_RELATIONSHIPS = makeGuidance('relationships', 'high');
const HIGH_CAREER        = makeGuidance('career',        'high');
const MEDIUM_SPIRIT      = makeGuidance('spirit',        'medium');
const LOW_HOME           = makeGuidance('home',          'low');
const LOW_BODY           = makeGuidance('body',          'low');

// A realistic set: 2 high, 1 medium, 2 low — mirrors a normal interpretTransits result
const MIXED_GUIDANCE: GuidanceResult[] = [
  HIGH_RELATIONSHIPS,
  HIGH_CAREER,
  MEDIUM_SPIRIT,
  LOW_HOME,
  LOW_BODY,
];

// Only quiet guidance (edge case: calm sky)
const ALL_QUIET: GuidanceResult[] = [LOW_HOME, LOW_BODY];

// Single active guidance (edge case: minimal transits)
const ONE_ACTIVE: GuidanceResult[] = [HIGH_RELATIONSHIPS, LOW_HOME];

// ── getTransitDomainLabel ─────────────────────────────────────────────────────

describe('getTransitDomainLabel', () => {
  describe('known domains', () => {
    it('returns "Love" for relationships', () => {
      expect(getTransitDomainLabel('relationships')).toBe('Love');
    });

    it('returns "Career" for career', () => {
      expect(getTransitDomainLabel('career')).toBe('Career');
    });

    it('returns "Health" for body', () => {
      expect(getTransitDomainLabel('body')).toBe('Health');
    });

    it('returns "Your Mind" for mind', () => {
      expect(getTransitDomainLabel('mind')).toBe('Your Mind');
    });

    it('returns "Spirituality" for spirit', () => {
      expect(getTransitDomainLabel('spirit')).toBe('Spirituality');
    });

    it('returns "Home" for home', () => {
      expect(getTransitDomainLabel('home')).toBe('Home');
    });
  });

  describe('all known domains are covered', () => {
    it('TRANSIT_ROOM_DOMAIN_LABELS covers all six core domains', () => {
      const coreDomains = ['body', 'mind', 'spirit', 'relationships', 'career', 'home'];
      for (const domain of coreDomains) {
        expect(TRANSIT_ROOM_DOMAIN_LABELS[domain]).toBeTruthy();
      }
    });
  });

  describe('unknown domain fallback', () => {
    it('capitalizes and returns raw key for an unknown domain', () => {
      expect(getTransitDomainLabel('finances')).toBe('Finances');
    });

    it('handles single-char unknown domain gracefully', () => {
      expect(getTransitDomainLabel('x')).toBe('X');
    });

    it('never returns empty string for any non-empty input', () => {
      const label = getTransitDomainLabel('unknown_future_domain');
      expect(label.length).toBeGreaterThan(0);
    });
  });
});

// ── partitionTransitRoomGuidance ──────────────────────────────────────────────

describe('partitionTransitRoomGuidance', () => {
  // ── Free user: thirst trap behavior ──────────────────────────────────────

  describe('free user (paid = false) — thirst trap', () => {
    it('shows exactly ONE active guidance card for free users', () => {
      const { visible } = partitionTransitRoomGuidance(MIXED_GUIDANCE, false);
      expect(visible).toHaveLength(1);
    });

    it('visible[0] is the first active guidance (highest priority)', () => {
      const { visible } = partitionTransitRoomGuidance(MIXED_GUIDANCE, false);
      expect(visible[0].domain).toBe('relationships');
    });

    it('locks the remaining active guidance items (N > 0)', () => {
      const { locked } = partitionTransitRoomGuidance(MIXED_GUIDANCE, false);
      // 3 active (2 high + 1 medium), 1 visible → 2 locked
      expect(locked).toHaveLength(2);
    });

    it('each locked item has a domain property that maps to a non-empty label', () => {
      const { locked } = partitionTransitRoomGuidance(MIXED_GUIDANCE, false);
      for (const item of locked) {
        const label = getTransitDomainLabel(item.domain);
        expect(label.length).toBeGreaterThan(0);
      }
    });

    it('locked items are not the same as visible items', () => {
      const { visible, locked } = partitionTransitRoomGuidance(MIXED_GUIDANCE, false);
      const visibleDomains = new Set(visible.map((g) => g.domain));
      for (const item of locked) {
        expect(visibleDomains.has(item.domain)).toBe(false);
      }
    });

    it('quiet guidance (low intensity) is separated from locked', () => {
      const { locked, quiet } = partitionTransitRoomGuidance(MIXED_GUIDANCE, false);
      // Low-intensity items should be in quiet, not locked
      for (const item of locked) {
        expect(item.intensity).not.toBe('low');
      }
      for (const item of quiet) {
        expect(item.intensity).toBe('low');
      }
    });

    it('quiet guidance is not gated (free users can see quiet domains)', () => {
      const { quiet } = partitionTransitRoomGuidance(MIXED_GUIDANCE, false);
      expect(quiet).toHaveLength(2); // LOW_HOME, LOW_BODY
    });

    it('handles a calm sky (all quiet) gracefully — visible and locked are empty', () => {
      const { visible, locked, quiet } = partitionTransitRoomGuidance(ALL_QUIET, false);
      expect(visible).toHaveLength(0);
      expect(locked).toHaveLength(0);
      expect(quiet).toHaveLength(2);
    });

    it('single active guidance: visible has 1, locked has 0', () => {
      const { visible, locked } = partitionTransitRoomGuidance(ONE_ACTIVE, false);
      expect(visible).toHaveLength(1);
      expect(locked).toHaveLength(0);
    });
  });

  // ── Paid user: full access ─────────────────────────────────────────────────

  describe('paid user (paid = true) — full access', () => {
    it('shows ALL active guidance (nothing locked) for paid users', () => {
      const { visible, locked } = partitionTransitRoomGuidance(MIXED_GUIDANCE, true);
      // 3 active items (2 high + 1 medium)
      expect(visible).toHaveLength(3);
      expect(locked).toHaveLength(0);
    });

    it('locked array is always empty for paid users', () => {
      const { locked } = partitionTransitRoomGuidance(MIXED_GUIDANCE, true);
      expect(locked).toHaveLength(0);
    });

    it('paid users see all high-intensity transits', () => {
      const { visible } = partitionTransitRoomGuidance(MIXED_GUIDANCE, true);
      const highCount = visible.filter((g) => g.intensity === 'high').length;
      expect(highCount).toBe(2);
    });

    it('quiet guidance is still separated for paid users (structural consistency)', () => {
      const { quiet } = partitionTransitRoomGuidance(MIXED_GUIDANCE, true);
      expect(quiet).toHaveLength(2);
    });

    it('paid calm sky: visible empty, locked empty, quiet has items', () => {
      const { visible, locked, quiet } = partitionTransitRoomGuidance(ALL_QUIET, true);
      expect(visible).toHaveLength(0);
      expect(locked).toHaveLength(0);
      expect(quiet).toHaveLength(2);
    });
  });

  // ── Unlock CTA guard ──────────────────────────────────────────────────────

  describe('Unlock CTA rendering guard (Transit Room is free-only)', () => {
    it('GUARD: free user with active transits always has locked > 0 OR is single-transit day', () => {
      // When there are ≥ 2 active transits, free users always have locked > 0
      const multiActive: GuidanceResult[] = [HIGH_RELATIONSHIPS, HIGH_CAREER, MEDIUM_SPIRIT];
      const { locked } = partitionTransitRoomGuidance(multiActive, false);
      expect(locked.length).toBeGreaterThan(0);
    });

    it('GUARD: paid user never has locked items (page redirects paid users to /calendar)', () => {
      // This mirrors the page-level redirect: paid users never see the Transit Room.
      // At the pure-function level, paid always returns locked = [].
      const { locked } = partitionTransitRoomGuidance(MIXED_GUIDANCE, true);
      expect(locked).toHaveLength(0);
    });

    it('GUARD: locked domain labels are unique across different domains', () => {
      const { locked } = partitionTransitRoomGuidance(MIXED_GUIDANCE, false);
      const labels = locked.map((r) => getTransitDomainLabel(r.domain));
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });
  });
});
