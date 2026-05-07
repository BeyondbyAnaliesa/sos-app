import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const buildReadingContextMock = vi.fn();
const createAdminClientMock = vi.fn(() => ({ admin: true }));
const logErrorMock = vi.fn();
const warnIfCronSecretMissingMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/transit-reading-context', () => ({
  buildReadingContext: buildReadingContextMock,
}));

vi.mock('@/lib/logger', () => ({
  logError: logErrorMock,
}));

vi.mock('@/lib/env-check', () => ({
  warnIfCronSecretMissing: warnIfCronSecretMissingMock,
}));

async function loadRoute() {
  vi.resetModules();
  return import('../route');
}

function request(path = '') {
  return new Request(`https://www.getsos.app/api/reading/channel-brief-preview${path}`, {
    method: 'GET',
    headers: {
      authorization: 'Bearer test-secret',
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', 'test-secret');
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('GET /api/reading/channel-brief-preview', () => {
  it('rejects unauthorized requests', async () => {
    const { GET } = await loadRoute();
    const response = await GET(new Request('https://www.getsos.app/api/reading/channel-brief-preview'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns the deterministic fixture preview with v1 brief shape', async () => {
    const { GET } = await loadRoute();
    const response = await GET(request('?fixture=internal-demo'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.preview).toMatchObject({
      status: 'astrology-channel-brief-preview-v1',
      mode: 'fixture',
      source: {
        fixtureId: 'internal-demo',
        privacy: 'internal-operator-only',
      },
      channelBrief: {
        status: 'astrology-channel-brief-v1',
      },
    });
    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).not.toContain('the stars are aligning');
    expect(serialized).not.toContain('big shifts');
    expect(body.preview.channelBrief.limitations).toContain(
      'Historical rarity claims remain unavailable unless the engine computes them explicitly.',
    );
    expect(body.laneInputs).toMatchObject({
      status: 'astrology-lane-input-adapter-v1',
      privacy: 'internal-operator-only',
      computedSkyFacts: {
        computed: [
          {
            eventId: expect.any(String),
            recurrence: {
              comparator: expect.any(String),
            },
          },
        ],
        notComputed: expect.any(Array),
      },
      lanes: {
        socials: {
          lane: 'socials',
        },
        substack: {
          lane: 'substack',
        },
        aeonLore: {
          lane: 'aeon_lore',
        },
      },
    });
  });

  it('returns a live-user preview through buildReadingContext without altering public flows', async () => {
    buildReadingContextMock.mockResolvedValue({
      date: '2026-05-07',
      channelBrief: {
        status: 'astrology-channel-brief-v1',
        date: '2026-05-07',
        dominantStory: {
          signalId: 'sig_1',
          title: 'Test signal',
          summary: 'Internal summary only.',
          currentSkySummary: 'Current sky summary.',
          collectiveEventIds: ['collective_1'],
          currentSkyRarity: null,
          scope: 'personal',
        },
        personalRelevance: {
          summary: 'Internal relevance.',
          activatedLifeAreas: ['career'],
          scope: 'personal',
          bridge: null,
        },
        channelRelevance: {
          social: 'Internal social guidance only.',
          substack: 'Internal substack guidance only.',
          aeonLore: 'Internal aeon lore guidance only.',
        },
        timing: {
          currentPhase: 'applying',
          exactDate: null,
          peakWindowStart: null,
          peakWindowEnd: null,
          nextWatchDate: '2026-05-10',
          windowLabel: 'Next watch date is 2026-05-10.',
          urgency: 'active',
        },
        concreteDemand: 'Stay concrete.',
        receipts: [],
        computedSkyFacts: {
          computed: [],
          notComputed: [],
        },
        hookAngles: [],
        limitations: ['This brief is an internal adapter. It is not final public copy.'],
      },
    });

    const { GET } = await loadRoute();
    const response = await GET(request('?userId=user_123&date=2026-05-07'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(buildReadingContextMock).toHaveBeenCalledWith({ admin: true }, 'user_123', new Date('2026-05-07T12:00:00.000Z'));
    expect(body.preview).toMatchObject({
      status: 'astrology-channel-brief-preview-v1',
      mode: 'live_user',
      source: {
        userId: 'user_123',
        date: '2026-05-07',
        privacy: 'internal-operator-only',
      },
      channelBrief: {
        status: 'astrology-channel-brief-v1',
        limitations: ['This brief is an internal adapter. It is not final public copy.'],
      },
    });
    expect(body.laneInputs).toMatchObject({
      status: 'astrology-lane-input-adapter-v1',
      computedSkyFacts: {
        computed: [],
        notComputed: [],
      },
      source: {
        previewStatus: 'astrology-channel-brief-preview-v1',
        mode: 'live_user',
        userId: 'user_123',
      },
      lanes: {
        socials: {
          lane: 'socials',
          requiredReceipts: [],
        },
        substack: {
          lane: 'substack',
        },
        aeonLore: {
          lane: 'aeon_lore',
        },
      },
    });
  });
});
