import type {
  AstrologyChannelBrief,
  AstrologyChannelBriefComputedSkyFact,
  AstrologyChannelBriefFencedSkyFact,
  AstrologyChannelBriefReceipt,
  AstrologyChannelBriefRaritySummary,
  AstrologyChannelBriefTopSignal,
} from '@/lib/astrology/channel-brief';
import type { AstrologyChannelBriefPreview } from '@/lib/astrology/channel-brief-preview';

export interface AstrologyLaneRarityRequirement {
  status: AstrologyChannelBriefRaritySummary['status'];
  confidence: AstrologyChannelBriefRaritySummary['confidence'];
  historicalGapYears: number | null;
  limitations: string[];
}

export interface AstrologyLaneReceiptRequirement {
  signalId: string;
  signalTitle: string;
  transitObject: AstrologyChannelBriefReceipt['transitObject'];
  transitPlanet: string;
  transitDignity: AstrologyChannelBriefReceipt['transitDignity'];
  aspect: string;
  natalTargetObject: AstrologyChannelBriefReceipt['natalTargetObject'];
  targetLabel: string;
  natalDignity: AstrologyChannelBriefReceipt['natalDignity'];
  lifeArea: string;
  exactDate: string | null;
  peakDate: string | null;
  startDate: string | null;
  endDate: string | null;
  reception: AstrologyChannelBriefReceipt['reception'];
  sect: AstrologyChannelBriefReceipt['sect'];
  limitations: string[];
  rarity: AstrologyLaneRarityRequirement | null;
}

export interface AstrologyLaneComputedSkyFact {
  eventId: AstrologyChannelBriefComputedSkyFact['eventId'];
  kind: AstrologyChannelBriefComputedSkyFact['kind'];
  bodies: string[];
  aspect: string | null;
  sign: string | null;
  summary: string;
  recurrence: AstrologyChannelBriefComputedSkyFact['recurrence'];
  historicalGapYears: number | null;
  limitations: string[];
  receipts: string[];
}

export interface AstrologyLaneFencedSkyFact {
  eventId: AstrologyChannelBriefFencedSkyFact['eventId'];
  kind: AstrologyChannelBriefFencedSkyFact['kind'];
  bodies: string[];
  aspect: string | null;
  sign: string | null;
  summary: string;
  status: 'not_computed';
  limitations: string[];
}

export interface AstrologyLaneSourceFact {
  key:
    | 'dominant_story'
    | 'current_sky'
    | 'personal_relevance'
    | 'timing_window'
    | 'concrete_demand'
    | 'watch_next'
    | 'limitations';
  fact: string;
  supportSignalIds: string[];
}

export interface AstrologyLaneTopSignal {
  signalId: AstrologyChannelBriefTopSignal['signalId'];
  title: string;
  summary: string;
  scope: AstrologyChannelBriefTopSignal['scope'];
  source: AstrologyChannelBriefTopSignal['source'];
  demand: AstrologyChannelBriefTopSignal['demand'];
  score: number;
  lifeAreas: string[];
  supportNotes: string[];
  receiptCount: number;
  collectiveEventIds: string[];
}

export interface AstrologyLaneJudgmentMetadataSummary {
  status: AstrologyChannelBrief['judgmentMetadata']['status'];
  signalCounts: AstrologyChannelBrief['judgmentMetadata']['signalCounts'];
  currentSky: AstrologyChannelBrief['judgmentMetadata']['currentSky'];
  availability: AstrologyChannelBrief['judgmentMetadata']['availability'];
  lead: AstrologyChannelBrief['judgmentMetadata']['lead'];
  limitations: string[];
}

export interface AstrologyLaneObjectInventorySummary {
  status: AstrologyChannelBrief['objectInventory']['status'];
  transitLabels: string[];
  targetLabels: string[];
  categoryCounts: AstrologyChannelBrief['objectInventory']['categoryCounts'];
  fencedLabels: string[];
}

export interface AstrologyLaneWatchNext {
  date: string | null;
  type: AstrologyChannelBrief['watchNext']['type'];
  summary: string;
}

export interface AstrologySocialsHookCandidate {
  key: 'current_sky_hook' | 'timing_hook' | 'utility_hook';
  premise: string;
  utilityAngle: string;
  receiptSignalIds: string[];
  timingRequirement: string;
}

export interface AstrologyEditorialOutlineSection {
  key: 'big_sky' | 'personal_landing' | 'limitations' | 'watch_next';
  prompt: string;
}

interface AstrologyLaneInputBase {
  lane: 'socials' | 'substack' | 'aeon_lore';
  channelFit: string;
  sourceFacts: AstrologyLaneSourceFact[];
  allowedAngles: string[];
  requiredReceipts: AstrologyLaneReceiptRequirement[];
  laneWarnings: string[];
  limitations: string[];
  doNotClaim: string[];
  toneRules: string[];
}

export interface AstrologySocialsLaneInput extends AstrologyLaneInputBase {
  lane: 'socials';
  hookCandidates: AstrologySocialsHookCandidate[];
  timingRequirements: string[];
  utilityAngle: string;
}

export interface AstrologyEditorialLaneInput extends AstrologyLaneInputBase {
  lane: 'substack' | 'aeon_lore';
  bigSkyOutline: AstrologyEditorialOutlineSection[];
  personalLanding: string;
  watchNext: string;
}

export interface AstrologyLaneInputBundle {
  status: 'astrology-lane-input-adapter-v1';
  date: string;
  privacy: 'internal-operator-only';
  mainSkyStory: AstrologyChannelBrief['dominantStory'];
  topSignals: AstrologyLaneTopSignal[];
  watchNext: AstrologyLaneWatchNext;
  judgmentMetadata: AstrologyLaneJudgmentMetadataSummary;
  objectInventory: AstrologyLaneObjectInventorySummary;
  computedSkyFacts: {
    computed: AstrologyLaneComputedSkyFact[];
    notComputed: AstrologyLaneFencedSkyFact[];
  };
  source: {
    briefStatus: AstrologyChannelBrief['status'];
    previewStatus: AstrologyChannelBriefPreview['status'] | null;
    mode: AstrologyChannelBriefPreview['mode'] | null;
    fixtureId: string | null;
    userId: string | null;
  };
  lanes: {
    socials: AstrologySocialsLaneInput;
    substack: AstrologyEditorialLaneInput;
    aeonLore: AstrologyEditorialLaneInput;
  };
}

export type AstrologyLaneKey = keyof AstrologyLaneInputBundle['lanes'];

export interface AstrologyLaneInputExport {
  status: 'astrology-lane-input-export-v1';
  date: string;
  privacy: 'internal-operator-only';
  requestedLane: AstrologyLaneKey | null;
  mainSkyStory: AstrologyLaneInputBundle['mainSkyStory'];
  topSignals: AstrologyLaneInputBundle['topSignals'];
  watchNext: AstrologyLaneInputBundle['watchNext'];
  judgmentMetadata: AstrologyLaneInputBundle['judgmentMetadata'];
  objectInventory: AstrologyLaneInputBundle['objectInventory'];
  computedSkyFacts: AstrologyLaneInputBundle['computedSkyFacts'];
  source: AstrologyLaneInputBundle['source'];
  lanes: Partial<AstrologyLaneInputBundle['lanes']>;
}

const BASE_TONE_RULES = [
  'Plain language only.',
  'Stay precise, adult, and consequential.',
  'No poetic filler, no mystical fog, no horoscope softness.',
  'Keep unsupported history or rarity claims fenced as unavailable.',
];

const BASE_DO_NOT_CLAIM = [
  'Do not present this as final public copy.',
  'Do not claim historical rarity unless the engine computes it.',
  'Do not invent emotional certainty, outcomes, or guaranteed events.',
  'Do not turn a timing window into scheduling instructions.',
  'Do not collapse this into generic sign-only astrology.',
  'Do not imply fenced objects or unsupported asteroid logic were computed.',
];

function dedupe(values: Array<string | null | undefined>) {
  return values.filter((value, index, all): value is string => Boolean(value) && all.indexOf(value) === index);
}

function compact(value: string | null | undefined, fallback: string) {
  const text = value?.replace(/\s+/g, ' ').trim();
  return text ? text : fallback;
}

function buildReceiptRequirement(receipt: AstrologyChannelBriefReceipt): AstrologyLaneReceiptRequirement {
  return {
    signalId: receipt.signalId,
    signalTitle: receipt.signalTitle,
    transitObject: receipt.transitObject,
    transitPlanet: receipt.transitPlanet,
    transitDignity: receipt.transitDignity,
    aspect: receipt.aspect,
    natalTargetObject: receipt.natalTargetObject,
    targetLabel: receipt.targetLabel,
    natalDignity: receipt.natalDignity,
    lifeArea: receipt.lifeArea,
    exactDate: receipt.exactDate,
    peakDate: receipt.peakDate,
    startDate: receipt.startDate,
    endDate: receipt.endDate,
    reception: receipt.reception,
    sect: receipt.sect,
    limitations: dedupe([
      ...receipt.limitations,
      'Historical rarity remains unavailable here unless a computed value is supplied.',
    ]),
    rarity: receipt.rarity
      ? {
        status: receipt.rarity.status,
        confidence: receipt.rarity.confidence,
        historicalGapYears: receipt.rarity.historicalGapYears,
        limitations: receipt.rarity.limitations,
      }
      : null,
  };
}

function buildComputedSkyFacts(brief: AstrologyChannelBrief): AstrologyLaneInputBundle['computedSkyFacts'] {
  return {
    computed: brief.computedSkyFacts.computed.map((fact) => ({
      eventId: fact.eventId,
      kind: fact.kind,
      bodies: fact.bodies,
      aspect: fact.aspect,
      sign: fact.sign,
      summary: fact.summary,
      recurrence: fact.recurrence,
      historicalGapYears: fact.historicalGapYears,
      limitations: fact.limitations,
      receipts: fact.receipts,
    })),
    notComputed: brief.computedSkyFacts.notComputed.map((fact) => ({
      eventId: fact.eventId,
      kind: fact.kind,
      bodies: fact.bodies,
      aspect: fact.aspect,
      sign: fact.sign,
      summary: fact.summary,
      status: fact.status,
      limitations: fact.limitations,
    })),
  };
}

function getWatchNext(brief: AstrologyChannelBrief): AstrologyLaneWatchNext {
  return brief.watchNext ?? {
    date: brief.timing.nextWatchDate ?? null,
    type: brief.timing.nextWatchDate ? 'timing_only' : null,
    summary: brief.timing.nextWatchDate
      ? `Watch ${brief.timing.nextWatchDate} next.`
      : 'Watch-next guidance is limited in this pass.',
  };
}

function getTopSignals(brief: AstrologyChannelBrief): AstrologyChannelBriefTopSignal[] {
  return brief.topSignals ?? [];
}

function getJudgmentMetadata(brief: AstrologyChannelBrief): AstrologyLaneJudgmentMetadataSummary {
  return brief.judgmentMetadata ?? {
    status: 'astrology-judgment-metadata-v1',
    signalCounts: {
      foreground: 0,
      supporting: 0,
      background: 0,
      noise: 0,
      total: 0,
      bySource: {
        major_arc: 0,
        daily_transit: 0,
        guidance: 0,
        memory: 0,
      },
    },
    currentSky: {
      eventCount: brief.computedSkyFacts.computed.length + brief.computedSkyFacts.notComputed.length,
      computedFactCount: brief.computedSkyFacts.computed.length,
      fencedFactCount: brief.computedSkyFacts.notComputed.length,
      rarityAssessments: {
        computedRecurrence: brief.computedSkyFacts.computed.length,
        boundedLimited: 0,
        heuristicOnly: 0,
        unsupported: 0,
      },
    },
    availability: {
      transitDignityReceipts: brief.receipts.filter((receipt) => Boolean(receipt.transitDignity)).length,
      natalDignityReceipts: brief.receipts.filter((receipt) => Boolean(receipt.natalDignity)).length,
      receptionReceipts: brief.receipts.filter((receipt) => receipt.reception.length > 0).length,
      supportedReceptionReceipts: brief.receipts.filter((receipt) => receipt.reception.some((fact) => fact.status !== 'unavailable')).length,
      sectReceipts: brief.receipts.filter((receipt) => Boolean(receipt.sect)).length,
      arcLifecycleReceipts: brief.receipts.filter((receipt) => Boolean(receipt.exactDate || receipt.peakDate || receipt.endDate)).length,
      collectiveBridgeReceipts: brief.receipts.filter((receipt) => Boolean(receipt.bridge)).length,
    },
    lead: {
      signalIds: brief.receipts.slice(0, 3).map((receipt) => receipt.signalId),
      currentSkyEventIds: brief.dominantStory.collectiveEventIds.slice(0, 3),
    },
    limitations: brief.limitations.slice(0, 8),
  };
}

function getObjectInventory(brief: AstrologyChannelBrief): AstrologyLaneObjectInventorySummary {
  return brief.objectInventory ?? {
    status: 'expanded-object-inventory-v1',
    transitLabels: brief.receipts.map((receipt) => receipt.transitObject?.label ?? receipt.transitPlanet).slice(0, 8),
    targetLabels: brief.receipts.map((receipt) => receipt.natalTargetObject?.label ?? receipt.targetLabel).slice(0, 8),
    categoryCounts: {},
    fencedLabels: [],
  };
}

function buildSourceFacts(brief: AstrologyChannelBrief): AstrologyLaneSourceFact[] {
  const watchNext = getWatchNext(brief);
  return [
    {
      key: 'dominant_story',
      fact: compact(brief.dominantStory.summary, 'Dominant story is limited in this pass.'),
      supportSignalIds: brief.dominantStory.signalId ? [brief.dominantStory.signalId] : [],
    },
    {
      key: 'current_sky',
      fact: compact(brief.dominantStory.currentSkySummary, 'Current-sky summary is limited in this pass.'),
      supportSignalIds: brief.dominantStory.signalId ? [brief.dominantStory.signalId] : [],
    },
    {
      key: 'personal_relevance',
      fact: compact(brief.personalRelevance.summary, 'Personal relevance is limited in this pass.'),
      supportSignalIds: brief.receipts.slice(0, 2).map((receipt) => receipt.signalId),
    },
    {
      key: 'timing_window',
      fact: compact(brief.timing.windowLabel, 'Timing is limited in this pass.'),
      supportSignalIds: brief.receipts.slice(0, 2).map((receipt) => receipt.signalId),
    },
    {
      key: 'concrete_demand',
      fact: compact(brief.concreteDemand, 'Concrete demand is limited in this pass.'),
      supportSignalIds: brief.receipts.slice(0, 2).map((receipt) => receipt.signalId),
    },
    {
      key: 'watch_next',
      fact: compact(watchNext.summary, 'Watch-next guidance is limited in this pass.'),
      supportSignalIds: brief.receipts.slice(0, 2).map((receipt) => receipt.signalId),
    },
    {
      key: 'limitations',
      fact: [
        brief.dominantStory.currentSkyRarity
          ? `Current-sky rarity status: ${brief.dominantStory.currentSkyRarity.status}${brief.dominantStory.currentSkyRarity.historicalGapYears != null ? ` (${brief.dominantStory.currentSkyRarity.historicalGapYears}y spacing).` : '.'}`
          : null,
        brief.limitations.join(' '),
      ].filter(Boolean).join(' '),
      supportSignalIds: [],
    },
  ];
}

function buildTopSignals(brief: AstrologyChannelBrief): AstrologyLaneTopSignal[] {
  return getTopSignals(brief).map((signal) => ({
    signalId: signal.signalId,
    title: signal.title,
    summary: signal.summary,
    scope: signal.scope,
    source: signal.source,
    demand: signal.demand,
    score: signal.score,
    lifeAreas: signal.lifeAreas,
    supportNotes: signal.supportNotes,
    receiptCount: signal.receiptCount,
    collectiveEventIds: signal.collectiveEventIds,
  }));
}

function buildAllowedAngles(brief: AstrologyChannelBrief, lane: 'socials' | 'substack' | 'aeon_lore') {
  const surface = lane === 'socials' ? 'social' : lane;
  const laneHookAngles = brief.hookAngles.filter((angle) => angle.surfaces.includes(surface));
  const angles = laneHookAngles.map((angle) => angle.rationale);

  if (lane === 'socials') {
    angles.push('Lead with one concrete sky-to-life connection that a person would save or send because it is useful, not because it sounds pretty.');
  } else if (lane === 'substack') {
    angles.push('Start big-sky first, then land it in the personal chart, then name what the reader should watch next.');
  } else {
    angles.push('Keep this as a longer plain-language analysis input, not a script, not a performance, and not a cinematic narration.');
  }

  return dedupe(angles);
}

function buildTimingRequirements(brief: AstrologyChannelBrief) {
  return dedupe([
    brief.timing.windowLabel,
    brief.timing.exactDate ? `Use the exact-date receipt if timing is foregrounded: ${brief.timing.exactDate}.` : 'If no exact date exists, say timing is active or developing rather than pretending to know the precise peak.',
    getWatchNext(brief).date ? `Include what to watch next on ${getWatchNext(brief).date}.` : 'If no next watch date exists, keep watch-next language limited.',
  ]);
}

function buildSocialsHookCandidates(brief: AstrologyChannelBrief): AstrologySocialsHookCandidate[] {
  const leadReceipt = brief.receipts[0] ?? null;
  const lifeArea = leadReceipt?.lifeArea ?? brief.personalRelevance.activatedLifeAreas[0] ?? 'the active life area';
  const signalIds = brief.receipts.slice(0, 2).map((receipt) => receipt.signalId);

  return [
    {
      key: 'current_sky_hook',
      premise: `${brief.dominantStory.currentSkySummary} Tie it directly to ${lifeArea}.`,
      utilityAngle: 'Give people one useful reason to save this: it explains what pressure is actually active.',
      receiptSignalIds: signalIds,
      timingRequirement: brief.timing.windowLabel,
    },
    {
      key: 'timing_hook',
      premise: `Use the timing window as the frame: ${brief.timing.windowLabel}`,
      utilityAngle: 'Make it easy to send to someone because the timing is concrete, not vague.',
      receiptSignalIds: signalIds,
      timingRequirement: brief.timing.exactDate
        ? `Anchor timing to the exact date receipt ${brief.timing.exactDate}.`
        : 'If no exact date exists, keep the timing claim broad and receipt-backed.',
    },
    {
      key: 'utility_hook',
      premise: `Name the demand in plain language: ${brief.concreteDemand}`,
      utilityAngle: 'Frame the post as a useful interpretation someone can act on or compare against their own life.',
      receiptSignalIds: signalIds,
      timingRequirement: getWatchNext(brief).date
        ? `Include what to watch next on ${getWatchNext(brief).date}.`
        : 'Use timing only as far as the current receipts support it.',
    },
  ];
}

function buildEditorialOutline(brief: AstrologyChannelBrief, lane: 'substack' | 'aeon_lore'): AstrologyEditorialOutlineSection[] {
  return [
    {
      key: 'big_sky',
      prompt: `Start with the big sky in plain language: ${brief.dominantStory.currentSkySummary}`,
    },
    {
      key: 'personal_landing',
      prompt: `Land it personally using the explicit life areas, dignity/reception/sect availability, and receipts: ${brief.personalRelevance.summary}`,
    },
    {
      key: 'limitations',
      prompt: `State the limitations cleanly, including unavailable rarity/history data and fenced objects: ${brief.limitations.join(' ')}`,
    },
    {
      key: 'watch_next',
      prompt: lane === 'substack'
        ? `Close with what to watch next and why it matters: ${getWatchNext(brief).summary}`
        : `Close with a plain-language watch-next section, not a script beat: ${getWatchNext(brief).summary}`,
    },
  ];
}

function buildLaneWarnings(brief: AstrologyChannelBrief, lane: 'socials' | 'substack' | 'aeon_lore') {
  const laneSpecific = lane === 'socials'
    ? [
      'Use hook candidates as briefing inputs only. Do not draft final captions here.',
      'Do not flatten this into sign-by-sign generic astrology without the engine receipts.',
    ]
    : lane === 'substack'
      ? [
        'This is an internal essay brief, not a drafted article.',
        'Any rarity claim must trace to computedSkyFacts.computed or an explicit receipt rarity status of computed.',
      ]
      : [
        'This is an internal Aeon Lore analysis brief, not a script or performance narration.',
        'Keep the analysis tied to current-sky evidence, personal activation, and explicit limits.',
      ];

  const availabilityWarnings = [
    getJudgmentMetadata(brief).availability.receptionReceipts === 0 ? 'No supported reception receipts are available in this export; do not imply reception analysis.' : null,
    getJudgmentMetadata(brief).availability.sectReceipts === 0 ? 'No sect receipts are available in this export; do not imply sect analysis.' : null,
    getObjectInventory(brief).fencedLabels.length > 0 ? `Fenced objects remain out of scope here: ${getObjectInventory(brief).fencedLabels.join(', ')}.` : null,
  ];

  return dedupe([...laneSpecific, ...availabilityWarnings]);
}

function buildCommonLimitations(brief: AstrologyChannelBrief, lane: 'socials' | 'substack' | 'aeon_lore') {
  const laneSpecific = lane === 'socials'
    ? ['Do not treat hook candidates as finished captions.']
    : lane === 'substack'
      ? ['Do not treat this as a drafted essay or final newsletter body.']
      : ['Do not treat this as a video script, shot list, or performance narration.'];

  return dedupe([
    ...brief.limitations,
    ...brief.receipts.flatMap((receipt) => receipt.limitations),
    ...laneSpecific,
    'Historical rarity remains unavailable here unless a computed value is supplied.',
  ]);
}

export function buildAstrologyLaneInputBundle(brief: AstrologyChannelBrief): AstrologyLaneInputBundle {
  const requiredReceipts = brief.receipts.slice(0, 6).map(buildReceiptRequirement);
  const sourceFacts = buildSourceFacts(brief);
  const watchNext = getWatchNext(brief);
  const judgmentMetadata = getJudgmentMetadata(brief);
  const objectInventory = getObjectInventory(brief);
  const socialsLimitations = buildCommonLimitations(brief, 'socials');
  const substackLimitations = buildCommonLimitations(brief, 'substack');
  const aeonLoreLimitations = buildCommonLimitations(brief, 'aeon_lore');

  return {
    status: 'astrology-lane-input-adapter-v1',
    date: brief.date,
    privacy: 'internal-operator-only',
    mainSkyStory: brief.dominantStory,
    topSignals: buildTopSignals(brief),
    watchNext,
    judgmentMetadata,
    objectInventory,
    computedSkyFacts: buildComputedSkyFacts(brief),
    source: {
      briefStatus: brief.status,
      previewStatus: null,
      mode: null,
      fixtureId: null,
      userId: null,
    },
    lanes: {
      socials: {
        lane: 'socials',
        channelFit: 'Short-form internal input for save/send utility. Use hook candidates, receipts, warnings, and timing requirements only. Not a final caption.',
        sourceFacts,
        allowedAngles: buildAllowedAngles(brief, 'socials'),
        requiredReceipts,
        laneWarnings: buildLaneWarnings(brief, 'socials'),
        limitations: socialsLimitations,
        doNotClaim: BASE_DO_NOT_CLAIM,
        toneRules: BASE_TONE_RULES,
        hookCandidates: buildSocialsHookCandidates(brief),
        timingRequirements: buildTimingRequirements(brief),
        utilityAngle: 'Prioritize the angle that explains why the current sky matters now, where it lands personally, and why someone would save or send it for practical use.',
      },
      substack: {
        lane: 'substack',
        channelFit: 'Longer-form internal outline for a contextual essay. Start with the sky, then personal relevance, then limitations and watch-next. Not a final article.',
        sourceFacts,
        allowedAngles: buildAllowedAngles(brief, 'substack'),
        requiredReceipts,
        laneWarnings: buildLaneWarnings(brief, 'substack'),
        limitations: substackLimitations,
        doNotClaim: BASE_DO_NOT_CLAIM,
        toneRules: BASE_TONE_RULES,
        bigSkyOutline: buildEditorialOutline(brief, 'substack'),
        personalLanding: compact(brief.personalRelevance.summary, 'Personal landing is limited in this pass.'),
        watchNext: watchNext.date
          ? `Watch ${watchNext.date} next and keep the interpretation tied to explicit receipts.`
          : `Use the active timing window only as far as the receipts support it: ${brief.timing.windowLabel}`,
      },
      aeonLore: {
        lane: 'aeon_lore',
        channelFit: 'Longer plain-language internal analysis input for Aeon Lore. Not a video script and not final audience copy.',
        sourceFacts,
        allowedAngles: buildAllowedAngles(brief, 'aeon_lore'),
        requiredReceipts,
        laneWarnings: buildLaneWarnings(brief, 'aeon_lore'),
        limitations: aeonLoreLimitations,
        doNotClaim: BASE_DO_NOT_CLAIM,
        toneRules: BASE_TONE_RULES,
        bigSkyOutline: buildEditorialOutline(brief, 'aeon_lore'),
        personalLanding: `${compact(brief.personalRelevance.summary, 'Personal landing is limited in this pass.')} Keep it in plain language and stay with the strongest life-area activation.`,
        watchNext: watchNext.date
          ? `Extend the analysis by naming what to watch next on ${watchNext.date}, without pretending to know the outcome.`
          : `Extend the analysis with the existing timing window only: ${brief.timing.windowLabel}`,
      },
    },
  };
}

export function buildAstrologyLaneInputBundleFromPreview(preview: AstrologyChannelBriefPreview): AstrologyLaneInputBundle {
  return {
    ...buildAstrologyLaneInputBundle(preview.channelBrief),
    source: {
      briefStatus: preview.channelBrief.status,
      previewStatus: preview.status,
      mode: preview.mode,
      fixtureId: preview.source.fixtureId,
      userId: preview.source.userId,
    },
  };
}

export function isAstrologyLaneKey(value: string | null | undefined): value is AstrologyLaneKey {
  return value === 'socials' || value === 'substack' || value === 'aeonLore';
}

export function buildAstrologyLaneInputExport(
  bundle: AstrologyLaneInputBundle,
  requestedLane: AstrologyLaneKey | null = null,
): AstrologyLaneInputExport {
  const lanes = requestedLane
    ? { [requestedLane]: bundle.lanes[requestedLane] }
    : bundle.lanes;

  return {
    status: 'astrology-lane-input-export-v1',
    date: bundle.date,
    privacy: bundle.privacy,
    requestedLane,
    mainSkyStory: bundle.mainSkyStory,
    topSignals: bundle.topSignals,
    watchNext: bundle.watchNext,
    judgmentMetadata: bundle.judgmentMetadata,
    objectInventory: bundle.objectInventory,
    computedSkyFacts: bundle.computedSkyFacts,
    source: bundle.source,
    lanes,
  };
}
