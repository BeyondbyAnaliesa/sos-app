'use client';

import { useState } from 'react';

export default function TesterAccessForm() {
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setError(null);

    const response = await fetch('/api/access/tester', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ code }),
    });

    const payload = await response.json().catch(() => ({} as { error?: string; redirectTo?: string }));

    if (!response.ok) {
      setError(payload.error ?? 'That code did not work.');
      setState('error');
      return;
    }

    setState('success');
    window.location.href = payload.redirectTo ?? '/';
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="tester-code" className="block text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Access code
        </label>
        <input
          id="tester-code"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Enter your tester code"
          autoComplete="off"
          required
          disabled={state === 'loading' || state === 'success'}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
        />
      </div>

      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={state === 'loading' || state === 'success'}
        className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-40"
      >
        {state === 'loading' ? 'Unlocking…' : state === 'success' ? 'Unlocked' : 'Unlock tester access'}
      </button>
    </form>
  );
}
