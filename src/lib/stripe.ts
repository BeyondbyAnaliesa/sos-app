import Stripe from 'stripe';

// Lazily initialised so build-time page collection doesn't fail when env vars aren't present.
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    });
  }
  return _stripe;
}

// Default export is a Proxy so call-sites can use it like a regular Stripe instance
// (e.g. `stripe.checkout.sessions.create(...)`) without explicit initialisation.
const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default stripe;

export type BillingInterval = 'month' | 'year';
export type MembershipTier = 'charter' | 'member';

const LEGACY_PLAN_ALIASES = {
  founding_annual: 'charter_annual',
  standard_annual: 'member_annual',
} as const;

export const PLANS = {
  charter_annual: {
    priceId:         process.env.STRIPE_PRICE_ID_CHARTER ?? '',
    name:            'Charter Access',
    price:           49,
    interval:        'year' as const,
    tier:            'charter' as const,
    description:     'Locked at $49/year while your subscription remains active.',
    checkoutLabel:   '$49/year',
  },
  member_annual: {
    priceId:         process.env.STRIPE_PRICE_ID_STANDARD ?? '',
    name:            'Member',
    price:           99,
    interval:        'year' as const,
    tier:            'member' as const,
    description:     'Full access, billed annually.',
    checkoutLabel:   '$99/year',
  },
  member_monthly: {
    priceId:         process.env.STRIPE_PRICE_ID_MEMBER_MONTHLY ?? '',
    name:            'Member',
    price:           12.99,
    interval:        'month' as const,
    tier:            'member' as const,
    description:     'Full access, billed monthly.',
    checkoutLabel:   '$12.99/month',
  },
} as const;

export type PlanKey = keyof typeof PLANS;
export type LegacyPlanKey = keyof typeof LEGACY_PLAN_ALIASES;

export function isPlanKey(value: string): value is PlanKey {
  return value in PLANS;
}

export function getCanonicalPlanKey(plan: string | null | undefined): PlanKey | null {
  if (!plan) return null;
  if (isPlanKey(plan)) return plan;
  if (plan in LEGACY_PLAN_ALIASES) {
    return LEGACY_PLAN_ALIASES[plan as LegacyPlanKey];
  }
  return null;
}

export function getPlan(plan: string | null | undefined) {
  const canonicalPlan = getCanonicalPlanKey(plan);
  return canonicalPlan ? PLANS[canonicalPlan] : null;
}

export function getBillingIntervalForPlan(plan: string | null | undefined): BillingInterval | null {
  return getPlan(plan)?.interval ?? null;
}

export function getMembershipTierForPlan(plan: string | null | undefined): MembershipTier | null {
  return getPlan(plan)?.tier ?? null;
}

function normalizeInterval(interval: string | null | undefined): BillingInterval {
  return interval === 'month' || interval === 'monthly' ? 'month' : 'year';
}

export function resolveCheckoutPlan(plan: string | null | undefined, interval?: string | null): PlanKey | null {
  const canonicalPlan = getCanonicalPlanKey(plan);
  if (canonicalPlan) return canonicalPlan;

  switch (plan) {
    case 'charter':
    case 'founding':
      return 'charter_annual';
    case 'member':
    case 'standard':
      return normalizeInterval(interval) === 'month' ? 'member_monthly' : 'member_annual';
    default:
      return null;
  }
}

export function resolvePlanFromPriceId(priceId: string | undefined): PlanKey | null {
  if (!priceId) return null;
  for (const [key, plan] of Object.entries(PLANS) as [PlanKey, (typeof PLANS)[PlanKey]][]) {
    if (plan.priceId === priceId) return key;
  }
  return null;
}
