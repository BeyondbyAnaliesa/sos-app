'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError('Unable to log out. Please try again.');
      setLoading(false);
      return;
    }

    router.replace('/auth/login');
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={signOut}
        disabled={loading}
        className="block w-full text-left disabled:opacity-60"
      >
        <div className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 hover:border-[var(--color-border)]">
          <div>
            <span className="text-lg text-[var(--color-copper-dim)]">↧</span>
            <span className="ml-3 text-sm text-[var(--color-text)]">
              {loading ? 'Logging out…' : 'Log Out'}
            </span>
            <p className="mt-0.5 pl-8 text-[11px] text-[var(--color-text-muted)]">
              End this session on this device
            </p>
          </div>
          <span className="text-[var(--color-copper-dim)]">→</span>
        </div>
      </button>
      {error && <p className="mt-2 px-1 text-xs text-[var(--color-electric)]">{error}</p>}
    </div>
  );
}
