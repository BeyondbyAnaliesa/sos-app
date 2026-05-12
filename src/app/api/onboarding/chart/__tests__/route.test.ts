import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUserMock = vi.fn();
const completionCreateMock = vi.fn();
const getSubscriptionMock = vi.fn();
const upsertMocks: Record<string, ReturnType<typeof vi.fn>> = {};
const singleQueue: Array<unknown> = [];
const maybeSingleQueue: Array<unknown> = [];

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
  createAdminClient: vi.fn(() => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(maybeSingleQueue.shift()),
          }),
          single: () => Promise.resolve(singleQueue.shift()),
          maybeSingle: () => Promise.resolve(maybeSingleQueue.shift()),
        }),
      }),
      upsert: upsertMocks[table] ?? (upsertMocks[table] = vi.fn(() => Promise.resolve({ error: null }))),
    }),
  })),
}));

vi.mock('@/lib/subscription', () => ({
  getSubscription: getSubscriptionMock,
  isActive: (sub: { status?: string } | null) => sub?.status === 'active' || sub?.status === 'trialing',
}));

vi.mock('openai', () => {
  function OpenAIMock() {
    return {
      chat: {
        completions: {
          create: completionCreateMock,
        },
      },
    };
  }

  return { default: OpenAIMock };
});

async function loadRoute() {
  vi.resetModules();
  process.env.OPENAI_API_KEY = 'test-key';
  return import('../route');
}

beforeEach(() => {
  vi.clearAllMocks();
  singleQueue.length = 0;
  maybeSingleQueue.length = 0;
  Object.keys(upsertMocks).forEach((key) => delete upsertMocks[key]);
  getUserMock.mockResolvedValue({ data: { user: { id: 'user_123' } } });
  getSubscriptionMock.mockResolvedValue({ status: 'active' });
  completionCreateMock.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ sunReading: 'a', moonReading: 'b', risingReading: 'c', aspectHighlights: 'd', synthesis: 'e' }) } }],
  });
});

afterEach(() => {
  vi.resetModules();
});

describe('PATCH /api/onboarding/chart', () => {
  it('repairs a missing natal reading from an already-valid chart', async () => {
    singleQueue.push({
      data: {
        placements_json: [{ key: 'sun', sign: 'Taurus', degree: 1, minute: 0, longitude: 31, label: 'Sun', retrograde: false }],
        angles_json: {
          ascendant: { sign: 'Leo', degree: 2, minute: 0, longitude: 122 },
          midheaven: { sign: 'Aries', degree: 3, minute: 0, longitude: 3 },
        },
        houses_json: [],
        aspects_json: [],
        metadata_json: {},
      },
    });
    maybeSingleQueue.push({ data: null });

    const { PATCH } = await loadRoute();
    const response = await PATCH(new Request('https://www.getsos.app/api/onboarding/chart', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ regenerateReading: true }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, readingGenerated: true });
    expect(completionCreateMock).toHaveBeenCalledTimes(1);
    expect(upsertMocks['natal_readings']).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user_123',
      prompt_version: 'v2-premium-natal',
    }), { onConflict: 'user_id' });
  });

  it('force-regenerates an existing natal reading for premium prompt upgrades', async () => {
    singleQueue.push({
      data: {
        placements_json: [{ key: 'sun', sign: 'Taurus', degree: 1, minute: 0, longitude: 31, label: 'Sun', retrograde: false }],
        angles_json: {
          ascendant: { sign: 'Leo', degree: 2, minute: 0, longitude: 122 },
          midheaven: { sign: 'Aries', degree: 3, minute: 0, longitude: 3 },
        },
        houses_json: [],
        aspects_json: [],
        metadata_json: {},
      },
    });

    const { PATCH } = await loadRoute();
    const response = await PATCH(new Request('https://www.getsos.app/api/onboarding/chart', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ forceRegenerateReading: true }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, readingGenerated: true });
    expect(completionCreateMock).toHaveBeenCalledTimes(1);
    expect(maybeSingleQueue).toHaveLength(0);
    expect(upsertMocks['natal_readings']).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'user_123',
      prompt_version: 'v2-premium-natal',
    }), { onConflict: 'user_id' });
  });

  it('allows existing users to expand older short natal readings without a premium gate', async () => {
    getSubscriptionMock.mockResolvedValue(null);
    singleQueue.push({
      data: {
        placements_json: [{ key: 'sun', sign: 'Taurus', degree: 1, minute: 0, longitude: 31, label: 'Sun', retrograde: false }],
        angles_json: {
          ascendant: { sign: 'Leo', degree: 2, minute: 0, longitude: 122 },
          midheaven: { sign: 'Aries', degree: 3, minute: 0, longitude: 3 },
        },
        houses_json: [],
        aspects_json: [],
        metadata_json: {},
      },
    });

    const { PATCH } = await loadRoute();
    const response = await PATCH(new Request('https://www.getsos.app/api/onboarding/chart', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ forceRegenerateReading: true }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, readingGenerated: true });
    expect(completionCreateMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the old chart-error fast path when no reading regeneration is requested', async () => {
    singleQueue.push({
      data: {
        placements_json: [{ key: 'sun' }],
        angles_json: { ascendant: { sign: 'Leo', degree: 2, minute: 0, longitude: 122 } },
      },
    });

    const { PATCH } = await loadRoute();
    const response = await PATCH(new Request('https://www.getsos.app/api/onboarding/chart', { method: 'PATCH' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, alreadyValid: true });
    expect(completionCreateMock).not.toHaveBeenCalled();
  });
});
