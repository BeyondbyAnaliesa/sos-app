'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NatalReadingUpgradeButton({ autoStart = false }: { autoStart?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgradeReading = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/chart', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ forceRegenerateReading: true }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Could not upgrade your natal reading yet.');
        return;
      }

      router.refresh();
    } catch {
      setError('Could not reach SOS to upgrade your natal reading.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!autoStart || loading) return;
    const key = 'sos:natal-reading-auto-upgrade:v2';
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    void upgradeReading();
  }, [autoStart, loading, upgradeReading]);

  return (
    <div className="mb-6 rounded-[16px] border border-[var(--color-electric)]/28 bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(22,20,34,0.94))] px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--color-electric)]">
Expanded natal reading available
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
SOS can expand this into the deeper permanent reference: chart architecture, planets, shadow patterns, relationships, vocation, and shareable chart truths.
      </p>
      <button
        type="button"
        onClick={upgradeReading}
        disabled={loading}
        className="mt-4 rounded-[10px] border border-[var(--color-electric)]/45 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-electric)] hover:border-[var(--color-electric)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? 'Expanding…' : 'Expand natal reading'}
      </button>
      {error && <p className="mt-3 text-xs text-[var(--color-text-muted)]">{error}</p>}
    </div>
  );
}
