import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSubscription, isActive } from '@/lib/subscription';
import UpgradePricing from '@/components/UpgradePricing';
import BottomNav from '@/components/BottomNav';

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const sub = await getSubscription(user.id);
  if (isActive(sub)) redirect('/');

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          Unlock SOS
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          Your full natal chart. Your transit calendar. The more you tell it, the more it sees you.
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      <UpgradePricing />

      <p className="mt-8 text-center text-xs leading-relaxed text-[var(--color-text-muted)] opacity-50">
        Monthly or annual billing. Cancel anytime — you keep access until the period ends.
        <br />Secure checkout via Stripe. We never store your card details.
      </p>
      <BottomNav />
    </main>
  );
}
