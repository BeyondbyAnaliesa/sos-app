/**
 * backfill-date-range.test.ts
 *
 * Deterministic tests for the bounded historical backfill helpers:
 *   - enumerateDateRange    — pure date sequence generation
 *   - validateBackfillParams — pure operator-input validation
 *
 * No Supabase, no I/O, no env vars required.
 */

import { describe, it, expect } from 'vitest';
import { enumerateDateRange, validateBackfillParams, BACKFILL_MAX_DAYS } from '../pure-fns';

// ── enumerateDateRange ───────────────────────────────────────────────────────

describe('enumerateDateRange', () => {
  it('returns a single date when start === end', () => {
    expect(enumerateDateRange('2025-01-15', '2025-01-15')).toEqual(['2025-01-15']);
  });

  it('returns consecutive dates in ascending order', () => {
    expect(enumerateDateRange('2025-01-01', '2025-01-03')).toEqual([
      '2025-01-01',
      '2025-01-02',
      '2025-01-03',
    ]);
  });

  it('spans a full week correctly (7 dates)', () => {
    const result = enumerateDateRange('2025-03-10', '2025-03-16');
    expect(result).toHaveLength(7);
    expect(result[0]).toBe('2025-03-10');
    expect(result[6]).toBe('2025-03-16');
  });

  it('crosses a month boundary correctly', () => {
    const result = enumerateDateRange('2025-01-30', '2025-02-02');
    expect(result).toEqual(['2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02']);
  });

  it('crosses a year boundary correctly', () => {
    const result = enumerateDateRange('2024-12-30', '2025-01-02');
    expect(result).toEqual(['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02']);
  });

  it('handles a leap year Feb 28 → Mar 1 crossing', () => {
    // 2024 is a leap year
    const result = enumerateDateRange('2024-02-28', '2024-03-01');
    expect(result).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  });

  it('handles a non-leap year Feb 28 → Mar 1 crossing (no Feb 29)', () => {
    // 2025 is not a leap year
    const result = enumerateDateRange('2025-02-28', '2025-03-01');
    expect(result).toEqual(['2025-02-28', '2025-03-01']);
  });

  it('produces the correct count for a 30-day range', () => {
    const result = enumerateDateRange('2025-01-01', '2025-01-30');
    expect(result).toHaveLength(30);
    expect(result[29]).toBe('2025-01-30');
  });

  it('all dates are in YYYY-MM-DD format', () => {
    const result = enumerateDateRange('2025-09-28', '2025-10-05');
    const iso = /^\d{4}-\d{2}-\d{2}$/;
    for (const d of result) {
      expect(d).toMatch(iso);
    }
  });

  it('returns empty array when endDate < startDate', () => {
    // enumerateDateRange is a pure generator — it returns [] on inverted range
    // (callers should validate first via validateBackfillParams)
    expect(enumerateDateRange('2025-01-10', '2025-01-05')).toEqual([]);
  });
});

// ── validateBackfillParams ────────────────────────────────────────────────────

describe('validateBackfillParams', () => {
  // ── Valid cases ──────────────────────────────────────────────────────────

  it('returns valid:true for a well-formed single-day request', () => {
    const result = validateBackfillParams('user-abc', '2025-01-01', '2025-01-01');
    expect(result).toEqual({ valid: true });
  });

  it('returns valid:true for a 7-day range', () => {
    const result = validateBackfillParams('user-abc', '2025-03-01', '2025-03-07');
    expect(result).toEqual({ valid: true });
  });

  it('returns valid:true for a 30-day range', () => {
    const result = validateBackfillParams('user-xyz', '2025-01-01', '2025-01-30');
    expect(result).toEqual({ valid: true });
  });

  it('returns valid:true for BACKFILL_MAX_DAYS exactly', () => {
    // Start at a fixed date and compute end at exactly MAX_DAYS
    const start = new Date('2024-01-01T12:00:00Z');
    const end   = new Date(start.getTime() + (BACKFILL_MAX_DAYS - 1) * 86_400_000);
    const startStr = start.toISOString().slice(0, 10);
    const endStr   = end.toISOString().slice(0, 10);
    const result = validateBackfillParams('user-abc', startStr, endStr);
    expect(result).toEqual({ valid: true });
  });

  // ── Missing / wrong-typed userId ─────────────────────────────────────────

  it('returns valid:false when userId is missing', () => {
    const result = validateBackfillParams(undefined, '2025-01-01', '2025-01-07');
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/userId/i);
  });

  it('returns valid:false when userId is empty string', () => {
    const result = validateBackfillParams('', '2025-01-01', '2025-01-07');
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/userId/i);
  });

  it('returns valid:false when userId is a number', () => {
    const result = validateBackfillParams(42, '2025-01-01', '2025-01-07');
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/userId/i);
  });

  // ── Bad startDate ─────────────────────────────────────────────────────────

  it('returns valid:false when startDate is missing', () => {
    const result = validateBackfillParams('user-abc', undefined, '2025-01-07');
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/startDate/i);
  });

  it('returns valid:false when startDate is not YYYY-MM-DD format', () => {
    const result = validateBackfillParams('user-abc', '01/01/2025', '2025-01-07');
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/startDate/i);
  });

  it('returns valid:false when startDate is an invalid calendar date', () => {
    // 2025-13-01 — month 13 is not real
    const result = validateBackfillParams('user-abc', '2025-13-01', '2025-13-07');
    expect(result.valid).toBe(false);
    // Either format error or invalid-date error is acceptable
    expect((result as { valid: false; error: string }).error).toBeTruthy();
  });

  // ── Bad endDate ───────────────────────────────────────────────────────────

  it('returns valid:false when endDate is missing', () => {
    const result = validateBackfillParams('user-abc', '2025-01-01', undefined);
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/endDate/i);
  });

  it('returns valid:false when endDate is not YYYY-MM-DD format', () => {
    const result = validateBackfillParams('user-abc', '2025-01-01', '2025/01/07');
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/endDate/i);
  });

  // ── Range order ───────────────────────────────────────────────────────────

  it('returns valid:false when endDate is before startDate', () => {
    const result = validateBackfillParams('user-abc', '2025-01-10', '2025-01-05');
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/endDate.*startDate|on or after/i);
  });

  // ── Range cap ─────────────────────────────────────────────────────────────

  it('returns valid:false when date range exceeds BACKFILL_MAX_DAYS', () => {
    const start = new Date('2024-01-01T12:00:00Z');
    const end   = new Date(start.getTime() + BACKFILL_MAX_DAYS * 86_400_000); // +1 over limit
    const startStr = start.toISOString().slice(0, 10);
    const endStr   = end.toISOString().slice(0, 10);
    const result = validateBackfillParams('user-abc', startStr, endStr);
    expect(result.valid).toBe(false);
    const err = (result as { valid: false; error: string }).error;
    expect(err).toMatch(/exceeds/i);
    expect(err).toMatch(new RegExp(String(BACKFILL_MAX_DAYS)));
  });

  it('respects custom maxDays override', () => {
    // With maxDays=7, a 30-day range should fail
    const result = validateBackfillParams('user-abc', '2025-01-01', '2025-01-30', 7);
    expect(result.valid).toBe(false);
    expect((result as { valid: false; error: string }).error).toMatch(/exceeds/i);
  });

  it('returns valid:true when range is within custom maxDays', () => {
    const result = validateBackfillParams('user-abc', '2025-01-01', '2025-01-07', 30);
    expect(result).toEqual({ valid: true });
  });

  // ── BAD OUTPUT guards ─────────────────────────────────────────────────────

  it('BAD OUTPUT: valid userId + dates must not be rejected', () => {
    const result = validateBackfillParams('abc123', '2025-06-01', '2025-06-30');
    expect(result.valid).toBe(true);
  });

  it('BAD OUTPUT: whitespace-only userId must not be accepted', () => {
    const result = validateBackfillParams('   ', '2025-01-01', '2025-01-07');
    expect(result.valid).toBe(false);
  });

  it('BAD OUTPUT: same-day range must be valid (1 date is a real request)', () => {
    const result = validateBackfillParams('user-abc', '2025-05-20', '2025-05-20');
    expect(result.valid).toBe(true);
  });
});
