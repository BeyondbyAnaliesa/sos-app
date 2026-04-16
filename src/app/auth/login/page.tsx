'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function LoginPage() {
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

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-light tracking-[0.2em] text-white">SOS</h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          Welcome Back
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.15] focus:outline-none"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-base text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.15] focus:outline-none"
        />

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.06] py-3.5 text-sm font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
        >
          {loading ? 'Signing in…' : 'Log In'}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-600">
        New to SOS?{' '}
        <Link href="/auth/signup" className="text-zinc-400 hover:text-zinc-300">
          Create an account
        </Link>
      </p>
    </>
  );
}
