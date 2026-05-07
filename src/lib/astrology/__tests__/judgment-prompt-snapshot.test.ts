import { describe, expect, it } from 'vitest';
import { buildAstrologyJudgment } from '@/lib/astrology/judgment';
import { buildAstrologyJudgmentPromptSnapshot } from '@/lib/astrology/judgment-prompt-snapshot';
import type { NatalChart } from '@/lib/astrology/types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';

const chart: NatalChart = {
  placements: [
    { key: 'sun', label: 'Sun', sign: 'Aries', degree: 12, minute: 0, speed: 1, retrograde: false, warning: null, longitude: 12 },
    { key: 'venus', label: 'Venus', sign: 'Libra', degree: 18, minute: 0, speed: 1, retrograde: false, warning: null, longitude: 198 },
  ],
  angles: {
    ascendant: { sign: 'Cancer', degree: 10, minute: 0, longitude: 100 },
    midheaven: { sign: 'Pisces', degree: 5, minute: 0, longitude: 335 },
  },
  houses: [100, 130, 160, 190, 220, 250, 280, 310, 340, 10, 40, 70],
  aspects: [],
  metadata: {
    jdUt: 0,
    timeExact: true,
    coordinates: { latitude: 0, longitude: 0 },
    warnings: { houses: null },
  },
};

const memory: MajorWaveMemoryInput = {
  report: { themes: ['relationships'], chartReading: 'Direct.', lookAhead: 'Watch structure.' },
  natalReading: 'Natal Venus matters here.',
  lifeSignals: [],
};

describe('buildAstrologyJudgmentPromptSnapshot', () => {
  it('preserves compact rarity classification metadata without dumping full historical receipts', () => {
    const judgment = buildAstrologyJudgment({
      date: '2026-02-20',
      chart,
      todayTransits: { date: '2026-02-20', transits: [] },
      majorArcs: [],
      guidance: [],
      memory,
    });

    const snapshot = buildAstrologyJudgmentPromptSnapshot(judgment);
    const aspect = snapshot.currentSky.events.find((event) => event.id === 'aspect:Saturn:conjunction:Neptune');

    expect(aspect?.rarity).toMatchObject({
      status: 'computed',
      assessment: 'computed_recurrence',
      method: 'bidirectional_scan',
    });
    expect(Object.keys(aspect?.rarity ?? {})).not.toContain('comparisonCriteria');
    expect(snapshot.currentSky.events.length).toBeLessThanOrEqual(4);
  });
});
