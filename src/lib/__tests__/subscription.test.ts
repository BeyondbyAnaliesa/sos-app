import { afterEach, describe, expect, it, vi } from 'vitest';

const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

const ORIGINAL_ENV = { ...process.env };

async function loadSubscriptionModule(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const key of [
    'STRIPE_PRICE_ID_CHARTER',
    'STRIPE_PRICE_ID_STANDARD',
    'STRIPE_PRICE_ID_MEMBER_MONTHLY',
  ]) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
  return import('../subscription');
}

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('subscription access', () => {
  it('treats tester access rows as active even without a Stripe plan', async () => {
    singleMock.mockResolvedValue({
      data: {
        user_id:                'user_tester',
        stripe_customer_id:     null,
        stripe_subscription_id: null,
        price_id:               'tester_access',
        status:                 'active',
      },
      error: null,
    });
    const { getSubscription, isActive } = await loadSubscriptionModule();

    const sub = await getSubscription('user_tester');

    expect(sub).toMatchObject({
      userId:               'user_tester',
      stripeCustomerId:     null,
      stripeSubscriptionId: null,
      stripePriceId:        'tester_access',
      plan:                 null,
      status:               'active',
    });
    expect(isActive(sub)).toBe(true);
  });

  it('resolves current live price_id rows into canonical plans', async () => {
    singleMock.mockResolvedValue({
      data: {
        user_id:                'user_member',
        stripe_customer_id:     'cus_test',
        stripe_subscription_id: 'sub_test',
        price_id:               'price_monthly',
        status:                 'active',
      },
      error: null,
    });
    const { getSubscription } = await loadSubscriptionModule({
      STRIPE_PRICE_ID_MEMBER_MONTHLY: 'price_monthly',
    });

    const sub = await getSubscription('user_member');

    expect(sub).toMatchObject({
      plan:            'member_monthly',
      tier:            'member',
      billingInterval: 'month',
    });
  });
});
