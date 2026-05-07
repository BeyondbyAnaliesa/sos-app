import { buildNatalSummary, type DailyTransits, type Transit } from '@/lib/astrology/domain-types';
import { getPlanetaryPositions } from '@/lib/astrology/calculate-transits';
import { buildCollectiveSkyBodyState, scanCurrentSkyFromPositions } from '@/lib/astrology/current-sky';
import {
  bridgeScope,
  buildCollectivePersonalBridge,
  collectiveBridgeScoreBonus,
} from '@/lib/astrology/collective-personal-bridge';
import {
  meaningScoreBonus,
  pickMeaningDemand,
  resolveMeaningFactors,
} from '@/lib/astrology/meaning-kernel';
import { buildNatalProjection } from '@/lib/astrology/natal-projection';
import { buildTransitArcJudgment } from '@/lib/astrology/transit-arc-judgment';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import type { GuidanceResult } from '@/lib/interpret';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import { transitKey, transitTitle } from '@/lib/transit-copy';
import type {
  AstrologyCollectiveSkyEvent,
  AstrologyJudgment,
  AstrologyJudgmentReceipt,
  AstrologyJudgmentSignal,
  JudgmentDemandType,
  JudgmentPhase,
  JudgmentTier,
} from '@/lib/astrology/judgment-types';

type PositionedTransitBody = ReturnType<typeof getPlanetaryPositions>[number] & {
  sign: string;
  degree: number;
};

const PLANET_WEIGHT: Record<string, number> = {
  Sun: 0.4,
  Moon: 0.2,
  Mercury: 0.5,
  Venus: 0.6,
  Mars: 0.8,
  Jupiter: 1,
  Saturn: 1.2,
  Uranus: 1.25,
  Neptune: 1.25,
  Pluto: 1.35,
  Chiron: 0.9,
  'North Node': 0.85,
};

const ASPECT_WEIGHT: Record<string, number> = {
  conjunction: 1.3,
  opposition: 1.2,
  square: 1.15,
  trine: 0.9,
  sextile: 0.7,
};

function compactText(value: unknown, max = 160) {
  if (!value) return '';
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function dedupe<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function phaseFromArc(arc: MajorTransitArc): JudgmentPhase {
  if (arc.phase === 'peaking' || (arc.todayOrb != null && arc.todayOrb <= 0.75)) return 'exact';
  return arc.phase === 'building' ? 'applying' : 'separating';
}

function phaseFromTransit(transit: Transit): JudgmentPhase {
  return transit.orb <= 0.75 ? 'exact' : transit.orb <= 2.5 ? 'applying' : 'separating';
}

function tierFromScore(score: number): JudgmentTier {
  if (score >= 3.2) return 'foreground';
  if (score >= 2.2) return 'supporting';
  if (score >= 1.2) return 'background';
  return 'noise';
}

function demandFor(transitPlanet: string, aspect: string, meaningDemand?: JudgmentDemandType | null): JudgmentDemandType {
  const fallback = transitPlanet === 'Saturn'
    ? (aspect === 'trine' || aspect === 'sextile' ? 'support' : 'restructuring')
    : transitPlanet === 'Jupiter'
      ? 'expansion'
      : transitPlanet === 'Uranus' || transitPlanet === 'Pluto'
        ? 'destabilization'
        : transitPlanet === 'Neptune' || transitPlanet === 'Mercury'
          ? 'clarification'
          : aspect === 'trine' || aspect === 'sextile'
            ? 'support'
            : 'pressure';

  return meaningDemand ?? fallback;
}

function scoreTransitSignal(transit: Transit, activeToday = false, hasMemory = false): number {
  const planet = PLANET_WEIGHT[transit.transitPlanet] ?? 0.5;
  const aspect = ASPECT_WEIGHT[transit.aspect] ?? 0.6;
  const closeness = Math.max(0.2, 1.8 - Math.min(transit.orb, 6) * 0.22);
  return Number((planet + aspect + closeness + (activeToday ? 0.4 : 0) + (hasMemory ? 0.35 : 0)).toFixed(2));
}

function countLifeAreaRepeats(memory: MajorWaveMemoryInput, lifeArea: string, targetLabel: string) {
  return matchingLifeSignals(memory, lifeArea, targetLabel).length;
}

function findCurrentSkyEvent(events: AstrologyCollectiveSkyEvent[], body: string) {
  return events.find((event) => event.bodies.includes(body)) ?? null;
}

function applyCollectiveBridge(receipt: AstrologyJudgmentReceipt, currentSkyEvents: AstrologyCollectiveSkyEvent[]) {
  const collectiveBridge = buildCollectivePersonalBridge(receipt, currentSkyEvents);
  const currentSkyEvent = collectiveBridge
    ? currentSkyEvents.find((event) => event.id === collectiveBridge.collectiveEvent.id) ?? findCurrentSkyEvent(currentSkyEvents, receipt.transitPlanet)
    : findCurrentSkyEvent(currentSkyEvents, receipt.transitPlanet);

  return {
    ...receipt,
    collectiveBridge,
    currentSkyRarity: currentSkyEvent?.rarity ?? null,
    meaningFactors: resolveMeaningFactors({
      transitBody: receipt.transitPlanet,
      aspect: receipt.aspect,
      natalTargetLabel: receipt.targetLabel,
      targetHouse: receipt.natalProjection?.targetHouse ?? receipt.natalHouse,
      demand: demandFor(receipt.transitPlanet, receipt.aspect),
      phase: receipt.phase,
      currentSkyEvent,
    }),
  };
}

function natalProjectionScoreBonus(receipt: AstrologyJudgmentReceipt) {
  const projection = receipt.natalProjection;
  if (!projection) return 0;

  let bonus = 0;
  if (projection.targetIsAngle) bonus += 0.7;
  else if (projection.angularity === 'angular') bonus += 0.35;
  else if (projection.angularity === 'succedent') bonus += 0.1;

  if (projection.targetIsModernChartRuler || projection.targetIsTraditionalChartRuler) bonus += 0.55;
  if (projection.repeatedLifeAreaSignalCount >= 3) bonus += 0.25;
  else if (projection.repeatedLifeAreaSignalCount >= 2) bonus += 0.12;

  return Number(bonus.toFixed(2));
}

function matchingLifeSignals(memory: MajorWaveMemoryInput, lifeArea: string, targetLabel: string) {
  const areaWords = lifeArea.toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 3);
  const target = targetLabel.toLowerCase();

  return (memory.lifeSignals ?? []).filter((signal) => {
    const haystack = [
      signal.content_text,
      signal.life_domain,
      ...(signal.themes_json ?? []),
      ...(signal.emotions_json ?? []),
    ].join(' ').toLowerCase();

    return haystack.includes(target) || areaWords.some((word) => haystack.includes(word));
  });
}

function buildMemorySummary(memory: MajorWaveMemoryInput, lifeArea: string, targetLabel: string) {
  const matches = matchingLifeSignals(memory, lifeArea, targetLabel).slice(0, 2);
  if (matches.length === 0) return null;

  return matches.map((signal) => {
    const text = compactText(signal.content_text, 80);
    const theme = signal.themes_json?.[0] ?? signal.life_domain ?? null;
    return text || theme || 'saved life signal';
  }).join(' | ');
}

function buildArcReceipt(
  arc: MajorTransitArc,
  chart: NatalChart,
  positions: PositionedTransitBody[],
  memory: MajorWaveMemoryInput,
  date: string,
  currentSkyEvents: AstrologyCollectiveSkyEvent[],
): AstrologyJudgmentReceipt {
  const position = positions.find((item) => item.label === arc.transit.transitPlanet);
  const lifeArea = arc.context.targetHouse != null
    ? buildNatalProjection({ chart, targetKey: arc.transit.natalPlanet, targetLabel: arc.context.targetLabel }).house.label
    : arc.context.lifeArea;
  const memorySummary = buildMemorySummary(memory, lifeArea, arc.context.targetLabel);
  const repeatedLifeAreaSignalCount = countLifeAreaRepeats(memory, lifeArea, arc.context.targetLabel);
  const natalProjection = buildNatalProjection({
    chart,
    targetKey: arc.transit.natalPlanet,
    targetLabel: arc.context.targetLabel,
    repeatedLifeAreaSignalCount,
  });
  const arcLifecycle = buildTransitArcJudgment({ arc, chart, memory, date });

  return applyCollectiveBridge({
    arcKey: arc.key,
    transitPlanet: arc.transit.transitPlanet,
    aspect: arc.transit.aspect,
    natalTarget: arc.transit.natalPlanet,
    targetLabel: arc.context.targetLabel,
    orb: arc.todayOrb ?? arc.peakOrb,
    phase: phaseFromArc(arc),
    transitSign: position?.sign ?? null,
    transitDegree: position ? Number(position.degree.toFixed(2)) : null,
    natalSign: arc.context.targetSign,
    natalHouse: arc.context.targetHouse,
    lifeArea,
    exactDate: arc.exactHits[0]?.date ?? null,
    peakDate: arc.peakDate,
    startDate: arc.startDate,
    endDate: arc.endDate,
    passCount: arc.activeRunCount,
    currentPass: arcLifecycle.currentPass,
    stations: arc.stations,
    memorySummary,
    natalProjection,
    arcLifecycle,
  }, currentSkyEvents);
}

function buildTransitReceipt(
  transit: Transit,
  chart: NatalChart,
  positions: PositionedTransitBody[],
  memory: MajorWaveMemoryInput,
  currentSkyEvents: AstrologyCollectiveSkyEvent[],
): AstrologyJudgmentReceipt {
  const natalSummary = buildNatalSummary(chart);
  const natalPlacement = transit.natalPlanet === 'ascendant'
    ? natalSummary.ascendant
    : transit.natalPlanet === 'midheaven'
      ? natalSummary.midheaven
      : natalSummary.placementsByKey[transit.natalPlanet];
  const position = positions.find((item) => item.label === transit.transitPlanet);
  const defaultLifeArea = transit.natalPlanet === 'ascendant'
    ? 'identity, body, and the way life is meeting you'
    : transit.natalPlanet === 'midheaven'
      ? 'career direction, reputation, and public visibility'
      : natalPlacement && 'house' in natalPlacement
        ? `house ${natalPlacement.house}`
        : 'core chart activation';
  const targetLabel = transit.natalPlanet === 'ascendant'
    ? 'Ascendant'
    : transit.natalPlanet === 'midheaven'
      ? 'Midheaven'
      : natalPlacement && 'label' in natalPlacement
        ? natalPlacement.label
        : transit.natalPlanet;
  const natalProjection = buildNatalProjection({
    chart,
    targetKey: transit.natalPlanet,
    targetLabel,
  });
  const lifeArea = natalProjection.house.label ?? defaultLifeArea;
  const repeatedLifeAreaSignalCount = countLifeAreaRepeats(memory, lifeArea, targetLabel);

  return applyCollectiveBridge({
    transitPlanet: transit.transitPlanet,
    aspect: transit.aspect,
    natalTarget: transit.natalPlanet,
    targetLabel,
    orb: transit.orb,
    phase: phaseFromTransit(transit),
    transitSign: position?.sign ?? null,
    transitDegree: position ? Number(position.degree.toFixed(2)) : null,
    natalSign: natalPlacement?.sign ?? null,
    natalHouse: natalPlacement && 'house' in natalPlacement ? natalPlacement.house : null,
    lifeArea,
    exactDate: null,
    peakDate: null,
    startDate: null,
    endDate: null,
    passCount: null,
    currentPass: null,
    stations: [],
    memorySummary: buildMemorySummary(memory, lifeArea, targetLabel),
    natalProjection: { ...natalProjection, repeatedLifeAreaSignalCount },
  }, currentSkyEvents);
}

function buildSignalFromArc(
  arc: MajorTransitArc,
  chart: NatalChart,
  positions: PositionedTransitBody[],
  memory: MajorWaveMemoryInput,
  date: string,
  currentSkyEvents: AstrologyCollectiveSkyEvent[],
): AstrologyJudgmentSignal {
  const receipt = buildArcReceipt(arc, chart, positions, memory, date, currentSkyEvents);
  const meaningDemand = pickMeaningDemand(receipt.meaningFactors, demandFor(arc.transit.transitPlanet, arc.transit.aspect));
  const score = scoreTransitSignal(arc.transit, arc.activeToday, Boolean(receipt.memorySummary))
    + natalProjectionScoreBonus(receipt)
    + meaningScoreBonus(receipt.meaningFactors)
    + collectiveBridgeScoreBonus(receipt.collectiveBridge)
    + (arc.phase === 'peaking' ? 0.45 : 0);
  const tier = tierFromScore(score);
  const exactHit = arc.exactHits[0]?.date ? `Exact hit ${arc.exactHits[0].date}` : null;
  const lifecycle = receipt.arcLifecycle;
  const passNote = lifecycle && lifecycle.totalPasses > 1
    ? `Pass ${lifecycle.currentPass ?? 1} of ${lifecycle.totalPasses}`
    : 'single pass so far';

  return {
    id: arc.key,
    tier,
    scope: bridgeScope('personal', receipt.collectiveBridge),
    source: 'major_arc',
    title: transitTitle(arc.transit),
    summary: `${transitTitle(arc.transit)} is the strongest active wave in ${receipt.natalProjection?.house.label ?? arc.context.lifeArea}. ${lifecycle?.phaseDemand === 'prepare' ? 'This is still building toward the next hit.' : lifecycle?.phaseDemand === 'respond' ? 'This is inside the peak window now.' : 'The exact hit has landed, but the arc is still asking for integration.'}`,
    lifeAreas: [receipt.natalProjection?.house.label ?? arc.context.lifeArea],
    demand: meaningDemand,
    score: Number(score.toFixed(2)),
    receipts: [receipt],
    collectiveBridge: receipt.collectiveBridge,
    supportNotes: [
      exactHit,
      passNote,
      lifecycle?.watchNextDate ? `Watch next ${lifecycle.watchNextType?.replace('_', ' ')} on ${lifecycle.watchNextDate}.` : null,
      receipt.collectiveBridge ? `Collective bridge: ${receipt.collectiveBridge.collectiveEvent.id} (${receipt.collectiveBridge.bridgeStrengthTier}).` : null,
      receipt.memorySummary,
      receipt.natalProjection?.targetIsAngle ? 'This directly hits a natal angle.' : null,
      receipt.natalProjection?.targetIsModernChartRuler || receipt.natalProjection?.targetIsTraditionalChartRuler ? 'This hits the chart ruler.' : null,
      lifecycle && lifecycle.memoryLinkage.matchedSignalCount > 0 ? `Saved signals linked: ${lifecycle.memoryLinkage.matchedSignalCount}.` : null,
      receipt.natalProjection && receipt.natalProjection.repeatedLifeAreaSignalCount >= 2 ? `Saved signals already repeat this life area (${receipt.natalProjection.repeatedLifeAreaSignalCount}).` : null,
    ].filter((value): value is string => Boolean(value)),
  };
}

function buildSignalFromTransit(
  transit: Transit,
  chart: NatalChart,
  positions: PositionedTransitBody[],
  memory: MajorWaveMemoryInput,
  guidance: GuidanceResult[],
  currentSkyEvents: AstrologyCollectiveSkyEvent[],
): AstrologyJudgmentSignal {
  const receipt = buildTransitReceipt(transit, chart, positions, memory, currentSkyEvents);
  const relatedGuidance = guidance
    .filter((item) => item.title.toLowerCase().includes(transit.transitPlanet.toLowerCase()) || item.message.toLowerCase().includes(transit.transitPlanet.toLowerCase()))
    .slice(0, 1);
  const meaningDemand = pickMeaningDemand(receipt.meaningFactors, demandFor(transit.transitPlanet, transit.aspect));
  const score = scoreTransitSignal(transit, false, Boolean(receipt.memorySummary))
    + natalProjectionScoreBonus(receipt)
    + meaningScoreBonus(receipt.meaningFactors)
    + collectiveBridgeScoreBonus(receipt.collectiveBridge);

  return {
    id: transitKey(transit),
    tier: tierFromScore(score),
    scope: bridgeScope('personal', receipt.collectiveBridge),
    source: 'daily_transit',
    title: transitTitle(transit),
    summary: `${transitTitle(transit)} is active now with a ${transit.orb}° orb. Treat it as shorter-term weather unless the longer arc stack says otherwise.`,
    lifeAreas: [receipt.natalProjection?.house.label ?? receipt.lifeArea],
    demand: meaningDemand,
    score: Number(score.toFixed(2)),
    receipts: [receipt],
    collectiveBridge: receipt.collectiveBridge,
    supportNotes: [
      relatedGuidance[0]?.summary,
      receipt.collectiveBridge ? `Collective bridge: ${receipt.collectiveBridge.collectiveEvent.id} (${receipt.collectiveBridge.bridgeStrengthTier}).` : null,
      receipt.memorySummary,
      receipt.natalProjection?.targetIsAngle ? 'This directly hits a natal angle.' : null,
      receipt.natalProjection?.targetIsModernChartRuler || receipt.natalProjection?.targetIsTraditionalChartRuler ? 'This hits the chart ruler.' : null,
      receipt.natalProjection && receipt.natalProjection.repeatedLifeAreaSignalCount >= 2 ? `Saved signals already repeat this life area (${receipt.natalProjection.repeatedLifeAreaSignalCount}).` : null,
    ].filter((value): value is string => Boolean(value)),
  };
}

function timingFromSignals(date: string, foreground: AstrologyJudgmentSignal[], supporting: AstrologyJudgmentSignal[], totalCount: number) {
  const ordered = [...foreground, ...supporting]
    .flatMap((signal) => signal.receipts)
    .sort((a, b) => {
      const aDate = a.exactDate ?? a.peakDate ?? '9999-99-99';
      const bDate = b.exactDate ?? b.peakDate ?? '9999-99-99';
      return aDate.localeCompare(bDate);
    });
  const lead = ordered[0] ?? null;

  return {
    currentPhase: lead?.phase ?? null,
    exactDate: lead?.exactDate ?? lead?.peakDate ?? null,
    peakWindowStart: lead?.startDate ?? date,
    peakWindowEnd: lead?.endDate ?? lead?.exactDate ?? lead?.peakDate ?? null,
    nextWatchDate: lead?.exactDate ?? lead?.peakDate ?? null,
    activeTransitCount: totalCount,
  };
}

export function buildAstrologyJudgment(params: {
  date: string;
  chart: NatalChart;
  todayTransits: DailyTransits;
  majorArcs: MajorTransitArc[];
  guidance: GuidanceResult[];
  memory: MajorWaveMemoryInput;
}): AstrologyJudgment {
  const now = new Date(`${params.date}T12:00:00Z`);
  const positions = getPlanetaryPositions(now).map((item) => ({
    ...item,
    sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][Math.floor((((item.longitude % 360) + 360) % 360) / 30)],
    degree: (((item.longitude % 360) + 360) % 360) % 30,
  }));
  const currentSky = scanCurrentSkyFromPositions(
    positions.map((position) => buildCollectiveSkyBodyState({
      body: position.label,
      longitude: position.longitude,
      speed: position.speed,
      retrograde: position.retrograde,
    })),
    { date: now },
  );

  const arcSignals = params.majorArcs.map((arc) => buildSignalFromArc(arc, params.chart, positions, params.memory, params.date, currentSky.events));
  const coveredKeys = new Set(params.majorArcs.map((arc) => transitKey(arc.transit)));
  const transitSignals = params.todayTransits.transits
    .filter((transit) => !coveredKeys.has(transitKey(transit)))
    .slice(0, 8)
    .map((transit) => buildSignalFromTransit(transit, params.chart, positions, params.memory, params.guidance, currentSky.events));

  const allSignals = [...arcSignals, ...transitSignals]
    .sort((a, b) => b.score - a.score);

  const foreground = allSignals.filter((signal) => signal.tier === 'foreground');
  const supporting = allSignals.filter((signal) => signal.tier === 'supporting');
  const background = allSignals.filter((signal) => signal.tier === 'background');
  const noise = allSignals.filter((signal) => signal.tier === 'noise');
  const lead = foreground[0] ?? supporting[0] ?? background[0] ?? noise[0] ?? null;
  const activatedLifeAreas = dedupe(
    allSignals.flatMap((signal) => signal.lifeAreas).filter(Boolean),
  ).slice(0, 6);
  const receipts = allSignals.flatMap((signal) => signal.receipts).slice(0, 12);
  const mainStory = lead
    ? `${lead.title} is the main signal. ${lead.summary}`
    : currentSky.events[0]
      ? `${currentSky.events[0].summary} No transit-to-natal contacts are inside the current scan window.`
      : 'No transit-to-natal contacts are inside the current scan window.';
  const practicalDemand = lead
    ? `${lead.demand === 'restructuring' ? 'Tighten the structure around' : lead.demand === 'expansion' ? 'Use the opening in' : lead.demand === 'clarification' ? 'Get precise about' : lead.demand === 'destabilization' ? 'Stop pretending you can fully control' : lead.demand === 'support' ? 'Work with the easier opening in' : 'Deal directly with'} ${lead.lifeAreas[0] ?? 'the active life area'}.`
    : currentSky.events[0]
      ? 'Track the strongest collective sky event before turning it into a personal story.'
      : 'Use the lighter day to get specific about what is building next.';

  return {
    date: params.date,
    foreground,
    supporting,
    background,
    noise,
    mainStory,
    practicalDemand,
    timing: timingFromSignals(params.date, foreground, supporting, params.todayTransits.transits.length),
    activatedLifeAreas,
    currentSky,
    receipts,
  };
}

export function buildArcFocusedJudgment(params: {
  date: string;
  chart: NatalChart;
  arc: MajorTransitArc;
  majorArcs: MajorTransitArc[];
  todayTransits: DailyTransits;
  guidance: GuidanceResult[];
  memory: MajorWaveMemoryInput;
}): AstrologyJudgment {
  const judgment = buildAstrologyJudgment(params);
  const primary = judgment.foreground.find((signal) => signal.id === params.arc.key)
    ?? judgment.supporting.find((signal) => signal.id === params.arc.key)
    ?? judgment.background.find((signal) => signal.id === params.arc.key)
    ?? judgment.noise.find((signal) => signal.id === params.arc.key)
    ?? null;

  if (!primary) return judgment;

  const restForeground = judgment.foreground.filter((signal) => signal.id !== primary.id);
  const restSupporting = judgment.supporting.filter((signal) => signal.id !== primary.id);
  const restBackground = judgment.background.filter((signal) => signal.id !== primary.id);
  const restNoise = judgment.noise.filter((signal) => signal.id !== primary.id);

  return {
    ...judgment,
    foreground: [primary, ...restForeground],
    supporting: restSupporting,
    background: restBackground,
    noise: restNoise,
    mainStory: `${primary.title} is the main wave in view. ${primary.summary}`,
    practicalDemand: `${judgment.practicalDemand} Track the pass sequence, station markers, and next watch date before you make this into a one-day mood story.`,
    receipts: [primary.receipts[0], ...judgment.receipts.filter((receipt) => receipt.arcKey !== params.arc.key)].slice(0, 12),
  };
}
