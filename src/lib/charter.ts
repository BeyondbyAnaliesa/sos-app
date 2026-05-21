import { PLANS, type PlanKey } from '@/lib/stripe';
import type { createAdminClient } from '@/lib/supabase/server';

export const CHARTER_SEAT_LIMIT = 100;
export const CHARTER_ACTIVE_STATUSES = ['active', 'trialing'] as const;

type SupabaseAdminClient = ReturnType<typeof createAdminClient>;

export function isCharterPlan(plan: PlanKey | null | undefined): plan is 'charter_annual' {
  return plan === 'charter_annual';
}

export function isCharterSoldOut(activeSeatCount: number, seatLimit = CHARTER_SEAT_LIMIT) {
  return activeSeatCount >= seatLimit;
}

export async function getActiveCharterSeatCount(admin: SupabaseAdminClient): Promise<number> {
  const charterPriceId = PLANS.charter_annual.priceId;
  if (!charterPriceId) {
    throw new Error('STRIPE_PRICE_ID_CHARTER is not configured');
  }

  const { count, error } = await admin
    .from('subscriptions')
    .select('user_id', { count: 'exact', head: true })
    .eq('price_id', charterPriceId)
    .in('status', [...CHARTER_ACTIVE_STATUSES]);

  if (error) {
    throw new Error('Unable to count active Charter subscriptions: ' + error.message);
  }

  return count ?? 0;
}
