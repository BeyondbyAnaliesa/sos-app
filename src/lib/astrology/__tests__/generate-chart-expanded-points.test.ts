import { describe, expect, it } from 'vitest';
import { generateNatalChart } from '@/lib/astrology/generate-chart';

describe('generateNatalChart expanded points v1', () => {
  it('includes natal Chiron and a derived South Node from the true node axis', () => {
    const chart = generateNatalChart({
      year: 1990,
      month: 4,
      day: 18,
      hour: 12,
      minute: 30,
      latitude: 34.0522,
      longitude: -118.2437,
      timeExact: true,
    });

    const chiron = chart.placements.find((placement) => placement.label === 'Chiron');
    const northNode = chart.placements.find((placement) => placement.label === 'North Node');
    const southNode = chart.placements.find((placement) => placement.label === 'South Node');

    expect(chiron).toBeTruthy();
    expect(northNode).toBeTruthy();
    expect(southNode).toBeTruthy();
    expect(Number(((((southNode!.longitude - northNode!.longitude) % 360) + 360) % 360).toFixed(2))).toBe(180);
    expect(southNode?.retrograde).toBe(northNode?.retrograde);
  });
});
