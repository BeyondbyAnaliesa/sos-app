import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';

const completionCreateMock = vi.fn();
const logWarnMock = vi.fn();
const logErrorMock = vi.fn();
const upsertMock = vi.fn();
const tableMock = {
  select: vi.fn(() => tableMock),
  eq: vi.fn(() => tableMock),
  in: vi.fn(),
  upsert: upsertMock,
};
const createAdminClientMock = vi.fn(() => ({ from: vi.fn(() => tableMock) }));

vi.mock('openai', () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: completionCreateMock,
      },
    };
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: createAdminClientMock,
}));

vi.mock('@/lib/logger', () => ({
  logWarn: logWarnMock,
  logError: logErrorMock,
}));

const arcs: MajorTransitArc[] = [
  {
    key: 'saturn-square-sun',
    transit: { transitPlanet: 'Saturn', aspect: 'square', natalPlanet: 'sun', orb: 0.4 },
    startDate: '2026-05-01',
    endDate: '2026-08-01',
    peakDate: '2026-06-15',
    peakOrb: 0.1,
    todayOrb: 0.4,
    phase: 'building',
    activeToday: true,
    daysUntilPeak: 40,
    totalDays: 90,
    visibleDates: ['2026-05-01'],
    exactHits: [{ date: '2026-06-15', orb: 0, kind: 'exact' }],
    stations: [],
    activeRunCount: 1,
    context: {
      targetLabel: 'Sun',
      targetSign: 'Aries',
      targetHouse: 1,
      targetDegree: 12,
      lifeArea: 'identity',
    },
  },
  {
    key: 'jupiter-trine-moon',
    transit: { transitPlanet: 'Jupiter', aspect: 'trine', natalPlanet: 'moon', orb: 0.8 },
    startDate: '2026-05-10',
    endDate: '2026-09-02',
    peakDate: '2026-06-22',
    peakOrb: 0.2,
    todayOrb: 0.8,
    phase: 'building',
    activeToday: true,
    daysUntilPeak: 47,
    totalDays: 115,
    visibleDates: ['2026-05-10'],
    exactHits: [{ date: '2026-06-22', orb: 0, kind: 'exact' }],
    stations: [],
    activeRunCount: 1,
    context: {
      targetLabel: 'Moon',
      targetSign: 'Cancer',
      targetHouse: 4,
      targetDegree: 20,
      lifeArea: 'home',
    },
  },
];

const chart: NatalChart = {
  placements: [
    { key: 'sun', label: 'Sun', sign: 'Aries', degree: 12, minute: 0, retrograde: false, longitude: 12 },
    { key: 'moon', label: 'Moon', sign: 'Cancer', degree: 20, minute: 0, retrograde: false, longitude: 110 },
  ],
  angles: {
    ascendant: { sign: 'Leo', degree: 8, minute: 0, longitude: 128 },
    midheaven: { sign: 'Taurus', degree: 22, minute: 0, longitude: 52 },
  },
  houses: [],
  aspects: [],
  metadata: null,
};

const memory: MajorWaveMemoryInput = { report: null, natalReading: null, lifeSignals: [] };
const judgment: AstrologyJudgment = {
  date: '2026-05-06',
  foreground: [],
  supporting: [],
  background: [],
  noise: [],
  mainStory: 'Main wave',
  practicalDemand: 'Do the thing',
  timing: {
    currentPhase: 'applying',
    exactDate: '2026-06-15',
    peakWindowStart: '2026-05-01',
    peakWindowEnd: '2026-08-01',
    nextWatchDate: '2026-06-15',
    activeTransitCount: 1,
  },
  activatedLifeAreas: ['identity'],
  currentSky: {
    status: 'collective-scan-v1',
    summary: 'Collective sky',
    scannedBodies: [],
    events: [],
    limitations: [],
  },
  receipts: [],
};

const judgmentsByKey = {
  'saturn-square-sun|2026-05-01|2026-08-01|building': judgment,
  'jupiter-trine-moon|2026-05-10|2026-09-02|building': judgment,
};

async function loadModule() {
  vi.resetModules();
  return import('@/lib/major-transit-ai-reading');
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPENAI_API_KEY = 'test-key';
  tableMock.in.mockResolvedValue({ data: [], error: null });
  upsertMock.mockResolvedValue({ error: null });
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe('getOrCreateMajorTransitAiReadings', () => {
  it('changes the hash when the structured judgment changes', async () => {
    const { buildMajorTransitAiReadingMemoryHash } = await loadModule();

    expect(buildMajorTransitAiReadingMemoryHash(arcs[0], memory, judgment)).not.toBe(
      buildMajorTransitAiReadingMemoryHash(arcs[0], memory, { ...judgment, mainStory: 'Different wave' }),
    );
  });

  it('changes the hash when collective bridge facts change inside the judgment snapshot', async () => {
    const { buildMajorTransitAiReadingMemoryHash } = await loadModule();
    const judgmentWithBridge: AstrologyJudgment = {
      ...judgment,
      foreground: [
        {
          id: arcs[0].key,
          tier: 'foreground',
          scope: 'both',
          source: 'major_arc',
          title: 'Saturn square Sun',
          summary: 'Main wave',
          lifeAreas: ['identity'],
          demand: 'restructuring',
          score: 4.4,
          collectiveBridge: {
            collectiveEvent: {
              id: 'aspect:Saturn:conjunction:Neptune',
              kind: 'transit_aspect',
              bodies: ['Saturn', 'Neptune'],
              aspect: 'conjunction',
              tier: 'foreground',
              score: 8.9,
            },
            matchReasons: ['Collective event includes transit body Saturn.'],
            bridgeStrengthScore: 2.4,
            bridgeStrengthTier: 'supporting',
            promoteScopeToBoth: true,
            limitations: ['heuristic'],
          },
          receipts: [],
          supportNotes: [],
        },
      ],
    };

    expect(buildMajorTransitAiReadingMemoryHash(arcs[0], memory, judgmentWithBridge)).not.toBe(
      buildMajorTransitAiReadingMemoryHash(arcs[0], memory, {
        ...judgmentWithBridge,
        foreground: [
          {
            ...judgmentWithBridge.foreground[0],
            collectiveBridge: {
              ...judgmentWithBridge.foreground[0]!.collectiveBridge!,
              bridgeStrengthScore: 2.8,
            },
          },
        ],
      }),
    );
  });

  it('includes compact expected metadata and tolerates rows missing persisted metadata in cache status', async () => {
    const { getMajorTransitAiReadingsCacheStatus } = await loadModule();
    tableMock.in.mockResolvedValueOnce({
      data: [
        {
          arc_key: arcs[0].key,
          lifecycle_start_date: arcs[0].startDate,
          lifecycle_end_date: arcs[0].endDate,
          phase: arcs[0].phase,
          memory_hash: 'old-hash',
          prompt_version: 'major-wave-full-memory-v5',
          generated_at: '2026-05-07T12:00:00.000Z',
        },
      ],
      error: null,
    });

    const [entry] = await getMajorTransitAiReadingsCacheStatus({
      userId: 'user-1',
      arcs: [arcs[0]],
      memory,
      chart,
      judgments: { 'saturn-square-sun|2026-05-01|2026-08-01|building': judgment },
    });

    expect(entry?.expectedJudgmentMetadata.status).toBe('astrology-judgment-metadata-v1');
    expect(entry?.latest?.judgmentMetadata).toBeNull();
  });

  it('retries once for only the missing arcs before returning partial output', async () => {
    const { getOrCreateMajorTransitAiReadings, majorTransitReadingKey } = await loadModule();
    completionCreateMock
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                readings: [
                  {
                    key: majorTransitReadingKey(arcs[0]),
                    headline: 'Hold the line',
                    wave: 'One wave only',
                    whyYou: 'Specific to you',
                    feel: 'Pressurized',
                    use: 'Stay steady',
                    doNotForce: 'Do not rush',
                    aeonQuestion: 'What am I bracing for?',
                  },
                ],
              }),
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                readings: [
                  {
                    key: majorTransitReadingKey(arcs[1]),
                    headline: 'Open the windows',
                    wave: 'Second try lands',
                    whyYou: 'Now it is specific',
                    feel: 'Room to breathe',
                    use: 'Say yes carefully',
                    doNotForce: 'Do not overpromise',
                    aeonQuestion: 'What wants to expand?',
                  },
                ],
              }),
            },
          },
        ],
      });

    const readings = await getOrCreateMajorTransitAiReadings({ userId: 'user-1', arcs, chart, memory, judgments: judgmentsByKey });

    expect(upsertMock.mock.calls[0]?.[0]?.[0]?.judgment_metadata_json?.status).toBe('astrology-judgment-metadata-v1');
    expect(Object.keys(readings).sort()).toEqual([
      majorTransitReadingKey(arcs[0]),
      majorTransitReadingKey(arcs[1]),
    ].sort());
    expect(completionCreateMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).not.toHaveBeenCalled();
  });

  it('logs an explicit partial-generation warning when the retry still omits requested arcs', async () => {
    const { getOrCreateMajorTransitAiReadings, majorTransitReadingKey } = await loadModule();
    completionCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              readings: [
                {
                  key: majorTransitReadingKey(arcs[0]),
                  headline: 'Hold the line',
                  wave: 'One wave only',
                  whyYou: 'Specific to you',
                  feel: 'Pressurized',
                  use: 'Stay steady',
                  doNotForce: 'Do not rush',
                  aeonQuestion: 'What am I bracing for?',
                },
              ],
            }),
          },
        },
      ],
    });

    const readings = await getOrCreateMajorTransitAiReadings({ userId: 'user-1', arcs, chart, memory, judgments: judgmentsByKey });

    expect(Object.keys(readings)).toEqual([majorTransitReadingKey(arcs[0])]);
    expect(completionCreateMock).toHaveBeenCalledTimes(3);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(logWarnMock).toHaveBeenCalledWith(
      'major_transit_reading_partial_generation',
      expect.objectContaining({
        requestedCount: 2,
        generatedCount: 1,
        retried: true,
        missingKeys: [majorTransitReadingKey(arcs[1])],
      }),
    );
  });

  it('throws on partial generation when strict completeness is required', async () => {
    const { getOrCreateMajorTransitAiReadings, majorTransitReadingKey } = await loadModule();
    completionCreateMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              readings: [
                {
                  key: majorTransitReadingKey(arcs[0]),
                  headline: 'Hold the line',
                  wave: 'One wave only',
                  whyYou: 'Specific to you',
                  feel: 'Pressurized',
                  use: 'Stay steady',
                  doNotForce: 'Do not rush',
                  aeonQuestion: 'What am I bracing for?',
                },
              ],
            }),
          },
        },
      ],
    });

    await expect(
      getOrCreateMajorTransitAiReadings({ userId: 'user-1', arcs, chart, memory, onPartial: 'throw', judgments: judgmentsByKey }),
    ).rejects.toThrow('partial output');

    expect(completionCreateMock).toHaveBeenCalledTimes(3);
    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(logErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        route: 'major-transit-ai-reading',
        action: 'partial-generation',
        missingKeys: [majorTransitReadingKey(arcs[1])],
      }),
    );
  });
});
