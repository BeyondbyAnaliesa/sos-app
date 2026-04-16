import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSubscription, isActive } from '@/lib/subscription';
import { PLANS } from '@/lib/stripe';

export default async function SuccessPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const sub = await getSubscription(user.id);
  const planName = sub?.plan ? (PLANS[sub.plan as keyof typeof PLANS]?.name ?? 'Member') : 'Member';

  // Format renewal date if available
  let renewalDate: string | null = null;
  if (sub?.currentPeriodEnd) {
    renewalDate = new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="py-8 text-center">
        <div className="mx-auto mb-8 h-px w-12 bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

        <p className="text-[10px] uppercase tracking-[0.3em] text-violet-400">
          {planName}
        </p>

        <h1 className="mt-4 text-3xl font-light tracking-wide text-white">
          You&apos;re in.
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
          {sub?.plan === 'founding_annual'
            ? 'Your founding rate is locked in for life. This is the price you will pay for as long as SOS exists.'
            : 'Your annual membership is active. Everything is now unlocked.'}
        </p>

        {renewalDate && (
          <p className="mt-3 text-xs text-zinc-600">
            Renews {renewalDate}
          </p>
        )}

        <div className="mt-10 space-y-3">
          {isActive(sub) ? (
            <>
              <Link
                href="/reading"
                className="flex items-center justify-between rounded-xl border border-white/[0.07] px-5 py-4 text-sm text-zinc-300 transition-colors hover:border-white/[0.12] hover:text-white"
              >
                <span>See your full chart</span>
                <span className="text-zinc-600">◆</span>
              </Link>
              <Link
                href="/calendar"
                className="flex items-center justify-between rounded-xl border border-white/[0.07] px-5 py-4 text-sm text-zinc-300 transition-colors hover:border-white/[0.12] hover:text-white"
              >
                <span>Open your transit calendar</span>
                <span className="text-zinc-600">◇</span>
              </Link>
              <Link
                href="/journal"
                className="flex items-center justify-between rounded-xl border border-white/[0.07] px-5 py-4 text-sm text-zinc-300 transition-colors hover:border-white/[0.12] hover:text-white"
              >
                <span>Write today&apos;s journal</span>
                <span className="text-zinc-600">→</span>
              </Link>
            </>
          ) : (
            // Webhook may not have fired yet — show home link
            <Link
              href="/"
              className="flex items-center justify-center rounded-xl border border-white/[0.07] px-5 py-4 text-sm text-zinc-300 transition-colors hover:border-white/[0.12]"
            >
              Go to home
            </Link>
          )}
        </div>

        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <p className="mt-6 text-xs text-zinc-700">
          A receipt is on its way to your email.
        </p>
      </div>
    </main>
  );
}
