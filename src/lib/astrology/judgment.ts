import { buildNatalSummary, type DailyTransits, type Transit } from '@/lib/astrology/domain-types';
import { getPlanetaryPositions } from '@/lib/astrology/calculate-transits';
import { buildCollectiveSkyBodyState, scanCurrentSkyFromPositions } from '@/lib/astrology/current-sky';
import {
  bridgeScope,
  buildCollectivePersonalBridge,
  collectiveBridgeScoreBonus,
} from '@/lib/astrology/collective-personal-bridge';
import { buildMacroPersonalBridge } from '@/lib/astrology/macro-personal-bridge';
import {
  meaningScoreBonus,
  pickMeaningDemand,
  resolveMeaningFactors,
} from '@/lib/astrology/meaning-kernel';
import {
  getAstrologyObjectRankingWeight,
  getAstrologyObjectReceiptSummary,
  getFencedAstrologyObjects,
} from '@/lib/astrology/object-inventory';
import {
  buildNatalProjection,
  buildSimpleReception,
  getBasicDignity,
  getSectConditionForBody,
  type NatalProjection,
} from '@/lib/astrology/natal-projection';
import { buildTransitArcJudgment } from '@/lib/astrology/transit-arc-judgment';
import { buildMacrocosmEngine } from '@/lib/astrology/macrocosm-engine';
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
  const planet = (PLANET_WEIGHT[transit.transitPlanet] ?? 0.5) * getAstrologyObjectRankingWeight(transit.transitPlanet);
  const targetWeight = getAstrologyObjectRankingWeight(transit.natalPlanet);
  const aspect = ASPECT_WEIGHT[transit.aspect] ?? 0.6;
  const closeness = Math.max(0.2, 1.8 - Math.min(transit.orb, 6) * 0.22);
  return Number((planet + aspect + closeness + (targetWeight - 0.7) * 0.22 + (activeToday ? 0.4 : 0) + (hasMemory ? 0.35 : 0)).toFixed(2));
}

function countLifeAreaRepeats(memory: MajorWaveMemoryInput, lifeArea: string, targetLabel: string) {
  return matchingLifeSignals(memory, lifeArea, targetLabel).length;
}

function findCurrentSkyEvent(events: AstrologyCollectiveSkyEvent[], body: string) {
  const bodyEvents = events.filter((event) => event.bodies.includes(body));
  return bodyEvents.find((event) => event.rarity.status === 'computed')
    ?? bodyEvents.find((event) => event.kind === 'sign_ingress_proximity')
    ?? bodyEvents[0]
    ?? null;
}

function applyCollectiveBridge(
  receipt: AstrologyJudgmentReceipt,
  currentSkyEvents: AstrologyCollectiveSkyEvent[],
  macroConfigurations: NonNullable<AstrologyJudgment['macrocosm']>['configurations'],
  memory: MajorWaveMemoryInput,
) {
  const collectiveBridge = buildCollectivePersonalBridge(receipt, currentSkyEvents);
  const macroBridge = buildMacroPersonalBridge({
    receipt: {
      ...receipt,
      collectiveBridge,
    },
    macroConfigurations,
    memory,
  });
  const bridgeEvent = collectiveBridge
    ? currentSkyEvents.find((event) => event.id === collectiveBridge.collectiveEvent.id) ?? null
    : null;
  const matchedBodyEvent = findCurrentSkyEvent(currentSkyEvents, receipt.transitPlanet);
  const currentSkyEvent = bridgeEvent ?? matchedBodyEvent;
  const rarityEvent = bridgeEvent?.rarity.status === 'computed'
    ? bridgeEvent
    : matchedBodyEvent?.rarity.status === 'computed'
      ? matchedBodyEvent
      : currentSkyEvent;

  return {
    ...receipt,
    collectiveBridge,
    macroBridge,
    currentSkyRarity: rarityEvent?.rarity ?? null,
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

function dignityScoreBonus(condition: string | null | undefined) {
  if (condition === 'domicile' || condition === 'exaltation') return 0.07;
  return 0;
}

function receptionScoreBonus(reception: AstrologyJudgmentReceipt['reception']) {
  if (!reception?.length) return 0;
  if (reception.some((fact) => fact.status === 'mutual')) return 0.1;
  if (reception.some((fact) => fact.status === 'one_way')) return 0.04;
  return 0;
}

function sectScoreBonus(sect: AstrologyJudgmentReceipt['sect']) {
  if (!sect) return 0;
  let bonus = 0;
  if (sect.transitPlanetCondition === 'in_sect') bonus += 0.04;
  if (sect.natalTargetCondition === 'in_sect') bonus += 0.03;
  return Number(bonus.toFixed(2));
}

function natalProjectionScoreBonus(receipt: AstrologyJudgmentReceipt) {
  const projection = receipt.natalProjection;
  if (!projection) return 0;

  let bonus = 0;
  if (projection.targetIsAngle) bonus += 0.7;
  else if (projection.angularity === 'angular') bonus += 0.35;
  else if (projection.angularity === 'succedent') bonus += 0.1;

  if (projection.targetIsModernChartRuler || projection.targetIsTraditionalChartRuler) bonus += 0.55;
  if (projection.signRuler.traditionalRulerPlacement?.angularity === 'angular' || projection.signRuler.modernRulerPlacement?.angularity === 'angular') bonus += 0.08;
  if (projection.dispositors.some((chain) => chain.termination === 'self_ruled')) bonus += 0.06;
  if (projection.dignity && ['domicile', 'exaltation'].includes(projection.dignity.condition)) bonus += 0.05;
  if (projection.repeatedLifeAreaSignalCount >= 3) bonus += 0.25;
  else if (projection.repeatedLifeAreaSignalCount >= 2) bonus += 0.12;

  return Number(bonus.toFixed(2));
}

function natalRulershipSupportNote(projection: NatalProjection | null | undefined) {
  if (!projection?.targetSign) return null;

  const primaryChain = projection.dispositors.find((chain) => chain.system === 'traditional')
    ?? projection.dispositors[0]
    ?? null;
  const firstStep = primaryChain?.steps[0] ?? null;
  if (!firstStep) return null;

  const houseText = firstStep.rulerHouse != null ? `house ${firstStep.rulerHouse}` : 'house unknown';
  const ending = primaryChain?.termination === 'self_ruled'
    ? 'self-ruled chain.'
    : primaryChain?.finalRuler
      ? `chain currently lands with ${primaryChain.finalRuler}.`
      : 'chain remains bounded in this slice.';

  return `${projection.targetLabel} is in ${projection.targetSign}, ruled ${primaryChain?.system ?? 'bounded'}ly by ${firstStep.ruler} in ${houseText}; ${ending}`;
}

function natalDignitySupportNote(projection: NatalProjection | null | undefined) {
  if (!projection?.dignity || !projection.targetSign) return null;
  if (projection.dignity.condition === 'neutral') return null;
  return `${projection.targetLabel} is in ${projection.targetSign} in ${projection.dignity.condition}.`;
}

function transitDignitySupportNote(receipt: AstrologyJudgmentReceipt) {
  if (!receipt.transitDignity || !receipt.transitSign) return null;
  if (receipt.transitDignity.condition === 'neutral') return null;
  return `${receipt.transitPlanet} is in ${receipt.transitSign} in ${receipt.transitDignity.condition}.`;
}

function receptionSupportNote(receipt: AstrologyJudgmentReceipt) {
  const fact = receipt.reception?.find((entry) => entry.status === 'mutual')
    ?? receipt.reception?.find((entry) => entry.status === 'one_way')
    ?? null;
  if (!fact) return null;

  if (fact.status === 'mutual') {
    return `${fact.transitPlanet} and ${fact.natalTargetLabel} are in mutual reception (${fact.system}).`;
  }

  const direction = fact.direction === 'transit_to_natal'
    ? `${fact.transitPlanet} is in ${fact.natalTargetLabel}'s sign`
    : fact.direction === 'natal_to_transit'
      ? `${fact.natalTargetLabel} is in ${fact.transitPlanet}'s sign`
      : `${fact.transitPlanet} and ${fact.natalTargetLabel} have one-way reception`;
  return `${direction} (${fact.system}).`;
}

function sectSupportNote(receipt: AstrologyJudgmentReceipt) {
  if (!receipt.sect) return null;
  if (receipt.sect.chartSect === 'unknown') return 'Chart sect is fenced in this slice; day/night could not be derived safely.';

  const targetPart = receipt.sect.natalTargetCondition === 'in_sect'
    ? `${receipt.targetLabel} is in sect`
    : receipt.sect.natalTargetCondition === 'out_of_sect'
      ? `${receipt.targetLabel} is out of sect`
      : `${receipt.targetLabel} has no sect claim here`;
  const transitPart = receipt.sect.transitPlanetCondition === 'in_sect'
    ? `${receipt.transitPlanet} is in sect`
    : receipt.sect.transitPlanetCondition === 'out_of_sect'
      ? `${receipt.transitPlanet} is out of sect`
      : `${receipt.transitPlanet} has no sect claim here`;

  return `This is a ${receipt.sect.chartSect} chart by Sun house; ${targetPart}, ${transitPart}.`;
}

function buildReceiptReceptionFacts(params: {
  transitPlanet: string;
  transitSign: string | null;
  natalTargetLabel: string;
  natalSign: string | null;
}) {
  if (!params.transitSign) return null;

  return (['modern', 'traditional'] as const).map((system) => {
    const fact = buildSimpleReception({
      sourceLabel: params.transitPlanet,
      sourceSign: params.transitSign,
      counterpartLabel: params.natalTargetLabel,
      counterpartSign: params.natalSign,
      system,
    });

    return {
      system: fact.system,
      status: fact.status,
      direction: fact.direction,
      transitPlanet: params.transitPlanet,
      natalTargetLabel: params.natalTargetLabel,
      transitSign: params.transitSign,
      natalSign: params.natalSign,
      transitInNatalRulership: fact.sourceInCounterpartRulership,
      natalInTransitRulership: fact.counterpartInSourceRulership,
      limitations: fact.limitations,
    };
  });
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
  macroConfigurations: NonNullable<AstrologyJudgment['macrocosm']>['configurations'],
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

  const transitDignity = position?.sign ? getBasicDignity(arc.transit.transitPlanet, position.sign) : null;
  const reception = buildReceiptReceptionFacts({
    transitPlanet: arc.transit.transitPlanet,
    transitSign: position?.sign ?? null,
    natalTargetLabel: arc.context.targetLabel,
    natalSign: arc.context.targetSign,
  });
  const sect = {
    chartSect: natalProjection.sect.chartSect,
    basis: natalProjection.sect.basis,
    sunHouse: natalProjection.sect.sunHouse,
    transitPlanetCondition: getSectConditionForBody(natalProjection.sect.chartSect, arc.transit.transitPlanet),
    natalTargetCondition: natalProjection.sect.targetCondition,
    limitations: natalProjection.sect.limitations,
  };

  return applyCollectiveBridge({
    arcKey: arc.key,
    transitPlanet: arc.transit.transitPlanet,
    transitObject: getAstrologyObjectReceiptSummary(arc.transit.transitPlanet, 'transit'),
    aspect: arc.transit.aspect,
    natalTarget: arc.transit.natalPlanet,
    natalTargetObject: getAstrologyObjectReceiptSummary(arc.transit.natalPlanet, 'natal'),
    targetLabel: arc.context.targetLabel,
    orb: arc.todayOrb ?? arc.peakOrb,
    phase: phaseFromArc(arc),
    transitSign: position?.sign ?? null,
    transitDegree: position ? Number(position.degree.toFixed(2)) : null,
    transitDignity,
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
    reception,
    sect,
    arcLifecycle,
  }, currentSkyEvents, macroConfigurations, memory);
}

function buildTransitReceipt(
  transit: Transit,
  chart: NatalChart,
  positions: PositionedTransitBody[],
  memory: MajorWaveMemoryInput,
  currentSkyEvents: AstrologyCollectiveSkyEvent[],
  macroConfigurations: NonNullable<AstrologyJudgment['macrocosm']>['configurations'],
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
      : transit.natalPlanet === 'descendant'
        ? 'Descendant'
        : transit.natalPlanet === 'imumCoeli'
          ? 'IC'
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

  const transitDignity = position?.sign ? getBasicDignity(transit.transitPlanet, position.sign) : null;
  const reception = buildReceiptReceptionFacts({
    transitPlanet: transit.transitPlanet,
    transitSign: position?.sign ?? null,
    natalTargetLabel: targetLabel,
    natalSign: natalPlacement?.sign ?? null,
  });
  const projectionWithRepeats = { ...natalProjection, repeatedLifeAreaSignalCount };
  const sect = {
    chartSect: projectionWithRepeats.sect.chartSect,
    basis: projectionWithRepeats.sect.basis,
    sunHouse: projectionWithRepeats.sect.sunHouse,
    transitPlanetCondition: getSectConditionForBody(projectionWithRepeats.sect.chartSect, transit.transitPlanet),
    natalTargetCondition: projectionWithRepeats.sect.targetCondition,
    limitations: projectionWithRepeats.sect.limitations,
  };

  return applyCollectiveBridge({
    transitPlanet: transit.transitPlanet,
    transitObject: getAstrologyObjectReceiptSummary(transit.transitPlanet, 'transit'),
    aspect: transit.aspect,
    natalTarget: transit.natalPlanet,
    natalTargetObject: getAstrologyObjectReceiptSummary(transit.natalPlanet, 'natal'),
    targetLabel,
    orb: transit.orb,
    phase: phaseFromTransit(transit),
    transitSign: position?.sign ?? null,
    transitDegree: position ? Number(position.degree.toFixed(2)) : null,
    transitDignity,
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
    natalProjection: projectionWithRepeats,
    reception,
    sect,
  }, currentSkyEvents, macroConfigurations, memory);
}

function buildSignalFromArc(
  arc: MajorTransitArc,
  chart: NatalChart,
  positions: PositionedTransitBody[],
  memory: MajorWaveMemoryInput,
  date: string,
  currentSkyEvents: AstrologyCollectiveSkyEvent[],
  macroConfigurations: NonNullable<AstrologyJudgment['macrocosm']>['configurations'],
): AstrologyJudgmentSignal {
  const receipt = buildArcReceipt(arc, chart, positions, memory, date, currentSkyEvents, macroConfigurations);
  const meaningDemand = pickMeaningDemand(receipt.meaningFactors, demandFor(arc.transit.transitPlanet, arc.transit.aspect));
  const score = scoreTransitSignal(arc.transit, arc.activeToday, Boolean(receipt.memorySummary))
    + natalProjectionScoreBonus(receipt)
    + dignityScoreBonus(receipt.transitDignity?.condition)
    + receptionScoreBonus(receipt.reception)
    + sectScoreBonus(receipt.sect)
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
    macroBridge: receipt.macroBridge,
    supportNotes: [
      exactHit,
      passNote,
      lifecycle?.watchNextDate ? `Watch next ${lifecycle.watchNextType?.replace('_', ' ')} on ${lifecycle.watchNextDate}.` : null,
      receipt.collectiveBridge ? `Collective bridge: ${receipt.collectiveBridge.collectiveEvent.id} (${receipt.collectiveBridge.bridgeStrengthTier}).` : null,
      receipt.macroBridge ? `Macro bridge: ${receipt.macroBridge.configurationId} (${receipt.macroBridge.manifestationClass}, ${receipt.macroBridge.decisionPressure}).` : null,
      receipt.memorySummary,
      receipt.natalProjection?.targetIsAngle ? 'This directly hits a natal angle.' : null,
      receipt.natalProjection?.targetIsModernChartRuler || receipt.natalProjection?.targetIsTraditionalChartRuler ? 'This hits the chart ruler.' : null,
      natalDignitySupportNote(receipt.natalProjection),
      transitDignitySupportNote(receipt),
      receptionSupportNote(receipt),
      sectSupportNote(receipt),
      natalRulershipSupportNote(receipt.natalProjection),
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
  macroConfigurations: NonNullable<AstrologyJudgment['macrocosm']>['configurations'],
): AstrologyJudgmentSignal {
  const receipt = buildTransitReceipt(transit, chart, positions, memory, currentSkyEvents, macroConfigurations);
  const relatedGuidance = guidance
    .filter((item) => item.title.toLowerCase().includes(transit.transitPlanet.toLowerCase()) || item.message.toLowerCase().includes(transit.transitPlanet.toLowerCase()))
    .slice(0, 1);
  const meaningDemand = pickMeaningDemand(receipt.meaningFactors, demandFor(transit.transitPlanet, transit.aspect));
  const score = scoreTransitSignal(transit, false, Boolean(receipt.memorySummary))
    + natalProjectionScoreBonus(receipt)
    + dignityScoreBonus(receipt.transitDignity?.condition)
    + receptionScoreBonus(receipt.reception)
    + sectScoreBonus(receipt.sect)
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
    macroBridge: receipt.macroBridge,
    supportNotes: [
      relatedGuidance[0]?.summary,
      receipt.collectiveBridge ? `Collective bridge: ${receipt.collectiveBridge.collectiveEvent.id} (${receipt.collectiveBridge.bridgeStrengthTier}).` : null,
      receipt.macroBridge ? `Macro bridge: ${receipt.macroBridge.configurationId} (${receipt.macroBridge.manifestationClass}, ${receipt.macroBridge.decisionPressure}).` : null,
      receipt.memorySummary,
      receipt.natalProjection?.targetIsAngle ? 'This directly hits a natal angle.' : null,
      receipt.natalProjection?.targetIsModernChartRuler || receipt.natalProjection?.targetIsTraditionalChartRuler ? 'This hits the chart ruler.' : null,
      natalDignitySupportNote(receipt.natalProjection),
      transitDignitySupportNote(receipt),
      receptionSupportNote(receipt),
      sectSupportNote(receipt),
      natalRulershipSupportNote(receipt.natalProjection),
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

function buildObjectInventorySummary(receipts: AstrologyJudgmentReceipt[]) {
  const transitLabels = dedupe(receipts.map((receipt) => receipt.transitObject?.label).filter((value): value is string => Boolean(value))).slice(0, 8);
  const targetLabels = dedupe(receipts.map((receipt) => receipt.natalTargetObject?.label).filter((value): value is string => Boolean(value))).slice(0, 8);
  const categoryCounts = receipts.reduce<Partial<Record<'luminary' | 'planet' | 'asteroid' | 'node' | 'angle' | 'lot', number>>>((acc, receipt) => {
    const categories = [receipt.transitObject?.category, receipt.natalTargetObject?.category].filter((value): value is 'luminary' | 'planet' | 'asteroid' | 'node' | 'angle' | 'lot' => Boolean(value));
    for (const category of categories) {
      acc[category] = (acc[category] ?? 0) + 1;
    }
    return acc;
  }, {});

  return {
    status: 'expanded-object-inventory-v1' as const,
    transitLabels,
    targetLabels,
    categoryCounts,
    fencedLabels: getFencedAstrologyObjects().map((entry) => entry.label),
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

  const macrocosm = buildMacrocosmEngine({
    currentSky,
    date: params.date,
  });
  currentSky.macroConfigurations = macrocosm.configurations;

  const arcSignals = params.majorArcs.map((arc) => buildSignalFromArc(
    arc,
    params.chart,
    positions,
    params.memory,
    params.date,
    currentSky.events,
    macrocosm.configurations,
  ));
  const coveredKeys = new Set(params.majorArcs.map((arc) => transitKey(arc.transit)));
  const transitSignals = params.todayTransits.transits
    .filter((transit) => !coveredKeys.has(transitKey(transit)))
    .slice(0, 8)
    .map((transit) => buildSignalFromTransit(
      transit,
      params.chart,
      positions,
      params.memory,
      params.guidance,
      currentSky.events,
      macrocosm.configurations,
    ));

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
    macrocosm,
    objectInventory: buildObjectInventorySummary(receipts),
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
