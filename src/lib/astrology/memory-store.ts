import { createAdminClient } from '@/lib/supabase/server';
import { logWarn } from '@/lib/logger';
import type { DailyTransits } from './domain-types';
import { buildArcTombstone, computeConfidenceTier, inferNewArcState, inferOrbDirection, inferUpdatedArcState } from './pure-fns';
import { createSecureLifeSignal, listSecureLifeSignals } from './secure-life-signals';
import type {
  LifeSignalRecord,
  LifeSignalTransitTagRecord,
  MemorySyncRunRecord,
  TransitArcEventRecord,
  TransitArcRecord,
  TransitDailySnapshotRecord,
} from './memory-types';

export async function upsertTransitDailySnapshot(snapshot: TransitDailySnapshotRecord) {
  const admin = createAdminClient();
  return admin
    .from('transit_daily_snapshots')
    .upsert(snapshot, { onConflict: 'user_id,snapshot_date' })
    .select('*')
    .single();
}

export async function getMemorySyncRunByDate(runDate: string) {
  const admin = createAdminClient();
  return admin
    .from('memory_sync_runs')
    .select('*')
    .eq('run_date', runDate)
    .maybeSingle();
}

export async function createMemorySyncRun(run: MemorySyncRunRecord) {
  const admin = createAdminClient();
  return admin
    .from('memory_sync_runs')
    .insert(run)
    .select('*')
    .single();
}

export async function updateMemorySyncRun(id: string, patch: Partial<MemorySyncRunRecord>) {
  const admin = createAdminClient();
  return admin
    .from('memory_sync_runs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
}

export async function createTransitArc(arc: TransitArcRecord) {
  const admin = createAdminClient();
  return admin
    .from('transit_arcs')
    .insert(arc)
    .select('*')
    .single();
}

export async function updateTransitArc(id: string, patch: Partial<TransitArcRecord>) {
  const admin = createAdminClient();
  return admin
    .from('transit_arcs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
}

export async function listActiveTransitArcs(userId: string) {
  const admin = createAdminClient();
  return admin
    .from('transit_arcs')
    .select('*')
    .eq('user_id', userId)
    .in('state', ['approaching', 'exact', 'separating', 'returning'])
    .order('updated_at', { ascending: false });
}

export async function createLifeSignal(signal: LifeSignalRecord) {
  const admin = createAdminClient();
  const created = await createSecureLifeSignal(admin, signal);
  return {
    data: { id: created.id },
    error: null,
  };
}

export async function getTransitDailySnapshot(userId: string, snapshotDate: string) {
  const admin = createAdminClient();
  return admin
    .from('transit_daily_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('snapshot_date', snapshotDate)
    .maybeSingle();
}

export async function emitTransitArcEvent(event: TransitArcEventRecord) {
  const admin = createAdminClient();
  // Append-only: never update or upsert arc events
  const { error } = await admin
    .from('transit_arc_events')
    .insert(event);
  // Non-fatal: log but don't throw
  if (error) {
    console.error(JSON.stringify({ _level: 'warn', action: 'emitTransitArcEvent', error: error.message, event_type: event.event_type }));
  }
}

// buildArcTombstone is imported from pure-fns — see that file for the
// deterministic rule-based implementation and evidence-boundary notes.


export async function reconcileTransitArcsFromSnapshot(params: {
  userId: string;
  snapshot: DailyTransits;
}) {
  const admin = createAdminClient();
  const { userId, snapshot } = params;

  const activeKeySet = new Set(
    snapshot.transits.map((transit) => [transit.transitPlanet, transit.aspect, transit.natalPlanet].join('|')),
  );

  const { data: existingArcs, error: fetchError } = await admin
    .from('transit_arcs')
    .select('*')
    .eq('user_id', userId)
    .in('state', ['approaching', 'exact', 'separating', 'returning']);

  if (fetchError) return { data: null, error: fetchError };

  const arcByKey = new Map(
    (existingArcs ?? []).map((arc) => [
      [arc.transit_planet, arc.aspect_type, arc.natal_target].join('|'),
      arc,
    ]),
  );

  // ── Return-family: look up recently dormant arcs (60-day window) ─────────
  // When a transit key reappears after being dormant, we create a new arc
  // with parent_arc_id linking to the prior dormant arc — not an in-place reopen.
  const dormantLookbackCutoff = new Date();
  dormantLookbackCutoff.setDate(dormantLookbackCutoff.getDate() - 60);
  const dormantCutoffDate = dormantLookbackCutoff.toISOString().slice(0, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dormantByKey = new Map<string, any>();
  const { data: recentDormantArcs } = await admin
    .from('transit_arcs')
    .select('*')
    .eq('user_id', userId)
    .eq('state', 'dormant')
    .gte('last_active_date', dormantCutoffDate)
    .order('last_active_date', { ascending: false });

  // Keep the most recently dormant arc per transit key (first in desc-ordered list)
  const seenDormantKeys = new Set<string>();
  for (const arc of recentDormantArcs ?? []) {
    const k = [arc.transit_planet, arc.aspect_type, arc.natal_target].join('|');
    if (!seenDormantKeys.has(k)) {
      seenDormantKeys.add(k);
      dormantByKey.set(k, arc);
    }
  }

  const createdOrUpdated = [];
  let staleCount = 0;

  for (const transit of snapshot.transits) {
    const key = [transit.transitPlanet, transit.aspect, transit.natalPlanet].join('|');
    const existing = arcByKey.get(key);

    const previousOrb = existing?.last_orb ?? existing?.peak_orb ?? null;
    const priorExactDates = Array.isArray(existing?.exact_dates_json) ? existing.exact_dates_json : [];

    // Phase truth: delegate to pure-fns so the same deterministic logic that is
    // tested in arc-phase.test.ts is exercised in production.
    // inferOrbDirection computes the label that is also stored on the arc record.
    // inferUpdatedArcState runs the full state-machine for existing arcs.
    // inferNewArcState handles the brand-new arc path (exact only at orb ≤ 0.5).
    // Note: existingArcs is filtered to active states only, so existing.state is
    // never 'dormant' here. The dormant/return-family path is handled below via dormantByKey.
    const lastDirection = inferOrbDirection(transit.orb, previousOrb);

    const nextState: TransitArcRecord['state'] = existing
      ? inferUpdatedArcState({
          currentOrb: transit.orb,
          previousOrb,
          currentState: existing.state,
          priorExactDates,
        })
      : inferNewArcState(transit.orb);

    if (!existing) {
      // ── Return-family check: transit key reappearing after dormancy ─────
      const priorDormant = dormantByKey.get(key);

      if (priorDormant) {
        // Create a new arc in the same return family, linked via parent_arc_id
        const returnRecurrenceCount = (priorDormant.recurrence_count ?? 1) + 1;
        // Force state to 'returning' (or 'exact' if already at peak orb)
        const returnState: TransitArcRecord['state'] = transit.orb <= 0.5 ? 'exact' : 'returning';
        const returnGapDays = priorDormant.last_active_date
          ? Math.round(
              (new Date(`${snapshot.date}T12:00:00Z`).getTime() -
                new Date(`${priorDormant.last_active_date}T12:00:00Z`).getTime()) /
                86400000,
            )
          : null;

        const returnInserted = await admin
          .from('transit_arcs')
          .insert({
            user_id: userId,
            transit_planet: transit.transitPlanet,
            natal_target: transit.natalPlanet,
            aspect_type: transit.aspect,
            aspect_nature: ['square', 'opposition'].includes(transit.aspect) ? 'hard' : 'flowing',
            first_active_date: snapshot.date,
            exact_dates_json: returnState === 'exact' ? [snapshot.date] : [],
            last_active_date: snapshot.date,
            state: returnState,
            recurrence_count: returnRecurrenceCount,
            parent_arc_id: priorDormant.id,
            peak_orb: transit.orb,
            last_orb: transit.orb,
            last_direction: 'unknown',
            tightest_orb: transit.orb,
            themes_json: [],
            metadata_json: {
              last_seen_date: snapshot.date,
              last_seen_orb: transit.orb,
              source: 'daily-snapshot-reconcile',
              parent_arc_id: priorDormant.id,
              return_gap_days: returnGapDays,
            },
          })
          .select('*')
          .single();

        if (returnInserted.error) return { data: null, error: returnInserted.error };
        createdOrUpdated.push(returnInserted.data);

        await emitTransitArcEvent({
          transit_arc_id: returnInserted.data.id,
          event_type: 'created',
          event_date: snapshot.date,
          payload_json: { state: returnState, orb: transit.orb, transit: key, parent_arc_id: priorDormant.id },
        });
        await emitTransitArcEvent({
          transit_arc_id: returnInserted.data.id,
          event_type: 'returned',
          event_date: snapshot.date,
          payload_json: {
            parent_arc_id: priorDormant.id,
            recurrence_count: returnRecurrenceCount,
            prior_last_active: priorDormant.last_active_date,
            return_gap_days: returnGapDays,
            orb: transit.orb,
          },
        });
        if (returnState === 'exact') {
          await emitTransitArcEvent({
            transit_arc_id: returnInserted.data.id,
            event_type: 'exact_hit',
            event_date: snapshot.date,
            payload_json: { orb: transit.orb, transit: key, first_exact: true },
          });
        }
        continue;
      }

      // ── Fresh arc — no prior dormant family within the return window ──────
      const inserted = await admin
        .from('transit_arcs')
        .insert({
          user_id: userId,
          transit_planet: transit.transitPlanet,
          natal_target: transit.natalPlanet,
          aspect_type: transit.aspect,
          aspect_nature: ['square', 'opposition'].includes(transit.aspect) ? 'hard' : 'flowing',
          first_active_date: snapshot.date,
          exact_dates_json: nextState === 'exact' ? [snapshot.date] : [],
          last_active_date: snapshot.date,
          state: nextState,
          recurrence_count: 1,
          peak_orb: transit.orb,
          last_orb: transit.orb,
          last_direction: lastDirection,
          tightest_orb: transit.orb,
          themes_json: [],
          metadata_json: {
            last_seen_date: snapshot.date,
            last_seen_orb: transit.orb,
            source: 'daily-snapshot-reconcile',
          },
        })
        .select('*')
        .single();

      if (inserted.error) return { data: null, error: inserted.error };
      createdOrUpdated.push(inserted.data);

      // Emit arc lifecycle events
      await emitTransitArcEvent({
        transit_arc_id: inserted.data.id,
        event_type: 'created',
        event_date: snapshot.date,
        payload_json: { state: nextState, orb: transit.orb, transit: key },
      });
      if (nextState === 'exact') {
        await emitTransitArcEvent({
          transit_arc_id: inserted.data.id,
          event_type: 'exact_hit',
          event_date: snapshot.date,
          payload_json: { orb: transit.orb, transit: key, first_exact: true },
        });
      }
      continue;
    }

    const nextExactDates = nextState === 'exact' && !priorExactDates.includes(snapshot.date)
      ? [...priorExactDates, snapshot.date]
      : priorExactDates;

    // existingArcs only contains active-state arcs; recurrence is only incremented
    // in the new return-family arc creation path (dormantByKey branch above).
    const nextRecurrenceCount = existing.recurrence_count;
    const nextTightestOrb = existing.tightest_orb == null
      ? transit.orb
      : Math.min(existing.tightest_orb, transit.orb);

    const updated = await admin
      .from('transit_arcs')
      .update({
        last_active_date: snapshot.date,
        state: nextState,
        recurrence_count: nextRecurrenceCount,
        peak_orb: existing.peak_orb == null ? transit.orb : Math.min(existing.peak_orb, transit.orb),
        last_orb: transit.orb,
        last_direction: lastDirection,
        tightest_orb: nextTightestOrb,
        exact_dates_json: nextExactDates,
        metadata_json: {
          ...(existing.metadata_json ?? {}),
          last_seen_date: snapshot.date,
          last_seen_orb: transit.orb,
          previous_orb: previousOrb,
          source: 'daily-snapshot-reconcile',
        },
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (updated.error) return { data: null, error: updated.error };
    createdOrUpdated.push(updated.data);

    // Emit arc lifecycle events for significant transitions
    const priorState = existing.state;
    if (nextState === 'exact' && !priorExactDates.includes(snapshot.date)) {
      await emitTransitArcEvent({
        transit_arc_id: existing.id,
        event_type: 'exact_hit',
        event_date: snapshot.date,
        payload_json: { orb: transit.orb, transit: key, exact_count: nextExactDates.length },
      });
    }
    if (nextState !== priorState) {
      // 'returned' events are only emitted in the new return-family arc creation
      // path (dormantByKey branch). Existing active arcs always emit 'state_changed'.
      await emitTransitArcEvent({
        transit_arc_id: existing.id,
        event_type: 'state_changed',
        event_date: snapshot.date,
        payload_json: {
          from: priorState,
          to: nextState,
          orb: transit.orb,
          direction: lastDirection,
          recurrence_count: nextRecurrenceCount,
        },
      });
    }
  }

  // ── Close stale arcs with rule-based tombstone summaries ─────────────────
  // Tombstone uses arc.last_active_date (last day truly active) before the update overwrites it.
  const staleArcs = (existingArcs ?? []).filter(
    (arc) => !activeKeySet.has([arc.transit_planet, arc.aspect_type, arc.natal_target].join('|')),
  );

  if (staleArcs.length > 0) {
    for (const arc of staleArcs) {
      const tombstone = buildArcTombstone(arc);
      // last_active_date is intentionally NOT updated here. It must remain the last
      // day the arc was truly seen in a snapshot (set during the active-arc update
      // path). Setting it to snapshot.date would be semantically wrong — the arc was
      // ABSENT from snapshot.date's set, not active on it. Preserving the prior
      // last_active_date also keeps return-family gap_days accurate: the gap is
      // measured from when the transit was last truly active, not the dormant date.
      const { error: staleError } = await admin
        .from('transit_arcs')
        .update({ state: 'dormant', tombstone_summary: tombstone })
        .eq('id', arc.id);

      if (staleError) return { data: null, error: staleError };

      await emitTransitArcEvent({
        transit_arc_id: arc.id,
        event_type: 'closed',
        event_date: snapshot.date,
        payload_json: { reason: 'absent_from_daily_snapshot', tombstone },
      });
    }
    staleCount = staleArcs.length;
  }

  return {
    data: {
      arcs: createdOrUpdated,
      staleCount,
      createdOrUpdatedCount: createdOrUpdated.length,
    },
    error: null,
  };
}

export async function tagLifeSignalToTransitArc(tag: LifeSignalTransitTagRecord) {
  const admin = createAdminClient();
  return admin
    .from('life_signal_transit_tags')
    .upsert(tag, { onConflict: 'life_signal_id,transit_arc_id' })
    .select('*')
    .single();
}

export async function getActiveTransitArcsForSnapshot(params: {
  userId: string;
  snapshot: DailyTransits;
}) {
  const admin = createAdminClient();
  const { userId, snapshot } = params;

  if (snapshot.transits.length === 0) {
    return { data: [], error: null };
  }

  const arcKeys = snapshot.transits.map((transit) => [
    transit.transitPlanet,
    transit.aspect,
    transit.natalPlanet,
  ].join('|'));

  const { data: arcs, error } = await admin
    .from('transit_arcs')
    .select('id, transit_planet, aspect_type, natal_target, state, recurrence_count, last_active_date, exact_dates_json')
    .eq('user_id', userId)
    .in('state', ['approaching', 'exact', 'separating', 'returning']);

  if (error) return { data: null, error };

  return {
    data: (arcs ?? []).filter((arc) =>
      arcKeys.includes([arc.transit_planet, arc.aspect_type, arc.natal_target].join('|')),
    ),
    error: null,
  };
}

export async function tagLifeSignalToActiveTransitArcs(params: {
  userId: string;
  lifeSignalId: string;
  snapshot: DailyTransits;
}) {
  const { userId, lifeSignalId, snapshot } = params;
  const arcResult = await getActiveTransitArcsForSnapshot({ userId, snapshot });
  if (arcResult.error) return { data: null, error: arcResult.error };

  const matchingArcs = arcResult.data ?? [];

  const results = [];
  for (const arc of matchingArcs) {
    const tagged = await tagLifeSignalToTransitArc({
      life_signal_id: lifeSignalId,
      transit_arc_id: arc.id,
      tag_source: 'auto',
      confidence: 1,
    });

    if (tagged.error) return { data: null, error: tagged.error };
    results.push(tagged.data);
  }

  return { data: results, error: null };
}

export async function getRecurringTransitContext(params: {
  userId: string;
  snapshot: DailyTransits;
  currentSignals?: Array<{
    signalKind?: string | null;
    themes?: string[];
    emotions?: string[];
    lifeDomain?: string | null;
  }>;
  excludeLifeSignalId?: string;
  limit?: number;
}) {
  const admin = createAdminClient();
  const { userId, snapshot, currentSignals = [], excludeLifeSignalId, limit = 6 } = params;

  const arcResult = await getActiveTransitArcsForSnapshot({ userId, snapshot });
  if (arcResult.error) return { data: null, error: arcResult.error };

  const arcs = arcResult.data ?? [];
  if (arcs.length === 0) {
    return { data: [], error: null };
  }

  const arcIds = arcs.map((arc) => arc.id);

  let query = admin
    .from('life_signal_transit_tags')
    .select(`
      id,
      transit_arc_id,
      confidence,
      created_at,
      life_signals!inner(
        id,
        user_id,
        signal_timestamp,
        content_text,
        signal_kind,
        themes_json,
        emotions_json,
        entities_json,
        life_domain,
        source,
        source_entry_id
      )
    `)
    .in('transit_arc_id', arcIds)
    .eq('life_signals.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (excludeLifeSignalId) {
    query = query.neq('life_signals.id', excludeLifeSignalId);
  }

  const { data: taggedSignals, error } = await query;
  if (error) return { data: null, error };

  const ranked = (taggedSignals ?? []).map((tag) => {
    const signal = Array.isArray(tag.life_signals) ? tag.life_signals[0] : tag.life_signals;
    const arc = arcs.find((item) => item.id === tag.transit_arc_id);

    const currentThemeSet = new Set(currentSignals.flatMap((item) => item.themes ?? []));
    const currentEmotionSet = new Set(currentSignals.flatMap((item) => item.emotions ?? []));
    const currentKindSet = new Set(currentSignals.map((item) => item.signalKind).filter(Boolean));
    const currentDomainSet = new Set(currentSignals.map((item) => item.lifeDomain).filter(Boolean));

    const themeOverlap = Array.isArray(signal?.themes_json)
      ? signal.themes_json.filter((theme: string) => currentThemeSet.has(theme)).length
      : 0;
    const emotionOverlap = Array.isArray(signal?.emotions_json)
      ? signal.emotions_json.filter((emotion: string) => currentEmotionSet.has(emotion)).length
      : 0;
    const kindOverlap = signal?.signal_kind && currentKindSet.has(signal.signal_kind) ? 1 : 0;
    const domainOverlap = signal?.life_domain && currentDomainSet.has(signal.life_domain) ? 1 : 0;

    const score =
      5 +
      kindOverlap * 3 +
      themeOverlap * 2 +
      emotionOverlap * 2 +
      domainOverlap * 2;

    return {
      arc,
      signal,
      confidence: tag.confidence,
      tagged_at: tag.created_at,
      score,
    };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.tagged_at).getTime() - new Date(a.tagged_at).getTime();
  });

  const deduped = ranked.filter((item, index, all) => {
    const text = item.signal?.content_text?.trim().toLowerCase();
    const kind = item.signal?.signal_kind ?? 'mixed';
    const arcKey = item.arc
      ? [item.arc.transit_planet, item.arc.aspect_type, item.arc.natal_target].join('|')
      : 'no-arc';

    return !all.slice(0, index).some((prior) => {
      const priorText = prior.signal?.content_text?.trim().toLowerCase();
      const priorKind = prior.signal?.signal_kind ?? 'mixed';
      const priorArcKey = prior.arc
        ? [prior.arc.transit_planet, prior.arc.aspect_type, prior.arc.natal_target].join('|')
        : 'no-arc';

      if (!text || !priorText) return false;

      const samePrefix = text.slice(0, 120) === priorText.slice(0, 120);
      const sameKind = kind === priorKind;
      const sameArc = arcKey === priorArcKey;
      const sameSourceEntry = item.signal?.source_entry_id && prior.signal?.source_entry_id && item.signal.source_entry_id === prior.signal.source_entry_id;

      return (samePrefix && sameKind) || (sameArc && sameKind && sameSourceEntry);
    });
  });

  return {
    data: deduped,
    error: null,
  };
}

// ── Retrieval helpers ────────────────────────────────────────────────────────

/**
 * Return all active transit arcs for a user (approaching, exact, separating, returning).
 * Sorted by tightest/last orb — tightest first.
 */
export async function getActiveTransitArcs(userId: string) {
  const admin = createAdminClient();
  return admin
    .from('transit_arcs')
    .select('id, user_id, transit_planet, natal_target, aspect_type, aspect_nature, state, last_direction, tightest_orb, last_orb, peak_orb, first_active_date, last_active_date, exact_dates_json, recurrence_count, themes_json, metadata_json')
    .eq('user_id', userId)
    .in('state', ['approaching', 'exact', 'separating', 'returning'])
    .order('last_orb', { ascending: true });
}

/**
 * Return arcs that were active within the past N days (including dormant ones that recently closed).
 */
export async function getRecentTransitArcHistory(userId: string, lookbackDays: number = 30) {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  return admin
    .from('transit_arcs')
    .select('id, transit_planet, natal_target, aspect_type, aspect_nature, state, last_direction, tightest_orb, last_orb, first_active_date, last_active_date, exact_dates_json, recurrence_count, themes_json, tombstone_summary, metadata_json')
    .eq('user_id', userId)
    .gte('last_active_date', cutoffDate)
    .order('last_active_date', { ascending: false });
}

/**
 * Return life signals linked to a specific arc, most recent first.
 */
export async function getLifeSignalsForArc(transitArcId: string, limit: number = 20) {
  const admin = createAdminClient();
  return admin
    .from('life_signal_transit_tags')
    .select(`
      id,
      transit_arc_id,
      confidence,
      created_at,
      life_signals!inner(
        id,
        user_id,
        signal_timestamp,
        content_text,
        signal_kind,
        themes_json,
        emotions_json,
        entities_json,
        life_domain,
        source
      )
    `)
    .eq('transit_arc_id', transitArcId)
    .order('created_at', { ascending: false })
    .limit(limit);
}

/**
 * Aggregate life signal domains linked to active or recent arcs.
 * Returns a ranked list of life areas with signal counts.
 */
export async function getRecurringDomains(
  userId: string,
  lookbackDays: number = 60,
): Promise<{ data: Array<{ domain: string; signalCount: number; arcCount: number }> | null; error: unknown }> {
  const admin = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);
  const cutoffTs = cutoff.toISOString();

  // Fetch life signals with a domain, linked to any arc, within lookback window
  const { data: signals, error } = await admin
    .from('life_signals')
    .select('id, life_domain, signal_timestamp, life_signal_transit_tags!inner(transit_arc_id)')
    .eq('user_id', userId)
    .not('life_domain', 'is', null)
    .gte('signal_timestamp', cutoffTs)
    .order('signal_timestamp', { ascending: false });

  if (error) return { data: null, error };

  const domainMap = new Map<string, { signalCount: number; arcSet: Set<string> }>();
  for (const signal of signals ?? []) {
    const domain = signal.life_domain as string;
    if (!domainMap.has(domain)) {
      domainMap.set(domain, { signalCount: 0, arcSet: new Set() });
    }
    const entry = domainMap.get(domain)!;
    entry.signalCount += 1;
    const tags = Array.isArray(signal.life_signal_transit_tags)
      ? signal.life_signal_transit_tags
      : [signal.life_signal_transit_tags];
    for (const tag of tags) {
      if (tag?.transit_arc_id) entry.arcSet.add(tag.transit_arc_id);
    }
  }

  const ranked = [...domainMap.entries()]
    .map(([domain, { signalCount, arcSet }]) => ({
      domain,
      signalCount,
      arcCount: arcSet.size,
    }))
    .sort((a, b) => b.signalCount - a.signalCount);

  return { data: ranked, error: null };
}

/**
 * Structured memory context for today: active arcs + recurring domains + recent arc history.
 * This is the retrieval entry-point for product surfaces.
 */
export async function getRelevantTransitMemoryForToday(userId: string): Promise<{
  activeArcs: Awaited<ReturnType<typeof getActiveTransitArcs>>['data'];
  recentArcs: Awaited<ReturnType<typeof getRecentTransitArcHistory>>['data'];
  recurringDomains: Array<{ domain: string; signalCount: number; arcCount: number }>;
  confidence: 'high' | 'medium' | 'low' | 'none';
}> {
  const t0 = Date.now();
  const [activeResult, recentResult, domainsResult] = await Promise.all([
    getActiveTransitArcs(userId),
    getRecentTransitArcHistory(userId, 30),
    getRecurringDomains(userId, 60),
  ]);
  const retrievalMs = Date.now() - t0;
  if (retrievalMs > 500) {
    logWarn('getRelevantTransitMemoryForToday.slow', {
      action: 'getRelevantTransitMemoryForToday',
      userId: userId.slice(0, 8),
      retrievalMs,
    });
  }

  const activeArcs = activeResult.data ?? [];
  const recentArcs = recentResult.data ?? [];
  const recurringDomains = domainsResult.data ?? [];

  const confidence = computeConfidenceTier({
    activeArcsCount: activeArcs.length,
    recurringDomainsCount: recurringDomains.length,
    recentArcsCount: recentArcs.length,
  });

  return {
    activeArcs,
    recentArcs,
    recurringDomains,
    confidence,
  };
}

// ── Trust / safety helpers ─────────────────────────────────────────────────

/**
 * Look up an existing life signal by its extraction anchor
 * (user_id + source_entry_id + source_index).
 * Used to deduplicate signals on journal-entry reruns.
 */
export async function findExistingLifeSignal(
  userId: string,
  sourceEntryId: string,
  sourceIndex: number,
) {
  const admin = createAdminClient();
  return admin
    .from('life_signals')
    .select('id')
    .eq('user_id', userId)
    .eq('source_entry_id', sourceEntryId)
    .eq('source_index', sourceIndex)
    .maybeSingle();
}

/**
 * Mark a transit arc dormant via an admin repair action.
 * Computes a tombstone from current arc state, writes repaired_at + repair_reason,
 * and emits a 'repaired' lifecycle event.
 * Non-destructive: the arc record is preserved; only state + metadata change.
 */
export async function markTransitArcDormant(
  arcId: string,
  reason: string = 'manual repair',
  eventDate: string = new Date().toISOString().slice(0, 10),
) {
  const admin = createAdminClient();

  const { data: arc, error: fetchErr } = await admin
    .from('transit_arcs')
    .select('*')
    .eq('id', arcId)
    .maybeSingle();

  if (fetchErr || !arc) {
    return { data: null, error: fetchErr ?? new Error('arc not found') };
  }

  if (arc.state === 'dormant') {
    return { data: arc, error: null, alreadyDormant: true };
  }

  const tombstone = buildArcTombstone(arc);
  const now = new Date().toISOString();

  const { data: updated, error: updateErr } = await admin
    .from('transit_arcs')
    .update({
      state: 'dormant',
      tombstone_summary: tombstone,
      repaired_at: now,
      repair_reason: reason,
    })
    .eq('id', arcId)
    .select('*')
    .single();

  if (updateErr) return { data: null, error: updateErr };

  await emitTransitArcEvent({
    transit_arc_id: arcId,
    event_type: 'repaired',
    event_date: eventDate,
    payload_json: { reason, prior_state: arc.state, tombstone },
  });

  return { data: updated, error: null };
}

/**
 * Reattach life signals that have no transit-arc tags for a given user.
 * Matches each orphaned signal's active_transits_json against the user's
 * known arcs (any state) and creates missing junction rows.
 *
 * Idempotent: uses upsert on (life_signal_id, transit_arc_id).
 */
export async function reattachOrphanedTagsForUser(userId: string): Promise<{
  processedSignals: number;
  tagsCreated: number;
  errors: string[];
}> {
  const admin = createAdminClient();
  const errors: string[] = [];

  // Load all signals for this user (cap to 500 for safety)
  const { data: allSignals, error: signalErr } = await admin
    .from('life_signals')
    .select('id, active_transits_json')
    .eq('user_id', userId)
    .not('active_transits_json', 'eq', '[]')
    .limit(500);

  if (signalErr) throw signalErr;
  const signals = allSignals ?? [];
  if (signals.length === 0) return { processedSignals: 0, tagsCreated: 0, errors: [] };

  // Find which signals already have at least one tag
  const signalIds = signals.map((s) => s.id);
  const { data: existingTags } = await admin
    .from('life_signal_transit_tags')
    .select('life_signal_id')
    .in('life_signal_id', signalIds);

  const taggedSet = new Set((existingTags ?? []).map((t) => t.life_signal_id));
  const orphaned = signals.filter((s) => !taggedSet.has(s.id));

  if (orphaned.length === 0) return { processedSignals: 0, tagsCreated: 0, errors: [] };

  // Load all arcs for this user; keep most-recent per transit key
  const { data: allArcs } = await admin
    .from('transit_arcs')
    .select('id, transit_planet, aspect_type, natal_target, first_active_date')
    .eq('user_id', userId)
    .order('first_active_date', { ascending: false });

  const arcByKey = new Map<string, string>(); // key -> arcId (most recent first)
  for (const arc of allArcs ?? []) {
    const key = [arc.transit_planet, arc.aspect_type, arc.natal_target].join('|');
    if (!arcByKey.has(key)) arcByKey.set(key, arc.id);
  }

  let tagsCreated = 0;
  for (const signal of orphaned) {
    const transits = Array.isArray(signal.active_transits_json)
      ? (signal.active_transits_json as Array<{ transitPlanet: string; aspect: string; natalPlanet: string }>)
      : [];

    for (const t of transits) {
      const key = [t.transitPlanet, t.aspect, t.natalPlanet].join('|');
      const arcId = arcByKey.get(key);
      if (!arcId) continue;

      const { error } = await admin
        .from('life_signal_transit_tags')
        .upsert(
          { life_signal_id: signal.id, transit_arc_id: arcId, tag_source: 'manual', confidence: 0.5 },
          { onConflict: 'life_signal_id,transit_arc_id' },
        );

      if (error) {
        errors.push(`signal ${signal.id.slice(0, 8)}: ${error.message}`);
      } else {
        tagsCreated++;
      }
    }
  }

  return { processedSignals: orphaned.length, tagsCreated, errors };
}

/**
 * Build a structured recall-audit trail for a single arc:
 *   - arc record
 *   - full lifecycle event history
 *   - life signals linked via junction table
 *   - plain-English basis for why this arc would surface in recall
 *
 * All fields come from stored DB columns — no inference.
 * Intended for operator inspection behind CRON_SECRET; not a public endpoint.
 */
export async function getArcAuditTrail(arcId: string) {
  const admin = createAdminClient();

  const [arcResult, eventsResult, tagsResult] = await Promise.all([
    admin.from('transit_arcs').select('*').eq('id', arcId).maybeSingle(),
    admin
      .from('transit_arc_events')
      .select('id, event_type, event_date, payload_json, created_at')
      .eq('transit_arc_id', arcId)
      .order('created_at', { ascending: true }),
    admin
      .from('life_signal_transit_tags')
      .select(`
        id, tag_source, confidence, created_at,
        life_signals!inner(
          id, signal_kind, themes_json, emotions_json,
          life_domain, signal_timestamp, content_text
        )
      `)
      .eq('transit_arc_id', arcId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const arc = arcResult.data;
  const events = eventsResult.data ?? [];
  const linkedSignals = tagsResult.data ?? [];

  // Build a plain-English explanation of why this arc would appear in recall
  const reasons: string[] = [];
  if (arc) {
    const recurrenceCount = arc.recurrence_count ?? 1;
    if (recurrenceCount > 1) reasons.push(`returning pattern — occurrence ${recurrenceCount}`);
    if (['approaching', 'exact', 'separating', 'returning'].includes(arc.state)) {
      reasons.push(`arc currently active (state: ${arc.state})`);
    }
    const tightest = arc.tightest_orb ?? arc.peak_orb;
    if (tightest != null && tightest <= 0.5) reasons.push('reached exact crossing (orb ≤ 0.5°)');
    const exactHits = events.filter((e) => e.event_type === 'exact_hit').length;
    if (exactHits > 0) reasons.push(`${exactHits} exact crossing(s) recorded in event log`);
    if (linkedSignals.length > 0) reasons.push(`${linkedSignals.length} life signal(s) tagged under this arc`);
    if (arc.parent_arc_id) reasons.push(`linked to prior arc family (parent_arc_id: ${arc.parent_arc_id})`);
  }

  return {
    arc,
    events,
    linkedSignals,
    recallBasis: reasons.length > 0 ? reasons.join('; ') : 'active arc within orb',
    queriedAt: new Date().toISOString(),
  };
}

/**
 * Export all memory-spine data for a single user as a JSON-serializable object.
 * Covers: transit_arcs, transit_arc_events, transit_daily_snapshots,
 *         life_signals, life_signal_transit_tags.
 *
 * Intended for GDPR/user-data-export flows and operator debugging.
 * Must only be called from admin-guarded paths.
 */
export async function getUserMemoryExport(userId: string) {
  const admin = createAdminClient();

  const [arcsQ, snapshotsQ, signalsQ] = await Promise.all([
    admin.from('transit_arcs').select('*').eq('user_id', userId).order('first_active_date'),
    admin.from('transit_daily_snapshots').select('*').eq('user_id', userId).order('snapshot_date'),
    Promise.resolve(listSecureLifeSignals(admin, { userId })),
  ]);

  const arcIds = (arcsQ.data ?? []).map((a) => a.id);
  const signalIds = (signalsQ ?? []).map((s) => s.id);

  const [eventsQ, tagsQ] = await Promise.all([
    arcIds.length > 0
      ? admin
          .from('transit_arc_events')
          .select('*')
          .in('transit_arc_id', arcIds)
          .order('created_at')
      : Promise.resolve({ data: [] }),
    signalIds.length > 0
      ? admin
          .from('life_signal_transit_tags')
          .select('*')
          .in('life_signal_id', signalIds)
          .order('created_at')
      : Promise.resolve({ data: [] }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    userId,
    transit_arcs:            arcsQ.data ?? [],
    transit_arc_events:      eventsQ.data ?? [],
    transit_daily_snapshots: snapshotsQ.data ?? [],
    life_signals:            signalsQ ?? [],
    life_signal_transit_tags: tagsQ.data ?? [],
    counts: {
      transit_arcs:            (arcsQ.data ?? []).length,
      transit_arc_events:      (eventsQ.data ?? []).length,
      transit_daily_snapshots: (snapshotsQ.data ?? []).length,
      life_signals:            (signalsQ ?? []).length,
      life_signal_transit_tags: (tagsQ.data ?? []).length,
    },
  };
}

/**
 * Hard-delete all memory-spine rows for a single user.
 * Cascades:
 *   - transit_arcs → transit_arc_events (on delete cascade in DB)
 *   - transit_arcs → life_signal_transit_tags (on delete cascade in DB)
 *   - life_signals → life_signal_transit_tags (on delete cascade in DB)
 *
 * Safe order: delete transit_arcs first (cascades clean up events + tags),
 * then life_signals (any remaining tags already removed), then snapshots.
 *
 * DESTRUCTIVE. Caller must enforce admin auth + explicit confirmation.
 */
export async function deleteUserMemory(userId: string): Promise<{
  deletedCounts: Record<string, number>;
  errors: string[];
}> {
  const admin = createAdminClient();
  const errors: string[] = [];
  const deletedCounts: Record<string, number> = {};

  // Export counts before deletion for the audit log
  const snapshot = await getUserMemoryExport(userId);

  // Delete transit_arcs (cascades → transit_arc_events + life_signal_transit_tags)
  const { error: arcErr, count: arcCount } = await admin
    .from('transit_arcs')
    .delete({ count: 'exact' })
    .eq('user_id', userId);
  if (arcErr) errors.push(`transit_arcs: ${arcErr.message}`);
  else deletedCounts.transit_arcs = arcCount ?? snapshot.counts.transit_arcs;

  // Delete life_signals (any remaining tags already cascaded above)
  const { error: sigErr, count: sigCount } = await admin
    .from('life_signals')
    .delete({ count: 'exact' })
    .eq('user_id', userId);
  if (sigErr) errors.push(`life_signals: ${sigErr.message}`);
  else deletedCounts.life_signals = sigCount ?? snapshot.counts.life_signals;

  // Delete snapshots
  const { error: snapErr, count: snapCount } = await admin
    .from('transit_daily_snapshots')
    .delete({ count: 'exact' })
    .eq('user_id', userId);
  if (snapErr) errors.push(`transit_daily_snapshots: ${snapErr.message}`);
  else deletedCounts.transit_daily_snapshots = snapCount ?? snapshot.counts.transit_daily_snapshots;

  // Record implied cascade counts from the pre-deletion snapshot
  deletedCounts.transit_arc_events_cascade     = snapshot.counts.transit_arc_events;
  deletedCounts.life_signal_transit_tags_cascade = snapshot.counts.life_signal_transit_tags;

  return { deletedCounts, errors };
}

// ── Operator observability ───────────────────────────────────────────────────

export interface MemorySpineStats {
  arcs: {
    active: number;
    dormant: number;
    total: number;
  };
  signals: {
    last30Days: number;
  };
  recentRuns: MemorySyncRunRecord[];
  queriedAt: string;
}

/**
 * Aggregate spine health stats for operator inspection.
 * Returns arc counts by state bucket, signal volume, and recent sync run records.
 * No user PII — all counts are aggregate.
 */
export async function getMemorySpineStats(): Promise<MemorySpineStats> {
  const admin = createAdminClient();
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const [activeArcsQ, dormantArcsQ, totalArcsQ, signalsQ, runsQ] = await Promise.all([
    admin
      .from('transit_arcs')
      .select('*', { count: 'exact', head: true })
      .in('state', ['approaching', 'exact', 'separating', 'returning']),
    admin
      .from('transit_arcs')
      .select('*', { count: 'exact', head: true })
      .eq('state', 'dormant'),
    admin
      .from('transit_arcs')
      .select('*', { count: 'exact', head: true }),
    admin
      .from('life_signals')
      .select('*', { count: 'exact', head: true })
      .gte('signal_timestamp', since30d.toISOString()),
    admin
      .from('memory_sync_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(7),
  ]);

  return {
    arcs: {
      active: activeArcsQ.count ?? 0,
      dormant: dormantArcsQ.count ?? 0,
      total: totalArcsQ.count ?? 0,
    },
    signals: {
      last30Days: signalsQ.count ?? 0,
    },
    recentRuns: (runsQ.data ?? []) as MemorySyncRunRecord[],
    queriedAt: new Date().toISOString(),
  };
}
