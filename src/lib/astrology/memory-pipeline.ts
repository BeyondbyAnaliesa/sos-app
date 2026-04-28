import type { NatalChart as RichChart } from './types';
import type { DailyTransits } from './domain-types';
import { computeTransitSetHash } from './pure-fns';
import {
  createLifeSignal,
  findExistingLifeSignal,
  getRecurringTransitContext,
  getTransitDailySnapshot,
  reconcileTransitArcsFromSnapshot,
  tagLifeSignalToActiveTransitArcs,
  upsertTransitDailySnapshot,
} from './memory-store';

export interface DailyTransitMemoryResult {
  snapshot: DailyTransits;
  /** True when a new snapshot row was written. */
  snapshotCreated: boolean;
  /**
   * True when the computed hash matched the existing snapshot — all writes
   * were skipped for this user/date. This is the genuine idempotency proof:
   * identical transit sets on the same day produce zero DB mutations.
   */
  snapshotSkipped: boolean;
  arcsCreatedOrUpdated: number;
  staleArcCount: number;
}
import { extractLifeSignals } from './life-signal-extract';
import { calculateTransitsForDate } from './calculate-transits';

// computeTransitSetHash is imported from pure-fns — see that file for the
// canonical hash implementation and idempotency guarantees.

export async function ensureDailyTransitMemory(params: {
  userId: string;
  richChart: RichChart;
  date?: Date;
  source?: string;
}): Promise<DailyTransitMemoryResult> {
  const { userId, richChart, date = new Date(), source = 'cron' } = params;
  const snapshot = calculateTransitsForDate(date, richChart);
  const hash = computeTransitSetHash(snapshot.transits);

  const existingSnapshot = await getTransitDailySnapshot(userId, snapshot.date);

  // ── Idempotency short-circuit ─────────────────────────────────────────────
  // If an existing snapshot for this user/date has the SAME transit-set hash,
  // the underlying transit computation is identical. All downstream writes
  // (arc reconciliation, event emission, state updates) would be no-ops or
  // duplicate-emitting. Skip them and return early.
  //
  // When hash differs (different time-of-day computation, orb drift across day),
  // we still upsert the snapshot and re-reconcile arcs.
  //
  // Limitation: if an existing snapshot is missing its hash column (rows written
  // before Slice A migration), existingHash is null → no short-circuit → normal
  // reconcile path runs. This is the safe fallback.
  const existingHash = existingSnapshot.data?.hash ?? null;
  if (existingSnapshot.data && existingHash === hash) {
    return {
      snapshot,
      snapshotCreated: false,
      snapshotSkipped: true,
      arcsCreatedOrUpdated: 0,
      staleArcCount: 0,
    };
  }

  const snapshotCreated = !existingSnapshot.data;

  await upsertTransitDailySnapshot({
    user_id: userId,
    snapshot_date: snapshot.date,
    transits_json: snapshot.transits,
    active_count: snapshot.transits.length,
    hash,
    source,
    computed_at: new Date().toISOString(),
  });

  const reconcileResult = await reconcileTransitArcsFromSnapshot({
    userId,
    snapshot,
  });

  if (reconcileResult.error) {
    throw reconcileResult.error;
  }

  return {
    snapshot,
    snapshotCreated,
    snapshotSkipped: false,
    arcsCreatedOrUpdated: reconcileResult.data?.createdOrUpdatedCount ?? 0,
    staleArcCount: reconcileResult.data?.staleCount ?? 0,
  };
}

export async function createJournalLifeSignals(params: {
  userId: string;
  entryId: string;
  entryText: string;
  snapshot: DailyTransits;
  signalTimestamp?: string;
}) {
  const { userId, entryId, entryText, snapshot, signalTimestamp = new Date().toISOString() } = params;
  const extractedSignals = extractLifeSignals(entryText.trim());
  const createdLifeSignalIds: string[] = [];

  for (const extracted of extractedSignals) {
    // ── Life-signal dedupe ──────────────────────────────────────────────────────────────
    // If this journal entry was processed before (e.g., journal save fired twice
    // or a repair rerun triggered re-extraction), skip the insert and reuse the
    // existing signal ID so arc tags are re-applied idempotently.
    const existingSignal = await findExistingLifeSignal(userId, entryId, extracted.sourceIndex);
    if (existingSignal.data?.id) {
      createdLifeSignalIds.push(existingSignal.data.id);
      continue;
    }

    const lifeSignalResult = await createLifeSignal({
      user_id: userId,
      source: 'journal',
      source_entry_id: entryId,
      source_index: extracted.sourceIndex,
      source_start: extracted.sourceStart,
      source_end: extracted.sourceEnd,
      signal_timestamp: signalTimestamp,
      content_text: extracted.text,
      content_json: null,
      signal_kind: extracted.signalKind,
      themes_json: extracted.themes,
      entities_json: extracted.entities,
      emotions_json: extracted.emotions,
      life_domain: extracted.lifeDomain,
      privacy_class: 'standard',
      status: 'open',
      active_transits_json: snapshot.transits,
      metadata_json: {
        journal_entry_id: entryId,
        transit_date: snapshot.date,
        capture_stage: 'multi-signal-rule-based-journal-bridge',
        extraction_confidence: extracted.confidence,
        extraction_rule_matches: extracted.matchedRuleCount,
        extraction_debug: extracted.debug,
        source_anchor: {
          index: extracted.sourceIndex,
          start: extracted.sourceStart,
          end: extracted.sourceEnd,
        },
      },
    });

    if (lifeSignalResult.data?.id) {
      createdLifeSignalIds.push(lifeSignalResult.data.id);
    }
  }

  for (const lifeSignalId of createdLifeSignalIds) {
    await tagLifeSignalToActiveTransitArcs({
      userId,
      lifeSignalId,
      snapshot,
    });
  }

  return {
    extractedSignals,
    createdLifeSignalIds,
  };
}

export async function buildRecurringTransitContext(params: {
  userId: string;
  snapshot: DailyTransits;
  currentSignals: ReturnType<typeof extractLifeSignals>;
  excludeLifeSignalId?: string;
}) {
  const recurringContextResult = await getRecurringTransitContext({
    userId: params.userId,
    snapshot: params.snapshot,
    currentSignals: params.currentSignals.map((signal) => ({
      signalKind: signal.signalKind,
      themes: signal.themes,
      emotions: signal.emotions,
      lifeDomain: signal.lifeDomain,
    })),
    excludeLifeSignalId: params.excludeLifeSignalId,
    limit: 8,
  });

  if (!recurringContextResult.data || recurringContextResult.data.length === 0) {
    return '';
  }

  const grouped = recurringContextResult.data
    .filter((item) => item.signal?.content_text)
    .reduce<Record<string, typeof recurringContextResult.data>>((acc, item) => {
      const key = item.signal?.signal_kind ?? 'mixed';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

  const sections = Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, items]) => {
      const lines = items.slice(0, 2).map((item) => {
        const dateLabel = item.signal.signal_timestamp
          ? new Date(item.signal.signal_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : 'Unknown date';
        const arcLabel = item.arc
          ? `${item.arc.transit_planet} ${item.arc.aspect_type} ${item.arc.natal_target}`
          : 'Related transit';
        const themes = Array.isArray(item.signal.themes_json) && item.signal.themes_json.length > 0
          ? ` | themes: ${item.signal.themes_json.join(', ')}`
          : '';
        const emotions = Array.isArray(item.signal.emotions_json) && item.signal.emotions_json.length > 0
          ? ` | emotions: ${item.signal.emotions_json.join(', ')}`
          : '';
        const score = typeof item.score === 'number'
          ? ` | score: ${item.score}`
          : '';
        const confidence = typeof item.confidence === 'number'
          ? ` | tag_confidence: ${item.confidence}`
          : '';

        return `[${dateLabel}] ${arcLabel}${themes}${emotions}${score}${confidence}\n${item.signal.content_text}`;
      }).join('\n\n');

      return `Kind: ${kind}\n${lines}`;
    })
    .join('\n\n');

  if (!sections) return '';

  return `\n\n--- PRIOR MOMENTS UNDER SIMILAR TRANSITS ---\nUse these only when genuinely relevant. Prefer the strongest structural resemblance, not just the newest thing. If you refer back, do it concretely and lightly.\n\n${sections}`;
}
