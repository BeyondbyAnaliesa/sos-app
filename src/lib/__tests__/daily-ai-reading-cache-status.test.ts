import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';

const limitMock = vi.fn();
const orderMock = vi.fn(() => ({ limit: limitMock }));
const ltMock = vi.fn(() => ({ order: orderMock }));
const eqMock = vi.fn(() => ({ eq: eqMock, lt: ltMock, order: orderMock }));
const selectMock = vi.fn(() => ({ eq: eqMock, lt: ltMock, order: orderMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));
const createAdminClientMock = vi.fn(() => ({ from: fromMock }));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: createAdminClientMock,
}));

const judgment: AstrologyJudgment = {
  date: '2026-05-06',
  foreground: [],
  supporting: [],
  background: [],
  noise: [],
  mainStory: 'Main story',
  practicalDemand: 'Do the thing',
  timing: {
    currentPhase: null,
    exactDate: null,
    peakWindowStart: null,
    peakWindowEnd: null,
    nextWatchDate: null,
    activeTransitCount: 0,
  },
  activatedLifeAreas: [],
  currentSky: {
    status: 'collective-scan-v1',
    summary: 'Collective sky',
    scannedBodies: [],
    events: [],
    limitations: ['Current-sky coverage is bounded.'],
  },
  receipts: [],
};

const chart = {
  placements: [
    {
      key: 'sun',
      label: 'Sun',
      sign: 'Aries',
      degree: 12,
      minute: 0,
      retrograde: false,
      longitude: 12,
    },
  ],
  angles: {
    ascendant: { sign: 'Leo', degree: 8, minute: 0, longitude: 128 },
    midheaven: { sign: 'Taurus', degree: 22, minute: 0, longitude: 52 },
  },
  houses: [],
  aspects: [],
  metadata: null,
};

async function loadModule() {
  vi.resetModules();
  return import('@/lib/daily-ai-reading');
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getDailyAiReadingCacheStatus', () => {
  it('reports expected metadata and tolerates older rows without persisted metadata', async () => {
    const { getDailyAiReadingCacheStatus } = await loadModule();
    limitMock
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [
          {
            reading_date: '2026-05-06',
            memory_hash: 'old-hash',
            prompt_version: 'daily-full-memory-v4',
            generated_at: '2026-05-06T12:00:00.000Z',
          },
        ],
        error: null,
      });

    const status = await getDailyAiReadingCacheStatus({
      userId: 'user-1',
      date: '2026-05-06',
      chart,
      todayTransits: { date: '2026-05-06', transits: [] },
      majorArcs: [],
      guidance: [],
      memory: { report: null, natalReading: null, lifeSignals: [] },
      judgment,
    });

    expect(status.expectedJudgmentMetadata.status).toBe('astrology-judgment-metadata-v1');
    expect(status.latest?.judgmentMetadata).toBeNull();
    expect(status.priorReadingCount).toBe(0);
  });
});
