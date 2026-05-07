import { describe, expect, it } from 'vitest';
import {
  getAstrologyObject,
  getAstrologyObjectReceiptSummary,
  getFencedAstrologyObjects,
  supportsAstrologySurface,
  supportsCurrentSkyIngress,
  supportsCurrentSkyPairing,
} from '@/lib/astrology/object-inventory';

describe('object-inventory', () => {
  it('classifies normalized expanded objects with bounded support states', () => {
    expect(getAstrologyObject('Chiron')).toMatchObject({
      category: 'asteroid',
      supportLevel: 'supporting',
    });
    expect(getAstrologyObject('southNode')).toMatchObject({
      label: 'South Node',
      category: 'node',
      supportLevel: 'minor',
    });
    expect(getAstrologyObject('descendant')).toMatchObject({
      label: 'Descendant',
      category: 'angle',
    });
    expect(getAstrologyObject('IC')).toMatchObject({
      label: 'IC',
      category: 'angle',
    });
  });

  it('keeps unsupported asteroids explicitly fenced instead of pretending they are live engine objects', () => {
    expect(getAstrologyObject('Ceres')).toMatchObject({
      supportLevel: 'fenced',
      category: 'asteroid',
    });
    expect(supportsAstrologySurface('Ceres', 'transit')).toBe(false);
    expect(supportsAstrologySurface('Juno', 'natal')).toBe(false);
    expect(getFencedAstrologyObjects().map((entry) => entry.label)).toEqual(
      expect.arrayContaining(['Ceres', 'Juno', 'Pallas', 'Vesta']),
    );
  });

  it('applies current-sky guardrails so node-axis and fenced bodies do not flood pairwise rankings', () => {
    expect(supportsCurrentSkyPairing('North Node')).toBe(false);
    expect(supportsCurrentSkyPairing('South Node')).toBe(false);
    expect(supportsCurrentSkyPairing('Ceres')).toBe(false);
    expect(supportsCurrentSkyIngress('North Node')).toBe(true);
    expect(supportsCurrentSkyIngress('South Node')).toBe(false);
  });

  it('builds compact receipt summaries for supported and derived objects', () => {
    expect(getAstrologyObjectReceiptSummary('South Node', 'transit')).toEqual({
      key: 'south-node',
      label: 'South Node',
      category: 'node',
      supportLevel: 'minor',
      rankingWeight: 0.68,
      status: 'derived',
    });
    expect(getAstrologyObjectReceiptSummary('Ascendant', 'natal')).toMatchObject({
      label: 'Ascendant',
      status: 'derived',
    });
  });
});
