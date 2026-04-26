import { createAdminClient } from '@/lib/supabase/server';
import { getSubscription, isActive } from '@/lib/subscription';

const MONTHLY_FREE_TURNS = 5;
const ONBOARDING_BONUS_TURNS = 3;

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

export interface AeonUsageStatus {
  paid: boolean;
  monthKey: string;
  firstTouchMonthKey: string | null;
  monthlyTurnsUsed: number;
  onboardingBonusTurnsUsed: number;
  monthlyTurnsRemaining: number;
  onboardingBonusTurnsRemaining: number;
  totalTurnsRemaining: number;
}

export async function getAeonUsageStatus(userId: string): Promise<AeonUsageStatus> {
  const sub = await getSubscription(userId);
  const paid = isActive(sub);
  const monthKey = getMonthKey();

  if (paid) {
    return {
      paid: true,
      monthKey,
      firstTouchMonthKey: null,
      monthlyTurnsUsed: 0,
      onboardingBonusTurnsUsed: 0,
      monthlyTurnsRemaining: Number.POSITIVE_INFINITY,
      onboardingBonusTurnsRemaining: 0,
      totalTurnsRemaining: Number.POSITIVE_INFINITY,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('aeon_usage_monthly')
    .select('month_key, first_touch_month_key, monthly_turns_used, onboarding_bonus_turns_used')
    .eq('user_id', userId)
    .eq('month_key', monthKey)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') {
      return {
        paid: false,
        monthKey,
        firstTouchMonthKey: monthKey,
        monthlyTurnsUsed: 0,
        onboardingBonusTurnsUsed: 0,
        monthlyTurnsRemaining: MONTHLY_FREE_TURNS,
        onboardingBonusTurnsRemaining: ONBOARDING_BONUS_TURNS,
        totalTurnsRemaining: MONTHLY_FREE_TURNS + ONBOARDING_BONUS_TURNS,
      };
    }
    throw error;
  }

  const firstTouchMonthKey = data?.first_touch_month_key ?? monthKey;
  const monthlyTurnsUsed = data?.monthly_turns_used ?? 0;
  const onboardingBonusTurnsUsed = data?.onboarding_bonus_turns_used ?? 0;
  const onboardingBonusTurnsRemaining = firstTouchMonthKey === monthKey
    ? Math.max(0, ONBOARDING_BONUS_TURNS - onboardingBonusTurnsUsed)
    : 0;
  const monthlyTurnsRemaining = Math.max(0, MONTHLY_FREE_TURNS - monthlyTurnsUsed);

  return {
    paid: false,
    monthKey,
    firstTouchMonthKey,
    monthlyTurnsUsed,
    onboardingBonusTurnsUsed,
    monthlyTurnsRemaining,
    onboardingBonusTurnsRemaining,
    totalTurnsRemaining: onboardingBonusTurnsRemaining + monthlyTurnsRemaining,
  };
}

export async function consumeAeonTurn(userId: string): Promise<AeonUsageStatus> {
  const status = await getAeonUsageStatus(userId);
  if (status.paid) return status;

  const admin = createAdminClient();
  const nextBonusUsed = status.onboardingBonusTurnsRemaining > 0
    ? status.onboardingBonusTurnsUsed + 1
    : status.onboardingBonusTurnsUsed;
  const nextMonthlyUsed = status.onboardingBonusTurnsRemaining > 0
    ? status.monthlyTurnsUsed
    : status.monthlyTurnsUsed + 1;

  const { error } = await admin.from('aeon_usage_monthly').upsert({
    user_id: userId,
    month_key: status.monthKey,
    first_touch_month_key: status.firstTouchMonthKey ?? status.monthKey,
    monthly_turns_used: nextMonthlyUsed,
    onboarding_bonus_turns_used: nextBonusUsed,
  }, { onConflict: 'user_id,month_key' });

  if (error) {
    if (error.code === '42P01') return status;
    throw error;
  }

  return getAeonUsageStatus(userId);
}
