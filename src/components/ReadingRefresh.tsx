'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReadingRefresh({ repairNatalReading = false }: { repairNatalReading?: boolean }) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairError, setRepairError] = useState<string | null>(null);
  const attemptedRepair = useRef(false);

  const repairReading = useCallback(async (manual = false) => {
    if (!repairNatalReading) return;
    if (attemptedRepair.current && !manual) return;

    attemptedRepair.current = true;
    setRepairing(true);
    setRepairError(null);

    try {
      const res = await fetch('/api/onboarding/chart', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ regenerateReading: true }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setRepairError(json.error ?? 'Could not finish your natal reading yet.');
        return;
      }

      setTimedOut(false);
      router.refresh();
    } catch {
      setRepairError('Could not reach the server to finish your natal reading.');
    } finally {
      setRepairing(false);
    }
  }, [repairNatalReading, router]);

  useEffect(() => {
    if (repairNatalReading) {
      void repairReading(false);
    }

    const id = setInterval(() => {
      try {
        router.refresh();
      } catch {
        // ignore
      }
    }, 8000);

    return () => clearInterval(id);
  }, [repairNatalReading, repairReading, router]);

  useEffect(() => {
    if (!repairNatalReading) return;
    const id = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(id);
  }, [repairNatalReading]);

  return (
    <div className="mt-6 space-y-3 text-center">
      <p className="text-xs text-[var(--color-text-muted)] opacity-50">
        Checking automatically every few seconds…
      </p>
      {repairNatalReading && timedOut && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-text-muted)]">
            This is taking longer than usual. I&apos;m trying a direct recovery path now.
          </p>
          <button
            type="button"
            onClick={() => void repairReading(true)}
            disabled={repairing}
            className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {repairing ? 'Retrying…' : 'Retry natal reading'}
          </button>
          {repairError && (
            <p className="text-xs text-[var(--color-text-muted)]">{repairError}</p>
          )}
        </div>
      )}
    </div>
  );
}
