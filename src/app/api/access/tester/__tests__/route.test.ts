import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.fn();
const upsertMock = vi.fn();
const fromMock = vi.fn(() => ({ upsert: upsertMock }));
const logErrorMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

vi.mock('@/lib/logger', () => ({
  logError: logErrorMock,
}));

const ORIGINAL_ENV = { ...process.env };

async function loadRoute() {
  vi.resetModules();
  return import('../route');
}

function request(code: string) {
  return new Request('https://www.getsos.app/api/access/tester', {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify({ code }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SOS_TESTER_ACCESS_CODES = 'SOS-TEST-CODE';
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

describe('/api/access/tester', () => {
  it('rejects logged-out users', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const { POST } = await loadRoute();

    const response = await POST(request('SOS-TEST-CODE'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('rejects invalid tester codes', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user_test' } } });
    const { POST } = await loadRoute();

    const response = await POST(request('WRONG'));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'That access code is not valid.' });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('grants tester access without erasing existing Stripe identifiers', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'user_test' } } });
    upsertMock.mockResolvedValue({ error: null });
    const { POST } = await loadRoute();

    const response = await POST(request('SOS-TEST-CODE'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, redirectTo: '/home' });
    expect(fromMock).toHaveBeenCalledWith('subscriptions');
    expect(upsertMock).toHaveBeenCalledWith({
      user_id:    'user_test',
      status:     'active',
      price_id:   'tester_access',
      updated_at: expect.any(String),
    }, { onConflict: 'user_id' });
  });
});
