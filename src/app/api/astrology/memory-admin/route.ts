export const runtime = 'nodejs';

/**
 * /api/astrology/memory-admin
 *
 * Operator-only endpoint for user-memory export and hard deletion.
 *
 * Authentication:
 *   Bearer ${CRON_SECRET}  — same secret used by all admin memory endpoints.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * POST actions:
 *
 *   export_user_memory
 *     Body: { action: 'export_user_memory', userId: string }
 *     Returns a JSON dump of all memory-spine rows for the user:
 *       transit_arcs, transit_arc_events, transit_daily_snapshots,
 *       life_signals, life_signal_transit_tags.
 *     No mutations. Safe to call at any time.
 *
 *   delete_user_memory
 *     Body: { action: 'delete_user_memory', userId: string, confirm: true }
 *     DESTRUCTIVE: hard-deletes all memory-spine rows for the user.
 *     Cascades via existing DB foreign-key rules:
 *       transit_arcs → transit_arc_events (cascade)
 *       transit_arcs → life_signal_transit_tags (cascade)
 *       life_signals → life_signal_transit_tags (cascade)
 *     `confirm: true` is required to prevent accidental deletion.
 *     Returns deleted row counts. Irreversible.
 *
 * Usage:
 *   # Export
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        -H "Content-Type: application/json" \
 *        -d '{"action":"export_user_memory","userId":"<uuid>"}' \
 *        https://<app>/api/astrology/memory-admin | jq > user-export.json
 *
 *   # Delete (irreversible — export first)
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *        -H "Content-Type: application/json" \
 *        -d '{"action":"delete_user_memory","userId":"<uuid>","confirm":true}' \
 *        https://<app>/api/astrology/memory-admin | jq
 */

import { getUserMemoryExport, deleteUserMemory } from '@/lib/astrology/memory-store';
import { logError } from '@/lib/logger';
import { warnIfCronSecretMissing } from '@/lib/env-check';

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const cronSecret = process.env.CRON_SECRET;
  return !!(cronSecret && bearer === cronSecret);
}

export async function POST(request: Request) {
  warnIfCronSecretMissing('/api/astrology/memory-admin');

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
  const userId = typeof body.userId === 'string' ? body.userId.trim() : null;

  if (!action) {
    return Response.json(
      { ok: false, error: 'action is required: export_user_memory | delete_user_memory' },
      { status: 400 },
    );
  }

  if (!userId) {
    return Response.json({ ok: false, error: 'userId is required' }, { status: 400 });
  }

  try {
    // ── export_user_memory ──────────────────────────────────────────────────
    if (action === 'export_user_memory') {
      const exported = await getUserMemoryExport(userId);
      return Response.json({ ok: true, action: 'export_user_memory', ...exported });
    }

    // ── delete_user_memory ──────────────────────────────────────────────────
    if (action === 'delete_user_memory') {
      // Require explicit confirmation to prevent accidental deletions
      if (body.confirm !== true) {
        return Response.json(
          {
            ok: false,
            error: 'confirm: true is required for delete_user_memory. This action is irreversible.',
          },
          { status: 400 },
        );
      }

      const result = await deleteUserMemory(userId);

      return Response.json({
        ok: result.errors.length === 0,
        action: 'delete_user_memory',
        userId: userId.slice(0, 8) + '…', // abbreviated; do not log full UUID to response body
        deletedCounts: result.deletedCounts,
        errors: result.errors,
        note: 'transit_arc_events and life_signal_transit_tags were removed via DB cascade',
      });
    }

    return Response.json(
      { ok: false, error: `Unknown action: ${action}. Valid: export_user_memory | delete_user_memory` },
      { status: 400 },
    );
  } catch (err) {
    logError(err, { route: '/api/astrology/memory-admin', action });
    return new Response('Something went wrong', { status: 500 });
  }
}
