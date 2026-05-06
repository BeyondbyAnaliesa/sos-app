'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ManagePlanButton({
  paid,
  canManagePlan = paid,
  testerAccess = false,
}: {
  paid: boolean;
  canManagePlan?: boolean;
  testerAccess?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Unable to open billing portal.');
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open billing portal.');
    } finally {
      setLoading(false);
    }
  }

  if (!paid) {
    return (
      <Link href="/upgrade">
        <PlanCard title="Membership" desc="View plan options" glyph="◇" />
      </Link>
    );
  }

  if (!canManagePlan) {
    return (
      <PlanCard
        title={testerAccess ? 'Tester Access' : 'Membership Active'}
        desc={testerAccess ? 'Free tester access is active' : 'Your account has active access'}
        glyph="◇"
      />
    );
  }

  return (
    <div>
      <button type="button" onClick={openPortal} disabled={loading} className="block w-full text-left disabled:opacity-60">
        <PlanCard title={loading ? 'Opening…' : 'Manage Plan'} desc="Billing, renewal, and subscription settings" glyph="◇" />
      </button>
      {error && <p className="mt-2 px-1 text-xs text-[var(--color-electric)]">{error}</p>}
    </div>
  );
}

function PlanCard({ title, desc, glyph }: { title: string; desc: string; glyph: string }) {
  return (
    <div className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 hover:border-[var(--color-border)]">
      <div>
        <span className="text-lg text-[var(--color-copper-dim)]">{glyph}</span>
        <span className="ml-3 text-sm text-[var(--color-text)]">{title}</span>
        <p className="mt-0.5 pl-8 text-[11px] text-[var(--color-text-muted)]">{desc}</p>
      </div>
      <span className="text-[var(--color-copper-dim)]">→</span>
    </div>
  );
}
