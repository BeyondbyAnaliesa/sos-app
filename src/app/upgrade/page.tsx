import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { getLoginRedirectPath } from '@/lib/auth/redirects';
import { getSubscription, isActive } from '@/lib/subscription';
import { CHARTER_SEAT_LIMIT, getActiveCharterSeatCount, isCharterSoldOut } from '@/lib/charter';
import UpgradePricing from '@/components/UpgradePricing';
import BottomNav from '@/components/BottomNav';
import AppBackLink from '@/components/AppBackLink';
import AeonFloatingButton from '@/components/AeonFloatingButton';

export default async function UpgradePage() {
  const headersList = await headers();
  const isNativeIOS = headersList.get('user-agent')?.includes('SOSNativeIOS') ?? false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(getLoginRedirectPath('/upgrade'));

  const sub = await getSubscription(user.id);
  if (isActive(sub)) redirect('/home');

  const activeCharterSeats = await getActiveCharterSeatCount(createAdminClient());

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <AppBackLink />
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

      <UpgradePricing
        nativeIOS={isNativeIOS}
        charterSoldOut={isCharterSoldOut(activeCharterSeats)}
        charterSeatCount={activeCharterSeats}
        charterSeatLimit={CHARTER_SEAT_LIMIT}
      />

      <div className="mt-8 space-y-3 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
        <p className="opacity-50">
          {isNativeIOS ? (
            <>
              Paid memberships are not available inside this iOS build yet.
              <br />If you were invited, use the private link you received.
            </>
          ) : (
            <>
              Monthly or annual billing. Cancel anytime. Your access continues until the end of the paid period.
              <br />Secure checkout via Stripe. We never store your card details.
            </>
          )}
        </p>
      </div>
      <AeonFloatingButton />
      <BottomNav />
    </main>
  );
}
