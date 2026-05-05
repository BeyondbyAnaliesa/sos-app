'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { trackClient } from '@/lib/analytics';

export default function PublicTesterStartPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function grantTesterAccess(accessCode: string) {
    const response = await fetch('/api/access/tester', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ code: accessCode }),
    });

    const payload = await response.json().catch(() => ({} as { error?: string }));
    if (!response.ok) {
      throw new Error(payload.error ?? 'That tester code did not work.');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setError('Enter your tester access code.');
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const emailRedirectTo = `${window.location.origin}/auth/callback`;

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { onboarding_complete: false, tester_invite: true },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    try {
      await grantTesterAccess(trimmedCode);
    } catch (accessError) {
      setError(accessError instanceof Error ? accessError.message : 'That tester code did not work.');
      setLoading(false);
      return;
    }

    trackClient('signup_complete', { method: 'email', source: 'tester_start' });

    window.location.href = '/onboarding';
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-5 py-10 sm:px-6 sm:py-16">
      <div className="rounded-[28px] border border-[var(--color-border-subtle)] bg-[rgba(12,10,25,0.82)] px-5 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-light tracking-[0.3em] text-[var(--color-text)]">SOS</h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-copper)]">
            Private Tester Access
          </p>
        </div>

        <div className="mb-7 space-y-3 text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
          <p className="text-[var(--color-text)]">
            Start the full SOS experience as an invited tester.
          </p>
          <p>
            Your access code unlocks the app before onboarding, so you get the same full product path a paid member would see: account, birth data, setup questions, first reading, and the logged-in app.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="tester-code" className="block text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Tester access code
            </label>
            <input
              id="tester-code"
              type="text"
              placeholder="Enter your tester code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              required
              disabled={loading}
              className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tester-email" className="block text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Email
            </label>
            <input
              id="tester-email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tester-password" className="block text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              Password
            </label>
            <input
              id="tester-password"
              type="password"
              placeholder="Password (8+ characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
              className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
            />
          </div>

          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-[52px] w-full rounded-[10px] border border-[var(--color-border)] bg-transparent text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] hover:bg-[rgba(142,110,82,0.06)] hover:border-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? 'Creating full-access account…' : 'Start full tester experience'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
          Already have an account?{' '}
          <Link href="/auth/login?next=%2Faccess" className="text-[var(--color-copper)] hover:underline">
            Log in and enter your tester code
          </Link>
        </p>
      </div>
    </main>
  );
}
