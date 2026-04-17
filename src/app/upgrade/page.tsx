import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSubscription, isActive } from '@/lib/subscription';
import { PLANS } from '@/lib/stripe';
import CheckoutButton from '@/components/CheckoutButton';

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const sub = await getSubscription(user.id);
  if (isActive(sub)) redirect('/');

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="mb-8 flex items-center gap-1.5 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-copper)]"
      >
        <span>←</span>
        <span>Home</span>
      </Link>

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

      {/* Plan cards */}
      <div className="space-y-4">

        {/* Founding Member */}
        <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
              Founding Member
            </p>
            <span className="rounded-[10px] border border-[var(--color-border-subtle)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-copper)]">
              Best value
            </span>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-light text-[var(--color-text)]">${PLANS.founding_annual.price}</span>
            <span className="text-sm text-[var(--color-text-muted)]">/ year</span>
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            {PLANS.founding_annual.description}
          </p>

          <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-muted)]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Full natal chart — all 10 planets, houses, aspects</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Transit calendar — 30-day view of what&apos;s coming</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Daily AI guidance tailored to your chart</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Unlimited journaling with astrological context</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Rate locked for life — never increases</span>
            </li>
          </ul>

          <CheckoutButton
            plan="founding_annual"
            label={`Start for $${PLANS.founding_annual.price}/yr`}
            className="mt-6 h-[52px] w-full rounded-[10px] border border-[var(--color-border)] bg-transparent text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] hover:border-[var(--color-copper)] disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>

        {/* Standard */}
        <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
            Member
          </p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-light text-[var(--color-text)]">${PLANS.standard_annual.price}</span>
            <span className="text-sm text-[var(--color-text-muted)]">/ year</span>
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] opacity-60">
            {PLANS.standard_annual.description}
          </p>

          <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-muted)]">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-[var(--color-text-muted)]">✓</span>
              <span>Everything in Founding Member</span>
            </li>
          </ul>

          <CheckoutButton
            plan="standard_annual"
            label={`Start for $${PLANS.standard_annual.price}/yr`}
            className="mt-6 h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-transparent text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
      </div>

      {/* Fine print */}
      <p className="mt-8 text-center text-xs leading-relaxed text-[var(--color-text-muted)] opacity-50">
        Annual billing. Cancel anytime — you keep access until the period ends.
        <br />Secure checkout via Stripe. We never store your card details.
      </p>
    </main>
  );
}
