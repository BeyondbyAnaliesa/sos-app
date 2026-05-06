import { describe, expect, it } from 'vitest';
import { buildDailyAiReadingMemoryHash } from '@/lib/daily-ai-reading';

const chart: Parameters<typeof buildDailyAiReadingMemoryHash>[0]['chart'] = {
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

describe('buildDailyAiReadingMemoryHash', () => {
  it('stays stable for the same date even if live todayTransits drift intraday', () => {
    const base = {
      date: '2026-05-06',
      chart,
      majorArcs: [],
      guidance: [],
      memory: { report: null, natalReading: null, lifeSignals: [] },
    } as const;

    const morningHash = buildDailyAiReadingMemoryHash({
      ...base,
      todayTransits: {
        date: '2026-05-06',
        transits: [
          { transitPlanet: 'Moon', aspect: 'square', natalPlanet: 'sun', orb: 0.12 },
          { transitPlanet: 'Mercury', aspect: 'trine', natalPlanet: 'ascendant', orb: 1.4 },
        ],
      },
    });

    const laterHash = buildDailyAiReadingMemoryHash({
      ...base,
      todayTransits: {
        date: '2026-05-06',
        transits: [
          { transitPlanet: 'Moon', aspect: 'trine', natalPlanet: 'sun', orb: 2.91 },
        ],
      },
    });

    expect(laterHash).toBe(morningHash);
  });

  it('still changes when the reading date changes', () => {
    const common = {
      chart,
      todayTransits: { date: '2026-05-06', transits: [] },
      majorArcs: [],
      guidance: [],
      memory: { report: null, natalReading: null, lifeSignals: [] },
    } as const;

    expect(buildDailyAiReadingMemoryHash({ ...common, date: '2026-05-06' })).not.toBe(
      buildDailyAiReadingMemoryHash({ ...common, date: '2026-05-07' }),
    );
  });
});
