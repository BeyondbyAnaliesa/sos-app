/**
 * state-text-domains.test.ts
 *
 * Deterministic tests for two pure functions extracted in Stability/QA slice 4:
 *   - buildStateText     (Home page state-text line below LifeWheel)
 *   - describeHiddenDomains (Daily Reading paywall CTA domain list)
 *
 * All tests are fully deterministic: no I/O, no Supabase, no Date.now() calls.
 * Every test asserts exact output or structural guarantees to regression-fence
 * the extraction — any accidental logic change will break a test here.
 */

import { describe, it, expect } from 'vitest';
import { buildStateText, describeHiddenDomains } from '../pure-fns';

// ── Shared fixtures ───────────────────────────────────────────────────────────

const HIGH_ENTRY = {
  intensity: 'high' as const,
  message: 'Mars is activating your career direction. This brings urgency. Do not scatter energy.',
};

const MEDIUM_ENTRY = {
  intensity: 'medium' as const,
  message: 'Jupiter is touching your spirit. Something deeper is trying to reach you. Stay open.',
};

const LOW_ENTRY = {
  intensity: 'low' as const,
  message: 'The pattern here is relatively quiet today.',
};

const STATIC_FALLBACK =
  'The sky is relatively quiet today. Better for noticing than forcing.';

// ── buildStateText ────────────────────────────────────────────────────────────

describe('buildStateText', () => {
  describe('quiet-sky fallback', () => {
    it('empty guidance array → static fallback', () => {
      expect(buildStateText([])).toBe(STATIC_FALLBACK);
    });

    it('all-low intensity → static fallback', () => {
      expect(
        buildStateText([LOW_ENTRY, { ...LOW_ENTRY, message: 'Also quiet.' }]),
      ).toBe(STATIC_FALLBACK);
    });

    it('single low-intensity entry → static fallback', () => {
      expect(buildStateText([LOW_ENTRY])).toBe(STATIC_FALLBACK);
    });
  });

  describe('first-sentence extraction from top entry', () => {
    it('single high-intensity entry → first sentence of message', () => {
      const result = buildStateText([HIGH_ENTRY]);
      expect(result).toBe('Mars is activating your career direction');
    });

    it('single medium-intensity entry → first sentence of message', () => {
      const result = buildStateText([MEDIUM_ENTRY]);
      expect(result).toBe('Jupiter is touching your spirit');
    });

    it('message with no period-space → full message returned', () => {
      const singleSentence = { intensity: 'high' as const, message: 'Something is building.' };
      const result = buildStateText([singleSentence]);
      // No '. ' separator → split returns full string as [0]
      expect(result).toBe('Something is building.');
    });

    it('message with only a period (no space after) → full message returned', () => {
      const noPeriodSpace = { intensity: 'high' as const, message: 'Mercury.Venus.are.active' };
      const result = buildStateText([noPeriodSpace]);
      // '. ' split doesn't match '.V' or '.a' — returns full message
      expect(result).toBe('Mercury.Venus.are.active');
    });
  });

  describe('intensity priority ordering', () => {
    it('high beats low → high entry drives the result', () => {
      const result = buildStateText([LOW_ENTRY, HIGH_ENTRY]);
      expect(result).toBe('Mars is activating your career direction');
    });

    it('high beats medium → high entry drives the result', () => {
      const result = buildStateText([MEDIUM_ENTRY, HIGH_ENTRY]);
      expect(result).toBe('Mars is activating your career direction');
    });

    it('medium beats low → medium entry drives the result', () => {
      const result = buildStateText([LOW_ENTRY, MEDIUM_ENTRY]);
      expect(result).toBe('Jupiter is touching your spirit');
    });

    it('first high entry wins when multiple highs (stable sort order preserved)', () => {
      const high2 = { intensity: 'high' as const, message: 'Saturn is pressing on your home. Slow down. Do not rush.' };
      // HIGH_ENTRY appears first in the input; stable sort keeps it first among equals
      const result = buildStateText([HIGH_ENTRY, high2, LOW_ENTRY]);
      expect(result).toBe('Mars is activating your career direction');
    });
  });

  describe('bad-output guards', () => {
    it('result is never an empty string for any non-empty guidance', () => {
      const cases = [
        [HIGH_ENTRY],
        [MEDIUM_ENTRY],
        [LOW_ENTRY],
        [HIGH_ENTRY, LOW_ENTRY],
        [LOW_ENTRY, MEDIUM_ENTRY, HIGH_ENTRY],
      ];
      for (const guidance of cases) {
        const result = buildStateText(guidance);
        expect(result.length).toBeGreaterThan(0);
      }
    });

    it('result is never an empty string for empty guidance', () => {
      expect(buildStateText([]).length).toBeGreaterThan(0);
    });
  });

  describe('idempotency', () => {
    it('same input always produces same output', () => {
      const guidance = [HIGH_ENTRY, MEDIUM_ENTRY, LOW_ENTRY];
      const r1 = buildStateText(guidance);
      const r2 = buildStateText(guidance);
      expect(r1).toBe(r2);
    });
  });
});

// ── describeHiddenDomains ─────────────────────────────────────────────────────

describe('describeHiddenDomains', () => {
  describe('empty and single-domain cases', () => {
    it('empty array → generic fallback phrase', () => {
      expect(describeHiddenDomains([])).toBe('more of what is moving in your chart');
    });

    it('single known domain → mapped label', () => {
      expect(describeHiddenDomains(['relationships'])).toBe('your love life');
    });

    it('single known domain (career) → label', () => {
      expect(describeHiddenDomains(['career'])).toBe('career');
    });

    it('single unknown domain → raw domain string (defensive fallback)', () => {
      expect(describeHiddenDomains(['some_future_domain'])).toBe('some_future_domain');
    });
  });

  describe('two-domain formatting', () => {
    it('two known domains → "X and Y"', () => {
      expect(describeHiddenDomains(['relationships', 'career'])).toBe('your love life and career');
    });

    it('two domains in different order → "X and Y" matches input order', () => {
      expect(describeHiddenDomains(['career', 'relationships'])).toBe('career and your love life');
    });
  });

  describe('three-domain Oxford-comma formatting', () => {
    it('three known domains → "X, Y, and Z"', () => {
      const result = describeHiddenDomains(['relationships', 'career', 'body']);
      expect(result).toBe('your love life, career, and your body');
    });
  });

  describe('deduplication (Set behaviour)', () => {
    it('duplicate domains → deduplicated to single label', () => {
      expect(describeHiddenDomains(['relationships', 'relationships'])).toBe('your love life');
    });

    it('three identical domains → single label, not fallback', () => {
      const result = describeHiddenDomains(['career', 'career', 'career']);
      expect(result).toBe('career');
    });

    it('two domains that map to same label → deduplicated (only one label)', () => {
      // 'money' → 'finances'; 'money' duplicated — collapses to one
      expect(describeHiddenDomains(['money', 'money'])).toBe('finances');
    });
  });

  describe('cap at 3 unique labels', () => {
    it('four distinct domains → only first 3 unique labels used', () => {
      const result = describeHiddenDomains(['relationships', 'career', 'body', 'mind']);
      // Set preserves insertion order; slice(0,3) → first three
      expect(result).toBe('your love life, career, and your body');
    });

    it('five distinct domains → only first 3', () => {
      const result = describeHiddenDomains(['body', 'mind', 'spirit', 'career', 'home']);
      expect(result).toBe('your body, your inner world, and your spiritual life');
    });
  });

  describe('bad-output guards', () => {
    it('result is never an empty string regardless of input', () => {
      const cases = [
        [],
        ['relationships'],
        ['relationships', 'career'],
        ['relationships', 'career', 'body'],
        ['unknown_domain'],
        ['relationships', 'relationships'],
      ];
      for (const domains of cases) {
        const result = describeHiddenDomains(domains);
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('idempotency', () => {
    it('same input always produces same output', () => {
      const domains = ['relationships', 'career', 'body'];
      expect(describeHiddenDomains(domains)).toBe(describeHiddenDomains(domains));
    });
  });
});
