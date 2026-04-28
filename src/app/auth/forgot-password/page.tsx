'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { buildPasswordResetRedirectUrl, classifyForgotPasswordError } from '@/lib/auth/password-reset-flow';

type State = 'idle' | 'loading' | 'sent' | 'error';

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState('');
  const [state, setState]   = useState<State>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    setErrorMsg(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // redirectTo must be in Supabase Auth → URL Configuration → Redirect URLs allowlist.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildPasswordResetRedirectUrl(window.location.origin),
    });

    if (error) {
      setErrorMsg(classifyForgotPasswordError(error));
      setState('error');
      return;
    }

    setState('sent');
  }

  if (state === 'sent') {
    return (
      <>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-[0.2em] text-[var(--color-text)]">SOS</h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Check Your Inbox
          </p>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            If that email exists, we sent a reset link to{' '}
            <span className="text-[var(--color-text)]">{email}</span>.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            The link expires in 1 hour. Check your spam folder if you don&apos;t
            see it.
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-[var(--color-text-muted)]">
          <Link href="/auth/login" className="text-[var(--color-copper)] hover:underline">
            Back to Log In
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-light tracking-[0.2em] text-[var(--color-text)]">SOS</h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Reset Your Password
        </p>
      </div>

      <p className="mb-6 text-center text-sm text-[var(--color-text-muted)]">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={state === 'error' && errorMsg ? 'forgot-password-error' : undefined}>
        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            aria-invalid={state === 'error' && Boolean(errorMsg)}
            disabled={state === 'loading'}
            className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
          />
        </div>

        {state === 'error' && errorMsg && (
          <p id="forgot-password-error" role="alert" aria-live="assertive" className="text-xs text-red-400">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={state === 'loading'}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-40"
        >
          {state === 'loading' ? 'Sending…' : 'Send Reset Link'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
        <Link href="/auth/login" className="text-[var(--color-copper)] hover:underline">
          Back to Log In
        </Link>
      </p>
    </>
  );
}
