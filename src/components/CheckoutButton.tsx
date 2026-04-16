'use client';

import { useState } from 'react';
import type { PlanKey } from '@/lib/stripe';
import { trackClient } from '@/lib/analytics';

interface Props {
  plan: PlanKey;
  label?: string;
  className?: string;
}

export default function CheckoutButton({ plan, label = 'Get started', className }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    trackClient('checkout_started', { plan });

    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Something went wrong');
      }

      // Redirect to Stripe hosted checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className}
      >
        {loading ? 'Redirecting…' : label}
      </button>
      {error && (
        <p className="mt-2 text-xs text-rose-400">{error}</p>
      )}
    </div>
  );
}
