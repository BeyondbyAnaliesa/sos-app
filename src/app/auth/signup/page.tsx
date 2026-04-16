'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { onboarding_complete: false },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect to onboarding — middleware handles the routing
    window.location.href = '/onboarding';
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-light tracking-[0.2em] text-white">SOS</h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
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
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.15] focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.15] focus:outline-none"
        />

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.06] py-3 text-xs font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
        >
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-600">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-zinc-400 hover:text-zinc-300">
          Log in
        </Link>
      </p>
    </>
  );
}
