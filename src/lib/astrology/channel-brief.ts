import type {
  AstrologyCollectiveBridge,
  AstrologyJudgment,
  AstrologyJudgmentReceipt,
  AstrologyJudgmentSignal,
} from '@/lib/astrology/judgment-types';

export interface AstrologyChannelBriefReceipt {
  signalId: string;
  signalTitle: string;
  transitPlanet: string;
  aspect: string;
  targetLabel: string;
  lifeArea: string;
  phase: AstrologyJudgmentReceipt['phase'];
  orb: number;
  exactDate: string | null;
  peakDate: string | null;
  startDate: string | null;
  endDate: string | null;
  memorySummary: string | null;
  bridge: {
    eventId: string;
    matchReasons: string[];
    bridgeStrengthTier: AstrologyCollectiveBridge['bridgeStrengthTier'];
  } | null;
  limitations: string[];
  rarityHistoricalGapYears: null;
}

export interface AstrologyChannelHookAngle {
  key: 'current_sky_story' | 'collective_to_personal' | 'timing_window' | 'concrete_demand';
  surfaces: Array<'social' | 'substack' | 'aeon_lore'>;
  rationale: string;
  supportSignalIds: string[];
  limitations: string[];
}

export interface AstrologyChannelBrief {
  status: 'astrology-channel-brief-v1';
  date: string;
  dominantStory: {
    signalId: string | null;
    title: string;
    summary: string;
    currentSkySummary: string;
    collectiveEventIds: string[];
    scope: AstrologyJudgmentSignal['scope'] | 'collective';
  };
  personalRelevance: {
    summary: string;
    activatedLifeAreas: string[];
    scope: AstrologyJudgmentSignal['scope'] | 'collective';
    bridge: AstrologyChannelBriefReceipt['bridge'];
  };
  channelRelevance: {
    social: string;
    substack: string;
    aeonLore: string;
  };
  timing: AstrologyJudgment['timing'] & {
    windowLabel: string;
    urgency: 'immediate' | 'active' | 'developing' | 'background';
  };
  concreteDemand: string;
  receipts: AstrologyChannelBriefReceipt[];
  hookAngles: AstrologyChannelHookAngle[];
  limitations: string[];
}

function compact(value: string | null | undefined, fallback: string) {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text ? text : fallback;
}

function selectLeadSignal(judgment: AstrologyJudgment) {
  return judgment.foreground[0]
    ?? judgment.supporting[0]
    ?? judgment.background[0]
    ?? judgment.noise[0]
    ?? null;
}

function bridgeSummary(bridge: AstrologyCollectiveBridge | null | undefined) {
  if (!bridge) return null;
  return {
    eventId: bridge.collectiveEvent.id,
    matchReasons: bridge.matchReasons,
    bridgeStrengthTier: bridge.bridgeStrengthTier,
  };
}

function buildWindowLabel(judgment: AstrologyJudgment) {
  const { currentPhase, exactDate, peakWindowStart, peakWindowEnd, nextWatchDate } = judgment.timing;
  if (exactDate) return `Exact pressure point is ${exactDate}.`;
  if (peakWindowStart && peakWindowEnd) return `Active window runs ${peakWindowStart} through ${peakWindowEnd}.`;
  if (nextWatchDate) return `Next watch date is ${nextWatchDate}.`;
  if (currentPhase) return `Current phase is ${currentPhase}.`;
  return 'Timing window is not fully computed in this layer.';
}

function buildUrgency(judgment: AstrologyJudgment): AstrologyChannelBrief['timing']['urgency'] {
  if (judgment.timing.currentPhase === 'exact') return 'immediate';
  if (judgment.foreground.length > 0) return 'active';
  if (judgment.supporting.length > 0) return 'developing';
  return 'background';
}

function buildReceipt(signal: AstrologyJudgmentSignal): AstrologyChannelBriefReceipt[] {
  return signal.receipts.map((receipt) => ({
    signalId: signal.id,
    signalTitle: signal.title,
    transitPlanet: receipt.transitPlanet,
    aspect: receipt.aspect,
    targetLabel: receipt.targetLabel,
    lifeArea: receipt.lifeArea,
    phase: receipt.phase,
    orb: receipt.orb,
    exactDate: receipt.exactDate,
    peakDate: receipt.peakDate,
    startDate: receipt.startDate,
    endDate: receipt.endDate,
    memorySummary: receipt.memorySummary,
    bridge: bridgeSummary(receipt.collectiveBridge ?? signal.collectiveBridge),
    limitations: [
      ...(receipt.arcLifecycle?.limitations ?? []),
      ...(receipt.collectiveBridge?.limitations ?? []),
      ...(receipt.meaningFactors?.limitations ?? []),
    ].filter((value, index, all) => Boolean(value) && all.indexOf(value) === index),
    rarityHistoricalGapYears: null,
  }));
}

export function buildAstrologyChannelBrief(judgment: AstrologyJudgment): AstrologyChannelBrief {
  const lead = selectLeadSignal(judgment);
  const leadBridge = bridgeSummary(lead?.collectiveBridge);
  const leadCurrentSkyEvent = lead?.collectiveBridge?.collectiveEvent ?? judgment.currentSky.events[0] ?? null;
  const supportingSignals = [...judgment.foreground, ...judgment.supporting, ...judgment.background].slice(0, 4);
  const receipts = supportingSignals.flatMap(buildReceipt).slice(0, 6);
  const currentSkySummary = compact(judgment.currentSky.summary, 'Current-sky summary is limited in this layer.');
  const leadLifeArea = lead?.lifeAreas[0] ?? judgment.activatedLifeAreas[0] ?? 'the active life area';

  return {
    status: 'astrology-channel-brief-v1',
    date: judgment.date,
    dominantStory: {
      signalId: lead?.id ?? null,
      title: lead?.title ?? 'Collective sky context only',
      summary: lead
        ? `${lead.title} is the main internal signal. ${lead.summary}`
        : `${currentSkySummary} No personal transit signal outranked the background stack in this pass.`,
      currentSkySummary,
      collectiveEventIds: leadCurrentSkyEvent ? [leadCurrentSkyEvent.id] : [],
      scope: lead?.scope ?? 'collective',
    },
    personalRelevance: {
      summary: lead
        ? `This lands in ${leadLifeArea}. Use the bridge between the current sky and the personal chart when present, and keep unsupported claims out.`
        : 'Personal relevance is limited in this pass. Use only the explicit life-area and receipt data that exist.',
      activatedLifeAreas: judgment.activatedLifeAreas,
      scope: lead?.scope ?? 'collective',
      bridge: leadBridge,
    },
    channelRelevance: {
      social: leadCurrentSkyEvent
        ? `Lead with the strongest current-sky event, then tie it to one concrete life-area demand or timing fact. Keep it short and receipt-backed.`
        : 'Lead with the clearest active demand and the next timing trigger. Do not turn a thin signal stack into a major claim.',
      substack: 'Use the dominant current-sky story, then move into personal/chart relevance, timing, and limitations. Keep unsupported rarity or history claims explicit as unavailable.',
      aeonLore: 'Use this brief as internal source material for a longer plain-language analysis: current sky, personal activation, concrete demand, and what to watch next.',
    },
    timing: {
      ...judgment.timing,
      windowLabel: buildWindowLabel(judgment),
      urgency: buildUrgency(judgment),
    },
    concreteDemand: judgment.practicalDemand,
    receipts,
    hookAngles: [
      {
        key: 'current_sky_story',
        surfaces: ['social', 'substack', 'aeon_lore'],
        rationale: currentSkySummary,
        supportSignalIds: lead ? [lead.id] : [],
        limitations: judgment.currentSky.limitations,
      },
      {
        key: 'collective_to_personal',
        surfaces: ['social', 'substack', 'aeon_lore'],
        rationale: leadBridge
          ? `A collective event also lands personally here: ${leadBridge.matchReasons.join('; ')}.`
          : `The strongest personal activation is ${leadLifeArea}; only use a collective bridge when the engine provides one.`,
        supportSignalIds: lead ? [lead.id] : [],
        limitations: lead?.collectiveBridge?.limitations ?? ['Collective-to-personal bridge is only available when explicitly matched by the engine.'],
      },
      {
        key: 'timing_window',
        surfaces: ['social', 'substack', 'aeon_lore'],
        rationale: buildWindowLabel(judgment),
        supportSignalIds: lead ? [lead.id] : [],
        limitations: ['Timing depends on the active receipt window and may be partial if exact dates are missing.'],
      },
      {
        key: 'concrete_demand',
        surfaces: ['social', 'substack', 'aeon_lore'],
        rationale: judgment.practicalDemand,
        supportSignalIds: lead ? [lead.id] : [],
        limitations: ['This is an internal demand summary, not final audience-facing copy.'],
      },
    ],
    limitations: [
      ...judgment.currentSky.limitations,
      'This brief is an internal adapter. It is not final public copy.',
      'Historical rarity claims remain unavailable unless the engine computes them explicitly.',
    ].filter((value, index, all) => Boolean(value) && all.indexOf(value) === index),
  };
}
