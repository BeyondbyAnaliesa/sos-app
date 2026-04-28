/**
 * calm-day.test.ts — DR-2 calm-day reading logic
 *
 * What's tested:
 * 1. Calm day WITH incoming transits → summary names today's contacts,
 *    detail names incoming transits + domains, "Today is the calm before that."
 * 2. Calm day with NO incoming transits in 72hr → still meaningful,
 *    concrete output (no slop register).
 * 3. Banned-register guardrail — the hard constraint that no calm-day output
 *    ever contains abstract meditation-app vibes-speak.
 *    This test is intentionally loud: if the prompt drifts back to slop, it fails.
 *
 * Evidence discipline:
 * - All fixtures built from scoring math traced explicitly in comments.
 * - Transit fixtures chosen to produce scores < 9 (calm) or >= 9 (active).
 * - NatalSummary is minimal but structurally valid.
 */

import { describe, it, expect } from 'vitest';
import { buildTransitOverview } from '@/lib/interpret';
import { describeTransitsNarrative } from '@/lib/prompt';
import type { Transit, DailyTransits, NatalSummary } from '@/lib/astrology/domain-types';

// ── Banned register (hard guardrail) ─────────────────────────────────────────
// These phrases must NEVER appear in calm-day output.
// Any change to copy that reintroduces them will fail this test loudly.
export const BANNED_REGISTER_PHRASES = [
  'trust the pause',
  'sit with the stillness',
  'the sky is quiet',
  'the sky is still',
  'lean into the quiet',
] as const;

// ── Test fixtures ─────────────────────────────────────────────────────────────

/**
 * Minimal NatalSummary for scoring tests.
 *
 * Houses chosen to enable or disable directHouseMatch as needed:
 * - neptune: house 12 → houseDomains ['spirit', 'mind']
 * - sun:     house 5  → houseDomains ['relationships', 'spirit']
 * - venus:   house 7  → houseDomains ['relationships']
 */
const testNatal: NatalSummary = {
  placementsByKey: {
    neptune: { key: 'neptune', label: 'Neptune', sign: 'Capricorn', house: 12, degree: 15, minute: 0 },
    sun:     { key: 'sun',     label: 'Sun',     sign: 'Aries',     house: 5,  degree: 10, minute: 0 },
    venus:   { key: 'venus',   label: 'Venus',   sign: 'Gemini',    house: 7,  degree: 22, minute: 0 },
    moon:    { key: 'moon',    label: 'Moon',    sign: 'Scorpio',   house: 8,  degree: 4,  minute: 0 },
  },
  ascendant: { sign: 'Leo',    degree: 20, minute: 0, longitude: 140 },
  midheaven: { sign: 'Taurus', degree: 10, minute: 0, longitude:  40 },
};

/**
 * A calm-day transit list: only wide-orb sextiles to low-weight natal points.
 *
 * Scoring trace (Mercury sextile natal Neptune, orb 5.1):
 *   domain 'mind': aspectWeight=4, transitWeight=3, natalWeight=1,
 *     orbBonus=max(0,6-5.1)=0.9, domainBonus=3 (neptune house 12 → mind matches),
 *     weakPenalty=-4 (sextile AND orb>4.5)
 *     total = 4+3+1+0.9+3-4 = 7.9 < 9 → null ✓
 *   domain 'career': directHouseMatch=false → domainBonus=0
 *     total = 4+3+1+0.9+0-4 = 4.9 < 9 → null ✓
 *
 * Result: Mercury sextile Neptune at 5.1° scores null in all domains → calm day.
 */
const calmDayTransits: Transit[] = [
  { transitPlanet: 'Mercury', aspect: 'sextile', natalPlanet: 'neptune', orb: 5.1 },
];

/**
 * A look-ahead day with a significant incoming transit.
 *
 * Scoring trace (Jupiter trine natal Sun, orb 1.5):
 *   domain 'spirit': aspectWeight=6, transitWeight=4, natalWeight=6,
 *     orbBonus=max(0,6-1.5)=4.5, domainBonus=3 (sun house 5 → spirit matches),
 *     weakPenalty=0 (trine, not sextile)
 *     total = 6+4+6+4.5+3 = 23.5 ≥ 9 → TransitSignature ✓
 */
const lookAheadDay1: DailyTransits = {
  date: '2026-04-28',
  transits: [
    { transitPlanet: 'Jupiter', aspect: 'trine', natalPlanet: 'sun', orb: 1.5 },
  ],
};

/** A look-ahead day with a second significant transit on a different day. */
const lookAheadDay2: DailyTransits = {
  date: '2026-04-29',
  transits: [
    { transitPlanet: 'Saturn', aspect: 'square', natalPlanet: 'moon', orb: 2.0 },
  ],
};

/** An empty look-ahead day — no transits at all. */
const lookAheadDayEmpty: DailyTransits = {
  date: '2026-04-30',
  transits: [],
};

// ── 1. Calm day WITH incoming transits ────────────────────────────────────────

describe('buildTransitOverview — calm day with incoming transits (#DR-2)', () => {
  it('returns intensity low when no transit scores above threshold', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    });
    expect(result.intensity).toBe('low');
  });

  it('summary names today\u2019s real transit contact (not empty-sky framing)', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    });
    // Must mention Mercury (tightest contact today) and natal Neptune
    expect(result.summary).toContain('Mercury');
    expect(result.summary).toContain('Neptune');
    // Must include the orb
    expect(result.summary).toContain('5.1');
  });

  it('detail names the incoming transit planet', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    });
    expect(result.detail).toContain('Jupiter');
  });

  it('detail names the incoming transit\u2019s natal target', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    });
    // 'Sun' capitalized in the output
    expect(result.detail).toContain('Sun');
  });

  it('detail contains look-ahead framing ("Today is the calm before that" or equivalent)', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    });
    expect(result.detail.toLowerCase()).toContain('today is the calm before that');
  });

  it('detail names the day/timing of the incoming transit', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    });
    // 2026-04-28 is a Tuesday — should appear as "Tuesday" or "tomorrow (Tuesday)" etc.
    expect(result.detail.toLowerCase()).toMatch(/tomorrow|tuesday/);
  });

  it('detail names a life domain for the incoming transit', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    });
    // Jupiter trine Sun (house 5 → spirit) → domain title "Spirit"
    expect(result.detail).toMatch(/spirit|career|mind|relationships|body|home/i);
  });

  it('handles two look-ahead days and mentions both', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1, lookAheadDay2],
    });
    expect(result.detail).toContain('Jupiter');
    expect(result.detail).toContain('Saturn');
  });

  it('topTransits is empty on a calm day', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    });
    expect(result.topTransits).toHaveLength(0);
  });
});

// ── 2. Calm day with NO incoming transits in 72hr ────────────────────────────

describe('buildTransitOverview — calm day with no incoming transits (#DR-2)', () => {
  it('still produces meaningful summary output (not empty or vague)', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [],
    });
    expect(result.summary.length).toBeGreaterThan(20);
  });

  it('summary names today\u2019s real transit planet', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [],
    });
    expect(result.summary).toContain('Mercury');
  });

  it('detail describes the quiet window concretely (mentions orb state or window)', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [],
    });
    // Should mention something concrete about the window, not vague vibes
    expect(result.detail.length).toBeGreaterThan(20);
    // Should NOT just repeat today\u2019s transit without adding context
    expect(result.detail.toLowerCase()).toMatch(/wide|window|days|wave|nothing|build/);
  });

  it('handles completely empty transits (no contacts in orb today)', () => {
    const result = buildTransitOverview([], testNatal, {
      lookAheadTransits: [],
    });
    expect(result.summary.length).toBeGreaterThan(10);
    expect(result.detail.length).toBeGreaterThan(10);
    expect(result.intensity).toBe('low');
  });

  it('omitting lookAheadTransits option behaves like empty look-ahead', () => {
    const withEmpty = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [],
    });
    const withOmitted = buildTransitOverview(calmDayTransits, testNatal);
    expect(withOmitted.summary).toBe(withEmpty.summary);
    expect(withOmitted.detail).toBe(withEmpty.detail);
  });

  it('empty look-ahead days (no transits) count as no incoming highlights', () => {
    const result = buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDayEmpty, lookAheadDayEmpty, lookAheadDayEmpty],
    });
    // No scored transits in look-ahead → quiet window detail, not look-ahead detail
    expect(result.detail.toLowerCase()).not.toContain('today is the calm before that');
  });
});

// ── 3. Banned-register guardrail ─────────────────────────────────────────────
// This is a HARD GUARDRAIL. If any of these phrases appear in calm-day output,
// the prompt has drifted to slop-AI register. Fix it before shipping.

describe('banned-register guardrail — calm-day output (#DR-2)', () => {
  const allCalmVariants = [
    // Calm with look-ahead
    buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1, lookAheadDay2],
    }),
    // Calm with partial look-ahead
    buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [lookAheadDay1],
    }),
    // Calm with empty look-ahead
    buildTransitOverview(calmDayTransits, testNatal, {
      lookAheadTransits: [],
    }),
    // Completely empty transits
    buildTransitOverview([], testNatal, {
      lookAheadTransits: [],
    }),
  ];

  for (const phrase of BANNED_REGISTER_PHRASES) {
    it(`never contains "${phrase}" in any calm-day output variant`, () => {
      for (const result of allCalmVariants) {
        const combined = `${result.summary} ${result.detail}`.toLowerCase();
        expect(combined).not.toContain(phrase.toLowerCase());
      }
    });
  }

  it('never contains banned phrases in describeTransitsNarrative (empty transits)', () => {
    const narrative = describeTransitsNarrative([]);
    const lower = narrative.toLowerCase();
    for (const phrase of BANNED_REGISTER_PHRASES) {
      expect(lower).not.toContain(phrase.toLowerCase());
    }
  });

  it('never contains banned phrases in describeTransitsNarrative (calm low-orb transits)', () => {
    const narrative = describeTransitsNarrative(calmDayTransits);
    const lower = narrative.toLowerCase();
    for (const phrase of BANNED_REGISTER_PHRASES) {
      expect(lower).not.toContain(phrase.toLowerCase());
    }
  });
});

// ── 4. Idempotency / determinism ─────────────────────────────────────────────

describe('buildTransitOverview — calm-day determinism (#DR-2)', () => {
  it('same input always produces identical output', () => {
    const input = { transits: calmDayTransits, natal: testNatal, lookAhead: [lookAheadDay1] };
    const r1 = buildTransitOverview(input.transits, input.natal, { lookAheadTransits: input.lookAhead });
    const r2 = buildTransitOverview(input.transits, input.natal, { lookAheadTransits: input.lookAhead });
    expect(r1).toEqual(r2);
  });
});
