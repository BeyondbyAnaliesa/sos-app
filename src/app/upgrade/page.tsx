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

  // Already subscribed — redirect home
  if (isActive(sub)) redirect('/');

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="mb-8 flex items-center gap-1.5 py-2 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
      >
        <span>←</span>
        <span>Home</span>
      </Link>

      <header className="mb-10 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-white">
          Unlock SOS
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Your full natal chart. Your transit calendar. The more you tell it, the more it sees you.
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>

      {/* Plan cards */}
      <div className="space-y-4">

        {/* Founding Member — lead card */}
        <div className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.04] px-6 py-6">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
              Founding Member
            </p>
            <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-violet-400">
              Best value
            </span>
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-light text-white">${PLANS.founding_annual.price}</span>
            <span className="text-sm text-zinc-500">/ year</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {PLANS.founding_annual.description}
          </p>

          <ul className="mt-5 space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>Full natal chart — all 10 planets, houses, aspects</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>Transit calendar — 30-day view of what&apos;s coming</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>Daily AI guidance tailored to your chart</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>Unlimited journaling with astrological context</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>Rate locked for life — never increases</span>
            </li>
          </ul>

          <CheckoutButton
            plan="founding_annual"
            label={`Start for $${PLANS.founding_annual.price}/yr`}
            className="mt-6 w-full rounded-xl border border-violet-500/30 bg-violet-500/10 py-4 text-sm font-semibold uppercase tracking-widest text-violet-300 transition-colors hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>

        {/* Standard */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-6">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Member
          </p>
          <p className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-light text-white">${PLANS.standard_annual.price}</span>
            <span className="text-sm text-zinc-500">/ year</span>
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {PLANS.standard_annual.description}
          </p>

          <ul className="mt-5 space-y-2 text-sm text-zinc-500">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-zinc-400">✓</span>
              <span>Everything in Founding Member</span>
            </li>
          </ul>

          <CheckoutButton
            plan="standard_annual"
            label={`Start for $${PLANS.standard_annual.price}/yr`}
            className="mt-6 w-full rounded-xl border border-white/[0.07] bg-white/[0.05] py-4 text-sm font-semibold uppercase tracking-widest text-zinc-400 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
      </div>

      {/* Fine print */}
      <p className="mt-8 text-center text-xs leading-relaxed text-zinc-700">
        Annual billing. Cancel anytime — you keep access until the period ends.
        <br />Secure checkout via Stripe. We never store your card details.
      </p>
    </main>
  );
}
