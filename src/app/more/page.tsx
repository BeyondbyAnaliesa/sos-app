import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getSubscription, isActive, type Subscription } from '@/lib/subscription';
import BottomNav from '@/components/BottomNav';
import AppBackLink from '@/components/AppBackLink';
import AeonFloatingButton from '@/components/AeonFloatingButton';
import ManagePlanButton from '@/components/ManagePlanButton';
import SignOutButton from '@/components/SignOutButton';

const LINKS = [
  {
    href:  '/calendar',
    glyph: '◎',
    title: 'Transit Calendar',
    desc:  '30-day view of what is coming',
    paid:  true,
  },
  {
    href:  '/feedback',
    glyph: '✦',
    title: 'Send Feedback',
    desc:  'Report bugs, share ideas, tell us what needs work',
    paid:  false,
  },
  {
    href:  '/support',
    glyph: '◆',
    title: 'Contact Support',
    desc:  'Get help or send us details',
    paid:  false,
  },
];

export default async function MorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let paid = false;
  let sub: Subscription | null = null;
  if (user) {
    sub = await getSubscription(user.id);
    paid = isActive(sub);
  }

  return (
    <main className="mx-auto w-full max-w-xl animate-[fade-in_0.35s_ease-out] px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <AppBackLink />
      <header className="mb-8 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          More
        </h1>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      <div className="space-y-3">
        <ManagePlanButton
          paid={paid}
          canManagePlan={Boolean(sub?.stripeCustomerId)}
          testerAccess={sub?.stripePriceId === 'tester_access'}
        />
        {LINKS.map((link) => {
          const locked = link.paid && !paid;
          const href = locked ? '/upgrade' : link.href;

          return (
            <Link key={link.href} href={href}>
              <div className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 hover:border-[var(--color-border)]">
                <div>
                  <span className="text-lg text-[var(--color-copper-dim)]">{link.glyph}</span>
                  <span className="ml-3 text-sm text-[var(--color-text)]">{link.title}</span>
                  <p className="mt-0.5 pl-8 text-[11px] text-[var(--color-text-muted)]">{link.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  {locked && (
                    <span className="text-[9px] text-[var(--color-text-muted)] opacity-40">◈</span>
                  )}
                  <span className="text-[var(--color-copper-dim)]">&rarr;</span>
                </div>
              </div>
            </Link>
          );
        })}
        <SignOutButton />
      </div>

      <AeonFloatingButton />
      <BottomNav />
    </main>
  );
}
