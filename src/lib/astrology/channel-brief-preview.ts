import type { AstrologyChannelBrief } from '@/lib/astrology/channel-brief';

export interface AstrologyChannelBriefPreview {
  status: 'astrology-channel-brief-preview-v1';
  mode: 'fixture' | 'live_user';
  source: {
    fixtureId: string | null;
    userId: string | null;
    date: string;
    privacy: 'internal-operator-only';
  };
  channelBrief: AstrologyChannelBrief;
}

export function buildAstrologyChannelBriefPreview(params: {
  mode: AstrologyChannelBriefPreview['mode'];
  date: string;
  channelBrief: AstrologyChannelBrief;
  fixtureId?: string | null;
  userId?: string | null;
}): AstrologyChannelBriefPreview {
  return {
    status: 'astrology-channel-brief-preview-v1',
    mode: params.mode,
    source: {
      fixtureId: params.fixtureId ?? null,
      userId: params.userId ?? null,
      date: params.date,
      privacy: 'internal-operator-only',
    },
    channelBrief: params.channelBrief,
  };
}
