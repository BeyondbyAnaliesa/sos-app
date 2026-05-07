import { describe, expect, it } from 'vitest';
import {
  getAspectMeaning,
  getTransitBodyMeaning,
  resolveMeaningFactors,
} from '@/lib/astrology/meaning-kernel';

const bannedPhrases = ['cosmic', 'mystic', 'the stars are aligning', 'magic', 'fated', 'destiny'];

describe('meaning-kernel', () => {
  it('returns deterministic structured factors for the same inputs', () => {
    const first = resolveMeaningFactors({
      transitBody: 'Saturn',
      aspect: 'square',
      natalTargetLabel: 'Moon',
      targetHouse: 10,
      demand: 'restructuring',
      phase: 'building',
      currentSkyEvent: null,
    });
    const second = resolveMeaningFactors({
      transitBody: 'Saturn',
      aspect: 'square',
      natalTargetLabel: 'Moon',
      targetHouse: 10,
      demand: 'restructuring',
      phase: 'building',
      currentSkyEvent: null,
    });

    expect(second).toEqual(first);
    expect(first.defaultDemands).toEqual(expect.arrayContaining(['restructuring', 'pressure', 'clarification']));
    expect(first.combinedFunctions).toEqual(expect.arrayContaining(['reality testing', 'create pressure', 'stabilize the system']));
  });

  it('stays plain and non-poetic', () => {
    const factors = resolveMeaningFactors({
      transitBody: 'Neptune',
      aspect: 'conjunction',
      natalTargetLabel: 'Ascendant',
      targetHouse: 1,
      demand: 'clarification',
      phase: 'exact',
      currentSkyEvent: null,
    });

    const joined = JSON.stringify(factors).toLowerCase();
    for (const bannedPhrase of bannedPhrases) {
      expect(joined).not.toContain(bannedPhrase);
    }
  });

  it('covers tier-1 body and aspect lookups used by the engine', () => {
    expect(getTransitBodyMeaning('Pluto')).toMatchObject({ label: 'Pluto' });
    expect(getTransitBodyMeaning('Ascendant')).toMatchObject({ label: 'Ascendant' });
    expect(getTransitBodyMeaning('southNode')).toMatchObject({ label: 'South Node' });
    expect(getTransitBodyMeaning('IC')).toMatchObject({ label: 'IC' });
    expect(getAspectMeaning('opposition')).toMatchObject({ label: 'Opposition' });
  });
});
