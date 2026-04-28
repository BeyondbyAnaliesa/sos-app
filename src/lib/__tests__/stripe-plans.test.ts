import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

async function loadStripeModule(env: Record<string, string> = {}) {
  vi.resetModules();

  for (const key of [
    'STRIPE_PRICE_ID_CHARTER',
    'STRIPE_PRICE_ID_STANDARD',
    'STRIPE_PRICE_ID_MEMBER_MONTHLY',
  ]) {
    delete process.env[key];
  }

  Object.assign(process.env, env);
  return import('../stripe');
}

afterEach(() => {
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('stripe plan helpers', () => {
  it('canonicalizes legacy annual member plans', async () => {
    const { getCanonicalPlanKey } = await loadStripeModule();

    expect(getCanonicalPlanKey('founding_annual')).toBe('charter_annual');
    expect(getCanonicalPlanKey('standard_annual')).toBe('member_annual');
  });

  it('resolves member checkout interval to the correct plan key', async () => {
    const { resolveCheckoutPlan } = await loadStripeModule();

    expect(resolveCheckoutPlan('member', 'year')).toBe('member_annual');
    expect(resolveCheckoutPlan('member', 'month')).toBe('member_monthly');
  });

  it('keeps Charter on the annual plan regardless of interval input', async () => {
    const { resolveCheckoutPlan } = await loadStripeModule();

    expect(resolveCheckoutPlan('charter', 'year')).toBe('charter_annual');
    expect(resolveCheckoutPlan('charter', 'month')).toBe('charter_annual');
  });

  it('maps Stripe price IDs back to the monthly and annual member plans', async () => {
    const { resolvePlanFromPriceId } = await loadStripeModule({
      STRIPE_PRICE_ID_CHARTER: 'price_charter',
      STRIPE_PRICE_ID_STANDARD: 'price_member_annual',
      STRIPE_PRICE_ID_MEMBER_MONTHLY: 'price_member_monthly',
    });

    expect(resolvePlanFromPriceId('price_member_annual')).toBe('member_annual');
    expect(resolvePlanFromPriceId('price_member_monthly')).toBe('member_monthly');
    expect(resolvePlanFromPriceId('price_charter')).toBe('charter_annual');
  });

  it('exposes billing interval and tier from the normalized plan key', async () => {
    const { getBillingIntervalForPlan, getMembershipTierForPlan } = await loadStripeModule();

    expect(getBillingIntervalForPlan('member_monthly')).toBe('month');
    expect(getBillingIntervalForPlan('standard_annual')).toBe('year');
    expect(getMembershipTierForPlan('member_annual')).toBe('member');
    expect(getMembershipTierForPlan('charter_annual')).toBe('charter');
  });
});
