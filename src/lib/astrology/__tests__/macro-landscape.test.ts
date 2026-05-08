import { describe, expect, it } from 'vitest';
import {
  getMacroLandscapeReceipt,
  lookupMacroLandscapeReceipt,
} from '@/lib/astrology/macro-landscape';

describe('macro-landscape', () => {
  it('returns seeded landscape receipts for supported macro topics', () => {
    const receipt = lookupMacroLandscapeReceipt('saturn-neptune-aries');

    expect(receipt).toMatchObject({
      status: 'macro-landscape-v1',
      topicKey: 'saturn-neptune-aries',
      statusLabel: 'emerging',
    });
    expect(receipt?.consensusSummary).toContain('Saturn-Neptune in Aries');
    expect(receipt?.underStudiedAngles).toContain('institutional stamina during high-heat beginnings');
  });

  it('returns an explicit unknown fallback for unmapped topics', () => {
    const receipt = getMacroLandscapeReceipt('unmapped-topic');

    expect(receipt).toMatchObject({
      status: 'macro-landscape-v1',
      topicKey: 'unmapped-topic',
      statusLabel: 'unknown',
    });
    expect(receipt.consensusSummary).toContain('No seeded macro landscape mapping exists');
    expect(receipt.limitations.join(' ')).toContain('safe fallback');
  });
});
