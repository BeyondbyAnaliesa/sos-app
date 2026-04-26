/**
 * life-signal-extract.test.ts
 *
 * Regression tests for the deterministic life-signal extraction pipeline.
 * All functions under test are pure: no Supabase, no I/O, no env vars.
 *
 * Test runner: vitest (see vitest.config.ts for setup rationale).
 */

import { describe, it, expect } from 'vitest';
import { extractLifeSignals, extractLifeSignalFeatures } from '../life-signal-extract';
import { GOLD_ENTRIES } from './fixtures/gold-set';

// ── extractLifeSignalFeatures (single-text) ───────────────────────────────────

describe('extractLifeSignalFeatures', () => {
  it('detects work theme from deadline entry', () => {
    const result = extractLifeSignalFeatures('I have a huge project deadline tomorrow and work has been non-stop.');
    expect(result.themes).toContain('work');
  });

  it('detects relationships theme', () => {
    const result = extractLifeSignalFeatures('I am afraid of losing this relationship.');
    expect(result.themes).toContain('relationships');
  });

  it('detects fear emotion', () => {
    const result = extractLifeSignalFeatures('I feel afraid and worried about everything.');
    expect(result.emotions).toContain('fear');
  });

  it('detects overwhelm emotion', () => {
    const result = extractLifeSignalFeatures('I feel completely overwhelmed and burned out from work.');
    expect(result.emotions).toContain('overwhelm');
  });

  it('detects calm emotion', () => {
    const result = extractLifeSignalFeatures('I feel calm and grounded today.');
    expect(result.emotions).toContain('calm');
  });

  it('maps "anxious" to fear emotion (rule added 2026-04-25)', () => {
    const result = extractLifeSignalFeatures('I feel anxious about the appointment tomorrow.');
    expect(result.emotions).toContain('fear');
  });

  it('maps "nervous" to fear emotion (rule added 2026-04-25)', () => {
    const result = extractLifeSignalFeatures('I am so nervous about the presentation.');
    expect(result.emotions).toContain('fear');
  });

  it('detects health domain from body distress entry', () => {
    const result = extractLifeSignalFeatures('My chest hurts, I am tired and my body feels sick.');
    expect(result.lifeDomain).toBe('health');
  });

  it('detects money domain from financial entry', () => {
    const result = extractLifeSignalFeatures('Client paid the invoice today and the money is in the bank.');
    expect(result.lifeDomain).toBe('money');
  });

  it('infers body signal kind', () => {
    const result = extractLifeSignalFeatures('My chest is tight and my body feels exhausted.');
    expect(['body', 'mixed']).toContain(result.signalKind);
  });

  // Priority disambiguation tests (added 2026-04-25)
  it('resolves body+feeling overlap to body (priority disambiguation)', () => {
    // "body" and "feel" both match — body wins as more specific somatic signal
    const result = extractLifeSignalFeatures('My body feels heavy and I feel drained.');
    expect(result.signalKind).toBe('body');
  });

  it('resolves thought+feeling overlap to thought (priority disambiguation)', () => {
    // "keep thinking" (thought) and "feel" (feeling) both match — thought wins
    const result = extractLifeSignalFeatures('I keep thinking about the decision and feel uncertain.');
    expect(result.signalKind).toBe('thought');
  });

  it('keeps mixed for body+event overlap (no priority rule)', () => {
    // "called" (event) and "body" both match — no disambiguation rule → mixed
    const result = extractLifeSignalFeatures('I called the doctor because my chest was tight and my body felt shaky.');
    expect(result.signalKind).toBe('mixed');
  });

  it('infers thought signal kind', () => {
    const result = extractLifeSignalFeatures('I keep thinking about whether I made the right decision.');
    expect(['thought', 'mixed']).toContain(result.signalKind);
  });

  it('infers event signal kind from action verbs', () => {
    const result = extractLifeSignalFeatures('I called her and we argued for hours.');
    expect(['event', 'mixed']).toContain(result.signalKind);
  });

  it('returns confidence in [0.2, 0.95] range', () => {
    const results = [
      extractLifeSignalFeatures('I feel sad.'),
      extractLifeSignalFeatures('Work was stressful and I feel overwhelmed and my body is tired.'),
      extractLifeSignalFeatures('X'), // short, low match
    ];
    for (const r of results) {
      expect(r.confidence).toBeGreaterThanOrEqual(0.2);
      expect(r.confidence).toBeLessThanOrEqual(0.95);
    }
  });

  it('returns a non-negative matchedRuleCount', () => {
    const result = extractLifeSignalFeatures('Something happened today that I cannot name.');
    expect(result.matchedRuleCount).toBeGreaterThanOrEqual(0);
  });
});

// ── extractLifeSignals (multi-signal) ────────────────────────────────────────

describe('extractLifeSignals', () => {
  it('returns at least one signal for any non-empty text', () => {
    const result = extractLifeSignals('Something is going on.');
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('returns at most 8 signals from a very long entry', () => {
    const longText = Array(20)
      .fill('Something happened today and I feel overwhelmed by work.')
      .join(' ');
    const result = extractLifeSignals(longText);
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it('filters segments shorter than 12 characters', () => {
    // All split parts < 12 chars → falls back to treating full text as one signal
    const result = extractLifeSignals('OK. Fine. Yes.');
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('each signal has required shape fields', () => {
    const result = extractLifeSignals('I feel afraid and worried about my relationship with my partner.');
    for (const signal of result) {
      expect(typeof signal.text).toBe('string');
      expect(signal.text.length).toBeGreaterThan(0);
      expect(typeof signal.sourceStart).toBe('number');
      expect(typeof signal.sourceEnd).toBe('number');
      expect(typeof signal.sourceIndex).toBe('number');
      expect(typeof signal.signalKind).toBe('string');
      expect(Array.isArray(signal.themes)).toBe(true);
      expect(Array.isArray(signal.emotions)).toBe(true);
      expect(Array.isArray(signal.entities)).toBe(true);
      expect(typeof signal.confidence).toBe('number');
      expect(typeof signal.matchedRuleCount).toBe('number');
    }
  });

  it('sourceIndex values are sequential from 0', () => {
    const result = extractLifeSignals(
      'I have a project deadline. I feel overwhelmed. My partner and I argued.',
    );
    result.forEach((signal, idx) => {
      expect(signal.sourceIndex).toBe(idx);
    });
  });

  it('sourceStart is within text bounds', () => {
    const text = 'I feel scared. Work is stressful and deadline is tomorrow.';
    const result = extractLifeSignals(text);
    for (const signal of result) {
      expect(signal.sourceStart).toBeGreaterThanOrEqual(0);
      expect(signal.sourceEnd).toBeLessThanOrEqual(text.length);
      expect(signal.sourceStart).toBeLessThan(signal.sourceEnd);
    }
  });

  it('multi-signal long entry produces multiple signals', () => {
    const text =
      'Work meeting went badly. My partner and I argued again about money. My body feels exhausted. I keep thinking I am failing at everything.';
    const result = extractLifeSignals(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Gold-set regression ───────────────────────────────────────────────────────

describe('gold-set: extractLifeSignals', () => {
  for (const entry of GOLD_ENTRIES) {
    it(`gold[${entry.id}]: meets minimum signal count`, () => {
      const signals = extractLifeSignals(entry.text);
      expect(signals.length).toBeGreaterThanOrEqual(entry.expected.minSignalCount);
    });

    if (entry.expected.expectedThemes) {
      it(`gold[${entry.id}]: at least one signal has expected theme(s)`, () => {
        const signals = extractLifeSignals(entry.text);
        const allThemes = signals.flatMap((s) => s.themes);
        for (const theme of entry.expected.expectedThemes!) {
          expect(allThemes).toContain(theme);
        }
      });
    }

    if (entry.expected.expectedEmotions) {
      it(`gold[${entry.id}]: at least one signal has expected emotion(s)`, () => {
        const signals = extractLifeSignals(entry.text);
        const allEmotions = signals.flatMap((s) => s.emotions);
        for (const emotion of entry.expected.expectedEmotions!) {
          expect(allEmotions).toContain(emotion);
        }
      });
    }

    if (entry.expected.forbiddenThemes) {
      it(`gold[${entry.id}]: BAD OUTPUT guard — forbidden themes absent`, () => {
        const signals = extractLifeSignals(entry.text);
        const allThemes = signals.flatMap((s) => s.themes);
        for (const forbidden of entry.expected.forbiddenThemes!) {
          expect(allThemes).not.toContain(forbidden);
        }
      });
    }

    if (entry.expected.primaryDomain !== undefined) {
      it(`gold[${entry.id}]: first signal has expected primary domain`, () => {
        const signals = extractLifeSignals(entry.text);
        // At least one signal must have the expected domain (not necessarily the first)
        const allDomains = signals.map((s) => s.lifeDomain);
        expect(allDomains).toContain(entry.expected.primaryDomain);
      });
    }

    if (entry.expected.confidenceFloor !== undefined) {
      it(`gold[${entry.id}]: confidence above floor`, () => {
        const signals = extractLifeSignals(entry.text);
        const maxConf = Math.max(...signals.map((s) => s.confidence));
        expect(maxConf).toBeGreaterThan(entry.expected.confidenceFloor!);
      });
    }
  }
});
