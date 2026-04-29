import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

const constructEventMock = vi.fn();
const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({ upsert: upsertMock }));
const logErrorMock = vi.fn();

vi.mock('@/lib/stripe', () => ({
  default: {
    webhooks: {
      constructEvent: constructEventMock,
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  getCanonicalPlanKey: vi.fn((plan: string | null | undefined) => plan ?? null),
  resolvePlanFromPriceId: vi.fn(() => 'member_annual'),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

vi.mock('@/lib/analytics', () => ({
  track: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logError: logErrorMock,
}));

async function loadRoute() {
  vi.resetModules();
  return import('../route');
}

function request(body = '{}', signature: string | null = 'signed') {
  return new Request('https://www.getsos.app/api/stripe/webhook', {
    method: 'POST',
    headers: signature ? { 'stripe-signature': signature } : undefined,
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('/api/stripe/webhook', () => {
  it('rejects requests without a Stripe signature', async () => {
    const { POST } = await loadRoute();

    const response = await POST(request('{}', null));

    expect(response.status).toBe(400);
    expect(await response.text()).toBe('Missing stripe-signature header');
    expect(constructEventMock).not.toHaveBeenCalled();
  });

  it('fails closed when the webhook signing secret is missing', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const { POST } = await loadRoute();

    const response = await POST(request());

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('Webhook is not configured');
    expect(constructEventMock).not.toHaveBeenCalled();
    expect(logErrorMock).toHaveBeenCalledWith(expect.any(Error), { route: '/api/stripe/webhook' });
  });

  it('accepts a valid signed unhandled event without touching subscriptions', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_test',
      type: 'ping',
      data: { object: {} },
    });
    const { POST } = await loadRoute();

    const response = await POST(request('{"id":"evt_test"}', 'signed'));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('OK');
    expect(constructEventMock).toHaveBeenCalledWith('{"id":"evt_test"}', 'signed', 'whsec_test');
    expect(fromMock).not.toHaveBeenCalled();
  });
});
