export const runtime = 'nodejs';

/**
 * /api/astrology/memory-repair
 *
 * Operator-only endpoint for arc + signal repair actions.
 *
 * Authentication:
 *   Bearer ${CRON_SECRET}  — same secret used by memory-sync and memory-status.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * POST actions:
 *
 *   mark_arc_dormant
 *     Body: { action: 'mark_arc_dormant', arcId: string, reason?: string, eventDate?: string }
 *     Marks a specific transit arc dormant, computes its tombstone, emits a
 *     'repaired' lifecycle event, and records repaired_at + repair_reason.
 *     Safe on already-dormant arcs (no-op with alreadyDormant: true response).
 *
 *   reattach_orphaned_tags
 *     Body: { action: 'reattach_orphaned_tags', userId: string }
 *     Finds life_signals that have zero transit-arc tags and re-creates the
 *     junction rows by matching active_transits_json against known arcs.
 *     Idempotent (upsert on conflict).
 *
 *   rerun_sync
 *     Body: { action: 'rerun_sync', userId: string, targetDate?: string }
 *     Re-runs ensureDailyTransitMemory for a single user on a specific date.
 *     Equivalent to calling POST /api/astrology/memory-sync with scope=batch,
 *     but cleaner for single-user repair flows.
 *     The hash short-circuit in ensureDailyTransitMemory means this is
 *     idempotent for the same user/date/transit-set combination.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * GET — Recall audit:
 *
 *   GET /api/astrology/memory-repair?arcId=<uuid>
 *   Returns the full lifecycle event trail for an arc, linked life signals,
 *   and a plain-English explanation of why it would surface in recall.
 *   No user PII reaches a public endpoint — this is behind CRON_SECRET.
 *
 * Usage:
 *   # Recall audit
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *        "https://<app>/api/astrology/memory-repair?arcId=<uuid>" | jq
 *
 *   # Mark arc dormant
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        -H "Content-Type: application/json" \
 *        -d '{"action":"mark_arc_dormant","arcId":"<uuid>","reason":"test arc, no longer relevant"}' \
 *        https://<app>/api/astrology/memory-repair | jq
 *
 *   # Reattach orphaned tags
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        -H "Content-Type: application/json" \
 *        -d '{"action":"reattach_orphaned_tags","userId":"<uuid>"}' \
 *        https://<app>/api/astrology/memory-repair | jq
 *
 *   # Rerun sync for one user
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        -H "Content-Type: application/json" \
 *        -d '{"action":"rerun_sync","userId":"<uuid>","targetDate":"2026-04-20"}' \
 *        https://<app>/api/astrology/memory-repair | jq
 */

import { createAdminClient } from '@/lib/supabase/server';
import {
  getArcAuditTrail,
  markTransitArcDormant,
  reattachOrphanedTagsForUser,
} from '@/lib/astrology/memory-store';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { ensureDailyTransitMemory } from '@/lib/astrology/memory-pipeline';
import { logError } from '@/lib/logger';
import { warnIfCronSecretMissing } from '@/lib/env-check';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cronSecret = process.env.CRON_SECRET;
  return !!(cronSecret && bearer === cronSecret);
}

// ── GET — Recall audit ────────────────────────────────────────────────────────

export async function GET(request: Request) {
  warnIfCronSecretMissing('/api/astrology/memory-repair');

  if (!isAuthorized(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const arcId = searchParams.get('arcId');

    if (!arcId) {
      return Response.json(
        { ok: false, error: 'arcId query param is required' },
        { status: 400 },
      );
    }

    const trail = await getArcAuditTrail(arcId);

    if (!trail.arc) {
      return Response.json({ ok: false, error: 'arc not found' }, { status: 404 });
    }

    return Response.json({ ok: true, ...trail });
  } catch (err) {
    logError(err, { route: '/api/astrology/memory-repair', method: 'GET' });
    return new Response('Something went wrong', { status: 500 });
  }
}

// ── POST — Repair actions ─────────────────────────────────────────────────────

export async function POST(request: Request) {
  warnIfCronSecretMissing('/api/astrology/memory-repair');

  if (!isAuthorized(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = typeof body.action === 'string' ? body.action : null;
  if (!action) {
    return Response.json(
      { ok: false, error: 'action is required: mark_arc_dormant | reattach_orphaned_tags | rerun_sync' },
      { status: 400 },
    );
  }

  try {
    // ── mark_arc_dormant ────────────────────────────────────────────────────
    if (action === 'mark_arc_dormant') {
      const arcId = typeof body.arcId === 'string' ? body.arcId.trim() : null;
      if (!arcId) {
        return Response.json({ ok: false, error: 'arcId is required' }, { status: 400 });
      }

      const reason = typeof body.reason === 'string' ? body.reason.trim() : 'manual repair via /api/astrology/memory-repair';
      const eventDate = typeof body.eventDate === 'string' ? body.eventDate : undefined;

      const result = await markTransitArcDormant(arcId, reason, eventDate);

      if (result.error) {
        return Response.json({ ok: false, error: result.error.message }, { status: 422 });
      }

      return Response.json({
        ok: true,
        action: 'mark_arc_dormant',
        arcId,
        alreadyDormant: (result as { alreadyDormant?: boolean }).alreadyDormant ?? false,
        tombstone: result.data?.tombstone_summary ?? null,
      });
    }

    // ── reattach_orphaned_tags ──────────────────────────────────────────────
    if (action === 'reattach_orphaned_tags') {
      const userId = typeof body.userId === 'string' ? body.userId.trim() : null;
      if (!userId) {
        return Response.json({ ok: false, error: 'userId is required' }, { status: 400 });
      }

      const result = await reattachOrphanedTagsForUser(userId);

      return Response.json({
        ok: true,
        action: 'reattach_orphaned_tags',
        userId: userId.slice(0, 8) + '…', // abbreviated for logs
        processedSignals: result.processedSignals,
        tagsCreated: result.tagsCreated,
        errors: result.errors,
      });
    }

    // ── rerun_sync ──────────────────────────────────────────────────────────
    if (action === 'rerun_sync') {
      const userId = typeof body.userId === 'string' ? body.userId.trim() : null;
      if (!userId) {
        return Response.json({ ok: false, error: 'userId is required' }, { status: 400 });
      }

      const targetDateStr = typeof body.targetDate === 'string' ? body.targetDate : null;
      const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
      if (isNaN(targetDate.getTime())) {
        return Response.json({ ok: false, error: 'Invalid targetDate' }, { status: 400 });
      }

      // Load the user's natal chart
      const admin = createAdminClient();
      const { data: chart, error: chartErr } = await admin
        .from('natal_charts')
        .select('user_id, placements_json, angles_json, houses_json, aspects_json, metadata_json')
        .eq('user_id', userId)
        .maybeSingle();

      if (chartErr || !chart) {
        return Response.json(
          { ok: false, error: chartErr?.message ?? 'natal chart not found for this user' },
          { status: 404 },
        );
      }

      const richChart: RichChart = {
        placements: chart.placements_json,
        angles:     chart.angles_json,
        houses:     chart.houses_json ?? [],
        aspects:    chart.aspects_json,
        metadata:   chart.metadata_json,
      };

      const result = await ensureDailyTransitMemory({
        userId,
        richChart,
        date: targetDate,
        source: 'repair',
      });

      return Response.json({
        ok: true,
        action: 'rerun_sync',
        userId: userId.slice(0, 8) + '…',
        targetDate: targetDate.toISOString().slice(0, 10),
        snapshotCreated: result.snapshotCreated,
        snapshotSkipped: result.snapshotSkipped,
        arcsCreatedOrUpdated: result.arcsCreatedOrUpdated,
        staleArcCount: result.staleArcCount,
      });
    }

    return Response.json(
      { ok: false, error: `Unknown action: ${action}. Valid: mark_arc_dormant | reattach_orphaned_tags | rerun_sync` },
      { status: 400 },
    );
  } catch (err) {
    logError(err, { route: '/api/astrology/memory-repair', action });
    return new Response('Something went wrong', { status: 500 });
  }
}
