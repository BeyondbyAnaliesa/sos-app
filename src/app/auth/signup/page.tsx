'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { trackClient } from '@/lib/analytics';

export default function SignupPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const emailRedirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: { onboarding_complete: false },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    trackClient('signup_complete', { method: 'email' });

    window.location.href = '/onboarding';
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-light tracking-[0.3em] text-[var(--color-text)]">SOS</h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Create Your Account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border)] bg-transparent text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] hover:bg-[rgba(142,110,82,0.06)] hover:border-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-[var(--color-copper)] hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
