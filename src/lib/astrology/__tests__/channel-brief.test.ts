import { describe, expect, it } from 'vitest';
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
      rarityHistoricalGapYears: null,
    });
    expect(brief.timing.windowLabel).toContain('2026-05-14');
    expect(brief.limitations).toContain('Historical rarity claims remain unavailable unless the engine computes them explicitly.');
    expect(brief.personalRelevance.bridge).toMatchObject({
      eventId: expect.any(String),
      matchReasons: expect.arrayContaining([expect.any(String)]),
    });
  });

  it('does not insert poetic filler or fake rarity claims into channel guidance', () => {
    const fixture = buildAstrologyChannelBriefFixture();
    const brief = fixture.channelBrief;
    const serialized = JSON.stringify(brief).toLowerCase();

    expect(serialized).not.toContain('trust the pause');
    expect(serialized).not.toContain('big shifts');
    expect(serialized).not.toContain('the stars are aligning');
    expect(brief.limitations).toContain('Historical rarity claims remain unavailable unless the engine computes them explicitly.');
    expect(brief.receipts.every((receipt) => receipt.rarityHistoricalGapYears === null)).toBe(true);
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
