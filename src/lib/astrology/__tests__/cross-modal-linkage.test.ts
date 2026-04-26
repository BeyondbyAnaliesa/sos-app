/**
 * cross-modal-linkage.test.ts
 *
 * Deterministic tests for linkJournalSignalsToArcEvidence().
 *
 * Tests verify:
 * - Correct domain-label overlap detection
 * - Evidence threshold enforcement (minDomainSignalCount)
 * - Theme-as-domain-hint matching
 * - Bad-output guards (no fake overlaps, no overclaiming)
 * - Edge cases: empty inputs, null lifeDomain, unknown themes
 */

import { describe, it, expect } from 'vitest';
import { linkJournalSignalsToArcEvidence } from '../pure-fns';

// ── Fixture helpers ────────────────────────────────────────────────────────────

function sig(lifeDomain: string | null, themes: string[] = []) {
  return { lifeDomain, themes };
}

function dom(domain: string, signalCount: number, arcCount: number = 1) {
  return { domain, signalCount, arcCount };
}

// ── Overlap detection ─────────────────────────────────────────────────────────

describe('linkJournalSignalsToArcEvidence — overlap detection', () => {
  it('returns hasOverlap: true when signal lifeDomain matches a recurring domain', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health')],
      recurringDomains: [dom('health', 3)],
    });
    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingDomains).toHaveLength(1);
    expect(result.overlappingDomains[0].domain).toBe('health');
  });

  it('includes signalCount and arcCount from the recurring domain record', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('work')],
      recurringDomains: [dom('work', 5, 2)],
    });
    expect(result.overlappingDomains[0].signalCount).toBe(5);
    expect(result.overlappingDomains[0].arcCount).toBe(2);
  });

  it('matches via themes when lifeDomain is null', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig(null, ['relationships', 'work'])],
      recurringDomains: [dom('relationships', 4)],
    });
    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingDomains[0].domain).toBe('relationships');
  });

  it('matches via lifeDomain AND themes — returns all qualifying overlaps', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health', ['work'])],
      recurringDomains: [dom('health', 3), dom('work', 2)],
    });
    expect(result.overlappingDomains).toHaveLength(2);
    expect(result.overlappingDomains.map((d) => d.domain)).toContain('health');
    expect(result.overlappingDomains.map((d) => d.domain)).toContain('work');
  });

  it('aggregates domains across multiple signals in the same entry', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health'), sig('family')],
      recurringDomains: [dom('family', 3), dom('health', 2)],
    });
    expect(result.hasOverlap).toBe(true);
    expect(result.overlappingDomains).toHaveLength(2);
  });

  it('preserves signalCount-sorted order from recurringDomains', () => {
    // recurringDomains already sorted desc by signalCount
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health', ['relationships'])],
      recurringDomains: [dom('relationships', 7), dom('health', 3)],
    });
    // relationships should be first (higher signalCount)
    expect(result.overlappingDomains[0].domain).toBe('relationships');
  });
});

// ── Evidence threshold enforcement ───────────────────────────────────────────

describe('linkJournalSignalsToArcEvidence — threshold enforcement', () => {
  it('GUARD: signalCount: 1 does NOT qualify (default threshold is 2)', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health')],
      recurringDomains: [dom('health', 1)],
    });
    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingDomains).toHaveLength(0);
  });

  it('signalCount: 2 qualifies at default threshold', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('money')],
      recurringDomains: [dom('money', 2)],
    });
    expect(result.hasOverlap).toBe(true);
  });

  it('custom minDomainSignalCount: 4 — signalCount: 3 does NOT qualify', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('work')],
      recurringDomains: [dom('work', 3)],
      minDomainSignalCount: 4,
    });
    expect(result.hasOverlap).toBe(false);
  });

  it('custom minDomainSignalCount: 1 — even signalCount: 1 qualifies', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('family')],
      recurringDomains: [dom('family', 1)],
      minDomainSignalCount: 1,
    });
    expect(result.hasOverlap).toBe(true);
  });

  it('GUARD: partial match — matching domain below threshold is excluded; non-matching domain above threshold is excluded', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health')],
      recurringDomains: [dom('health', 1), dom('work', 5)],  // health too low; work not in entry
    });
    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingDomains).toHaveLength(0);
  });
});

// ── No overlap cases ──────────────────────────────────────────────────────────

describe('linkJournalSignalsToArcEvidence — no overlap', () => {
  it('returns hasOverlap: false when signal domain not in recurringDomains', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health')],
      recurringDomains: [dom('work', 3)],
    });
    expect(result.hasOverlap).toBe(false);
    expect(result.overlapSentence).toBe('');
  });

  it('returns hasOverlap: false when recurringDomains is empty', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health', ['work'])],
      recurringDomains: [],
    });
    expect(result.hasOverlap).toBe(false);
  });

  it('returns hasOverlap: false when extractedSignals is empty', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [],
      recurringDomains: [dom('health', 5)],
    });
    expect(result.hasOverlap).toBe(false);
  });

  it('returns hasOverlap: false when all signals have null lifeDomain and no themes', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig(null, [])],
      recurringDomains: [dom('health', 4)],
    });
    expect(result.hasOverlap).toBe(false);
  });
});

// ── Bad-output guards ─────────────────────────────────────────────────────────

describe('linkJournalSignalsToArcEvidence — BAD OUTPUT guards', () => {
  it('GUARD: overlapSentence is always empty string when hasOverlap is false', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health')],
      recurringDomains: [dom('work', 3)],
    });
    expect(result.hasOverlap).toBe(false);
    expect(result.overlapSentence).toBe('');
  });

  it('GUARD: overlapSentence never contains transit-level claims (no planet/aspect text)', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health')],
      recurringDomains: [dom('health', 4, 2)],
    });
    expect(result.overlapSentence).not.toMatch(/Jupiter|Saturn|trine|square|sextile|exact/i);
  });

  it('GUARD: overlapSentence never contains "returning" (arc-level claim)', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('work')],
      recurringDomains: [dom('work', 5)],
    });
    // "returning" is an arc-level pattern label — not appropriate here
    expect(result.overlapSentence).not.toMatch(/\breturning\b/i);
  });

  it('GUARD: a theme that does not appear in recurringDomains does NOT create overlap', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig(null, ['creativity'])],  // 'creativity' not in DB domains
      recurringDomains: [dom('health', 3), dom('work', 2)],
    });
    expect(result.hasOverlap).toBe(false);
  });

  it('GUARD: empty signals array always returns hasOverlap: false with empty overlappingDomains', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [],
      recurringDomains: [dom('health', 10), dom('work', 5)],
    });
    expect(result.hasOverlap).toBe(false);
    expect(result.overlappingDomains).toHaveLength(0);
    expect(result.overlapSentence).toBe('');
  });

  it('GUARD: signal with lifeDomain matching non-existent recurringDomain does NOT produce overlap', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('family')],
      recurringDomains: [],
    });
    expect(result.hasOverlap).toBe(false);
  });
});

// ── overlapSentence content ────────────────────────────────────────────────────

describe('linkJournalSignalsToArcEvidence — overlapSentence content', () => {
  it('single-domain sentence contains the domain name', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health')],
      recurringDomains: [dom('health', 4, 2)],
    });
    expect(result.overlapSentence).toContain('health');
  });

  it('single-domain sentence references the signalCount', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('work')],
      recurringDomains: [dom('work', 6, 3)],
    });
    expect(result.overlapSentence).toContain('6');
    expect(result.overlapSentence).toContain('signal');
  });

  it('multi-domain sentence lists all domain names', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health', ['relationships'])],
      recurringDomains: [dom('relationships', 5), dom('health', 3)],
    });
    expect(result.overlapSentence).toContain('health');
    expect(result.overlapSentence).toContain('relationships');
  });

  it('multi-domain sentence references the top domain signalCount', () => {
    const result = linkJournalSignalsToArcEvidence({
      extractedSignals: [sig('health', ['relationships'])],
      recurringDomains: [dom('relationships', 7), dom('health', 3)],
    });
    // top is 'relationships' with 7 signals
    expect(result.overlapSentence).toContain('7');
    expect(result.overlapSentence).toContain('relationships');
  });
});

// ── Idempotency ───────────────────────────────────────────────────────────────

describe('linkJournalSignalsToArcEvidence — idempotency', () => {
  it('same input always returns the same output', () => {
    const input = {
      extractedSignals: [sig('health', ['work']), sig('money')],
      recurringDomains: [dom('health', 4), dom('work', 3), dom('money', 2)],
    };
    const r1 = linkJournalSignalsToArcEvidence(input);
    const r2 = linkJournalSignalsToArcEvidence(input);
    expect(r1).toEqual(r2);
  });
});
