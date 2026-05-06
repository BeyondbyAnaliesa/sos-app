import { describe, expect, it } from 'vitest';
import { buildAstrologyPromptJudgmentSnapshot, buildSystemPrompt } from '@/lib/prompt';
import type { AstrologyJudgment } from '@/lib/astrology/judgment-types';
import type { NatalSummary } from '@/lib/astrology/domain-types';

const natalSummary: NatalSummary = {
  placementsByKey: {
    sun: { key: 'sun', label: 'Sun', sign: 'Aries', house: 1, degree: 12, minute: 0 },
    moon: { key: 'moon', label: 'Moon', sign: 'Cancer', house: 4, degree: 8, minute: 0 },
  },
  ascendant: { sign: 'Leo', degree: 8, minute: 0, longitude: 128 },
  midheaven: { sign: 'Taurus', degree: 22, minute: 0, longitude: 52 },
};

const judgment: AstrologyJudgment = {
  date: '2026-05-06',
  foreground: [
    {
      id: 'saturn-square-sun',
      tier: 'foreground',
      scope: 'both',
      source: 'major_arc',
      title: 'Saturn square Sun is the main pressure line',
      summary: 'Responsibility, identity, and output are under real pressure.',
      lifeAreas: ['career', 'identity'],
      demand: 'restructuring',
      score: 9.4,
      collectiveBridge: {
        collectiveEvent: {
          id: 'aspect:Saturn:conjunction:Neptune',
          kind: 'transit_aspect',
          bodies: ['Saturn', 'Neptune'],
          aspect: 'conjunction',
          tier: 'foreground',
          score: 8.7,
        },
        matchReasons: ['Collective event includes transit body Saturn.'],
        bridgeStrengthScore: 2.8,
        bridgeStrengthTier: 'supporting',
        promoteScopeToBoth: true,
        limitations: ['heuristic'],
      },
      receipts: [
        {
          arcKey: 'saturn-square-sun',
          transitPlanet: 'Saturn',
          aspect: 'square',
          natalTarget: 'sun',
          targetLabel: 'Sun',
          orb: 0.6,
          phase: 'applying',
          transitSign: 'Aries',
          transitDegree: 12.4,
          natalSign: 'Aries',
          natalHouse: 1,
          lifeArea: 'career, identity, public pressure',
          exactDate: '2026-05-08',
          peakDate: '2026-05-08',
          startDate: '2026-04-20',
          endDate: '2026-06-02',
          passCount: 3,
          currentPass: 1,
          stations: [],
          memorySummary: 'Similar pressure showed up in prior work and authority journal notes.',
          natalProjection: null,
          meaningFactors: null,
          collectiveBridge: null,
          arcLifecycle: null,
        },
      ],
      supportNotes: ['Pressure is not abstract here. It is tied to responsibility and visibility.'],
    },
  ],
  supporting: [],
  background: [],
  noise: [],
  mainStory: 'Saturn square Sun is the main signal. Responsibility and identity are under pressure.',
  practicalDemand: 'Tighten the structure around career and identity.',
  timing: {
    currentPhase: 'applying',
    exactDate: '2026-05-08',
    peakWindowStart: '2026-05-06',
    peakWindowEnd: '2026-05-09',
    nextWatchDate: '2026-05-08',
    activeTransitCount: 4,
  },
  activatedLifeAreas: ['career', 'identity'],
  currentSky: {
    status: 'collective-scan-v1',
    summary: 'Saturn-Neptune is the strongest collective event in the scan.',
    scannedBodies: ['Saturn', 'Neptune'],
    events: [
      {
        id: 'aspect:Saturn:conjunction:Neptune',
        kind: 'transit_aspect',
        tier: 'foreground',
        score: 8.7,
        scope: 'collective',
        bodies: ['Saturn', 'Neptune'],
        aspect: 'conjunction',
        orb: 0.2,
        phase: 'applying',
        applyingStateKnown: true,
        sign: 'Aries',
        exactnessBand: 'exact',
        rarity: { score: 8.5, basis: 'heuristic', limitations: ['historical proof not computed'], historicalGapYears: null },
        consequence: { score: 8.8, basis: 'heuristic', limitations: ['historical proof not computed'], historicalGapYears: null },
        summary: 'Saturn conjunct Neptune is restructuring collective reality-testing.',
        receipts: ['tight orb', 'outer planet involvement'],
        limitations: ['Exact peak timestamp is not solved in this slice; phase is inferred from one-day speed deltas.'],
      },
    ],
    limitations: ['Rarity and consequence scores are heuristic and explicitly do not claim historical proof.'],
  },
  receipts: [
    {
      arcKey: 'saturn-square-sun',
      transitPlanet: 'Saturn',
      aspect: 'square',
      natalTarget: 'sun',
      targetLabel: 'Sun',
      orb: 0.6,
      phase: 'applying',
      transitSign: 'Aries',
      transitDegree: 12.4,
      natalSign: 'Aries',
      natalHouse: 1,
      lifeArea: 'career, identity, public pressure',
      exactDate: '2026-05-08',
      peakDate: '2026-05-08',
      startDate: '2026-04-20',
      endDate: '2026-06-02',
      passCount: 3,
      currentPass: 1,
      stations: [],
      memorySummary: 'Similar pressure showed up in prior work and authority journal notes.',
      natalProjection: null,
      meaningFactors: null,
      collectiveBridge: null,
      arcLifecycle: null,
    },
  ],
};

describe('buildAstrologyPromptJudgmentSnapshot', () => {
  it('keeps the structured judgment bounded but preserves receipts and current-sky facts', () => {
    const snapshot = buildAstrologyPromptJudgmentSnapshot(judgment);

    expect(snapshot.status).toBe('structured-astrology-judgment-v1');
    expect(snapshot.mainStory).toContain('Saturn square Sun');
    expect(snapshot.leadSignals[0]?.receipts[0]).toMatchObject({
      transitPlanet: 'Saturn',
      lifeArea: 'career, identity, public pressure',
      exactDate: '2026-05-08',
    });
    expect(snapshot.currentSky.events[0]).toMatchObject({
      id: 'aspect:Saturn:conjunction:Neptune',
      scope: 'collective',
    });
  });
});

describe('buildSystemPrompt', () => {
  it('tells Aeon to treat structured judgment as source-of-truth when present', () => {
    const prompt = buildSystemPrompt(
      natalSummary,
      { date: '2026-05-06', transits: [] },
      'They are under work pressure.',
      { judgment },
    );

    expect(prompt).toContain('STRUCTURED ASTROLOGY SOURCE OF TRUTH');
    expect(prompt).toContain('STRUCTURED ASTROLOGY JUDGMENT (authoritative when present)');
    expect(prompt).toContain('Do not contradict the structured judgment.');
    expect(prompt).toContain('Saturn square Sun is the main signal. Responsibility and identity are under pressure.');
    expect(prompt).toContain('Saturn-Neptune is the strongest collective event in the scan.');
  });

  it('falls back safely when no structured judgment is present', () => {
    const prompt = buildSystemPrompt(
      natalSummary,
      { date: '2026-05-06', transits: [] },
      'They are under work pressure.',
    );

    expect(prompt).toContain('If no structured judgment block is present, fall back normally to the natal chart and today\'s transit stack.');
    expect(prompt).not.toContain('STRUCTURED ASTROLOGY JUDGMENT (authoritative when present)');
  });
});
