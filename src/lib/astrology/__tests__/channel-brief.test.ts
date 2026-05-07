import { describe, expect, it } from 'vitest';
import { buildAstrologyChannelBrief } from '@/lib/astrology/channel-brief';
import { buildAstrologyChannelBriefFixture, DEFAULT_CHANNEL_BRIEF_FIXTURE_ID } from '@/lib/astrology/channel-brief-fixture';
import { buildAstrologyChannelBriefPreview } from '@/lib/astrology/channel-brief-preview';

describe('buildAstrologyChannelBrief', () => {
  it('includes receipts, timing, limitations, and preserves the collective bridge', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    const brief = fixture.channelBrief;

    expect(brief.status).toBe('astrology-channel-brief-v1');
    expect(brief.receipts[0]).toMatchObject({
      signalId: 'saturn-opposition-venus',
      transitPlanet: 'Saturn',
      aspect: 'opposition',
      targetLabel: 'Venus',
      exactDate: '2026-05-14',
      bridge: {
        eventId: expect.any(String),
        matchReasons: expect.arrayContaining([expect.any(String)]),
      },
      rarity: {
        status: 'not_computed',
        historicalGapYears: null,
      },
    });
    expect(brief.timing.windowLabel).toContain('2026-05-14');
    expect(brief.limitations).toContain('Historical rarity claims remain unavailable unless the engine computes them explicitly.');
    expect(brief.personalRelevance.bridge).toMatchObject({
      eventId: expect.any(String),
      matchReasons: expect.arrayContaining([expect.any(String)]),
    });
    expect(brief.dominantStory.currentSkyRarity?.status).toBeDefined();
    expect(brief.computedSkyFacts.computed.length).toBeGreaterThan(0);
  });

  it('does not insert poetic filler or fake rarity claims into channel guidance', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    const brief = fixture.channelBrief;
    const serialized = JSON.stringify(brief).toLowerCase();

    expect(serialized).not.toContain('trust the pause');
    expect(serialized).not.toContain('big shifts');
    expect(serialized).not.toContain('the stars are aligning');
    expect(brief.limitations).toContain('Historical rarity claims remain unavailable unless the engine computes them explicitly.');
    expect(brief.receipts.every((receipt) => receipt.rarity?.status === 'not_computed')).toBe(true);
  });


  it('preserves computed current-sky facts even when the dominant story stays on a different event', () => {
    const brief = buildAstrologyChannelBrief({
      date: '2025-05-25',
      foreground: [
        {
          id: 'saturn-aspect-signal',
          tier: 'foreground',
          scope: 'both',
          source: 'major_arc',
          title: 'Saturn pressure is the dominant signal',
          summary: 'A personal Saturn contact outranks the background sky in this pass.',
          lifeAreas: ['home'],
          demand: 'restructuring',
          score: 8.7,
          receipts: [
            {
              transitPlanet: 'Saturn',
              aspect: 'opposition',
              natalTarget: 'venus',
              targetLabel: 'Venus',
              orb: 0.4,
              phase: 'applying',
              transitSign: 'Aries',
              transitDegree: 2,
              natalSign: 'Libra',
              natalHouse: 4,
              lifeArea: 'home',
              exactDate: '2025-05-28',
              peakDate: '2025-05-28',
              startDate: '2025-05-20',
              endDate: '2025-06-10',
              passCount: 1,
              currentPass: 1,
              stations: [],
              memorySummary: null,
              natalProjection: null,
              meaningFactors: null,
              collectiveBridge: {
                collectiveEvent: {
                  id: 'aspect:Saturn:opposition:Venus',
                  kind: 'transit_aspect',
                  bodies: ['Saturn', 'Venus'],
                  aspect: 'opposition',
                  tier: 'foreground',
                  score: 8.2,
                },
                matchReasons: ['Collective event includes transit body Saturn.'],
                bridgeStrengthScore: 2.5,
                bridgeStrengthTier: 'supporting',
                promoteScopeToBoth: true,
                limitations: ['heuristic'],
              },
              currentSkyRarity: {
                score: 5.2,
                basis: 'heuristic',
                status: 'not_computed',
                confidence: 'none',
                recurrence: null,
                limitations: ['Transit aspect recurrence remains fenced in this slice.'],
                historicalGapYears: null,
              },
              arcLifecycle: null,
            },
          ],
          collectiveBridge: {
            collectiveEvent: {
              id: 'aspect:Saturn:opposition:Venus',
              kind: 'transit_aspect',
              bodies: ['Saturn', 'Venus'],
              aspect: 'opposition',
              tier: 'foreground',
              score: 8.2,
            },
            matchReasons: ['Collective event includes transit body Saturn.'],
            bridgeStrengthScore: 2.5,
            bridgeStrengthTier: 'supporting',
            promoteScopeToBoth: true,
            limitations: ['heuristic'],
          },
          supportNotes: [],
        },
      ],
      supporting: [],
      background: [],
      noise: [],
      mainStory: 'Saturn pressure is dominant.',
      practicalDemand: 'Work with the structural pressure directly.',
      timing: {
        currentPhase: 'applying',
        exactDate: '2025-05-28',
        peakWindowStart: '2025-05-25',
        peakWindowEnd: '2025-05-28',
        nextWatchDate: '2025-05-28',
        activeTransitCount: 1,
      },
      activatedLifeAreas: ['home'],
      currentSky: {
        status: 'collective-scan-v1',
        summary: 'Saturn pressure leads, but a separate ingress still carries computed spacing facts.',
        scannedBodies: ['Saturn', 'Jupiter'],
        events: [
          {
            id: 'aspect:Saturn:opposition:Venus',
            kind: 'transit_aspect',
            tier: 'foreground',
            score: 8.2,
            scope: 'collective',
            bodies: ['Saturn', 'Venus'],
            aspect: 'opposition',
            orb: 0.2,
            phase: 'applying',
            applyingStateKnown: true,
            sign: null,
            exactnessBand: 'near_exact',
            rarity: {
              score: 5.2,
              basis: 'heuristic',
              status: 'not_computed',
              confidence: 'none',
              recurrence: null,
              limitations: ['Transit aspect recurrence remains fenced in this slice.'],
              historicalGapYears: null,
            },
            consequence: {
              score: 5.4,
              basis: 'heuristic',
              limitations: ['heuristic'],
              historicalGapYears: null,
            },
            summary: 'Saturn opposes Venus in the current sky.',
            receipts: ['Saturn opposition Venus'],
            limitations: ['bounded estimate only'],
          },
          {
            id: 'ingress:Jupiter:post_ingress',
            kind: 'sign_ingress_proximity',
            tier: 'supporting',
            score: 7.1,
            scope: 'collective',
            bodies: ['Jupiter'],
            aspect: null,
            orb: 0.05,
            phase: null,
            applyingStateKnown: false,
            sign: 'Cancer',
            exactnessBand: 'exact',
            rarity: {
              score: 6.1,
              basis: 'heuristic',
              status: 'computed',
              confidence: 'bounded',
              recurrence: {
                comparator: 'same_body_sign_ingress_spacing_estimate',
                scanWindowDays: 400,
                priorComparableEventDate: '2024-06-09',
                nextComparableEventDate: '2026-06-30',
                spacingDays: 386,
                spacingYears: 1.1,
              },
              limitations: ['Ingress spacing is a bounded sign-boundary estimate from current ephemeris/speed, not a full historical frequency engine.'],
              historicalGapYears: 1.1,
            },
            consequence: {
              score: 5.1,
              basis: 'heuristic',
              limitations: ['heuristic'],
              historicalGapYears: null,
            },
            summary: 'Jupiter has just crossed into Cancer.',
            receipts: ['Jupiter: Cancer 0.05°'],
            limitations: ['bounded estimate only'],
          },
        ],
        limitations: ['Historical rarity claims remain unavailable unless the engine computes them explicitly.'],
      },
      receipts: [],
    });

    expect(brief.dominantStory.collectiveEventIds).toEqual(['aspect:Saturn:opposition:Venus']);
    expect(brief.dominantStory.currentSkyRarity).toMatchObject({
      status: 'not_computed',
      historicalGapYears: null,
    });
    expect(brief.computedSkyFacts.computed).toHaveLength(1);
    expect(brief.computedSkyFacts.computed[0]).toMatchObject({
      eventId: 'ingress:Jupiter:post_ingress',
      kind: 'sign_ingress_proximity',
      historicalGapYears: 1.1,
      recurrence: {
        comparator: 'same_body_sign_ingress_spacing_estimate',
      },
    });
    expect(brief.computedSkyFacts.notComputed[0]).toMatchObject({
      eventId: 'aspect:Saturn:opposition:Venus',
      status: 'not_computed',
    });
  });

  it('preserves computed ingress spacing facts in the channel brief without adding fake rarity language', () => {
    const brief = buildAstrologyChannelBrief({
      date: '2025-05-25',
      foreground: [
        {
          id: 'saturn-ingress-signal',
          tier: 'foreground',
          scope: 'both',
          source: 'major_arc',
          title: 'Saturn is crossing a sign boundary',
          summary: 'The current sky and a personal Saturn transit are lining up at the same boundary.',
          lifeAreas: ['home'],
          demand: 'restructuring',
          score: 8.4,
          receipts: [
            {
              transitPlanet: 'Saturn',
              aspect: 'opposition',
              natalTarget: 'venus',
              targetLabel: 'Venus',
              orb: 0.4,
              phase: 'applying',
              transitSign: 'Aries',
              transitDegree: 0.03,
              natalSign: 'Libra',
              natalHouse: 4,
              lifeArea: 'home',
              exactDate: '2025-05-28',
              peakDate: '2025-05-28',
              startDate: '2025-05-20',
              endDate: '2025-06-10',
              passCount: 1,
              currentPass: 1,
              stations: [],
              memorySummary: null,
              natalProjection: null,
              meaningFactors: null,
              collectiveBridge: {
                collectiveEvent: {
                  id: 'ingress:Saturn:post_ingress',
                  kind: 'sign_ingress_proximity',
                  bodies: ['Saturn'],
                  aspect: null,
                  tier: 'foreground',
                  score: 8.1,
                },
                matchReasons: ['Collective event includes transit body Saturn.'],
                bridgeStrengthScore: 2.5,
                bridgeStrengthTier: 'supporting',
                promoteScopeToBoth: true,
                limitations: ['heuristic'],
              },
              currentSkyRarity: {
                score: 6.3,
                basis: 'heuristic',
                status: 'computed',
                confidence: 'bounded',
                recurrence: {
                  comparator: 'same_body_sign_ingress_spacing_estimate',
                  scanWindowDays: 400,
                  priorComparableEventDate: '2025-05-25',
                  nextComparableEventDate: '2026-06-29',
                  spacingDays: 400,
                  spacingYears: 1.1,
                },
                limitations: ['Ingress spacing is a bounded sign-boundary estimate from current ephemeris/speed, not a full historical frequency engine.'],
                historicalGapYears: 1.1,
              },
              arcLifecycle: null,
            },
          ],
          collectiveBridge: {
            collectiveEvent: {
              id: 'ingress:Saturn:post_ingress',
              kind: 'sign_ingress_proximity',
              bodies: ['Saturn'],
              aspect: null,
              tier: 'foreground',
              score: 8.1,
            },
            matchReasons: ['Collective event includes transit body Saturn.'],
            bridgeStrengthScore: 2.5,
            bridgeStrengthTier: 'supporting',
            promoteScopeToBoth: true,
            limitations: ['heuristic'],
          },
          supportNotes: [],
        },
      ],
      supporting: [],
      background: [],
      noise: [],
      mainStory: 'Saturn is crossing a sign boundary.',
      practicalDemand: 'Work with the structural shift directly.',
      timing: {
        currentPhase: 'applying',
        exactDate: '2025-05-28',
        peakWindowStart: '2025-05-25',
        peakWindowEnd: '2025-05-28',
        nextWatchDate: '2025-05-28',
        activeTransitCount: 1,
      },
      activatedLifeAreas: ['home'],
      currentSky: {
        status: 'collective-scan-v1',
        summary: 'Saturn has just crossed into Aries.',
        scannedBodies: ['Saturn'],
        events: [
          {
            id: 'ingress:Saturn:post_ingress',
            kind: 'sign_ingress_proximity',
            tier: 'foreground',
            score: 8.1,
            scope: 'collective',
            bodies: ['Saturn'],
            aspect: null,
            orb: 0.03,
            phase: null,
            applyingStateKnown: false,
            sign: 'Aries',
            exactnessBand: 'exact',
            rarity: {
              score: 6.3,
              basis: 'heuristic',
              status: 'computed',
              confidence: 'bounded',
              recurrence: {
                comparator: 'same_body_sign_ingress_spacing_estimate',
                scanWindowDays: 400,
                priorComparableEventDate: '2025-05-25',
                nextComparableEventDate: '2026-06-29',
                spacingDays: 400,
                spacingYears: 1.1,
              },
              limitations: ['Ingress spacing is a bounded sign-boundary estimate from current ephemeris/speed, not a full historical frequency engine.'],
              historicalGapYears: 1.1,
            },
            consequence: {
              score: 5.4,
              basis: 'heuristic',
              limitations: ['heuristic'],
              historicalGapYears: null,
            },
            summary: 'Saturn is within 0.03° of a sign boundary (post_ingress).',
            receipts: ['Saturn: Aries 0.03°'],
            limitations: ['bounded estimate only'],
          },
        ],
        limitations: ['Historical rarity claims remain unavailable unless the engine computes them explicitly.'],
      },
      receipts: [],
    });

    expect(brief.receipts[0]?.rarity).toMatchObject({
      status: 'computed',
      confidence: 'bounded',
      historicalGapYears: 1.1,
    });
    expect(JSON.stringify(brief).toLowerCase()).not.toContain('rare celestial moment');
  });

  it('serializes a preview wrapper that keeps v1 shape and internal-only privacy status', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    const preview = buildAstrologyChannelBriefPreview({
      mode: 'fixture',
      date: fixture.date,
      fixtureId: DEFAULT_CHANNEL_BRIEF_FIXTURE_ID,
      channelBrief: fixture.channelBrief,
    });

    expect(preview).toMatchObject({
      status: 'astrology-channel-brief-preview-v1',
      mode: 'fixture',
      source: {
        fixtureId: DEFAULT_CHANNEL_BRIEF_FIXTURE_ID,
        userId: null,
        date: fixture.date,
        privacy: 'internal-operator-only',
      },
      channelBrief: {
        status: 'astrology-channel-brief-v1',
      },
    });
  });
});
