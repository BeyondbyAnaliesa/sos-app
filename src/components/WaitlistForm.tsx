'use client';

import { FormEvent, useState } from 'react';

type FormState = 'idle' | 'loading' | 'success' | 'error';

export default function WaitlistForm({ className = '' }: { className?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        setState('error');
        setMessage(data.error || 'Something went wrong. Try again.');
        return;
      }

      setState('success');
      setMessage('You are on the list. Charter access opens next.');
      setEmail('');
    } catch {
      setState('error');
      setMessage('Something went wrong. Try again.');
    }
  }

  return (
    <form onSubmit={onSubmit} className={`w-full ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="waitlist-email">
          Email address
        </label>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="h-14 min-w-0 flex-1 rounded-2xl border border-[rgba(247,185,214,0.34)] bg-[rgba(7,7,17,0.68)] px-5 text-sm text-[rgba(247,241,236,0.96)] outline-none placeholder:text-[rgba(233,221,214,0.48)] focus:border-[rgba(247,185,214,0.78)]"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="inline-flex h-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f1c08b,#b9784a_48%,#8f5536)] px-7 text-sm font-bold uppercase tracking-[0.2em] text-[#140c0e] shadow-[0_18px_55px_rgba(201,120,76,0.34)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_70px_rgba(201,120,76,0.42)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === 'loading' ? 'Joining…' : 'Join Waitlist'}
        </button>
      </div>
      {message ? (
        <p
          className={`mt-3 text-sm leading-6 ${
            state === 'success' ? 'text-[rgba(201,162,122,0.96)]' : 'text-[rgba(247,185,214,0.96)]'
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
