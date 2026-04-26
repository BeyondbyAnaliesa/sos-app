/**
 * gold-set.ts
 *
 * Synthetic journal entry fixtures with expected signal extraction outcomes.
 *
 * Rules for this file:
 * - No real user PII. All users are synthetic (user_synth_01, etc.).
 * - All expected values are derived from the deterministic rule-based extractor.
 * - If a behavior is ambiguous, it is marked SKIP with a comment.
 * - Gold set is intentionally small — 6 entries. Grow only when a new rule merits it.
 */

import type { ExtractedLifeSignal } from '../../memory-types';
import type { Transit } from '../../domain-types';

// ── Synthetic transit context ─────────────────────────────────────────────────
// Used to populate active_transits_json in signal records.
// No actual chart calculation here — snapshot is purely structural.

export const SYNTH_TRANSITS: Transit[] = [
  { transitPlanet: 'Venus', aspect: 'sextile', natalPlanet: 'Moon', orb: 0.45 },
  { transitPlanet: 'Saturn', aspect: 'square', natalPlanet: 'Sun', orb: 2.10 },
];

// ── Gold-set journal entries ──────────────────────────────────────────────────

export interface GoldEntry {
  id: string;
  userId: string;
  text: string;
  /**
   * Expected signal extraction outcome for the FULL entry text.
   * Only fields that can be deterministically verified from the rules are specified.
   * Fields marked optional may vary (e.g., entities depend on capitalisation).
   */
  expected: {
    minSignalCount: number;
    /** At least one signal must have these themes (subset check) */
    expectedThemes?: string[];
    /** At least one signal must have these emotions (subset check) */
    expectedEmotions?: string[];
    /** Primary life domain of the first/dominant signal */
    primaryDomain?: string | null;
    /** Signal kind must be one of these values */
    signalKindOneOf?: ExtractedLifeSignal['signalKind'][];
    /** Confidence must be strictly greater than this floor */
    confidenceFloor?: number;
    /** BAD OUTPUT guard: these themes must NOT appear in any signal */
    forbiddenThemes?: string[];
  };
}

export const GOLD_ENTRIES: GoldEntry[] = [
  // ── 1. Work stress / deadline ─────────────────────────────────────────────
  {
    id: 'gold-work-deadline',
    userId: 'user_synth_01',
    text: 'I have a huge project deadline tomorrow and I feel completely overwhelmed. Work has been non-stop for two weeks and I cannot catch a break.',
    expected: {
      minSignalCount: 1,
      expectedThemes: ['work'],
      expectedEmotions: ['overwhelm'],
      primaryDomain: 'work',
      signalKindOneOf: ['mixed', 'feeling', 'event'],
      confidenceFloor: 0.3,
      forbiddenThemes: ['family'], // no family signals in this entry
    },
  },

  // ── 2. Relationship anxiety ───────────────────────────────────────────────
  {
    id: 'gold-relationship-fear',
    userId: 'user_synth_01',
    text: 'I am afraid of losing this relationship. We had a fight last night and I keep thinking it means something is broken between us.',
    expected: {
      minSignalCount: 1,
      expectedThemes: ['relationships'],
      expectedEmotions: ['fear'],
      primaryDomain: 'relationships',
      signalKindOneOf: ['mixed', 'feeling', 'thought'],
      confidenceFloor: 0.3,
    },
  },

  // ── 3. Calm / grounded body state ────────────────────────────────────────
  {
    id: 'gold-calm-body',
    userId: 'user_synth_02',
    text: 'Woke up feeling calm and grounded today. My body feels rested for the first time in weeks. Slept through the whole night.',
    expected: {
      minSignalCount: 1,
      expectedEmotions: ['calm'],
      signalKindOneOf: ['mixed', 'body', 'feeling'],
      confidenceFloor: 0.2,
      forbiddenThemes: ['money'], // no financial signals here
    },
  },

  // ── 4. Health / body distress ─────────────────────────────────────────────
  // Updated 2026-04-25: 'anxious' was added to the fear emotion rule.
  // 'exhausted' → overwhelm rule; 'anxious' → fear rule (new). Both emotions now detected.
  // signalKind: body+feeling → body (priority disambiguation, new).
  {
    id: 'gold-health-distress',
    userId: 'user_synth_02',
    text: 'Chest pain again. I am tired, anxious, and my body will not stop shaking. Feeling sick and exhausted.',
    expected: {
      minSignalCount: 1,
      expectedThemes: ['health'],
      expectedEmotions: ['overwhelm', 'fear'], // 'exhausted' → overwhelm; 'anxious' → fear (rule added 2026-04-25)
      primaryDomain: 'health',
      signalKindOneOf: ['body', 'mixed'], // body+feeling priority → body
      confidenceFloor: 0.3,
    },
  },

  // ── 5. Money / client event ───────────────────────────────────────────────
  {
    id: 'gold-money-client',
    userId: 'user_synth_03',
    text: 'Client paid the invoice today. Finally got the money in the bank. Feeling relieved but also worried about the next project.',
    expected: {
      minSignalCount: 1,
      expectedThemes: ['money'],
      primaryDomain: 'money',
      signalKindOneOf: ['event', 'mixed', 'feeling'],
      confidenceFloor: 0.3,
      forbiddenThemes: ['family'],
    },
  },

  // ── 6. Multi-signal long entry ────────────────────────────────────────────
  {
    id: 'gold-multi-signal',
    userId: 'user_synth_03',
    text: 'Work meeting went badly. My partner and I argued again about money. My body feels exhausted. I keep thinking I am failing at everything.',
    expected: {
      // Long entry with multiple sentences → multiple signals expected
      minSignalCount: 2,
      expectedThemes: ['work'],
      signalKindOneOf: ['mixed', 'event', 'feeling', 'body', 'thought'],
      confidenceFloor: 0.2,
    },
  },
];

// ── Arc fixture shapes ────────────────────────────────────────────────────────
// Used in arc-phase and tombstone tests.

export const SYNTH_ARC_APPROACHING = {
  transit_planet: 'Venus',
  aspect_type: 'sextile',
  natal_target: 'Moon',
  first_active_date: '2026-04-10',
  last_active_date: '2026-04-24',
  tightest_orb: 1.2,
  peak_orb: 1.2,
  exact_dates_json: [] as string[], // NO exact crossing
  last_direction: 'widening' as const,
  recurrence_count: 1,
  parent_arc_id: null,
};

export const SYNTH_ARC_WITH_EXACT = {
  transit_planet: 'Saturn',
  aspect_type: 'square',
  natal_target: 'Sun',
  first_active_date: '2026-04-01',
  last_active_date: '2026-04-22',
  tightest_orb: 0.30,
  peak_orb: 0.30,
  exact_dates_json: ['2026-04-15', '2026-04-22'] as string[],
  last_direction: 'widening' as const,
  recurrence_count: 1,
  parent_arc_id: null,
};

export const SYNTH_ARC_RETURNING = {
  transit_planet: 'Jupiter',
  aspect_type: 'trine',
  natal_target: 'Venus',
  first_active_date: '2026-04-20',
  last_active_date: '2026-04-24',
  tightest_orb: 0.80,
  peak_orb: 0.80,
  exact_dates_json: [] as string[], // no exact in this occurrence yet
  last_direction: 'tightening' as const,
  recurrence_count: 2,
  parent_arc_id: 'prior-arc-uuid-0001', // linked to prior dormant arc
};
