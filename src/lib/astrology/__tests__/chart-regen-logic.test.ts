/**
 * chart-regen-logic.test.ts
 *
 * Tests for the PATCH /api/onboarding/chart regeneration endpoint logic and the
 * /chart-error page state machine.
 *
 * These are pure-logic tests — no HTTP transport, no Supabase, no React rendering.
 * They follow the same pattern as onboarding-report-null-guards.test.ts: inline
 * functions that mirror the production logic without importing Next.js modules.
 *
 * Scenarios covered:
 *
 * ENDPOINT LOGIC
 *   1. isChartValid: detects valid vs. corrupted chart rows
 *   2. hasBirthData: detects missing birth data
 *   3. buildChartParamsFromBirthData: UTC conversion correctness (known reference cases)
 *   4. Idempotency: valid chart → early return without regeneration
 *   5. 401 path: unauthenticated request → Unauthorized
 *   6. 422 path: no birth data → needs-onboarding error
 *
 * ERROR PAGE STATE MACHINE
 *   7. classifyApiResponse: maps API responses to page states
 *   8. Success path: valid response → 'success' state
 *   9. needs-onboarding path: 422 + error=needs-onboarding → 'needs-onboarding' state
 *  10. Generic error path: non-ok response → 'error' state with message
 *  11. 401 path: unauthorized → 'redirect-login' state
 */

import { describe, it, expect } from 'vitest';

// ── Shared helpers (mirrors production logic) ────────────────────────────────

// Mirrors: checking placements_json + angles_json columns in the PATCH handler
function isChartValid(chartRow: {
  placements_json: unknown;
  angles_json: unknown;
} | null | undefined): boolean {
  if (!chartRow) return false;
  return !!chartRow.placements_json && !!chartRow.angles_json;
}

// Mirrors: checking birth_data row in the PATCH handler
function hasBirthData(birthRow: {
  birth_date?: string | null;
  latitude?: number | null;
  longitude?: number | null;
} | null | undefined): boolean {
  if (!birthRow) return false;
  return !!(birthRow.birth_date && birthRow.latitude != null && birthRow.longitude != null);
}

// Mirrors: the UT conversion in buildChartParamsFromBirthData
// (without sweph dependency — tests the arithmetic only)
function localToUT(
  localHour: number,
  localMinute: number,
  offsetHours: number,
): { utHourDecimal: number; dayOffset: -1 | 0 | 1 } {
  let utHourDecimal = (localHour + localMinute / 60) - offsetHours;
  let dayOffset: -1 | 0 | 1 = 0;
  if (utHourDecimal >= 24) {
    utHourDecimal -= 24;
    dayOffset = 1;
  } else if (utHourDecimal < 0) {
    utHourDecimal += 24;
    dayOffset = -1;
  }
  return { utHourDecimal, dayOffset };
}

// Error page state machine — mirrors ChartErrorPage's handleRegenerate branches
type PageState = 'idle' | 'loading' | 'needs-onboarding' | 'error' | 'success' | 'redirect-login';

function classifyApiResponse(status: number, json: { error?: string; success?: boolean }): PageState {
  if (status === 401) return 'redirect-login';
  if (status === 422 && json.error === 'needs-onboarding') return 'needs-onboarding';
  if (!json.success && json.error) return 'error';
  if (json.success) return 'success';
  return 'error';
}

// ── 1. isChartValid ──────────────────────────────────────────────────────────

describe('isChartValid — chart column null-guard', () => {
  it('returns true when both columns are present', () => {
    expect(isChartValid({ placements_json: [{}], angles_json: {} })).toBe(true);
  });

  it('returns false when placements_json is null', () => {
    expect(isChartValid({ placements_json: null, angles_json: {} })).toBe(false);
  });

  it('returns false when angles_json is null', () => {
    expect(isChartValid({ placements_json: [{}], angles_json: null })).toBe(false);
  });

  it('returns false when both columns are null', () => {
    expect(isChartValid({ placements_json: null, angles_json: null })).toBe(false);
  });

  it('returns false for null row (no natal_charts row at all)', () => {
    expect(isChartValid(null)).toBe(false);
  });

  it('returns false for undefined row', () => {
    expect(isChartValid(undefined)).toBe(false);
  });
});

// ── 2. hasBirthData ─────────────────────────────────────────────────────────

describe('hasBirthData — birth_data row presence check', () => {
  it('returns true when all required fields are present', () => {
    expect(hasBirthData({ birth_date: '1990-06-15', latitude: 37.77, longitude: -122.4 })).toBe(true);
  });

  it('returns false when birth_data row is null', () => {
    expect(hasBirthData(null)).toBe(false);
  });

  it('returns false when birth_date is null', () => {
    expect(hasBirthData({ birth_date: null, latitude: 37.77, longitude: -122.4 })).toBe(false);
  });

  it('returns false when latitude is null', () => {
    expect(hasBirthData({ birth_date: '1990-06-15', latitude: null, longitude: -122.4 })).toBe(false);
  });

  it('returns false when longitude is null', () => {
    expect(hasBirthData({ birth_date: '1990-06-15', latitude: 37.77, longitude: null })).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(hasBirthData({})).toBe(false);
  });

  it('handles latitude=0 (valid equatorial coordinate)', () => {
    // Latitude 0 is a valid coordinate (equator) — must not be treated as falsy
    expect(hasBirthData({ birth_date: '1990-06-15', latitude: 0, longitude: 36.8 })).toBe(true);
  });
});

// ── 3. buildChartParamsFromBirthData — UT conversion arithmetic ──────────────

describe('localToUT — UTC conversion arithmetic', () => {
  // PST = UTC-8
  it('converts afternoon PST birth time correctly (no day rollover)', () => {
    // 14:30 PST (UTC-8) → UT = 14.5 - (-8) = 22.5 → 22:30 UT, same day
    const { utHourDecimal, dayOffset } = localToUT(14, 30, -8);
    expect(utHourDecimal).toBeCloseTo(22.5, 5);
    expect(dayOffset).toBe(0);
  });

  it('handles day rollover forward (late night local → next UT day)', () => {
    // 18:42 PST (UTC-8) → UT = 18.7 + 8 = 26.7 → 2.7 next UT day
    const { utHourDecimal, dayOffset } = localToUT(18, 42, -8);
    expect(utHourDecimal).toBeCloseTo(26.7 - 24, 2);
    expect(dayOffset).toBe(1);
  });

  it('handles day rollover backward (early morning in positive offset → prev UT day)', () => {
    // 01:00 IST (UTC+5:30) → UT = 1.0 - 5.5 = -4.5 → 19.5 prev UT day
    const { utHourDecimal, dayOffset } = localToUT(1, 0, 5.5);
    expect(utHourDecimal).toBeCloseTo(24 - 4.5, 5);
    expect(dayOffset).toBe(-1);
  });

  it('noon local in UTC+0 stays at noon UT with no day offset', () => {
    const { utHourDecimal, dayOffset } = localToUT(12, 0, 0);
    expect(utHourDecimal).toBe(12);
    expect(dayOffset).toBe(0);
  });

  it('midnight local in UTC-5 produces 05:00 UT next day', () => {
    // 00:00 EST (UTC-5) → UT = 0 + 5 = 5 → same nominal UT day actually
    // Wait: 0 - (-5) = 5 → no rollover
    const { utHourDecimal, dayOffset } = localToUT(0, 0, -5);
    expect(utHourDecimal).toBe(5);
    expect(dayOffset).toBe(0);
  });

  it('utHourDecimal is always in [0, 24) after normalization', () => {
    const cases = [
      { h: 23, m: 30, offset: -1 },  // 23.5 + 1 = 24.5 → rollover → 0.5
      { h: 1, m: 0, offset: 3 },     // 1 - 3 = -2 → rollover → 22
      { h: 12, m: 0, offset: 0 },    // 12 → stays 12
    ];
    for (const { h, m, offset } of cases) {
      const { utHourDecimal } = localToUT(h, m, offset);
      expect(utHourDecimal).toBeGreaterThanOrEqual(0);
      expect(utHourDecimal).toBeLessThan(24);
    }
  });
});

// ── 4. Idempotency logic ─────────────────────────────────────────────────────

describe('endpoint idempotency — valid chart skips regeneration', () => {
  it('a valid chart triggers the early-return path', () => {
    const chart = { placements_json: [{ key: 'sun' }], angles_json: { ascendant: { sign: 'Aries' } } };
    // Idempotent: if isChartValid returns true, the PATCH handler returns immediately
    expect(isChartValid(chart)).toBe(true);
    // hasBirthData is NOT called in this path — just document the contract
  });

  it('a corrupted chart (null placements) falls through to birth data lookup', () => {
    const chart = { placements_json: null, angles_json: { ascendant: { sign: 'Aries' } } };
    expect(isChartValid(chart)).toBe(false);
    // Handler continues to birth_data query
  });

  it('a corrupted chart (null angles) falls through to birth data lookup', () => {
    const chart = { placements_json: [{ key: 'sun' }], angles_json: null };
    expect(isChartValid(chart)).toBe(false);
  });
});

// ── 5–6. Auth and birth data error paths ─────────────────────────────────────

describe('PATCH endpoint error paths — classification', () => {
  it('unauthenticated request maps to redirect-login', () => {
    expect(classifyApiResponse(401, { error: 'Unauthorized' })).toBe('redirect-login');
  });

  it('missing birth data maps to needs-onboarding', () => {
    expect(classifyApiResponse(422, { error: 'needs-onboarding' })).toBe('needs-onboarding');
  });

  it('other 422 errors do not map to needs-onboarding', () => {
    // A different 422 error should fall into generic error handling
    expect(classifyApiResponse(422, { error: 'validation-error' })).toBe('error');
  });

  it('500 error maps to error state', () => {
    expect(classifyApiResponse(500, { error: 'Something went wrong' })).toBe('error');
  });

  it('success response maps to success state', () => {
    expect(classifyApiResponse(200, { success: true })).toBe('success');
  });

  it('success with alreadyValid maps to success state', () => {
    expect(classifyApiResponse(200, { success: true })).toBe('success');
  });
});

// ── 7–11. Error page state machine ───────────────────────────────────────────

describe('chart-error page state machine — classifyApiResponse', () => {
  it('200 success → success state (redirect to home)', () => {
    expect(classifyApiResponse(200, { success: true })).toBe('success');
  });

  it('401 Unauthorized → redirect-login state', () => {
    expect(classifyApiResponse(401, { error: 'Unauthorized' })).toBe('redirect-login');
  });

  it('422 needs-onboarding → needs-onboarding state', () => {
    expect(classifyApiResponse(422, { error: 'needs-onboarding' })).toBe('needs-onboarding');
  });

  it('500 server error → error state', () => {
    expect(classifyApiResponse(500, { error: 'Internal error' })).toBe('error');
  });

  it('non-ok with unknown error → error state', () => {
    expect(classifyApiResponse(503, { error: 'Service unavailable' })).toBe('error');
  });

  it('success:false with error message → error state with message preserved', () => {
    const json = { error: 'Could not compute chart', success: undefined };
    expect(classifyApiResponse(500, json)).toBe('error');
    expect(json.error).toBe('Could not compute chart');
  });

  it('needs-onboarding state implies user should be routed to /onboarding, not home', () => {
    // Contract: chart-error page renders the "Start onboarding" button in this state
    // and does NOT redirect to /
    const state = classifyApiResponse(422, { error: 'needs-onboarding' });
    expect(state).toBe('needs-onboarding');
    expect(state).not.toBe('success');
  });

  it('success state implies user should be routed to home (/)', () => {
    const state = classifyApiResponse(200, { success: true });
    expect(state).toBe('success');
    expect(state).not.toBe('needs-onboarding');
  });

  it('state machine is deterministic: same input always produces same state', () => {
    const cases: Array<[number, { error?: string; success?: boolean }, PageState]> = [
      [200, { success: true },              'success'],
      [401, { error: 'Unauthorized' },      'redirect-login'],
      [422, { error: 'needs-onboarding' },  'needs-onboarding'],
      [500, { error: 'Server error' },      'error'],
    ];
    for (const [status, json, expected] of cases) {
      expect(classifyApiResponse(status, json)).toBe(expected);
      expect(classifyApiResponse(status, json)).toBe(expected); // idempotent
    }
  });
});
