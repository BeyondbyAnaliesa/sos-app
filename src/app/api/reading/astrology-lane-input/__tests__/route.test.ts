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
  return new Request(`https://www.getsos.app/api/reading/astrology-lane-input${path}`, {
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

describe('GET /api/reading/astrology-lane-input', () => {
  it('rejects unauthorized requests', async () => {
    const { GET } = await loadRoute();
    const response = await GET(new Request('https://www.getsos.app/api/reading/astrology-lane-input'));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('returns a protected fixture export with all lanes and computed facts preserved', async () => {
    const { GET } = await loadRoute();
    const response = await GET(request('?fixture=internal-demo'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.export).toMatchObject({
      status: 'astrology-lane-input-export-v1',
      privacy: 'internal-operator-only',
      judgmentMetadata: {
        status: 'astrology-judgment-metadata-v1',
      },
      objectInventory: {
        status: 'expanded-object-inventory-v1',
      },
      requestedLane: null,
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

    expect(body.export).not.toHaveProperty('preview');
    expect(body.export).not.toHaveProperty('channelBrief');
    expect(body.export.lanes.socials).not.toHaveProperty('caption');
    expect(body.export.lanes.socials).not.toHaveProperty('script');
    expect(body.export.lanes.socials).not.toHaveProperty('headline');
    expect(body.export.lanes.substack).not.toHaveProperty('body');
    expect(body.export.lanes.aeonLore).not.toHaveProperty('script');
  });

  it('supports lane filtering without dropping computed facts', async () => {
    const { GET } = await loadRoute();
    const response = await GET(request('?fixture=internal-demo&lane=socials'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.export).toMatchObject({
      status: 'astrology-lane-input-export-v1',
      requestedLane: 'socials',
      computedSkyFacts: {
        computed: expect.any(Array),
        notComputed: expect.any(Array),
      },
      lanes: {
        socials: {
          lane: 'socials',
          hookCandidates: expect.any(Array),
        },
      },
    });
    expect(Object.keys(body.export.lanes)).toEqual(['socials']);
  });

  it('returns a live-user export with lane filtering', async () => {
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
          macroBridge: null,
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
        macrocosmBrief: {
          topConfigurationIds: [],
          configurations: [],
          underStudiedAngles: [],
          recurrenceStatus: { computed: [], fenced: [] },
          doNotClaimWarnings: [],
          limitations: [],
        },
        limitations: ['This brief is an internal adapter. It is not final public copy.'],
      },
    });

    const { GET } = await loadRoute();
    const response = await GET(request('?userId=user_123&date=2026-05-07&lane=aeonLore'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(buildReadingContextMock).toHaveBeenCalledWith({ admin: true }, 'user_123', new Date('2026-05-07T12:00:00.000Z'));
    expect(body.export).toMatchObject({
      status: 'astrology-lane-input-export-v1',
      requestedLane: 'aeonLore',
      source: {
        previewStatus: 'astrology-channel-brief-preview-v1',
        mode: 'live_user',
        userId: 'user_123',
      },
      lanes: {
        aeonLore: {
          lane: 'aeon_lore',
          bigSkyOutline: expect.any(Array),
        },
      },
    });
    expect(Object.keys(body.export.lanes)).toEqual(['aeonLore']);
  });

  it('rejects invalid lane filters', async () => {
    const { GET } = await loadRoute();
    const response = await GET(request('?fixture=internal-demo&lane=publicCopy'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Use lane=socials, lane=substack, or lane=aeonLore.' });
  });
});
