import {
  buildAstrologyJudgmentMetadata,
  type AstrologyJudgmentMetadata,
} from '@/lib/astrology/judgment-metadata';
import type {
  AstrologyCollectiveBridge,
  AstrologyCollectiveSkyEvent,
  AstrologyJudgment,
  AstrologyJudgmentReceipt,
  AstrologyJudgmentSignal,
  AstrologyMacroPersonalBridge,
  CollectiveSkyHistoricalRarityFact,
  CollectiveSkyHistoricalRecurrence,
} from '@/lib/astrology/judgment-types';

export interface AstrologyChannelBriefRaritySummary {
  status: CollectiveSkyHistoricalRarityFact['status'];
  confidence: CollectiveSkyHistoricalRarityFact['confidence'];
  historicalGapYears: number | null;
  limitations: string[];
}

export interface AstrologyChannelBriefReceipt {
  signalId: string;
  signalTitle: string;
  transitObject: {
    label: string;
    category: NonNullable<AstrologyJudgmentReceipt['transitObject']>['category'];
    supportLevel: NonNullable<AstrologyJudgmentReceipt['transitObject']>['supportLevel'];
  } | null;
  transitPlanet: string;
  transitDignity: AstrologyJudgmentReceipt['transitDignity'] extends infer T
    ? T extends { condition: infer Condition }
      ? Condition | null
      : null
    : null;
  aspect: string;
  natalTargetObject: {
    label: string;
    category: NonNullable<AstrologyJudgmentReceipt['natalTargetObject']>['category'];
    supportLevel: NonNullable<AstrologyJudgmentReceipt['natalTargetObject']>['supportLevel'];
  } | null;
  targetLabel: string;
  natalDignity: AstrologyJudgmentReceipt['natalProjection'] extends infer T
    ? T extends { dignity: infer Dignity }
      ? Dignity extends { condition: infer Condition }
        ? Condition | null
        : null
      : null
    : null;
  lifeArea: string;
  phase: AstrologyJudgmentReceipt['phase'];
  orb: number;
  exactDate: string | null;
  peakDate: string | null;
  startDate: string | null;
  endDate: string | null;
  memorySummary: string | null;
  reception: Array<{
    system: NonNullable<AstrologyJudgmentReceipt['reception']>[number]['system'];
    status: NonNullable<AstrologyJudgmentReceipt['reception']>[number]['status'];
    direction: NonNullable<AstrologyJudgmentReceipt['reception']>[number]['direction'];
  }>;
  sect: {
    chartSect: NonNullable<AstrologyJudgmentReceipt['sect']>['chartSect'];
    transitPlanetCondition: NonNullable<AstrologyJudgmentReceipt['sect']>['transitPlanetCondition'];
    natalTargetCondition: NonNullable<AstrologyJudgmentReceipt['sect']>['natalTargetCondition'];
  } | null;
  bridge: {
    eventId: string;
    matchReasons: string[];
    bridgeStrengthTier: AstrologyCollectiveBridge['bridgeStrengthTier'];
  } | null;
  macroBridge: {
    configurationId: string;
    bridgeStrengthTier: AstrologyMacroPersonalBridge['bridgeStrengthTier'];
    manifestationClass: AstrologyMacroPersonalBridge['manifestationClass'];
    decisionPressure: AstrologyMacroPersonalBridge['decisionPressure'];
    activationArea: string[];
    matchedThemes: string[];
  } | null;
  limitations: string[];
  rarity: AstrologyChannelBriefRaritySummary | null;
}

export interface AstrologyChannelBriefComputedSkyFact {
  eventId: string;
  kind: AstrologyCollectiveSkyEvent['kind'];
  bodies: string[];
  aspect: string | null;
  sign: string | null;
  exactnessBand: AstrologyCollectiveSkyEvent['exactnessBand'];
  summary: string;
  recurrence: CollectiveSkyHistoricalRecurrence;
  historicalGapYears: number | null;
  limitations: string[];
  receipts: string[];
}

export interface AstrologyChannelBriefFencedSkyFact {
  eventId: string;
  kind: AstrologyCollectiveSkyEvent['kind'];
  bodies: string[];
  aspect: string | null;
  sign: string | null;
  summary: string;
  status: 'not_computed';
  limitations: string[];
}

export interface AstrologyChannelHookAngle {
  key: 'current_sky_story' | 'collective_to_personal' | 'timing_window' | 'concrete_demand';
  surfaces: Array<'social' | 'substack' | 'aeon_lore'>;
  rationale: string;
  supportSignalIds: string[];
  limitations: string[];
}

export interface AstrologyChannelBriefTopSignal {
  signalId: string;
  title: string;
  summary: string;
  scope: AstrologyJudgmentSignal['scope'];
  source: AstrologyJudgmentSignal['source'];
  demand: AstrologyJudgmentSignal['demand'];
  score: number;
  lifeAreas: string[];
  supportNotes: string[];
  receiptCount: number;
  collectiveEventIds: string[];
}

export interface AstrologyChannelBriefMacroConfigurationSummary {
  configurationId: string;
  kind: NonNullable<AstrologyJudgment['macrocosm']>['configurations'][number]['kind'];
  title: string;
  landscapeStatus: NonNullable<NonNullable<AstrologyJudgment['macrocosm']>['configurations'][number]['landscape']>['statusLabel'] | 'unknown';
  underStudiedAngles: string[];
  recurrenceStatus: NonNullable<AstrologyJudgment['macrocosm']>['configurations'][number]['rarity']['status'];
  recurrenceAssessment: NonNullable<AstrologyJudgment['macrocosm']>['configurations'][number]['rarity']['assessment'];
  doNotClaimWarnings: string[];
  limitations: string[];
}

export interface AstrologyChannelBriefMacrocosmBrief {
  topConfigurationIds: string[];
  configurations: AstrologyChannelBriefMacroConfigurationSummary[];
  underStudiedAngles: string[];
  recurrenceStatus: {
    computed: string[];
    fenced: string[];
  };
  doNotClaimWarnings: string[];
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
    currentSkyRarity: AstrologyChannelBriefRaritySummary | null;
    scope: AstrologyJudgmentSignal['scope'] | 'collective';
  };
  personalRelevance: {
    summary: string;
    activatedLifeAreas: string[];
    scope: AstrologyJudgmentSignal['scope'] | 'collective';
    bridge: AstrologyChannelBriefReceipt['bridge'];
    macroBridge: AstrologyChannelBriefReceipt['macroBridge'];
  };
  topSignals: AstrologyChannelBriefTopSignal[];
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
  watchNext: {
    date: string | null;
    type: 'exact_hit' | 'station' | 'arc_close' | 'timing_only' | null;
    summary: string;
  };
  receipts: AstrologyChannelBriefReceipt[];
  objectInventory: AstrologyJudgment['objectInventory'];
  judgmentMetadata: AstrologyJudgmentMetadata;
  computedSkyFacts: {
    computed: AstrologyChannelBriefComputedSkyFact[];
    notComputed: AstrologyChannelBriefFencedSkyFact[];
  };
  hookAngles: AstrologyChannelHookAngle[];
  macrocosmBrief: AstrologyChannelBriefMacrocosmBrief;
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

function macroBridgeSummary(bridge: AstrologyMacroPersonalBridge | null | undefined) {
  if (!bridge) return null;
  return {
    configurationId: bridge.configurationId,
    bridgeStrengthTier: bridge.bridgeStrengthTier,
    manifestationClass: bridge.manifestationClass,
    decisionPressure: bridge.decisionPressure,
    activationArea: bridge.activationArea,
    matchedThemes: bridge.memoryLinks.matchedThemes,
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

function buildUrgency(timing: AstrologyJudgment['timing']): AstrologyChannelBrief['timing']['urgency'] {
  if (timing.currentPhase === 'exact') return 'immediate';
  if (timing.activeTransitCount > 0) return 'active';
  if (timing.nextWatchDate) return 'developing';
  return 'background';
}

function compactRarity(rarity: CollectiveSkyHistoricalRarityFact | null | undefined): AstrologyChannelBriefRaritySummary | null {
  if (!rarity) return null;

  return {
    status: rarity.status,
    confidence: rarity.confidence,
    historicalGapYears: rarity.historicalGapYears,
    limitations: rarity.limitations,
  };
}

function dedupe(values: Array<string | null | undefined>) {
  return values.filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
}

function buildReceipt(signal: AstrologyJudgmentSignal): AstrologyChannelBriefReceipt[] {
  return signal.receipts.map((receipt) => ({
    signalId: signal.id,
    signalTitle: signal.title,
    transitObject: receipt.transitObject
      ? {
        label: receipt.transitObject.label,
        category: receipt.transitObject.category,
        supportLevel: receipt.transitObject.supportLevel,
      }
      : null,
    transitPlanet: receipt.transitPlanet,
    transitDignity: receipt.transitDignity?.condition ?? null,
    aspect: receipt.aspect,
    natalTargetObject: receipt.natalTargetObject
      ? {
        label: receipt.natalTargetObject.label,
        category: receipt.natalTargetObject.category,
        supportLevel: receipt.natalTargetObject.supportLevel,
      }
      : null,
    targetLabel: receipt.targetLabel,
    natalDignity: receipt.natalProjection?.dignity?.condition ?? null,
    lifeArea: receipt.lifeArea,
    phase: receipt.phase,
    orb: receipt.orb,
    exactDate: receipt.exactDate,
    peakDate: receipt.peakDate,
    startDate: receipt.startDate,
    endDate: receipt.endDate,
    memorySummary: receipt.memorySummary,
    reception: receipt.reception?.map((fact) => ({
      system: fact.system,
      status: fact.status,
      direction: fact.direction,
    })) ?? [],
    sect: receipt.sect
      ? {
        chartSect: receipt.sect.chartSect,
        transitPlanetCondition: receipt.sect.transitPlanetCondition,
        natalTargetCondition: receipt.sect.natalTargetCondition,
      }
      : null,
    bridge: bridgeSummary(receipt.collectiveBridge ?? signal.collectiveBridge),
    macroBridge: macroBridgeSummary(receipt.macroBridge ?? signal.macroBridge),
    limitations: dedupe([
      ...(receipt.arcLifecycle?.limitations ?? []),
      ...(receipt.collectiveBridge?.limitations ?? []),
      ...(receipt.macroBridge?.limitations ?? []),
      ...(receipt.meaningFactors?.limitations ?? []),
      ...(receipt.currentSkyRarity?.limitations ?? []),
    ]),
    rarity: compactRarity(receipt.currentSkyRarity),
  }));
}

function buildTopSignals(judgment: AstrologyJudgment): AstrologyChannelBriefTopSignal[] {
  return [...judgment.foreground, ...judgment.supporting, ...judgment.background]
    .slice(0, 4)
    .map((signal) => ({
      signalId: signal.id,
      title: signal.title,
      summary: signal.summary,
      scope: signal.scope,
      source: signal.source,
      demand: signal.demand,
      score: signal.score,
      lifeAreas: signal.lifeAreas,
      supportNotes: signal.supportNotes.slice(0, 4),
      receiptCount: signal.receipts.length,
      collectiveEventIds: dedupe(signal.receipts.map((receipt) => (
        receipt.collectiveBridge?.collectiveEvent.id
          ?? signal.collectiveBridge?.collectiveEvent.id
          ?? null
      ))),
    }));
}

function buildComputedSkyFacts(currentSkyEvents: AstrologyCollectiveSkyEvent[]): AstrologyChannelBrief['computedSkyFacts'] {
  return {
    computed: currentSkyEvents
      .filter((event) => event.rarity.status === 'computed' && event.rarity.recurrence)
      .map((event) => ({
        eventId: event.id,
        kind: event.kind,
        bodies: event.bodies,
        aspect: event.aspect,
        sign: event.sign,
        exactnessBand: event.exactnessBand,
        summary: event.summary,
        recurrence: event.rarity.recurrence as CollectiveSkyHistoricalRecurrence,
        historicalGapYears: event.rarity.historicalGapYears,
        limitations: dedupe([...event.limitations, ...event.rarity.limitations]),
        receipts: event.receipts.slice(0, 4),
      })),
    notComputed: currentSkyEvents
      .filter((event) => event.rarity.status === 'not_computed')
      .map((event) => ({
        eventId: event.id,
        kind: event.kind,
        bodies: event.bodies,
        aspect: event.aspect,
        sign: event.sign,
        summary: event.summary,
        status: 'not_computed' as const,
        limitations: dedupe([...event.limitations, ...event.rarity.limitations]).slice(0, 4),
      })),
  };
}

function buildMacroDoNotClaimWarnings(judgment: AstrologyJudgment): string[] {
  const configurations = judgment.macrocosm?.configurations ?? [];

  return dedupe([
    ...configurations.flatMap((configuration) => configuration.rarity.status === 'computed'
      ? []
      : [`Do not claim historical recurrence for ${configuration.id}; macro recurrence is fenced as not_computed.`]),
    ...configurations.flatMap((configuration) => configuration.landscape?.statusLabel === 'saturated'
      ? [`Do not frame ${configuration.id} as a novel or nobody-is-talking-about-this angle; the landscape is already saturated.`]
      : []),
    ...configurations.flatMap((configuration) => configuration.landscape
      ? []
      : [`Do not infer novelty for ${configuration.id}; landscape coverage is unknown.`]),
    configurations.some((configuration) => configuration.landscape?.statusLabel === 'under_discussed' || configuration.landscape?.statusLabel === 'niche')
      ? 'Under-studied angles may be explored only as internal research prompts, not as SOS-exclusive claims.'
      : null,
  ]);
}

function buildMacrocosmBrief(judgment: AstrologyJudgment): AstrologyChannelBriefMacrocosmBrief {
  const configurations = (judgment.macrocosm?.configurations ?? []).slice(0, 4);
  const doNotClaimWarnings = buildMacroDoNotClaimWarnings(judgment);

  return {
    topConfigurationIds: configurations.map((configuration) => configuration.id),
    configurations: configurations.map((configuration) => ({
      configurationId: configuration.id,
      kind: configuration.kind,
      title: configuration.title,
      landscapeStatus: configuration.landscape?.statusLabel ?? 'unknown',
      underStudiedAngles: configuration.landscape?.underStudiedAngles ?? [],
      recurrenceStatus: configuration.rarity.status,
      recurrenceAssessment: configuration.rarity.assessment,
      doNotClaimWarnings: dedupe([
        ...doNotClaimWarnings.filter((warning) => warning.includes(configuration.id)),
        configuration.landscape?.statusLabel === 'saturated'
          ? 'Do not pretend novelty when this configuration is already saturated in the existing astrology landscape.'
          : null,
        configuration.rarity.status !== 'computed'
          ? 'Do not convert fenced macro recurrence into historical certainty.'
          : null,
      ]),
      limitations: dedupe([
        ...configuration.limitations,
        ...configuration.rarity.limitations,
        ...(configuration.landscape?.limitations ?? []),
      ]).slice(0, 6),
    })),
    underStudiedAngles: dedupe(configurations.flatMap((configuration) => configuration.landscape?.underStudiedAngles ?? [])).slice(0, 8),
    recurrenceStatus: {
      computed: configurations.filter((configuration) => configuration.rarity.status === 'computed').map((configuration) => configuration.id),
      fenced: configurations.filter((configuration) => configuration.rarity.status !== 'computed').map((configuration) => configuration.id),
    },
    doNotClaimWarnings,
    limitations: dedupe([
      ...(judgment.macrocosm?.limitations ?? []),
      configurations.length === 0 ? 'No macrocosm configurations were available for condensation in this brief.' : null,
    ]),
  };
}

export function buildAstrologyChannelBrief(judgment: AstrologyJudgment): AstrologyChannelBrief {
  const lead = selectLeadSignal(judgment);
  const leadBridge = bridgeSummary(lead?.collectiveBridge);
  const leadMacroBridge = macroBridgeSummary(lead?.macroBridge ?? lead?.receipts[0]?.macroBridge);
  const leadCurrentSkyEvent = lead?.collectiveBridge?.collectiveEvent ?? judgment.currentSky.events[0] ?? null;
  const leadCurrentSkyRarity = compactRarity(
    judgment.currentSky.events.find((event) => event.id === leadCurrentSkyEvent?.id)?.rarity
      ?? lead?.receipts[0]?.currentSkyRarity
      ?? null,
  );
  const supportingSignals = [...judgment.foreground, ...judgment.supporting, ...judgment.background].slice(0, 4);
  const receipts = supportingSignals.flatMap(buildReceipt).slice(0, 6);
  const topSignals = buildTopSignals(judgment);
  const currentSkySummary = compact(judgment.currentSky.summary, 'Current-sky summary is limited in this layer.');
  const leadLifeArea = lead?.lifeAreas[0] ?? judgment.activatedLifeAreas[0] ?? 'the active life area';
  const computedSkyFacts = buildComputedSkyFacts(judgment.currentSky.events);
  const macrocosmBrief = buildMacrocosmBrief(judgment);
  const watchNextReceipt = supportingSignals
    .flatMap((signal) => signal.receipts)
    .find((receipt) => Boolean(receipt.arcLifecycle?.watchNextDate));
  const timing = {
    ...judgment.timing,
    windowLabel: buildWindowLabel(judgment),
    urgency: buildUrgency(judgment.timing),
  };
  const judgmentMetadata = buildAstrologyJudgmentMetadata(judgment);

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
      currentSkyRarity: leadCurrentSkyRarity,
      scope: lead?.scope ?? 'collective',
    },
    personalRelevance: {
      summary: lead
        ? `This lands in ${leadLifeArea}.${leadMacroBridge ? ` Macro pressure is showing up as ${leadMacroBridge.manifestationClass} with ${leadMacroBridge.decisionPressure} decision pressure.` : ''} Use the bridge between the current sky and the personal chart when present, and keep unsupported claims out.`
        : 'Personal relevance is limited in this pass. Use only the explicit life-area and receipt data that exist.',
      activatedLifeAreas: judgment.activatedLifeAreas,
      scope: lead?.scope ?? 'collective',
      bridge: leadBridge,
      macroBridge: leadMacroBridge,
    },
    topSignals,
    channelRelevance: {
      social: leadCurrentSkyEvent
        ? 'Lead with the strongest current-sky event, then tie it to one concrete life-area demand or timing fact. Macro configuration ids and under-studied angles can inform hooks, but keep it short and receipt-backed.'
        : 'Lead with the clearest active demand and the next timing trigger. Do not turn a thin signal stack into a major claim.',
      substack: 'Use the dominant current-sky story, then move into personal/chart relevance, timing, macro landscape status, and limitations. Keep unsupported rarity or history claims explicit as unavailable.',
      aeonLore: 'Use this brief as internal source material for a longer plain-language analysis: current sky, personal activation, macro source truth, concrete demand, and what to watch next.',
    },
    timing,
    concreteDemand: judgment.practicalDemand,
    watchNext: {
      date: watchNextReceipt?.arcLifecycle?.watchNextDate ?? judgment.timing.nextWatchDate ?? null,
      type: watchNextReceipt?.arcLifecycle?.watchNextType ?? (judgment.timing.nextWatchDate ? 'timing_only' : null),
      summary: watchNextReceipt?.arcLifecycle?.watchNextDate
        ? `Watch ${watchNextReceipt.arcLifecycle.watchNextType?.replace('_', ' ') ?? 'next timing trigger'} on ${watchNextReceipt.arcLifecycle.watchNextDate}.`
        : judgment.timing.nextWatchDate
          ? `Watch ${judgment.timing.nextWatchDate} next.`
          : 'No separate watch-next date is available beyond the active timing window.',
    },
    receipts,
    objectInventory: judgment.objectInventory,
    judgmentMetadata,
    computedSkyFacts,
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
    macrocosmBrief,
    limitations: dedupe([
      ...macrocosmBrief.doNotClaimWarnings,
      ...judgment.currentSky.limitations,
      'This brief is an internal adapter. It is not final public copy.',
      'Historical rarity claims remain unavailable unless the engine computes them explicitly.',
      judgment.objectInventory.fencedLabels.length > 0
        ? `Unsupported/fenced objects stay fenced here: ${judgment.objectInventory.fencedLabels.join(', ')}.`
        : null,
      leadCurrentSkyRarity?.status === 'not_computed'
        ? 'Current-sky rarity stays fenced as not_computed when no bounded recurrence result exists.'
        : null,
      macrocosmBrief.recurrenceStatus.fenced.length > 0
        ? 'Macro recurrence stays fenced as not_computed unless a configuration receipt explicitly says computed.'
        : null,
    ]),
  };
}
