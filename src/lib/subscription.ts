import { createAdminClient } from '@/lib/supabase/server';
import {
  getBillingIntervalForPlan,
  getCanonicalPlanKey,
  getMembershipTierForPlan,
  type BillingInterval,
  type MembershipTier,
  resolvePlanFromPriceId,
  type PlanKey,
} from '@/lib/stripe';

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
  plan: PlanKey | null;
  tier: MembershipTier | null;
  billingInterval: BillingInterval | null;
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

  const stripePriceId = data.stripe_price_id ?? data.price_id ?? null;
  const plan = getCanonicalPlanKey(data.plan ?? null) ?? resolvePlanFromPriceId(stripePriceId ?? undefined);

  return {
    userId:               data.user_id,
    stripeCustomerId:     data.stripe_customer_id ?? null,
    stripeSubscriptionId: data.stripe_subscription_id ?? null,
    stripePriceId,
    plan,
    tier:                 getMembershipTierForPlan(plan),
    billingInterval:      getBillingIntervalForPlan(plan),
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
