/**
 * password-validation.test.ts
 *
 * Unit tests for the pure password-validation helpers used by the
 * forgot-password / reset-password flow (audit item L-1).
 *
 * All tests are deterministic: no I/O, no Supabase, no env vars.
 */

import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  validatePasswordMatch,
  validatePasswordReset,
  PASSWORD_MIN_LENGTH,
} from '../password-validation';

// ── validatePassword ─────────────────────────────────────────────────────────

describe('validatePassword', () => {
  it('returns null for an 8-character password (minimum)', () => {
    expect(validatePassword('abcdefgh')).toBeNull();
  });

  it('returns null for a password longer than the minimum', () => {
    expect(validatePassword('SuperSecurePass123!')).toBeNull();
  });

  it('returns an error for a 7-character password (one short)', () => {
    const result = validatePassword('abcdefg');
    expect(result).not.toBeNull();
    expect(result).toContain(`${PASSWORD_MIN_LENGTH}`);
  });

  it('returns an error for an empty string', () => {
    expect(validatePassword('')).not.toBeNull();
  });

  it('returns an error for a single character', () => {
    expect(validatePassword('x')).not.toBeNull();
  });

  it('error message mentions minimum length', () => {
    const result = validatePassword('short');
    expect(result).toMatch(/8/);
  });
});

// ── validatePasswordMatch ────────────────────────────────────────────────────

describe('validatePasswordMatch', () => {
  it('returns null when both passwords are identical', () => {
    expect(validatePasswordMatch('correcthorse', 'correcthorse')).toBeNull();
  });

  it('returns an error when passwords differ', () => {
    const result = validatePasswordMatch('password123', 'password456');
    expect(result).not.toBeNull();
    expect(result).toMatch(/do not match/i);
  });

  it('returns an error when confirm is empty', () => {
    expect(validatePasswordMatch('password123', '')).not.toBeNull();
  });

  it('is case-sensitive', () => {
    expect(validatePasswordMatch('Password', 'password')).not.toBeNull();
  });

  it('returns null when both are identical empty strings (length check is separate)', () => {
    // validatePasswordMatch is only about equality — length is validatePassword's job
    expect(validatePasswordMatch('', '')).toBeNull();
  });
});

// ── validatePasswordReset ────────────────────────────────────────────────────

describe('validatePasswordReset', () => {
  it('returns null when password meets length and both match', () => {
    expect(validatePasswordReset('securepass', 'securepass')).toBeNull();
  });

  it('returns length error when password is too short (even if they match)', () => {
    const result = validatePasswordReset('abc', 'abc');
    expect(result).not.toBeNull();
    expect(result).toMatch(/8/);
  });

  it('returns mismatch error when length is fine but passwords differ', () => {
    const result = validatePasswordReset('longpassword1', 'longpassword2');
    expect(result).not.toBeNull();
    expect(result).toMatch(/do not match/i);
  });

  it('returns length error first (before mismatch) when both rules fail', () => {
    // Too short AND mismatched — length error should come first
    const result = validatePasswordReset('abc', 'xyz');
    expect(result).toMatch(/8/);
  });

  it('returns null for exactly-8-char matching passwords', () => {
    expect(validatePasswordReset('exactly8', 'exactly8')).toBeNull();
  });
});
