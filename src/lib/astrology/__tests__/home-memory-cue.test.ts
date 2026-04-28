/**
 * home-memory-cue.test.ts
 *
 * Deterministic unit tests for buildHomeMemoryCue (pure-fns.ts).
 *
 * This function was extracted from app/page.tsx so that the branch logic
 * (returning arc, dominant arc daysActive, recurring domain, signal fallback,
 * report fallback, static fallback) is directly verifiable without a
 * Next.js server-component harness.
 *
 * Key differences from buildDailyMemoryCue:
 *   - Returns { headline: string; body: string } (two-line card) not a plain string
 *   - Has an additional `report` parameter (report.themes[0] → Priority 5 fallback)
 *   - Daily Reading's "separating" stateLabel is "now moving through";
 *     Home's is "moving through" (without "now") — preserved exactly
 *
 * All tests are deterministic:
 *   - explicit nowMs to freeze "now"
 *   - explicit fixture data; no Date.now() side-effects
 *   - no I/O, no Supabase, no network
 */

import { describe, it, expect } from 'vitest';
import { buildHomeMemoryCue } from '../pure-fns';

// Reference "now": 2026-04-25T12:00:00Z
const NOW_MS = new Date('2026-04-25T12:00:00Z').getTime();

// Convenience dates relative to NOW_MS
const START_5_DAYS_AGO = '2026-04-20'; // daysActive = 6
const START_2_DAYS_AGO = '2026-04-23'; // daysActive = 3 (boundary)
const START_1_DAY_AGO  = '2026-04-24'; // daysActive = 2 (falls through Priority 2)

const CONFIDENT_MEMORY = (
  arcs: object[],
  domains: Array<{ domain: string; signalCount: number; arcCount: number }> = [],
) => ({
  confidence: 'medium' as const,
  activeArcs: arcs as Array<{
    transit_planet: string;
    aspect_type: string;
    natal_target: string;
    state: string;
    recurrence_count?: number | null;
    first_active_date?: string | null;
  }>,
  recurringDomains: domains,
});

// ── Priority 1: Returning arc (recurrence_count > 1) ────────────────────────

describe('buildHomeMemoryCue — Priority 1: returning arc (recurrence_count)', () => {
  it('recurrence_count 2 → headline "familiar pattern returning", body "a second time"', () => {
    const result = buildHomeMemoryCue({
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
    expect(result.headline).toBe('SOS noticed a familiar pattern returning.');
    expect(result.body).toContain('Jupiter trine Venus');
    expect(result.body).toContain('a second time');
  });

  it('recurrence_count 3 → body "a third time"', () => {
    const result = buildHomeMemoryCue({
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
    expect(result.body).toContain('a third time');
  });

  it('recurrence_count 5 → body "a 5th time"', () => {
    const result = buildHomeMemoryCue({
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
    expect(result.body).toContain('a 5th time');
  });

  it('state === "returning" fires Priority 1 even with recurrence_count 1', () => {
    const result = buildHomeMemoryCue({
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
    expect(result.headline).toBe('SOS noticed a familiar pattern returning.');
    expect(result.body).toContain('Neptune sextile Mercury');
  });
});

// ── Priority 2: Dominant arc with multi-day presence ────────────────────────

describe('buildHomeMemoryCue — Priority 2: dominant arc daysActive', () => {
  it('state === "approaching" → stateLabel "still building"', () => {
    const result = buildHomeMemoryCue({
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
    expect(result.headline).toBe('SOS noticed something has been building.');
    expect(result.body).toContain('Uranus trine Sun');
    expect(result.body).toContain('still building');
    expect(result.body).toContain('days.');
  });

  it('state === "exact" → stateLabel "at its peak"', () => {
    const result = buildHomeMemoryCue({
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
    expect(result.body).toContain('at its peak');
    expect(result.body).toContain('days.');
  });

  it('state === "separating" → stateLabel "moving through" (no "now")', () => {
    // NOTE: Home page uses "moving through", not "now moving through" (Daily Reading uses "now moving through")
    const result = buildHomeMemoryCue({
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
    expect(result.body).toContain('moving through');
    expect(result.body).not.toContain('now moving through');
  });

  it('BOUNDARY: daysActive exactly 3 (started 2 days ago) → fires Priority 2', () => {
    // Apr 25 - Apr 23 → round(2) + 1 = 3 → fires
    const result = buildHomeMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Mercury',
        aspect_type: 'trine',
        natal_target: 'Jupiter',
        state: 'approaching',
        recurrence_count: 1,
        first_active_date: START_2_DAYS_AGO,
      }]),
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed something has been building.');
    expect(result.body).toContain('3 days.');
  });

  it('BOUNDARY: daysActive exactly 2 (started 1 day ago) → falls through Priority 2', () => {
    // Apr 25 - Apr 24 → round(1) + 1 = 2 → does NOT fire
    const result = buildHomeMemoryCue({
      arcMemory: CONFIDENT_MEMORY(
        [{
          transit_planet: 'Mercury',
          aspect_type: 'trine',
          natal_target: 'Jupiter',
          state: 'approaching',
          recurrence_count: 1,
          first_active_date: START_1_DAY_AGO,
        }],
        [{ domain: 'career', signalCount: 4, arcCount: 1 }],
      ),
      nowMs: NOW_MS,
    });
    // Priority 2 did not fire; falls to Priority 3 (domain)
    expect(result.headline).toBe('SOS noticed a pattern in your life.');
    expect(result.body).toContain('career');
  });

  it('arc with no first_active_date → falls through Priority 2', () => {
    const result = buildHomeMemoryCue({
      arcMemory: CONFIDENT_MEMORY(
        [{
          transit_planet: 'Mars',
          aspect_type: 'trine',
          natal_target: 'Venus',
          state: 'approaching',
          recurrence_count: 1,
          first_active_date: null,
        }],
        [{ domain: 'body', signalCount: 3, arcCount: 1 }],
      ),
      nowMs: NOW_MS,
    });
    // No first_active_date → Priority 2 skipped → falls to Priority 3
    expect(result.headline).toBe('SOS noticed a pattern in your life.');
    expect(result.body).toContain('body');
  });
});

// ── Priority 3: Recurring domain pattern ────────────────────────────────────

describe('buildHomeMemoryCue — Priority 3: recurring domain', () => {
  it('single signal → singular label, correct headline', () => {
    const result = buildHomeMemoryCue({
      arcMemory: {
        confidence: 'medium',
        activeArcs: [],
        recurringDomains: [{ domain: 'relationships', signalCount: 1, arcCount: 1 }],
      },
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed a pattern in your life.');
    expect(result.body).toContain('relationships');
    expect(result.body).toContain('1 signal');
    expect(result.body).not.toContain('signals');
    expect(result.body).toContain('in recent weeks');
  });

  it('plural signals → plural label', () => {
    const result = buildHomeMemoryCue({
      arcMemory: {
        confidence: 'medium',
        activeArcs: [],
        recurringDomains: [{ domain: 'career', signalCount: 5, arcCount: 2 }],
      },
      nowMs: NOW_MS,
    });
    expect(result.body).toContain('5 signals');
  });
});

// ── Priority 4: Signal-based fallback ───────────────────────────────────────

describe('buildHomeMemoryCue — Priority 4: signal fallback', () => {
  it('no arc + signal.themes_json[0] → signal fallback headline + theme in body', () => {
    const result = buildHomeMemoryCue({
      arcMemory: null,
      signal: { life_domain: null, themes_json: ['boundaries'] },
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed something carrying forward.');
    expect(result.body).toContain('boundaries');
    expect(result.body).toContain('not just today\'s sky in isolation');
  });

  it('no arc + signal.life_domain → domain in body', () => {
    const result = buildHomeMemoryCue({
      arcMemory: null,
      signal: { life_domain: 'mind', themes_json: null },
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed something carrying forward.');
    expect(result.body).toContain('mind');
  });

  it('themes_json takes precedence over life_domain', () => {
    const result = buildHomeMemoryCue({
      arcMemory: null,
      signal: { life_domain: 'career', themes_json: ['creativity'] },
      nowMs: NOW_MS,
    });
    expect(result.body).toContain('creativity');
    expect(result.body).not.toContain('career');
  });
});

// ── Priority 5: Report-theme fallback ───────────────────────────────────────

describe('buildHomeMemoryCue — Priority 5: report fallback', () => {
  it('no arc, no signal → report theme fires, lowercased in body', () => {
    const result = buildHomeMemoryCue({
      arcMemory: null,
      signal: null,
      report: { themes: ['Identity'] },
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS is already holding one of your core threads.');
    expect(result.body).toContain('identity'); // lowercased
    expect(result.body).toContain('Aeon can help you work with how that is showing up right now.');
  });

  it('signal is present → signal fires (Priority 4), report is skipped', () => {
    const result = buildHomeMemoryCue({
      arcMemory: null,
      signal: { life_domain: 'spirit', themes_json: null },
      report: { themes: ['Identity'] },
      nowMs: NOW_MS,
    });
    // Signal domain exists → fires Priority 4, not Priority 5
    expect(result.headline).toBe('SOS noticed something carrying forward.');
    expect(result.body).toContain('spirit');
    expect(result.body).not.toContain('identity');
  });

  it('report with empty themes array → falls through to static fallback', () => {
    const result = buildHomeMemoryCue({
      arcMemory: null,
      signal: null,
      report: { themes: [] },
      nowMs: NOW_MS,
    });
    // themes[0] is undefined → report fallback not fired
    expect(result.headline).toBe('Aeon gets stronger the more real you are here.');
  });

  it('report: null → falls through to static fallback', () => {
    const result = buildHomeMemoryCue({
      arcMemory: null,
      signal: null,
      report: null,
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('Aeon gets stronger the more real you are here.');
  });
});

// ── Priority 6: Static fallback ──────────────────────────────────────────────

describe('buildHomeMemoryCue — Priority 6: static fallback', () => {
  it('all null/undefined → static fallback headline and body', () => {
    const result = buildHomeMemoryCue({ arcMemory: null, signal: null, nowMs: NOW_MS });
    expect(result.headline).toBe('Aeon gets stronger the more real you are here.');
    expect(result.body).toBe('What you share starts turning into context, not just entries. That is where the intelligence deepens.');
  });

  it('arcMemory confidence === "none" → arc block skipped → static fallback', () => {
    const result = buildHomeMemoryCue({
      arcMemory: {
        confidence: 'none',
        activeArcs: [{
          transit_planet: 'Mars', aspect_type: 'trine', natal_target: 'Sun',
          state: 'approaching', recurrence_count: 2, first_active_date: START_5_DAYS_AGO,
        }],
        recurringDomains: [{ domain: 'career', signalCount: 5, arcCount: 1 }],
      },
      signal: null,
      nowMs: NOW_MS,
    });
    // confidence === 'none' → arc block skipped entirely, no signal → static fallback
    expect(result.headline).toBe('Aeon gets stronger the more real you are here.');
  });
});

// ── Priority ordering guards ─────────────────────────────────────────────────

describe('buildHomeMemoryCue — priority ordering guards', () => {
  it('GUARD: P1 (returning) beats P2 (dominant multi-day)', () => {
    const result = buildHomeMemoryCue({
      arcMemory: CONFIDENT_MEMORY([{
        transit_planet: 'Jupiter',
        aspect_type: 'trine',
        natal_target: 'Venus',
        state: 'approaching',
        recurrence_count: 2,         // P1 fires
        first_active_date: START_5_DAYS_AGO,  // daysActive=6 → P2 would also fire
      }]),
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed a familiar pattern returning.');
    expect(result.body).not.toContain('days.');
  });

  it('GUARD: P1 (returning) beats P3 (recurring domain)', () => {
    const result = buildHomeMemoryCue({
      arcMemory: CONFIDENT_MEMORY(
        [{
          transit_planet: 'Saturn',
          aspect_type: 'square',
          natal_target: 'Moon',
          state: 'returning',
          recurrence_count: 1,
          first_active_date: START_1_DAY_AGO,
        }],
        [{ domain: 'career', signalCount: 10, arcCount: 3 }],
      ),
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed a familiar pattern returning.');
    expect(result.body).not.toContain('career');
  });

  it('GUARD: P2 (dominant arc) beats P3 (recurring domain)', () => {
    const result = buildHomeMemoryCue({
      arcMemory: CONFIDENT_MEMORY(
        [{
          transit_planet: 'Venus',
          aspect_type: 'sextile',
          natal_target: 'Mars',
          state: 'exact',
          recurrence_count: 1,           // not returning
          first_active_date: START_5_DAYS_AGO,  // daysActive=6 → fires P2
        }],
        [{ domain: 'relationships', signalCount: 5, arcCount: 1 }],
      ),
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed something has been building.');
    expect(result.body).toContain('Venus sextile Mars');
    expect(result.body).not.toContain('relationships');
  });

  it('GUARD: P4 (signal) beats P5 (report theme)', () => {
    const result = buildHomeMemoryCue({
      arcMemory: null,
      signal: { life_domain: 'body', themes_json: null },
      report: { themes: ['Identity'] },
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed something carrying forward.');
    expect(result.body).toContain('body');
    expect(result.body).not.toContain('identity');
  });

  it('GUARD: signal fallback fires after all arc branches miss', () => {
    // Arc block fires but: no returning, daysActive < 3, no domain → signal fallback
    const result = buildHomeMemoryCue({
      arcMemory: CONFIDENT_MEMORY(
        [{
          transit_planet: 'Moon',
          aspect_type: 'trine',
          natal_target: 'Sun',
          state: 'approaching',
          recurrence_count: 1,
          first_active_date: START_1_DAY_AGO,  // daysActive=2 → under threshold
        }],
        [],  // no recurring domains
      ),
      signal: { life_domain: 'spirit', themes_json: null },
      nowMs: NOW_MS,
    });
    expect(result.headline).toBe('SOS noticed something carrying forward.');
    expect(result.body).toContain('spirit');
  });
});

// ── Idempotency / determinism ────────────────────────────────────────────────

describe('buildHomeMemoryCue — idempotency', () => {
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
    const r1 = buildHomeMemoryCue(params);
    const r2 = buildHomeMemoryCue(params);
    expect(r1.headline).toBe(r2.headline);
    expect(r1.body).toBe(r2.body);
  });
});
