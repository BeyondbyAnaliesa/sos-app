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

  let renewalDate: string | null = null;
  if (sub?.currentPeriodEnd) {
    renewalDate = new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="py-8 text-center">
        <div className="mx-auto mb-8 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />

        <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-copper)]">
          {planName}
        </p>

        <h1 className="mt-4 text-3xl font-light tracking-wide text-[var(--color-text)]">
          You&apos;re in.
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[var(--color-text-muted)]">
          {sub?.plan === 'founding_annual'
            ? 'Your founding rate is locked in for life. This is the price you will pay for as long as SOS exists.'
            : 'Your annual membership is active. Everything is now unlocked.'}
        </p>

        {renewalDate && (
          <p className="mt-3 text-xs text-[var(--color-text-muted)] opacity-50">
            Renews {renewalDate}
          </p>
        )}

        <div className="mt-10 space-y-3">
          {isActive(sub) ? (
            <>
              <Link
                href="/reading"
                className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
              >
                <span>See your full chart</span>
                <span className="text-[var(--color-copper-dim)]">◆</span>
              </Link>
              <Link
                href="/calendar"
                className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
              >
                <span>Open your transit calendar</span>
                <span className="text-[var(--color-copper-dim)]">◇</span>
              </Link>
              <Link
                href="/journal"
                className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
              >
                <span>Write today&apos;s journal</span>
                <span className="text-[var(--color-copper-dim)]">→</span>
              </Link>
            </>
          ) : (
            <Link
              href="/"
              className="flex items-center justify-center rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)]"
            >
              Go to home
            </Link>
          )}
        </div>

        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
        <p className="mt-6 text-xs text-[var(--color-text-muted)] opacity-40">
          A receipt is on its way to your email.
        </p>
      </div>
    </main>
  );
}
