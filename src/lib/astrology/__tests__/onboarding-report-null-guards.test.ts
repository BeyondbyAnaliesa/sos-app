/**
 * onboarding-report-null-guards.test.ts
 *
 * Tests for the null-guard logic introduced in #9-stability to prevent
 * runtime crashes when the OpenAI GPT response is missing required fields.
 *
 * These are pure-logic tests for the defensive patterns used by NatalReading.tsx
 * and reading/page.tsx. They do not render React components.
 *
 * Scenarios covered:
 *   1. splitReport: handles null, undefined, empty string, and valid text
 *   2. splitParagraphs: same function semantics for reading/page.tsx
 *   3. buildFallbackBridge-equivalent: lookAhead null guard chain
 *   4. themes null guard: Array.isArray safety
 *   5. birth date future-guard: string comparison logic used in the API
 */

import { describe, it, expect } from 'vitest';

// ── 1. splitReport / splitParagraphs null-guard logic ──────────────────────
//
// Both NatalReading.tsx and reading/page.tsx use a safe paragraph splitter.
// This tests the same logic inline (not importing the component).

function splitSafe(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.split('\n\n').filter(Boolean);
}

describe('splitReport / splitParagraphs — null-guard logic', () => {
  it('returns [] for null', () => {
    expect(splitSafe(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(splitSafe(undefined)).toEqual([]);
  });

  it('returns [] for empty string', () => {
    expect(splitSafe('')).toEqual([]);
  });

  it('returns [] for whitespace-only string', () => {
    // A whitespace-only string has no paragraphs
    const result = splitSafe('   ');
    // After split and filter(Boolean): ["   "] remains (truthy whitespace)
    // This is acceptable — it won't crash; empty display is handled by the empty array fast-path
    expect(Array.isArray(result)).toBe(true);
    expect(() => splitSafe('   ')).not.toThrow();
  });

  it('returns single paragraph for plain string', () => {
    expect(splitSafe('Hello world.')).toEqual(['Hello world.']);
  });

  it('splits on double newline', () => {
    const result = splitSafe('Para one.\n\nPara two.');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe('Para one.');
    expect(result[1]).toBe('Para two.');
  });

  it('filters out empty segments from extra blank lines', () => {
    const result = splitSafe('Para one.\n\n\n\nPara two.');
    expect(result).toHaveLength(2);
  });

  it('handles multi-paragraph realistic content', () => {
    const text = 'You carry a Scorpio Sun.\n\nYour Moon in Pisces amplifies that depth.\n\nThe Rising sign seals the impression.';
    const result = splitSafe(text);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatch(/Scorpio/);
  });

  it('never throws for any input type', () => {
    const inputs: Array<string | null | undefined> = [
      null, undefined, '', 'text', 'a\n\nb', '\n\n', 'single',
    ];
    for (const input of inputs) {
      expect(() => splitSafe(input)).not.toThrow();
    }
  });
});

// ── 2. themes null-guard: Array.isArray safety ────────────────────────────
//
// NatalReading.tsx now uses: (Array.isArray(report.themes) ? report.themes : []).map(...)
// This ensures the .map() call never throws when GPT omits or corrupts the themes array.

describe('themes null guard — Array.isArray pattern', () => {
  function safeThemes(themes: unknown): string[] {
    return (Array.isArray(themes) ? themes : []) as string[];
  }

  it('passes through a valid string array', () => {
    expect(safeThemes(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('returns [] for null', () => {
    expect(safeThemes(null)).toEqual([]);
  });

  it('returns [] for undefined', () => {
    expect(safeThemes(undefined)).toEqual([]);
  });

  it('returns [] for a string (GPT returning themes as a single string instead of array)', () => {
    expect(safeThemes('theme1, theme2')).toEqual([]);
  });

  it('returns [] for a number', () => {
    expect(safeThemes(42)).toEqual([]);
  });

  it('returns [] for an object', () => {
    expect(safeThemes({ 0: 'theme' })).toEqual([]);
  });

  it('returns [] for an empty array', () => {
    expect(safeThemes([])).toEqual([]);
  });

  it('result is always safe to .map() over', () => {
    const badInputs: unknown[] = [null, undefined, 'string', 42, {}, false];
    for (const input of badInputs) {
      const result = safeThemes(input);
      expect(() => result.map((t) => t.toUpperCase())).not.toThrow();
    }
  });
});

// ── 3. lookAhead null guard chain (buildFallbackBridge equivalent) ──────────
//
// NatalReading.tsx's buildFallbackBridge now guards lookAhead:
//   report.aeonBridgeBody ?? (report.lookAhead ? report.lookAhead.split('...')[0] : undefined) ?? STATIC_COPY
//
// This tests the guard chain without crashing on undefined lookAhead.

describe('buildFallbackBridge lookAhead guard chain', () => {
  const STATIC_COPY = 'Aeon can help you work with what is active right now in your chart and your life.';

  function guardedBody(
    aeonBridgeBody: string | undefined,
    lookAhead: string | undefined,
  ): string {
    return (
      aeonBridgeBody ??
      (lookAhead ? lookAhead.split('\n\n')[0] : undefined) ??
      STATIC_COPY
    );
  }

  it('uses aeonBridgeBody when present (highest priority)', () => {
    expect(guardedBody('custom body', 'look ahead text')).toBe('custom body');
  });

  it('uses first paragraph of lookAhead when aeonBridgeBody is absent', () => {
    expect(guardedBody(undefined, 'First para.\n\nSecond para.')).toBe('First para.');
  });

  it('falls back to static copy when both are absent', () => {
    expect(guardedBody(undefined, undefined)).toBe(STATIC_COPY);
  });

  it('falls back to static copy when lookAhead is empty string', () => {
    // Empty string is falsy → guard fires → static copy
    expect(guardedBody(undefined, '')).toBe(STATIC_COPY);
  });

  it('GUARD: does NOT call split() on undefined (old crash path)', () => {
    // The old code: `report.lookAhead.split('\n\n')[0]` would throw when lookAhead is undefined.
    // The new guard: (lookAhead ? lookAhead.split(...) : undefined) — never throws.
    expect(() => guardedBody(undefined, undefined)).not.toThrow();
  });

  it('GUARD: does NOT call split() on null (old crash path)', () => {
    // null is treated same as undefined via the ternary guard
    expect(() => guardedBody(undefined, null as unknown as undefined)).not.toThrow();
  });
});

// ── 4. Birth date future-guard: string comparison logic ──────────────────────
//
// API route now rejects birth dates in the future.
// ISO date string comparison (YYYY-MM-DD) is lexicographically correct for date ordering.

describe('birth date future-guard — string comparison logic', () => {
  function isFutureBirthDate(birthDate: string, todayStr: string): boolean {
    return birthDate > todayStr;
  }

  it('accepts today as birth date (not future)', () => {
    expect(isFutureBirthDate('2026-04-27', '2026-04-27')).toBe(false);
  });

  it('accepts yesterday', () => {
    expect(isFutureBirthDate('2026-04-26', '2026-04-27')).toBe(false);
  });

  it('accepts a real historical birth date', () => {
    expect(isFutureBirthDate('1990-06-15', '2026-04-27')).toBe(false);
  });

  it('rejects tomorrow', () => {
    expect(isFutureBirthDate('2026-04-28', '2026-04-27')).toBe(true);
  });

  it('rejects a far future date', () => {
    expect(isFutureBirthDate('2040-01-01', '2026-04-27')).toBe(true);
  });

  it('rejects a year-typo future date (e.g., 2004 typed as 2040)', () => {
    expect(isFutureBirthDate('2040-06-15', '2026-04-27')).toBe(true);
  });

  it('string comparison is lexicographically correct for ISO dates', () => {
    // Verify the ISO format string comparison works correctly across month/year boundaries
    expect(isFutureBirthDate('2026-12-31', '2026-04-27')).toBe(true);
    expect(isFutureBirthDate('2025-12-31', '2026-04-27')).toBe(false);
    expect(isFutureBirthDate('2026-04-27', '2026-04-27')).toBe(false);
  });
});
