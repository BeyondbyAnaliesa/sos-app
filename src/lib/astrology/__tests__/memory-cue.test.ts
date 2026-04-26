/**
 * memory-cue.test.ts
 *
 * Deterministic unit tests for buildDailyMemoryCue (pure-fns.ts).
 *
 * This function was extracted from reading/daily/page.tsx so that the
 * branch logic (returning arc, dominant arc daysActive, recurring domain,
 * signal fallback, static fallback) is directly verifiable without a
 * Next.js server-component harness.
 *
 * All tests are deterministic:
 *   - explicit nowMs to freeze "now"
 *   - explicit fixture data; no Date.now() side-effects
 *   - no I/O, no Supabase, no network
 *
 * Test coverage plan:
 *   1. Priority 1 — returning arc (recurrence_count > 1)
 *   2. Priority 1 — returning arc (state === 'returning')
 *   3. Priority 2 — dominant arc daysActive >= 3 (various states)
 *   4. Priority 2 — dominant arc daysActive < 3 falls through
 *   5. Priority 2 — dominant arc with no first_active_date falls through
 *   6. Priority 3 — recurring domain pattern
 *   7. Priority 4 — signal theme fallback
 *   8. Priority 4 — signal domain fallback
 *   9. Priority 5 — static fallback (no arc, no signal)
 *  10. arcMemory null → falls through to signal/static fallback
 *  11. arcMemory confidence === 'none' → falls through to signal/static fallback
 *  12. nowMs injection: daysActive boundary at exactly 3 days
 *  13. nowMs injection: daysActive at exactly 2 days falls through to next priority
 *  14. GUARD: returning arc takes priority over dominant arc
 *  15. GUARD: dominant arc takes priority over recurring domain
 */

import { describe, it, expect } from 'vitest';
import { buildDailyMemoryCue } from '../pure-fns';

// Reference "now" for all deterministic tests: 2026-04-25T12:00:00Z
// This is 1 day after the arc started on 2026-04-24.
const NOW_MS = new Date('2026-04-25T12:00:00Z').getTime();

// Arc started 5 days ago relative to NOW_MS (2026-04-20)
const START_5_DAYS_AGO = '2026-04-20';
// Arc started 1 day ago (2026-04-24)
const START_1_DAY_AGO = '2026-04-24';
// Arc started 3 days ago (2026-04-22) → daysActive = 4
const START_3_DAYS_AGO = '2026-04-22';
// Arc started 2 days ago (2026-04-23) → daysActive = 3
const START_2_DAYS_AGO = '2026-04-23';
// Arc started 1 day ago = TODAY - 1 (2026-04-24) → daysActive = 2
const START_TODAY_MINUS_1 = '2026-04-24';

const CONFIDENT_MEMORY = (arcs: object[], domains: object[] = []) => ({
  confidence: 'medium' as const,
  activeArcs: arcs as Parameters<typeof buildDailyMemoryCue>[0]['arcMemory'] extends NonNullable<infer T> ? T['activeArcs'] : never,
  recurringDomains: domains as Array<{ domain: string; signalCount: number; arcCount: number }>,
});

// ── Priority 1: Returning arc (recurrence_count > 1) ────────────────────────

describe('buildDailyMemoryCue — Priority 1: returning arc (recurrence_count)', () => {
  it('recurrence_count 2 → "a second time" label', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Jupiter',
        aspect_type: 'trine',
        natal_target: 'Venus',
        state: 'approaching',
        recurrence_count: 2,
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    expect(result).toContain('Jupiter trine Venus');
    expect(result).toContain('a second time');
    expect(result).toContain('A familiar pattern is returning.');
  });

  it('recurrence_count 3 → "a third time" label', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Saturn',
        aspect_type: 'square',
        natal_target: 'Sun',
        state: 'separating',
        recurrence_count: 3,
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    expect(result).toContain('a third time');
    expect(result).toContain('A familiar pattern is returning.');
  });

  it('recurrence_count 5 → "a 5th time" label', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Mars',
        aspect_type: 'opposition',
        natal_target: 'Moon',
        state: 'approaching',
        recurrence_count: 5,
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    expect(result).toContain('a 5th time');
  });
});

// ── Priority 1: Returning arc (state === 'returning') ───────────────────────

describe('buildDailyMemoryCue — Priority 1: returning arc (state)', () => {
  it('state === "returning" fires Priority 1 even with recurrence_count: 1', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Neptune',
        aspect_type: 'sextile',
        natal_target: 'Mercury',
        state: 'returning',
        recurrence_count: 1,
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    expect(result).toContain('Neptune sextile Mercury');
    expect(result).toContain('A familiar pattern is returning.');
  });
});

// ── Priority 2: Dominant arc with multi-day presence ────────────────────────

describe('buildDailyMemoryCue — Priority 2: dominant arc daysActive', () => {
  it('daysActive >= 3, state === "approaching" → "still building"', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Uranus',
        aspect_type: 'trine',
        natal_target: 'Sun',
        state: 'approaching',
        recurrence_count: 1,
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    expect(result).toContain('Uranus trine Sun');
    expect(result).toContain('still building');
    expect(result).toContain('days.');
  });

  it('daysActive >= 3, state === "exact" → "at its peak"', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Venus',
        aspect_type: 'conjunction',
        natal_target: 'Ascendant',
        state: 'exact',
        recurrence_count: 1,
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    expect(result).toContain('at its peak');
    expect(result).toContain('days.');
  });

  it('daysActive >= 3, state === "separating" → "now moving through"', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Pluto',
        aspect_type: 'square',
        natal_target: 'Moon',
        state: 'separating',
        recurrence_count: 1,
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    expect(result).toContain('now moving through');
    expect(result).toContain('days.');
  });

  it('BOUNDARY: daysActive exactly 3 (arc started 2 days ago) → fires Priority 2', () => {
    // NOW_MS = Apr 25; first_active_date = Apr 23
    // days = round((Apr25 - Apr23) / 86400000) + 1 = 2 + 1 = 3 → fires
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Mercury',
        aspect_type: 'trine',
        natal_target: 'Jupiter',
        state: 'approaching',
        recurrence_count: 1,
        first_active_date: START_2_DAYS_AGO, // Apr 23 → daysActive = 3
      }]),
      nowMs: NOW_MS,
    });
    expect(result).toContain('3 days.');
  });

  it('BOUNDARY: daysActive exactly 2 (arc started yesterday) → falls through Priority 2', () => {
    // NOW_MS = Apr 25; first_active_date = Apr 24
    // days = round((Apr25 - Apr24) / 86400000) + 1 = 1 + 1 = 2 → does NOT fire
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([
        {
          transit_planet: 'Mercury',
          aspect_type: 'trine',
          natal_target: 'Jupiter',
          state: 'approaching',
          recurrence_count: 1,
          first_active_date: START_TODAY_MINUS_1, // Apr 24 → daysActive = 2
        },
      ],
      [{ domain: 'career', signalCount: 4, arcCount: 1 }]),
      nowMs: NOW_MS,
    });
    // Priority 2 did not fire; falls through to Priority 3 (domain)
    expect(result).toContain('career');
    expect(result).not.toContain('days.');
  });

  it('arc with no first_active_date falls through Priority 2', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([
        {
          transit_planet: 'Mars',
          aspect_type: 'trine',
          natal_target: 'Venus',
          state: 'approaching',
          recurrence_count: 1,
          first_active_date: null,
        },
      ],
      [{ domain: 'body', signalCount: 3, arcCount: 1 }]),
      nowMs: NOW_MS,
    });
    // No first_active_date → Priority 2 skipped → falls to Priority 3
    expect(result).toContain('body');
  });
});

// ── Priority 3: Recurring domain pattern ────────────────────────────────────

describe('buildDailyMemoryCue — Priority 3: recurring domain', () => {
  it('recurring domain with 1 signal → singular label', () => {
    const result = buildDailyMemoryCue({
      arcMemory: {
        confidence: 'medium',
        activeArcs: [],
        recurringDomains: [{ domain: 'relationships', signalCount: 1, arcCount: 1 }],
      },
      nowMs: NOW_MS,
    });
    expect(result).toContain('relationships');
    expect(result).toContain('1 signal');
    expect(result).not.toContain('signals');
    expect(result).toContain('in recent weeks');
  });

  it('recurring domain with 5 signals → plural label', () => {
    const result = buildDailyMemoryCue({
      arcMemory: {
        confidence: 'medium',
        activeArcs: [],
        recurringDomains: [{ domain: 'career', signalCount: 5, arcCount: 2 }],
      },
      nowMs: NOW_MS,
    });
    expect(result).toContain('career');
    expect(result).toContain('5 signals');
  });
});

// ── Priority 4: Signal-based fallback ───────────────────────────────────────

describe('buildDailyMemoryCue — Priority 4: signal fallback', () => {
  it('no arc memory + signal.themes_json[0] → theme-based fallback', () => {
    const result = buildDailyMemoryCue({
      arcMemory: null,
      signal: { life_domain: null, themes_json: ['boundaries'] },
      nowMs: NOW_MS,
    });
    expect(result).toContain('boundaries');
    expect(result).toContain('navigating around');
  });

  it('no arc memory + signal.life_domain → domain-based fallback', () => {
    const result = buildDailyMemoryCue({
      arcMemory: null,
      signal: { life_domain: 'mind', themes_json: null },
      nowMs: NOW_MS,
    });
    expect(result).toContain('mind');
    expect(result).toContain('navigating around');
  });

  it('themes_json takes precedence over life_domain in signal fallback', () => {
    const result = buildDailyMemoryCue({
      arcMemory: null,
      signal: { life_domain: 'career', themes_json: ['creativity'] },
      nowMs: NOW_MS,
    });
    // theme is [0] so 'creativity' fires, not 'career'
    expect(result).toContain('creativity');
    expect(result).not.toContain('career');
  });
});

// ── Priority 5: Static fallback ──────────────────────────────────────────────

describe('buildDailyMemoryCue — Priority 5: static fallback', () => {
  it('null arcMemory, null signal → static fallback', () => {
    const result = buildDailyMemoryCue({
      arcMemory: null,
      signal: null,
      nowMs: NOW_MS,
    });
    expect(result).toContain('The more you bring to Aeon');
    expect(result).toContain('context');
  });

  it('arcMemory confidence === "none" → falls through to static fallback (no signal)', () => {
    const result = buildDailyMemoryCue({
      arcMemory: {
        confidence: 'none',
        activeArcs: [{ transit_planet: 'Mars', aspect_type: 'trine', natal_target: 'Sun', state: 'approaching', recurrence_count: 2, first_active_date: START_5_DAYS_AGO }],
        recurringDomains: [{ domain: 'career', signalCount: 5, arcCount: 1 }],
      },
      signal: null,
      nowMs: NOW_MS,
    });
    // confidence === 'none' → arc block skipped entirely
    expect(result).toContain('The more you bring to Aeon');
  });

  it('undefined arcMemory, empty signal → static fallback', () => {
    const result = buildDailyMemoryCue({
      signal: { life_domain: null, themes_json: [] },
      nowMs: NOW_MS,
    });
    expect(result).toContain('The more you bring to Aeon');
  });
});

// ── Priority ordering guards ─────────────────────────────────────────────────

describe('buildDailyMemoryCue — priority ordering guards', () => {
  it('GUARD: returning arc takes priority over dominant multi-day arc', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Jupiter',
        aspect_type: 'trine',
        natal_target: 'Venus',
        state: 'approaching',
        recurrence_count: 2, // returning → Priority 1
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    // Must fire returning-arc copy, not dominant-arc copy
    expect(result).toContain('A familiar pattern is returning.');
    expect(result).not.toContain('days.');
  });

  it('GUARD: returning arc takes priority over recurring domain', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY(
        [{
          transit_planet: 'Saturn',
          aspect_type: 'square',
          natal_target: 'Moon',
          state: 'returning',
          recurrence_count: 1,
          first_active_date: START_5_DAYS_AGO,
        }],
        [{ domain: 'career', signalCount: 10, arcCount: 3 }],
      ),
      nowMs: NOW_MS,
    });
    expect(result).toContain('A familiar pattern is returning.');
    expect(result).not.toContain('career');
  });

  it('GUARD: dominant arc takes priority over recurring domain', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY(
        [{
          transit_planet: 'Venus',
          aspect_type: 'sextile',
          natal_target: 'Mars',
          state: 'exact',
          recurrence_count: 1, // not returning
          first_active_date: START_5_DAYS_AGO, // daysActive = 6
        }],
        [{ domain: 'relationships', signalCount: 5, arcCount: 1 }],
      ),
      nowMs: NOW_MS,
    });
    expect(result).toContain('Venus sextile Mars');
    expect(result).toContain('days.');
    expect(result).not.toContain('relationships');
  });

  it('GUARD: signal fallback fires after all arc branches return nothing', () => {
    const result = buildDailyMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Moon',
        aspect_type: 'trine',
        natal_target: 'Sun',
        state: 'approaching',
        recurrence_count: 1, // not returning
        first_active_date: START_TODAY_MINUS_1, // only 2 days → under threshold
      }], []),
      signal: { life_domain: 'spirit', themes_json: null },
      nowMs: NOW_MS,
    });
    // Arc block fires but neither returning nor daysActive≥3 nor domain hits
    // → signal fallback fires
    expect(result).toContain('spirit');
    expect(result).toContain('navigating around');
  });
});

// ── Idempotency / determinism ────────────────────────────────────────────────

describe('buildDailyMemoryCue — idempotency', () => {
  it('same input always produces same output', () => {
    const params = {
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Jupiter',
        aspect_type: 'trine',
        natal_target: 'Venus',
        state: 'approaching',
        recurrence_count: 1,
        first_active_date: START_5_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    };
    expect(buildDailyMemoryCue(params)).toBe(buildDailyMemoryCue(params));
  });
});
