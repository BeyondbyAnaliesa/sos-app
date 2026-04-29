import { afterEach, describe, expect, it } from 'vitest';
import { isValidTesterAccessCode, testerAccessConfigured } from '../tester-access';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('tester access codes', () => {
  it('reports unconfigured access when no codes are set', () => {
    delete process.env.SOS_TESTER_ACCESS_CODES;

    expect(testerAccessConfigured()).toBe(false);
    expect(isValidTesterAccessCode('anything')).toBe(false);
  });

  it('accepts exact configured codes with whitespace trimmed', () => {
    process.env.SOS_TESTER_ACCESS_CODES = 'alpha, beta-gamma ';

    expect(testerAccessConfigured()).toBe(true);
    expect(isValidTesterAccessCode(' alpha ')).toBe(true);
    expect(isValidTesterAccessCode('beta-gamma')).toBe(true);
    expect(isValidTesterAccessCode('nope')).toBe(false);
  });
});
