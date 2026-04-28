/**
 * transit-domain-map.ts
 *
 * Pure functions mapping transit guidance results → human-readable life domain
 * labels for the Transit Room thirst-trap surface.
 *
 * No I/O, no Supabase, no env vars. Importable from server components and tests.
 *
 * The domain labels here are the user-facing "thirst trap" labels — short,
 * concrete, showing a free user exactly what they're missing. They are
 * intentionally shorter than DOMAIN_TITLES (interpret.ts) which are used in
 * full card headers.
 */

import type { GuidanceResult } from '@/lib/interpret';

/**
 * Short, user-facing life domain labels for locked Transit Room cards.
 * Used to show free users what they're missing without revealing the reading.
 *
 * Distinct from DOMAIN_TITLES (interpret.ts) which are used in full card headers,
 * and from LIFE_DOMAIN_LABELS (pure-fns.ts) which are used in paywall copy.
 */
export const TRANSIT_ROOM_DOMAIN_LABELS: Record<string, string> = {
  body:          'Health',
  mind:          'Your Mind',
  spirit:        'Spirituality',
  relationships: 'Love',
  career:        'Career',
  home:          'Home',
};

/**
 * Get the short, user-facing domain label for a locked transit card.
 * Falls back to the raw domain key (capitalized) for any unknown domain —
 * defensive: new domains added to interpret.ts should never crash the Transit Room.
 *
 * Pure function — no I/O, deterministic for any fixed input.
 */
export function getTransitDomainLabel(domain: string): string {
  return (
    TRANSIT_ROOM_DOMAIN_LABELS[domain] ??
    (domain.charAt(0).toUpperCase() + domain.slice(1))
  );
}

/**
 * Partition a full guidance list into visible (unlocked), locked, and quiet
 * sections based on subscription tier.
 *
 * Rules:
 * - Paid users: all active guidance is visible; nothing is locked.
 * - Free users: the single highest-scored active domain is visible; the rest
 *   are locked (these are the thirst-trap cards). Low-intensity guidance is
 *   shown as "quiet" and is not locked (not worth gatekeeping).
 *
 * "Active" = intensity !== 'low'. The interpretTransits sort order (score-weighted,
 * best first) means visible[0] is always the most significant active transit.
 *
 * Pure function — no I/O, deterministic for any fixed input.
 */
export function partitionTransitRoomGuidance(
  guidance: GuidanceResult[],
  paid: boolean,
): {
  /** Fully readable guidance cards (unlocked). */
  visible: GuidanceResult[];
  /** Locked domain cards — visible label only, content hidden. */
  locked: GuidanceResult[];
  /** Low-intensity guidance — shown as a quiet summary, not locked. */
  quiet: GuidanceResult[];
} {
  const active = guidance.filter((g) => g.intensity !== 'low');
  const quiet = guidance.filter((g) => g.intensity === 'low');

  if (paid) {
    return { visible: active, locked: [], quiet };
  }

  // Free: show the first (best-scored) active domain fully; lock the rest.
  return {
    visible: active.slice(0, 1),
    locked:  active.slice(1),
    quiet,
  };
}
