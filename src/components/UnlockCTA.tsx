'use client';

import Link from 'next/link';

/**
 * Canonical upgrade route for the app.
 * All UnlockCTA instances point here — one source of truth.
 */
export const UPGRADE_ROUTE = '/upgrade';

/**
 * UnlockCTA — shared upgrade call-to-action component.
 *
 * Appears at the bottom of every free-tier thirst-trap surface in the app:
 *   - Transit Room (/transits)
 *   - Daily Reading (/reading/daily)
 *   - Charts / Natal Reading (/reading)
 *   - Aeon / Journal (/journal) when usage is exhausted
 *
 * Points to the canonical upgrade page (/upgrade) — never hardcodes the
 * route; always uses UPGRADE_ROUTE so a future route change is one edit.
 *
 * Marked 'use client' so it can be imported from both server and client
 * component trees (e.g. the journal page which is a client component).
 *
 * Usage:
 *   <UnlockCTA />
 *   <UnlockCTA label="Go deeper with Aeon" />
 */
export default function UnlockCTA({ label = 'Unlock full access' }: { label?: string }) {
  return (
    <Link
      href={UPGRADE_ROUTE}
      className="flex items-center justify-between rounded-[10px] border border-[var(--color-electric)] bg-[var(--color-surface)] px-5 py-4 text-sm text-[var(--color-text)] hover:border-[var(--color-text)]"
    >
      <span>{label}</span>
      <span className="text-[var(--color-electric)]">→</span>
    </Link>
  );
}
