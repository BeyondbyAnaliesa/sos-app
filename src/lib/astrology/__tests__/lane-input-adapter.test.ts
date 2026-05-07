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
