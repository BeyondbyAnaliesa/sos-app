'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { validatePasswordReset } from '@/lib/auth/password-validation';

type PageState = 'verifying' | 'ready' | 'submitting' | 'success' | 'expired' | 'error';

export default function ResetPasswordPage() {
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

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setPageState('expired');
          return;
        }
        // Remove the code from the URL so it isn't reused
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Check for an active recovery session (set either from code exchange
      // above or from the hash-based tokens the browser client auto-detects)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setPageState('expired');
        return;
      }

      setPageState('ready');
    } catch {
      setPageState('error');
    }
  }, [supabase]);

  useEffect(() => {
    // Also listen for the PASSWORD_RECOVERY auth event (hash-based flow)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setPageState('ready');
        }
      },
    );

    verifySession();

    return () => subscription.unsubscribe();
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
      const msg = error.message.toLowerCase();
      if (msg.includes('weak') || msg.includes('policy')) {
        setErrorMsg('That password is too weak. Please choose a stronger one.');
      } else if (msg.includes('expired') || msg.includes('invalid')) {
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

        <div className="space-y-4 text-center">
          <p className="text-sm text-[var(--color-text-muted)]">
            Your password has been updated. You can now log in with your new
            password.
          </p>
        </div>

        <div className="mt-8">
          <Link
            href="/auth/login"
            className="block h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-center text-sm font-medium uppercase leading-[52px] tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
          >
            Log In
          </Link>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="New password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={pageState === 'submitting'}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          disabled={pageState === 'submitting'}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
        />

        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}

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
