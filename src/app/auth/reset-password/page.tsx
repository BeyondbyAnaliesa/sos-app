'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { validatePasswordReset } from '@/lib/auth/password-validation';
import { classifyPasswordUpdateError, resolveRecoverySessionState } from '@/lib/auth/password-reset-flow';

type PageState = 'verifying' | 'ready' | 'submitting' | 'success' | 'expired' | 'error';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>('verifying');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Detect the recovery session from the URL.
  //
  // Supabase sends a link with:
  //   - PKCE flow:     /auth/reset-password?code=<code>
  //   - Implicit flow: /auth/reset-password#access_token=<token>&type=recovery
  //
  // We handle both. With the @supabase/ssr browser client the hash-based
  // tokens are picked up automatically; the code-based flow needs an explicit
  // exchange call.
  const verifySession = useCallback(async () => {
    try {
      // Handle PKCE code exchange if present
      const params = new URLSearchParams(window.location.search);
      const code   = params.get('code');

      let exchangeError = false;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        exchangeError = Boolean(error);
        if (!error) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      }

      // Check for an active recovery session (set either from code exchange
      // above or from the hash-based tokens the browser client auto-detects)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      setPageState(resolveRecoverySessionState({
        exchangeError,
        sessionError: Boolean(sessionError),
        hasSession: Boolean(session),
      }));
    } catch {
      setPageState('error');
    }
  }, [supabase]);

  useEffect(() => {
    // Also listen for the PASSWORD_RECOVERY auth event (hash-based flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPageState(resolveRecoverySessionState({ authEvent: event, hasSession: true }));
        }
      },
    );

    const verifyTimer = window.setTimeout(() => {
      void verifySession();
    }, 0);

    return () => {
      window.clearTimeout(verifyTimer);
      subscription.unsubscribe();
    };
  }, [verifySession, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const validationError = validatePasswordReset(password, confirm);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setPageState('submitting');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      const errorType = classifyPasswordUpdateError(error.message);
      if (errorType === 'weak') {
        setErrorMsg('That password is too weak. Please choose a stronger one.');
      } else if (errorType === 'expired') {
        setPageState('expired');
        return;
      } else {
        setErrorMsg('Something went wrong. Please try again.');
      }
      setPageState('ready');
      return;
    }

    // Revoke all other sessions so a stolen reset link can't leave
    // a hijacked session alive anywhere.
    await supabase.auth.signOut({ scope: 'others' });

    setPageState('success');
    window.setTimeout(() => {
      router.replace('/');
    }, 1200);
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (pageState === 'verifying') {
    return (
      <div className="text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Verifying your reset link…</p>
      </div>
    );
  }

  if (pageState === 'expired') {
    return (
      <>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-[0.2em] text-[var(--color-text)]">SOS</h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Link Expired
          </p>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            This password reset link has expired or already been used. Reset
            links are valid for 1 hour.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Request a new one and try again.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/auth/forgot-password"
            className="block h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center text-sm font-medium uppercase leading-[52px] tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
          >
            Request New Link
          </Link>
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            <Link href="/auth/login" className="text-[var(--color-copper)] hover:underline">
              Back to Log In
            </Link>
          </p>
        </div>
      </>
    );
  }

  if (pageState === 'error') {
    return (
      <>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-[0.2em] text-[var(--color-text)]">SOS</h1>
        </div>
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          Something went wrong. Please{' '}
          <Link href="/auth/forgot-password" className="text-[var(--color-copper)] hover:underline">
            request a new reset link
          </Link>
          .
        </p>
      </>
    );
  }

  if (pageState === 'success') {
    return (
      <>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-light tracking-[0.2em] text-[var(--color-text)]">SOS</h1>
          <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Password Updated
          </p>
        </div>

        <div className="space-y-4 text-center" aria-live="polite">
          <p className="text-sm text-[var(--color-text-muted)]">
            Your password is updated. Taking you home…
          </p>
        </div>
      </>
    );
  }

  // 'ready' | 'submitting' — show the form
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-light tracking-[0.2em] text-[var(--color-text)]">SOS</h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Choose a New Password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={errorMsg ? 'reset-password-error' : undefined}>
        <div className="space-y-2">
          <label htmlFor="new-password" className="block text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
            aria-invalid={Boolean(errorMsg)}
            disabled={pageState === 'submitting'}
            className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm-password" className="block text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            placeholder="Repeat your new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            aria-invalid={Boolean(errorMsg)}
            disabled={pageState === 'submitting'}
            className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
          />
        </div>

        {errorMsg && <p id="reset-password-error" role="alert" aria-live="assertive" className="text-xs text-red-400">{errorMsg}</p>}

        <button
          type="submit"
          disabled={pageState === 'submitting'}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:opacity-40"
        >
          {pageState === 'submitting' ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </>
  );
}
