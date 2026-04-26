/**
 * arc-memory-system-section.test.ts
 *
 * Deterministic unit tests for buildArcMemorySystemSection (pure-fns.ts).
 *
 * This function was extracted from api/journal/chat/route.ts so the
 * string-building logic (arc listing, daysActive, peak scan, domain rows,
 * cross-modal linkage, pattern synthesis, footer) is directly unit-testable
 * without a Next.js / Supabase harness.
 *
 * All tests are deterministic:
 *   - explicit nowMs to freeze "now" (2026-04-25T12:00:00Z)
 *   - explicit fixture data; no Date.now() side-effects
 *   - no I/O, no network, no live Supabase
 *   - upcomingTransits fixtures are minimal inline objects (no ephemeris calls)
 */

import { describe, it, expect } from 'vitest';
import { buildArcMemorySystemSection } from '../pure-fns';
import type { ArcMemoryInput, ActiveArcRow } from '../pure-fns';

// ── Reference "now": 2026-04-25T12:00:00Z ────────────────────────────────────
const NOW_MS = new Date('2026-04-25T12:00:00Z').getTime();

// Convenience first_active_date strings relative to NOW_MS
const START_TODAY    = '2026-04-25'; // daysActive = 1  (same day)
const START_5_AGO    = '2026-04-20'; // daysActive = 6
const START_10_AGO   = '2026-04-15'; // daysActive = 11

function arc(overrides: Partial<ActiveArcRow> & Pick<ActiveArcRow, 'transit_planet' | 'aspect_type' | 'natal_target'>): ActiveArcRow {
  return {
    state: 'approaching',
    first_active_date: START_5_AGO,
    tightest_orb: null,
    recurrence_count: 1,
    last_orb: null,
    ...overrides,
  };
}

function mem(
  arcs: ActiveArcRow[],
  domains: ArcMemoryInput['recurringDomains'] = [],
  confidence: ArcMemoryInput['confidence'] = 'medium',
): ArcMemoryInput {
  return { confidence, activeArcs: arcs, recurringDomains: domains };
}

// ── Guard cases: returns empty string ────────────────────────────────────────

describe('buildArcMemorySystemSection — guard cases (empty string)', () => {
  it('returns empty string when arcMemory is null', () => {
    expect(buildArcMemorySystemSection({ arcMemory: null, nowMs: NOW_MS })).toBe('');
  });

  it('returns empty string when confidence is "none"', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })], [], 'none');
    expect(buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS })).toBe('');
  });
});

// ── Header and footer ─────────────────────────────────────────────────────────

describe('buildArcMemorySystemSection — structure', () => {
  it('starts with the expected header', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('--- ACTIVE TRANSIT ARC MEMORY ---');
  });

  it('ends with the evidence-use footer', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('Use this arc context to ground your responses');
    expect(out).toContain('Do not surface arc data that has no connection');
  });

  it('is idempotent: same input always produces same output', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })]);
    const a = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    const b = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(a).toBe(b);
  });
});

// ── Active arc listing ────────────────────────────────────────────────────────

describe('buildArcMemorySystemSection — active arc lines', () => {
  it('includes the arc transit identity and state', () => {
    const m = mem([arc({ transit_planet: 'Jupiter', aspect_type: 'trine', natal_target: 'Moon' })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('Jupiter trine Moon');
    expect(out).toContain('approaching');
  });

  it('includes daysActive when first_active_date is present (plural)', () => {
    const m = mem([arc({ transit_planet: 'Saturn', aspect_type: 'square', natal_target: 'Venus', first_active_date: START_5_AGO })]);
    // START_5_AGO = 2026-04-20, NOW = 2026-04-25 → daysActive = 6
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('6 days active');
  });

  it('includes daysActive = 1 (singular "day") for same-day start', () => {
    const m = mem([arc({ transit_planet: 'Venus', aspect_type: 'sextile', natal_target: 'Mars', first_active_date: START_TODAY })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('1 day active');
    expect(out).not.toContain('1 days active');
  });

  it('omits daysActive when first_active_date is null', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun', first_active_date: null })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).not.toContain('days active');
    expect(out).not.toContain('day active');
  });

  it('includes tightest_orb when present', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun', tightest_orb: 0.45 })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('tightest orb 0.45°');
  });

  it('omits tightest_orb when null', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun', tightest_orb: null })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).not.toContain('tightest orb');
  });

  it('includes recurrence label when recurrence_count > 1', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun', recurrence_count: 3 })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('recurrence 3 (this pattern has returned)');
  });

  it('omits recurrence label when recurrence_count is 1', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun', recurrence_count: 1 })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).not.toContain('this pattern has returned');
  });

  it('caps active arc listing at 5 arcs', () => {
    const arcs = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter'].map((p) =>
      arc({ transit_planet: p, aspect_type: 'conjunct', natal_target: 'Ascendant' }),
    );
    const m = mem(arcs);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    // 5 bullet points for arcs (Jupiter should be excluded as 6th)
    const bulletMatches = out.match(/• \w+ conjunct Ascendant/g) ?? [];
    expect(bulletMatches.length).toBe(5);
    expect(out).not.toContain('Jupiter conjunct Ascendant');
  });
});

// ── Recurring domains section ─────────────────────────────────────────────────

describe('buildArcMemorySystemSection — recurring domains', () => {
  it('includes domain section when recurringDomains is non-empty', () => {
    const m = mem(
      [arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })],
      [{ domain: 'relationships', signalCount: 4, arcCount: 2 }],
    );
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('Recurring life areas');
    expect(out).toContain('relationships: 4 signals, 2 arcs');
  });

  it('uses singular "signal" and "arc" for count of 1', () => {
    const m = mem(
      [arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })],
      [{ domain: 'career', signalCount: 1, arcCount: 1 }],
    );
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('career: 1 signal, 1 arc');
  });

  it('caps domain listing at 3 domains', () => {
    const domains = [
      { domain: 'relationships', signalCount: 5, arcCount: 2 },
      { domain: 'career', signalCount: 4, arcCount: 1 },
      { domain: 'body', signalCount: 3, arcCount: 1 },
      { domain: 'money', signalCount: 2, arcCount: 1 },
    ];
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })], domains);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('relationships');
    expect(out).toContain('career');
    expect(out).toContain('body');
    expect(out).not.toContain('money');
  });

  it('omits domain section when recurringDomains is empty', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })], []);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).not.toContain('Recurring life areas');
  });
});

// ── Cross-modal linkage section ───────────────────────────────────────────────

describe('buildArcMemorySystemSection — cross-modal linkage', () => {
  it('includes linkage sentence when journal signals overlap recurring domains', () => {
    const m = mem(
      [arc({ transit_planet: 'Venus', aspect_type: 'trine', natal_target: 'Moon' })],
      [{ domain: 'relationships', signalCount: 3, arcCount: 2 }],
    );
    const signals = [{ lifeDomain: 'relationships', themes: ['love'] }];
    const out = buildArcMemorySystemSection({ arcMemory: m, currentSignals: signals, nowMs: NOW_MS });
    expect(out).toContain('Journal × arc overlap');
    expect(out).toContain('relationships');
  });

  it('omits linkage section when no overlap exists', () => {
    const m = mem(
      [arc({ transit_planet: 'Venus', aspect_type: 'trine', natal_target: 'Moon' })],
      [{ domain: 'career', signalCount: 3, arcCount: 2 }],
    );
    const signals = [{ lifeDomain: 'relationships', themes: [] }];
    const out = buildArcMemorySystemSection({ arcMemory: m, currentSignals: signals, nowMs: NOW_MS });
    expect(out).not.toContain('Journal × arc overlap');
  });

  it('omits linkage section when currentSignals is absent', () => {
    const m = mem(
      [arc({ transit_planet: 'Mars', aspect_type: 'conjunct', natal_target: 'Sun' })],
      [{ domain: 'relationships', signalCount: 3, arcCount: 2 }],
    );
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).not.toContain('Journal × arc overlap');
  });
});

// ── Pattern synthesis section ─────────────────────────────────────────────────

describe('buildArcMemorySystemSection — pattern synthesis', () => {
  it('includes recall pattern line for a returning arc (recurrence_count >= 2)', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'square', natal_target: 'Saturn', recurrence_count: 2 })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('Recall pattern: returning');
  });

  it('includes recall pattern line for a recurring domain (signalCount >= 3)', () => {
    const m = mem(
      [arc({ transit_planet: 'Venus', aspect_type: 'trine', natal_target: 'Moon' })],
      [{ domain: 'relationships', signalCount: 3, arcCount: 1 }],
    );
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('Recall pattern: recurring_domain');
  });

  it('omits recall pattern line when pattern is quiet', () => {
    // Single arc, no recurring domains, recurrence_count = 1, started >3 days ago
    const m = mem(
      [arc({ transit_planet: 'Neptune', aspect_type: 'sextile', natal_target: 'Mercury', first_active_date: START_10_AGO, recurrence_count: 1 })],
      [],
    );
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).not.toContain('Recall pattern:');
  });

  it('pattern synthesis is deterministic: same nowMs → same pattern output', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'square', natal_target: 'Saturn', recurrence_count: 2 })]);
    const a = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    const b = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(a).toBe(b);
  });
});

// ── Approaching arc peak scan ─────────────────────────────────────────────────

describe('buildArcMemorySystemSection — approaching arc peaks', () => {
  it('includes approaching peak when an arc tightens in the upcoming window', () => {
    const testArc = arc({ transit_planet: 'Mars', aspect_type: 'square', natal_target: 'Sun', state: 'approaching', last_orb: 1.5 });
    const m = mem([testArc]);
    const upcomingTransits = [
      {
        date: '2026-04-26',
        transits: [{ transitPlanet: 'Mars', aspect: 'square', natalPlanet: 'Sun', orb: 0.8 }],
      },
      {
        date: '2026-04-27',
        transits: [{ transitPlanet: 'Mars', aspect: 'square', natalPlanet: 'Sun', orb: 0.3 }],
      },
    ];
    const out = buildArcMemorySystemSection({ arcMemory: m, upcomingTransits, nowMs: NOW_MS });
    expect(out).toContain('Approaching arc peaks');
    expect(out).toContain('Mars square Sun');
    expect(out).toContain('reaches exact');
  });

  it('omits peak section when no upcoming transits are provided', () => {
    const m = mem([arc({ transit_planet: 'Mars', aspect_type: 'square', natal_target: 'Sun', state: 'approaching' })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).not.toContain('Approaching arc peaks');
  });

  it('omits peak section when arc is not approaching (separating state)', () => {
    const testArc = arc({ transit_planet: 'Mars', aspect_type: 'square', natal_target: 'Sun', state: 'separating' });
    const m = mem([testArc]);
    const upcomingTransits = [
      { date: '2026-04-26', transits: [{ transitPlanet: 'Mars', aspect: 'square', natalPlanet: 'Sun', orb: 1.5 }] },
    ];
    const out = buildArcMemorySystemSection({ arcMemory: m, upcomingTransits, nowMs: NOW_MS });
    expect(out).not.toContain('Approaching arc peaks');
  });
});

// ── Bad-output guards ─────────────────────────────────────────────────────────

describe('buildArcMemorySystemSection — bad-output guards', () => {
  it('never returns an empty string for medium-confidence input with at least one arc', () => {
    const m = mem([arc({ transit_planet: 'Jupiter', aspect_type: 'trine', natal_target: 'Sun' })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out.length).toBeGreaterThan(50);
  });

  it('never returns an empty string for high-confidence input', () => {
    const m = mem(
      [arc({ transit_planet: 'Jupiter', aspect_type: 'trine', natal_target: 'Sun' }), arc({ transit_planet: 'Venus', aspect_type: 'sextile', natal_target: 'Mars' })],
      [{ domain: 'relationships', signalCount: 5, arcCount: 2 }],
      'high',
    );
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out.length).toBeGreaterThan(100);
  });

  it('always contains the header when producing output', () => {
    const m = mem([arc({ transit_planet: 'Jupiter', aspect_type: 'trine', natal_target: 'Sun' })]);
    const out = buildArcMemorySystemSection({ arcMemory: m, nowMs: NOW_MS });
    expect(out).toContain('--- ACTIVE TRANSIT ARC MEMORY ---');
  });
});
