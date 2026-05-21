import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const getUserMock = vi.fn();
const createCustomerMock = vi.fn();
const createCheckoutSessionMock = vi.fn();
const fromMock = vi.fn();
const logErrorMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock,
    },
  })),
  createAdminClient: vi.fn(() => ({
    from: fromMock,
  })),
}));

vi.mock('@/lib/stripe', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stripe')>();
  return {
    ...actual,
    default: {
      customers: {
        create: createCustomerMock,
      },
      checkout: {
        sessions: {
          create: createCheckoutSessionMock,
        },
      },
    },
  };
});

vi.mock('@/lib/logger', () => ({
  logError: logErrorMock,
}));

function request(plan: string, interval?: string) {
  return new Request('https://www.getsos.app/api/stripe/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'https://www.getsos.app',
    },
    body: JSON.stringify({ plan, interval }),
  });
}

function mockAdminQueries(activeCharterSeats: number, existingCustomerId: string | null = 'cus_existing') {
  const countInMock = vi.fn().mockResolvedValue({ count: activeCharterSeats, error: null });
  const countEqMock = vi.fn(() => ({ in: countInMock }));

  const singleMock = vi.fn().mockResolvedValue({
    data: existingCustomerId ? { stripe_customer_id: existingCustomerId } : null,
    error: null,
  });
  const customerEqMock = vi.fn(() => ({ single: singleMock }));

  const upsertMock = vi.fn().mockResolvedValue({ error: null });

  fromMock.mockReturnValue({
    select: vi.fn((column: string, options?: { count?: string; head?: boolean }) => {
      if (column === 'user_id' && options?.count === 'exact') {
        return { eq: countEqMock };
      }

      return { eq: customerEqMock };
    }),
    upsert: upsertMock,
  });
}

async function loadRoute() {
  vi.resetModules();
  process.env.STRIPE_PRICE_ID_CHARTER = 'price_charter';
  process.env.STRIPE_PRICE_ID_STANDARD = 'price_standard';
  process.env.STRIPE_PRICE_ID_MEMBER_MONTHLY = 'price_member_monthly';
  return import('../route');
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserMock.mockResolvedValue({ data: { user: { id: 'user_test', email: 'test@example.com' } } });
  createCustomerMock.mockResolvedValue({ id: 'cus_created' });
  createCheckoutSessionMock.mockResolvedValue({ url: 'https://checkout.stripe.test/session' });
});

afterEach(() => {
  vi.resetModules();
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('/api/stripe/checkout', () => {
  it('blocks unauthenticated checkout', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { POST } = await loadRoute();

    const response = await POST(request('charter_annual'));

    expect(response.status).toBe(401);
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it('allows the 100th Charter checkout while 99 seats are active', async () => {
    mockAdminQueries(99);
    const { POST } = await loadRoute();

    const response = await POST(request('charter_annual'));

    expect(response.status).toBe(200);
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      line_items: [{ price: 'price_charter', quantity: 1 }],
      metadata: expect.objectContaining({
        plan: 'charter_annual',
        interval: 'year',
      }),
      subscription_data: expect.objectContaining({
        metadata: expect.objectContaining({
          plan: 'charter_annual',
          interval: 'year',
        }),
      }),
    }));
  });

  it('blocks the 101st Charter checkout server-side', async () => {
    mockAdminQueries(100);
    const { POST } = await loadRoute();

    const response = await POST(request('charter_annual'));
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toContain('Charter Access is sold out');
    expect(createCheckoutSessionMock).not.toHaveBeenCalled();
  });

  it('does not apply the Charter cap to standard annual or monthly membership', async () => {
    mockAdminQueries(100);
    const { POST } = await loadRoute();

    const annualResponse = await POST(request('member_annual'));
    const monthlyResponse = await POST(request('member', 'month'));

    expect(annualResponse.status).toBe(200);
    expect(monthlyResponse.status).toBe(200);
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{ price: 'price_standard', quantity: 1 }],
    }));
    expect(createCheckoutSessionMock).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [{ price: 'price_member_monthly', quantity: 1 }],
    }));
  });
});
