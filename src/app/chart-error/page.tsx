'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PageState = 'idle' | 'loading' | 'needs-onboarding' | 'error';

export default function ChartErrorPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleRegenerate() {
    setState('loading');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/onboarding/chart', { method: 'PATCH' });
      const json = await res.json();

      if (res.status === 401) {
        router.push('/auth/login');
        return;
      }

      if (res.status === 422 && json.error === 'needs-onboarding') {
        setState('needs-onboarding');
        return;
      }

      if (!res.ok) {
        setState('error');
        setErrorMessage(json.error ?? 'Something went wrong. Try again.');
        return;
      }

      // Chart is valid — head home.
      router.push('/');
    } catch {
      setState('error');
      setErrorMessage('Could not reach the server. Check your connection and try again.');
    }
  }

  // ── Needs onboarding — birth data missing ────────────────────────────────
  if (state === 'needs-onboarding') {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-20 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-lg font-light text-[var(--color-text)]">
          Birth data not found
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">
          Your birth information is not on file. Complete onboarding to generate your chart.
        </p>
        <button
          onClick={() => router.push('/onboarding')}
          className="mt-8 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          Start onboarding
        </button>
      </main>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-20 text-center">
        <div className="mx-auto mb-6 flex items-center justify-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-copper-dim)]/40">
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-copper)] animate-spin" />
            <span className="text-lg text-[var(--color-copper)] animate-pulse">✦</span>
          </div>
        </div>
        <p className="text-sm text-[var(--color-text)]">Regenerating your chart…</p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">This takes a few seconds.</p>
      </main>
    );
  }

  // ── Idle + error (same layout, error message shown below CTA) ───────────
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-20 text-center">
      <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
      <h1 className="text-lg font-light text-[var(--color-text)]">
        Your chart data is incomplete.
      </h1>
      <p className="mt-3 text-sm text-[var(--color-text-muted)]">
        Your birth information is saved. Regenerating takes a few seconds.
      </p>
      <button
        onClick={handleRegenerate}
        className="mt-8 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Regenerate chart
      </button>
      {state === 'error' && errorMessage && (
        <p className="mt-4 text-xs text-[var(--color-text-muted)]">{errorMessage}</p>
      )}
    </main>
  );
}
