/**
 * synthesis-composition.test.ts
 *
 * Multi-arc + multi-signal composition tests for the three moat synthesis layers:
 *   - synthesizeRecallPattern
 *   - linkJournalSignalsToArcEvidence
 *   - scanApproachingArcPeaks
 *
 * These tests are NOT duplicates of the per-function test files.
 * They test the coherence of all three functions running together on
 * the SAME shared scenario — catching regressions that only appear
 * when multiple synthesis layers interact:
 *
 *   1. A returning arc drives the recall pattern label AND must be excluded
 *      from the anticipatory scan (state ≠ 'approaching').
 *   2. A recurring domain that drives the pattern label must also trigger
 *      cross-modal linkage when the journal entry touches that domain.
 *   3. The quiet state must produce zero noise from every function
 *      simultaneously — no function should overclaim when evidence is absent.
 *
 * All tests are deterministic: explicit asOfDate, explicit fixture data,
 * no I/O, no Supabase, no Date.now() side-effects.
 *
 * Test scenarios:
 *   A — Mixed-state arcs: returning + approaching together
 *   B — Domain-driven recall: recurring_domain with journal overlap
 *   C — Newly-active arc: minimal evidence set
 *   D — Quiet state: all three functions in empty-evidence mode
 *   E — Cross-function coherence guards (hard regression fences)
 */

import { describe, it, expect } from 'vitest';
import {
  synthesizeRecallPattern,
  linkJournalSignalsToArcEvidence,
  scanApproachingArcPeaks,
} from '../pure-fns';

// ── Shared constants ──────────────────────────────────────────────────────────

const TODAY = '2026-04-25';

// ── Fixture builders ──────────────────────────────────────────────────────────

function mkArc(
  planet: string,
  aspect: string,
  target: string,
  state: string,
  opts: {
    recurrence_count?: number;
    first_active_date?: string;
    last_orb?: number | null;
    tightest_orb?: number | null;
  } = {},
) {
  return {
    transit_planet: planet,
    aspect_type: aspect,
    natal_target: target,
    state,
    recurrence_count: opts.recurrence_count ?? 1,
    first_active_date: opts.first_active_date ?? TODAY,
    last_orb: opts.last_orb ?? null,
    tightest_orb: opts.tightest_orb ?? null,
  };
}

function mkDomain(domain: string, signalCount: number, arcCount = 1) {
  return { domain, signalCount, arcCount };
}

function mkSignal(lifeDomain: string | null, themes: string[] = []) {
  return { lifeDomain, themes };
}

function mkDay(
  date: string,
  entries: Array<{ planet: string; aspect: string; target: string; orb: number }>,
) {
  return {
    date,
    transits: entries.map((e) => ({
      transitPlanet: e.planet,
      aspect: e.aspect,
      natalPlanet: e.target,
      orb: e.orb,
    })),
  };
}

// ── Scenario A: Mixed-state arc set — returning + approaching ─────────────────
//
// A return-family arc (Jupiter trine Venus, recurrence_count: 2, state: 'returning')
// and a separate approaching arc (Mars conjunct Sun, state: 'approaching') are both
// active at the same time.
//
// Expected coherent picture:
//   synthesizeRecallPattern  → 'returning'  (Jupiter arc wins hierarchy)
//   linkJournalSignalsToArcEvidence → hasOverlap: true  (relationships domain)
//   scanApproachingArcPeaks  → only Mars arc  (Jupiter excluded — state='returning')
//

const SCENARIO_A_ARCS = [
  mkArc('Jupiter', 'trine', 'Venus', 'returning', {
    recurrence_count: 2,
    first_active_date: '2026-04-20',
    last_orb: 0.9,
  }),
  mkArc('Mars', 'conjunct', 'Sun', 'approaching', {
    recurrence_count: 1,
    first_active_date: '2026-04-22',
    last_orb: 1.4,
  }),
];

const SCENARIO_A_DOMAINS = [mkDomain('relationships', 4, 1)];

const SCENARIO_A_SIGNALS = [mkSignal('relationships')];

const SCENARIO_A_UPCOMING = [
  mkDay('2026-04-26', [{ planet: 'Mars', aspect: 'conjunct', target: 'Sun', orb: 1.1 }]),
  mkDay('2026-04-27', [{ planet: 'Mars', aspect: 'conjunct', target: 'Sun', orb: 0.6 }]),
  mkDay('2026-04-28', [{ planet: 'Mars', aspect: 'conjunct', target: 'Sun', orb: 0.4 }]),
];

describe('Scenario A — mixed-state: returning + approaching arc', () => {
  it('synthesizeRecallPattern returns "returning" driven by Jupiter arc', () => {
    const r = synthesizeRecallPattern({
      activeArcs: SCENARIO_A_ARCS,
      recurringDomains: SCENARIO_A_DOMAINS,
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('returning');
    expect(r.returningArcCount).toBe(1);
  });

  it('linkJournalSignalsToArcEvidence finds relationships overlap', () => {
    const r = linkJournalSignalsToArcEvidence({
      extractedSignals: SCENARIO_A_SIGNALS,
      recurringDomains: SCENARIO_A_DOMAINS,
    });
    expect(r.hasOverlap).toBe(true);
    expect(r.overlappingDomains[0].domain).toBe('relationships');
  });

  it('scanApproachingArcPeaks includes only the approaching Mars arc', () => {
    const r = scanApproachingArcPeaks({
      activeArcs: SCENARIO_A_ARCS,
      upcomingTransits: SCENARIO_A_UPCOMING,
    });
    expect(r).toHaveLength(1);
    expect(r[0].transit_planet).toBe('Mars');
    expect(r[0].aspect_type).toBe('conjunct');
    expect(r[0].natal_target).toBe('Sun');
  });

  it('GUARD: returning Jupiter arc must NOT appear in the anticipatory scan', () => {
    const r = scanApproachingArcPeaks({
      activeArcs: SCENARIO_A_ARCS,
      upcomingTransits: SCENARIO_A_UPCOMING,
    });
    const jupiters = r.filter((p) => p.transit_planet === 'Jupiter');
    expect(jupiters).toHaveLength(0);
  });

  it('GUARD: Mars approaching arc must NOT be counted as returning in pattern', () => {
    const r = synthesizeRecallPattern({
      activeArcs: SCENARIO_A_ARCS,
      recurringDomains: [],
      asOfDate: TODAY,
    });
    // Jupiter returning drives the label; Mars should not inflate returningArcCount
    // (Mars has recurrence_count: 1 — below the threshold)
    expect(r.returningArcCount).toBe(1); // only Jupiter
  });

  it('GUARD: pattern "returning" and journal overlap are independent — both hold simultaneously', () => {
    const pattern = synthesizeRecallPattern({
      activeArcs: SCENARIO_A_ARCS,
      recurringDomains: SCENARIO_A_DOMAINS,
      asOfDate: TODAY,
    });
    const linkage = linkJournalSignalsToArcEvidence({
      extractedSignals: SCENARIO_A_SIGNALS,
      recurringDomains: SCENARIO_A_DOMAINS,
    });
    // Both are true — they draw from independent evidence paths
    expect(pattern.patternLabel).toBe('returning');
    expect(linkage.hasOverlap).toBe(true);
  });
});

// ── Scenario B: Domain-driven recall — recurring_domain + overlap ─────────────
//
// One approaching arc (Saturn square Moon) + a high-signal domain ('work', 5 signals).
// Journal entry also touches 'work'.
//
// Expected coherent picture:
//   synthesizeRecallPattern  → 'recurring_domain'  (work domain, signalCount ≥ 3)
//   linkJournalSignalsToArcEvidence → hasOverlap: true  (work domain matches)
//   scanApproachingArcPeaks  → Saturn arc (approaching, within orb)
//

const SCENARIO_B_ARCS = [
  mkArc('Saturn', 'square', 'Moon', 'approaching', {
    recurrence_count: 1,
    first_active_date: '2026-04-15',
    last_orb: 1.2,
  }),
];

const SCENARIO_B_DOMAINS = [mkDomain('work', 5, 2)];

const SCENARIO_B_SIGNALS = [mkSignal('work', ['work'])];

const SCENARIO_B_UPCOMING = [
  mkDay('2026-04-26', [{ planet: 'Saturn', aspect: 'square', target: 'Moon', orb: 0.9 }]),
  mkDay('2026-04-27', [{ planet: 'Saturn', aspect: 'square', target: 'Moon', orb: 0.7 }]),
];

describe('Scenario B — domain-driven: recurring_domain with journal overlap', () => {
  it('synthesizeRecallPattern returns "recurring_domain" from work evidence', () => {
    const r = synthesizeRecallPattern({
      activeArcs: SCENARIO_B_ARCS,
      recurringDomains: SCENARIO_B_DOMAINS,
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('recurring_domain');
    expect(r.dominantDomain).toBe('work');
    expect(r.dominantDomainSignalCount).toBe(5);
  });

  it('linkJournalSignalsToArcEvidence confirms "work" overlap with the same domain evidence', () => {
    const r = linkJournalSignalsToArcEvidence({
      extractedSignals: SCENARIO_B_SIGNALS,
      recurringDomains: SCENARIO_B_DOMAINS,
    });
    expect(r.hasOverlap).toBe(true);
    expect(r.overlappingDomains[0].domain).toBe('work');
    expect(r.overlappingDomains[0].signalCount).toBe(5);
  });

  it('scanApproachingArcPeaks includes Saturn arc', () => {
    const r = scanApproachingArcPeaks({
      activeArcs: SCENARIO_B_ARCS,
      upcomingTransits: SCENARIO_B_UPCOMING,
    });
    expect(r).toHaveLength(1);
    expect(r[0].transit_planet).toBe('Saturn');
    expect(r[0].projectedPeakOrb).toBe(0.7);
  });

  it('GUARD: pattern dominant domain and overlap domain are the same label', () => {
    // The domain driving the pattern label must be the same domain found in the overlap.
    // If these diverge, the system would inject contradictory Aeon context.
    const pattern = synthesizeRecallPattern({
      activeArcs: SCENARIO_B_ARCS,
      recurringDomains: SCENARIO_B_DOMAINS,
      asOfDate: TODAY,
    });
    const linkage = linkJournalSignalsToArcEvidence({
      extractedSignals: SCENARIO_B_SIGNALS,
      recurringDomains: SCENARIO_B_DOMAINS,
    });
    // When the journal entry touches the same domain that drives the pattern label,
    // both functions agree on what domain is significant.
    expect(pattern.dominantDomain).toBe(linkage.overlappingDomains[0]?.domain);
  });
});

// ── Scenario C: Newly-active arc — minimal evidence ───────────────────────────
//
// One fresh approaching arc (Venus sextile Mars, 1 day old, no domain history).
// Journal touches 'relationships' but there's no prior domain history to link to.
//
// Expected coherent picture:
//   synthesizeRecallPattern  → 'newly_active'  (arc is 1 day old)
//   linkJournalSignalsToArcEvidence → hasOverlap: false  (no recurring domain evidence)
//   scanApproachingArcPeaks  → Venus arc (approaching, within orb)
//

const SCENARIO_C_ARCS = [
  mkArc('Venus', 'sextile', 'Mars', 'approaching', {
    recurrence_count: 1,
    first_active_date: '2026-04-24', // 1 day before TODAY
    last_orb: 1.6,
  }),
];

const SCENARIO_C_UPCOMING = [
  mkDay('2026-04-26', [{ planet: 'Venus', aspect: 'sextile', target: 'Mars', orb: 1.2 }]),
  mkDay('2026-04-27', [{ planet: 'Venus', aspect: 'sextile', target: 'Mars', orb: 0.8 }]),
];

describe('Scenario C — newly-active arc with no domain history', () => {
  it('synthesizeRecallPattern returns "newly_active" for a fresh arc', () => {
    const r = synthesizeRecallPattern({
      activeArcs: SCENARIO_C_ARCS,
      recurringDomains: [], // no domain history
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('newly_active');
    expect(r.newlyActiveArcCount).toBe(1);
  });

  it('linkJournalSignalsToArcEvidence returns hasOverlap: false — no domain history to match', () => {
    const r = linkJournalSignalsToArcEvidence({
      extractedSignals: [mkSignal('relationships')],
      recurringDomains: [], // no recurring domain evidence
    });
    expect(r.hasOverlap).toBe(false);
    expect(r.overlapSentence).toBe('');
  });

  it('scanApproachingArcPeaks still includes the newly-active approaching arc', () => {
    const r = scanApproachingArcPeaks({
      activeArcs: SCENARIO_C_ARCS,
      upcomingTransits: SCENARIO_C_UPCOMING,
    });
    expect(r).toHaveLength(1);
    expect(r[0].transit_planet).toBe('Venus');
  });
});

// ── Scenario D: Quiet state — all three functions in empty-evidence mode ──────
//
// No active arcs, no domains, no journal signals, no upcoming transits.
// All three functions must return their "empty" output with zero noise.
//

describe('Scenario D — quiet state: zero evidence across all functions', () => {
  it('synthesizeRecallPattern returns "quiet" with zero counts', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    expect(r.patternLabel).toBe('quiet');
    expect(r.returningArcCount).toBe(0);
    expect(r.newlyActiveArcCount).toBe(0);
    expect(r.dominantDomain).toBeNull();
  });

  it('linkJournalSignalsToArcEvidence returns hasOverlap: false with empty overlapSentence', () => {
    const r = linkJournalSignalsToArcEvidence({
      extractedSignals: [mkSignal('work')],
      recurringDomains: [],
    });
    expect(r.hasOverlap).toBe(false);
    expect(r.overlapSentence).toBe('');
    expect(r.overlappingDomains).toHaveLength(0);
  });

  it('scanApproachingArcPeaks returns empty array', () => {
    const r = scanApproachingArcPeaks({
      activeArcs: [],
      upcomingTransits: [],
    });
    expect(r).toHaveLength(0);
  });

  it('GUARD: quiet evidenceSentence contains no affirmative pattern claim', () => {
    const r = synthesizeRecallPattern({
      activeArcs: [],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    // The quiet sentence must not use phrases that only appear in affirmative pattern labels.
    // Checked: 'returning' label uses 'recurrence_count'; 'recurring_domain' uses 'linked signal';
    // 'newly_active' uses 'entered the active arc window'. None of these should appear here.
    expect(r.evidenceSentence).not.toMatch(/recurrence_count/i);
    expect(r.evidenceSentence).not.toMatch(/linked signal/i);
    expect(r.evidenceSentence).not.toMatch(/entered the active arc window/i);
    // Sentence must start with a negation — the quiet state says no pattern found
    expect(r.evidenceSentence).toMatch(/^No /i);
  });
});

// ── Scenario E: Cross-function coherence guards ───────────────────────────────
//
// Hard regression fences that apply across function boundaries.
// These test invariants that no single-function test file can protect.
//

describe('Cross-function coherence — hard regression guards', () => {
  it('GUARD: an arc with recurrence_count 2 is counted by synthesize but NOT in scan', () => {
    // A returning arc should drive the recall pattern label.
    // The SAME arc should be excluded from the anticipatory scan.
    const returningArc = mkArc('Jupiter', 'trine', 'Venus', 'returning', {
      recurrence_count: 2,
      first_active_date: '2026-04-20',
      last_orb: 0.7,
    });
    const upcoming = [
      mkDay('2026-04-26', [{ planet: 'Jupiter', aspect: 'trine', target: 'Venus', orb: 0.5 }]),
    ];

    const pattern = synthesizeRecallPattern({
      activeArcs: [returningArc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    const scan = scanApproachingArcPeaks({
      activeArcs: [returningArc],
      upcomingTransits: upcoming,
    });

    // Pattern should see it (recurrence_count: 2)
    expect(pattern.returningArcCount).toBe(1);
    // Scan should NOT include it (state: 'returning' ≠ 'approaching')
    expect(scan).toHaveLength(0);
  });

  it('GUARD: an arc with recurrence_count 1 is in the scan but does NOT trigger returning label', () => {
    const approachingArc = mkArc('Saturn', 'square', 'Sun', 'approaching', {
      recurrence_count: 1,
      first_active_date: '2026-04-01',
      last_orb: 1.5,
    });
    const upcoming = [
      mkDay('2026-04-26', [{ planet: 'Saturn', aspect: 'square', target: 'Sun', orb: 1.0 }]),
    ];

    const pattern = synthesizeRecallPattern({
      activeArcs: [approachingArc],
      recurringDomains: [],
      asOfDate: TODAY,
    });
    const scan = scanApproachingArcPeaks({
      activeArcs: [approachingArc],
      upcomingTransits: upcoming,
    });

    // Pattern must NOT say returning (recurrence_count: 1 < 2)
    expect(pattern.patternLabel).not.toBe('returning');
    expect(pattern.returningArcCount).toBe(0);
    // Scan SHOULD include the approaching arc
    expect(scan).toHaveLength(1);
  });

  it('GUARD: domain that triggers recurring_domain also overlaps when journal touches that domain', () => {
    // If the pattern label is 'recurring_domain' for domain X, and the journal entry
    // touches domain X, then linkJournalSignalsToArcEvidence MUST find an overlap.
    // Divergence between these two functions would inject contradictory Aeon context.
    const sharedDomains = [mkDomain('health', 4, 2)];
    const arc = mkArc('Neptune', 'trine', 'Mercury', 'approaching', {
      first_active_date: '2026-03-01',
      recurrence_count: 1,
    });

    const pattern = synthesizeRecallPattern({
      activeArcs: [arc],
      recurringDomains: sharedDomains,
      asOfDate: TODAY,
    });
    const linkage = linkJournalSignalsToArcEvidence({
      extractedSignals: [mkSignal('health')],
      recurringDomains: sharedDomains,
    });

    expect(pattern.patternLabel).toBe('recurring_domain');
    // The domain driving the pattern must be findable by the linkage function
    expect(linkage.hasOverlap).toBe(true);
    expect(linkage.overlappingDomains[0].domain).toBe(pattern.dominantDomain);
  });

  it('GUARD: when journal does NOT touch the pattern domain, overlap is false even if pattern is active', () => {
    // Pattern fires for 'health'. Journal entry touches 'money'. No overlap.
    // The two functions draw from independent evidence — they can diverge legitimately.
    const domains = [mkDomain('health', 4, 1)];
    const arc = mkArc('Pluto', 'opposition', 'Mars', 'approaching', {
      first_active_date: '2026-03-01',
      recurrence_count: 1,
    });

    const pattern = synthesizeRecallPattern({
      activeArcs: [arc],
      recurringDomains: domains,
      asOfDate: TODAY,
    });
    const linkage = linkJournalSignalsToArcEvidence({
      extractedSignals: [mkSignal('money')], // touches 'money', not 'health'
      recurringDomains: domains,
    });

    expect(pattern.patternLabel).toBe('recurring_domain');
    expect(pattern.dominantDomain).toBe('health');
    // Journal touches 'money' only — no overlap with 'health' domain
    expect(linkage.hasOverlap).toBe(false);
  });

  it('GUARD: multiple arcs spanning all three functions produce consistent output in one call', () => {
    // Three arcs: one returning, one approaching, one separating (excluded from scan).
    // Scan must include only the approaching arc.
    // Pattern must count only the returning arc.
    const returningArc = mkArc('Jupiter', 'trine', 'Venus', 'returning', { recurrence_count: 2 });
    const approachingArc = mkArc('Mars', 'sextile', 'Moon', 'approaching', { last_orb: 1.2 });
    const separatingArc = mkArc('Venus', 'square', 'Saturn', 'separating', { last_orb: 1.8 });

    const allArcs = [returningArc, approachingArc, separatingArc];
    const upcoming = [
      mkDay('2026-04-26', [{ planet: 'Mars', aspect: 'sextile', target: 'Moon', orb: 0.8 }]),
      // Jupiter and Venus not in window (excluded from forward scan)
    ];

    const pattern = synthesizeRecallPattern({
      activeArcs: allArcs,
      recurringDomains: [],
      asOfDate: TODAY,
    });
    const scan = scanApproachingArcPeaks({
      activeArcs: allArcs,
      upcomingTransits: upcoming,
    });

    // Pattern: only Jupiter counts as returning
    expect(pattern.returningArcCount).toBe(1);
    expect(pattern.patternLabel).toBe('returning');

    // Scan: only Mars (approaching + in window)
    expect(scan).toHaveLength(1);
    expect(scan[0].transit_planet).toBe('Mars');

    // Guard: separating arc is in neither
    const separatingInScan = scan.filter((p) => p.transit_planet === 'Venus');
    expect(separatingInScan).toHaveLength(0);
  });
});
