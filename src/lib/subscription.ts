import { createAdminClient } from '@/lib/supabase/server';

export type SubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'canceled'
  | 'none';

export interface Subscription {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  plan: string | null;          // 'founding_annual' | 'standard_annual' | null
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;  // ISO datetime
  cancelAtPeriodEnd: boolean;
}

/**
 * Returns the subscription record for a user.
 * Uses service-role to bypass RLS (server-side only).
 */
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;

  return {
    userId:               data.user_id,
    stripeCustomerId:     data.stripe_customer_id ?? null,
    stripeSubscriptionId: data.stripe_subscription_id ?? null,
    stripePriceId:        data.stripe_price_id ?? null,
    plan:                 data.plan ?? null,
    status:               (data.status as SubscriptionStatus) ?? 'none',
    currentPeriodEnd:     data.current_period_end ?? null,
    cancelAtPeriodEnd:    data.cancel_at_period_end ?? false,
  };
}

/** Returns true if the user has an active or trialing subscription. */
export function isActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  return sub.status === 'active' || sub.status === 'trialing';
}
