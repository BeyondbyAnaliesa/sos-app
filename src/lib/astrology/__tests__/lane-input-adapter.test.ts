import { describe, expect, it } from 'vitest';
import { buildAstrologyChannelBriefFixture } from '@/lib/astrology/channel-brief-fixture';
import { buildAstrologyChannelBriefPreview } from '@/lib/astrology/channel-brief-preview';
import {
  buildAstrologyLaneInputBundle,
  buildAstrologyLaneInputBundleFromPreview,
} from '@/lib/astrology/lane-input-adapter';

const BANNED_PHRASES = [
  'trust the pause',
  'big shifts',
  'the stars are aligning',
  'cosmic invitation',
  'divine timing',
  'rare celestial moment',
];

describe('buildAstrologyLaneInputBundle', () => {
  it('builds internal adapter shapes for socials, substack, and aeon lore', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    const bundle = buildAstrologyLaneInputBundle(fixture.channelBrief);

    expect(bundle).toMatchObject({
      status: 'astrology-lane-input-adapter-v1',
      privacy: 'internal-operator-only',
      computedSkyFacts: {
        computed: expect.any(Array),
        notComputed: expect.any(Array),
      },
      lanes: {
        socials: {
          lane: 'socials',
          hookCandidates: expect.any(Array),
          timingRequirements: expect.any(Array),
          requiredReceipts: expect.any(Array),
        },
        substack: {
          lane: 'substack',
          bigSkyOutline: expect.any(Array),
          personalLanding: expect.any(String),
          watchNext: expect.any(String),
          requiredReceipts: expect.any(Array),
        },
        aeonLore: {
          lane: 'aeon_lore',
          bigSkyOutline: expect.any(Array),
          personalLanding: expect.any(String),
          watchNext: expect.any(String),
          requiredReceipts: expect.any(Array),
        },
      },
    });

    expect(bundle.lanes.socials.requiredReceipts[0]).toMatchObject({
      signalId: 'saturn-opposition-venus',
      exactDate: '2026-05-14',
      rarity: {
        status: 'not_computed',
        historicalGapYears: null,
      },
    });
    expect(bundle.lanes.substack.limitations.length).toBeGreaterThan(0);
    expect(bundle.lanes.aeonLore.limitations.length).toBeGreaterThan(0);
    expect(bundle.computedSkyFacts.computed.length).toBeGreaterThan(0);
  });

  it('keeps rarity fenced as unavailable and excludes final-public-copy fields', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    const bundle = buildAstrologyLaneInputBundle(fixture.channelBrief);

    expect(bundle.lanes.socials.requiredReceipts.every((receipt) => receipt.rarity?.status === 'not_computed')).toBe(true);
    expect(bundle.lanes.socials.limitations).toContain('Historical rarity remains unavailable here unless a computed value is supplied.');
    expect(bundle.lanes.substack.doNotClaim).toContain('Do not claim historical rarity unless the engine computes it.');
    expect('finalPublicCopy' in bundle.lanes.socials).toBe(false);
    expect('finalPublicCopy' in bundle.lanes.substack).toBe(false);
    expect('finalPublicCopy' in bundle.lanes.aeonLore).toBe(false);
  });


  it('preserves computed sky facts even when dominant-story rarity is fenced', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    fixture.channelBrief.dominantStory.currentSkyRarity = {
      status: 'not_computed',
      confidence: 'none',
      historicalGapYears: null,
      limitations: ['Transit aspect recurrence remains fenced in this slice.'],
    };
    fixture.channelBrief.computedSkyFacts = {
      computed: [
        {
          eventId: 'ingress:Jupiter:post_ingress',
          kind: 'sign_ingress_proximity',
          bodies: ['Jupiter'],
          aspect: null,
          sign: 'Cancer',
          exactnessBand: 'exact',
          summary: 'Jupiter has just crossed into Cancer.',
          recurrence: {
            comparator: 'same_body_sign_ingress_spacing_estimate',
            scanWindowDays: 400,
            priorComparableEventDate: '2024-06-09',
            nextComparableEventDate: '2026-06-30',
            spacingDays: 386,
            spacingYears: 1.1,
          },
          historicalGapYears: 1.1,
          limitations: ['bounded estimate only'],
          receipts: ['Jupiter: Cancer 0.05°'],
        },
      ],
      notComputed: [
        {
          eventId: 'aspect:Saturn:opposition:Venus',
          kind: 'transit_aspect',
          bodies: ['Saturn', 'Venus'],
          aspect: 'opposition',
          sign: null,
          summary: 'Saturn opposes Venus in the current sky.',
          status: 'not_computed',
          limitations: ['Transit aspect recurrence remains fenced in this slice.'],
        },
      ],
    };

    const bundle = buildAstrologyLaneInputBundle(fixture.channelBrief);

    expect(bundle.computedSkyFacts.computed[0]).toMatchObject({
      eventId: 'ingress:Jupiter:post_ingress',
      historicalGapYears: 1.1,
      recurrence: {
        comparator: 'same_body_sign_ingress_spacing_estimate',
      },
    });
    expect(bundle.computedSkyFacts.notComputed[0]).toMatchObject({
      eventId: 'aspect:Saturn:opposition:Venus',
      status: 'not_computed',
    });
    expect(bundle.lanes.substack.doNotClaim).toContain('Do not claim historical rarity unless the engine computes it.');
  });

  it('preserves computed ingress spacing facts through the lane adapter while keeping claim guardrails', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    fixture.channelBrief.receipts[0]!.rarity = {
      status: 'computed',
      confidence: 'bounded',
      historicalGapYears: 1.1,
      limitations: ['Ingress spacing is a bounded sign-boundary estimate from current ephemeris/speed, not a full historical frequency engine.'],
    };
    fixture.channelBrief.dominantStory.currentSkyRarity = fixture.channelBrief.receipts[0]!.rarity;

    const bundle = buildAstrologyLaneInputBundle(fixture.channelBrief);

    expect(bundle.lanes.socials.requiredReceipts[0]?.rarity).toMatchObject({
      status: 'computed',
      confidence: 'bounded',
      historicalGapYears: 1.1,
    });
    expect(bundle.lanes.substack.doNotClaim).toContain('Do not claim historical rarity unless the engine computes it.');
    expect(bundle.computedSkyFacts.computed[0]).toMatchObject({
      historicalGapYears: expect.any(Number),
      recurrence: {
        comparator: 'same_body_sign_ingress_spacing_estimate',
      },
    });
    expect(JSON.stringify(bundle).toLowerCase()).not.toContain('rare celestial moment');
  });

  it('stays plain, non-poetic, and uses preview metadata when adapting from preview', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    const preview = buildAstrologyChannelBriefPreview({
      mode: 'fixture',
      date: fixture.date,
      fixtureId: fixture.fixtureId,
      channelBrief: fixture.channelBrief,
    });
    const bundle = buildAstrologyLaneInputBundleFromPreview(preview);
    const serialized = JSON.stringify(bundle).toLowerCase();

    expect(bundle.source).toMatchObject({
      briefStatus: 'astrology-channel-brief-v1',
      previewStatus: 'astrology-channel-brief-preview-v1',
      mode: 'fixture',
      fixtureId: fixture.fixtureId,
      userId: null,
    });

    for (const phrase of BANNED_PHRASES) {
      expect(serialized).not.toContain(phrase);
    }

    expect(bundle.lanes.aeonLore.channelFit).toContain('Not a video script');
    expect(bundle.lanes.aeonLore.allowedAngles).toContain(
      'Keep this as a longer plain-language analysis input, not a script, not a performance, and not a cinematic narration.',
    );
  });
});
