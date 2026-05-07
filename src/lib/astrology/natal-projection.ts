import { buildNatalSummary, getHouse } from '@/lib/astrology/domain-types';
import type { NatalChart } from '@/lib/astrology/types';

export type NatalProjectionDignityCondition = 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'neutral';
export type NatalProjectionAngularity = 'angle' | 'angular' | 'succedent' | 'cadent' | 'unknown';
export type NatalProjectionTargetType = 'planet' | 'angle';
export type NatalProjectionSectClass = 'day' | 'night' | 'unknown';
export type NatalProjectionSectCondition = 'in_sect' | 'out_of_sect' | 'not_applicable' | 'unknown';
export type NatalProjectionReceptionStatus = 'mutual' | 'one_way' | 'none' | 'unavailable';
export type NatalProjectionReceptionDirection = 'transit_to_natal' | 'natal_to_transit' | 'both' | 'neither' | 'unknown';

export interface NatalProjectionAspectContext {
  otherBody: string;
  aspect: string;
  orb: number;
  angle: number;
}

export interface NatalProjectionHouseContext {
  house: number | null;
  label: string;
  axisHouse: number | null;
  axisLabel: string | null;
}

export interface NatalProjectionRulerPlacement {
  ruler: string;
  sign: string | null;
  degree: number | null;
  house: number | null;
  houseContext: NatalProjectionHouseContext;
  angularity: NatalProjectionAngularity;
  dignity: NatalProjectionDignity | null;
  targetIsAngle: boolean;
}

export interface NatalProjectionChartRuler {
  ascSign: string;
  modernRuler: string;
  traditionalRuler: string | null;
  modernPlacement: NatalProjectionRulerPlacement | null;
  traditionalPlacement: NatalProjectionRulerPlacement | null;
}

export interface NatalProjectionDignity {
  condition: NatalProjectionDignityCondition;
  limitations: string[];
}

export interface NatalProjectionSignRulerContext {
  sign: string | null;
  modernRuler: string | null;
  traditionalRuler: string | null;
  modernRulerPlacement: NatalProjectionRulerPlacement | null;
  traditionalRulerPlacement: NatalProjectionRulerPlacement | null;
}

export interface NatalProjectionDispositorStep {
  sourceSign: string;
  ruler: string;
  rulerSign: string | null;
  rulerHouse: number | null;
  dignity: NatalProjectionDignity | null;
  angularity: NatalProjectionAngularity;
  targetIsModernChartRuler: boolean;
  targetIsTraditionalChartRuler: boolean;
}

export interface NatalProjectionDispositorChain {
  system: 'modern' | 'traditional';
  steps: NatalProjectionDispositorStep[];
  finalRuler: string | null;
  termination: 'self_ruled' | 'cycle' | 'missing_ruler_placement' | 'max_depth' | 'missing_sign';
  limitations: string[];
}

export interface NatalProjectionSect {
  chartSect: NatalProjectionSectClass;
  basis: 'sun_house_relative_to_horizon' | 'unavailable';
  sunHouse: number | null;
  targetCondition: NatalProjectionSectCondition;
  limitations: string[];
}

export interface NatalProjectionSimpleReception {
  system: 'modern' | 'traditional';
  status: NatalProjectionReceptionStatus;
  direction: NatalProjectionReceptionDirection;
  sourceLabel: string;
  sourceSign: string | null;
  counterpartLabel: string;
  counterpartSign: string | null;
  sourceInCounterpartRulership: boolean;
  counterpartInSourceRulership: boolean;
  limitations: string[];
}

export interface NatalProjection {
  targetKey: string;
  targetLabel: string;
  targetType: NatalProjectionTargetType;
  targetSign: string | null;
  targetDegree: number | null;
  targetHouse: number | null;
  house: NatalProjectionHouseContext;
  angularity: NatalProjectionAngularity;
  chartRuler: NatalProjectionChartRuler;
  signRuler: NatalProjectionSignRulerContext;
  dispositors: NatalProjectionDispositorChain[];
  sect: NatalProjectionSect;
  targetIsModernChartRuler: boolean;
  targetIsTraditionalChartRuler: boolean;
  targetIsAngle: boolean;
  dignity: NatalProjectionDignity | null;
  natalAspects: NatalProjectionAspectContext[];
  repeatedLifeAreaSignalCount: number;
  limitations: string[];
}

const HOUSE_LABELS: Record<number, string> = {
  1: 'self, body, identity, new beginnings, appearance',
  2: 'money, possessions, values, security, self-worth',
  3: 'communication, local movement, siblings, learning, short travel',
  4: 'home, family of origin, roots, private life, foundation',
  5: 'creativity, romance, children, play, self-expression, speculation',
  6: 'work, health, daily routine, service, analysis, body maintenance',
  7: 'partnership, marriage, contracts, open enemies, cooperation',
  8: 'shared resources, sexuality, death/transformation, debt, psychology',
  9: 'beliefs, higher education, long travel, publishing, law, worldview',
  10: 'career, public reputation, authority, achievement, legacy',
  11: 'community, friends, groups, goals, collective belonging, future visions',
  12: 'solitude, hidden matters, self-undoing, spiritual practice, endings',
};

const MODERN_RULERS: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Pluto',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Uranus',
  Pisces: 'Neptune',
};

const TRADITIONAL_RULERS: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
};

const DIGNITY_RULES: Record<string, {
  domicile?: string[];
  exaltation?: string[];
  detriment?: string[];
  fall?: string[];
}> = {
  Sun: { domicile: ['Leo'], exaltation: ['Aries'], detriment: ['Aquarius'], fall: ['Libra'] },
  Moon: { domicile: ['Cancer'], exaltation: ['Taurus'], detriment: ['Capricorn'], fall: ['Scorpio'] },
  Mercury: { domicile: ['Gemini', 'Virgo'], exaltation: ['Virgo'], detriment: ['Sagittarius', 'Pisces'], fall: ['Pisces'] },
  Venus: { domicile: ['Taurus', 'Libra'], exaltation: ['Pisces'], detriment: ['Scorpio', 'Aries'], fall: ['Virgo'] },
  Mars: { domicile: ['Aries', 'Scorpio'], exaltation: ['Capricorn'], detriment: ['Libra', 'Taurus'], fall: ['Cancer'] },
  Jupiter: { domicile: ['Sagittarius', 'Pisces'], exaltation: ['Cancer'], detriment: ['Gemini', 'Virgo'], fall: ['Capricorn'] },
  Saturn: { domicile: ['Capricorn', 'Aquarius'], exaltation: ['Libra'], detriment: ['Cancer', 'Leo'], fall: ['Aries'] },
  Uranus: { domicile: ['Aquarius'], detriment: ['Leo'] },
  Neptune: { domicile: ['Pisces'], detriment: ['Virgo'] },
  Pluto: { domicile: ['Scorpio'], detriment: ['Taurus'] },
};

const DAY_SECT_PLANETS = new Set(['Sun', 'Jupiter', 'Saturn']);
const NIGHT_SECT_PLANETS = new Set(['Moon', 'Venus', 'Mars']);
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const MODERN_RULED_SIGNS = invertRulers(MODERN_RULERS);
const TRADITIONAL_RULED_SIGNS = invertRulers(TRADITIONAL_RULERS);

function invertRulers(source: Record<string, string>) {
  return Object.entries(source).reduce<Record<string, string[]>>((acc, [sign, ruler]) => {
    acc[ruler] ??= [];
    acc[ruler].push(sign);
    return acc;
  }, {});
}

function oppositeHouse(house: number | null) {
  if (house == null) return null;
  return ((house + 5) % 12) + 1;
}

function signFromLongitude(longitude: number) {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)] ?? 'Aries';
}

function normalizeKey(label: string) {
  return label.toLowerCase().replace(/\s+/g, '-');
}

function degreeFromLongitude(longitude: number) {
  const normalized = ((longitude % 360) + 360) % 360;
  return Number((normalized % 30).toFixed(2));
}

function normalizePlanetLabel(label: string) {
  if (label === 'ASC') return 'Ascendant';
  if (label === 'MC') return 'Midheaven';
  if (label === 'IC') return 'IC';
  if (label === 'DSC') return 'Descendant';
  return label;
}

function ruledSignsFor(label: string, system: 'modern' | 'traditional') {
  const normalized = normalizePlanetLabel(label);
  return system === 'modern'
    ? (MODERN_RULED_SIGNS[normalized] ?? [])
    : (TRADITIONAL_RULED_SIGNS[normalized] ?? []);
}

function buildReceptionLimitations() {
  return [
    'Reception v1 is sign-rulership only. It does not compute exaltation reception, house-based reception, terms/bounds, faces/decans, or wider traditional condition.',
  ];
}

export function getHouseLifeArea(house: number | null): NatalProjectionHouseContext {
  const axisHouse = oppositeHouse(house);
  return {
    house,
    label: house == null ? 'core chart activation; natal house unavailable' : HOUSE_LABELS[house],
    axisHouse,
    axisLabel: axisHouse == null ? null : HOUSE_LABELS[axisHouse],
  };
}

export function classifyAngularity(targetKey: string, house: number | null): NatalProjectionAngularity {
  if (targetKey === 'ascendant' || targetKey === 'midheaven' || targetKey === 'descendant' || targetKey === 'imumCoeli') {
    return 'angle';
  }
  if (house == null) return 'unknown';
  if ([1, 4, 7, 10].includes(house)) return 'angular';
  if ([2, 5, 8, 11].includes(house)) return 'succedent';
  return 'cadent';
}

function lookupAngle(chart: NatalChart, key: string) {
  if (key === 'ascendant') return { ...chart.angles.ascendant, house: 1, label: 'Ascendant' };
  if (key === 'midheaven') return { ...chart.angles.midheaven, house: 10, label: 'Midheaven' };

  if (key === 'descendant') {
    const longitude = ((chart.angles.ascendant.longitude + 180) % 360 + 360) % 360;
    return {
      longitude,
      sign: signFromLongitude(longitude),
      degree: degreeFromLongitude(longitude),
      minute: chart.angles.ascendant.minute,
      house: chart.houses?.length === 12 ? getHouse(longitude, chart.houses) : 7,
      label: 'Descendant',
    };
  }

  if (key === 'imumCoeli') {
    const longitude = ((chart.angles.midheaven.longitude + 180) % 360 + 360) % 360;
    return {
      longitude,
      sign: signFromLongitude(longitude),
      degree: degreeFromLongitude(longitude),
      minute: chart.angles.midheaven.minute,
      house: chart.houses?.length === 12 ? getHouse(longitude, chart.houses) : 4,
      label: 'IC',
    };
  }

  return null;
}

function lookupRulerPlacement(chart: NatalChart, ruler: string | null): NatalProjectionRulerPlacement | null {
  if (!ruler) return null;
  const natalSummary = buildNatalSummary(chart);
  const placement = natalSummary.placementsByKey[normalizeKey(ruler)];
  const angle = lookupAngle(chart, normalizeKey(ruler));
  const source = placement ?? angle;
  const targetHouse = placement?.house ?? angle?.house ?? null;

  if (!source) return null;

  return {
    ruler,
    sign: source.sign ?? null,
    degree: source.degree ?? null,
    house: targetHouse,
    houseContext: getHouseLifeArea(targetHouse),
    angularity: classifyAngularity(normalizeKey(ruler), targetHouse),
    dignity: source.sign ? getBasicDignity(ruler, source.sign) : null,
    targetIsAngle: !placement && Boolean(angle),
  };
}

export function getSignRulers(sign: string | null) {
  if (!sign) {
    return { modernRuler: null, traditionalRuler: null };
  }

  return {
    modernRuler: MODERN_RULERS[sign] ?? null,
    traditionalRuler: TRADITIONAL_RULERS[sign] ?? null,
  };
}

export function getChartRuler(chart: NatalChart): NatalProjectionChartRuler {
  const ascSign = chart.angles.ascendant.sign;
  const modernRuler = MODERN_RULERS[ascSign];
  const traditionalRuler = TRADITIONAL_RULERS[ascSign] === modernRuler ? null : TRADITIONAL_RULERS[ascSign];

  return {
    ascSign,
    modernRuler,
    traditionalRuler,
    modernPlacement: lookupRulerPlacement(chart, modernRuler),
    traditionalPlacement: lookupRulerPlacement(chart, traditionalRuler),
  };
}

export function getBasicDignity(label: string, sign: string): NatalProjectionDignity | null {
  const rules = DIGNITY_RULES[normalizePlanetLabel(label)];
  if (!rules) return null;

  let condition: NatalProjectionDignityCondition = 'neutral';
  if (rules.domicile?.includes(sign)) condition = 'domicile';
  else if (rules.exaltation?.includes(sign)) condition = 'exaltation';
  else if (rules.detriment?.includes(sign)) condition = 'detriment';
  else if (rules.fall?.includes(sign)) condition = 'fall';

  const limitations = [
    'Dignity v1 is sign-based essential dignity only. It does not compute terms/bounds, decans/faces, combustion/cazimi, house-strength, or sect-weighted dignity.',
  ];
  if (['Uranus', 'Neptune', 'Pluto'].includes(label)) {
    limitations.push('Outer-planet dignity is limited to modern domicile/detriment only here; no exaltation or fall claims are made for those planets.');
  }

  return { condition, limitations };
}

export function getSectConditionForBody(chartSect: NatalProjectionSectClass, label: string): NatalProjectionSectCondition {
  if (chartSect === 'unknown') return 'unknown';
  const normalized = normalizePlanetLabel(label);
  if (normalized === 'Mercury') return 'not_applicable';
  if (DAY_SECT_PLANETS.has(normalized)) return chartSect === 'day' ? 'in_sect' : 'out_of_sect';
  if (NIGHT_SECT_PLANETS.has(normalized)) return chartSect === 'night' ? 'in_sect' : 'out_of_sect';
  return 'not_applicable';
}

export function buildSectContext(chart: NatalChart, targetLabel: string): NatalProjectionSect {
  const sun = chart.placements.find((placement) => placement.label === 'Sun' || placement.key === 'sun') ?? null;
  const limitations = [
    'Sect v1 only derives day/night from the Sun house relative to the horizon when house data is safe to use. It does not compute Mercury sect, hemisphere nuance, rejoicing, or house-based traditional condition beyond day/night.',
  ];

  if (!chart.metadata?.timeExact) {
    return {
      chartSect: 'unknown',
      basis: 'unavailable',
      sunHouse: null,
      targetCondition: 'unknown',
      limitations: [...limitations, 'Birth time is not exact, so day/night sect is fenced instead of guessed.'],
    };
  }

  if (chart.metadata.warnings.houses || !chart.houses?.length || chart.houses.length !== 12 || !sun) {
    return {
      chartSect: 'unknown',
      basis: 'unavailable',
      sunHouse: null,
      targetCondition: 'unknown',
      limitations: [...limitations, 'Safe house-based Sun placement was not available, so day/night sect is fenced instead of guessed.'],
    };
  }

  const sunHouse = getHouse(sun.longitude, chart.houses);
  const chartSect: NatalProjectionSectClass = sunHouse >= 7 ? 'day' : 'night';

  return {
    chartSect,
    basis: 'sun_house_relative_to_horizon',
    sunHouse,
    targetCondition: getSectConditionForBody(chartSect, targetLabel),
    limitations,
  };
}

export function buildSimpleReception(params: {
  sourceLabel: string;
  sourceSign: string | null;
  counterpartLabel: string;
  counterpartSign: string | null;
  system: 'modern' | 'traditional';
}): NatalProjectionSimpleReception {
  const limitations = buildReceptionLimitations();
  const sourceLabel = normalizePlanetLabel(params.sourceLabel);
  const counterpartLabel = normalizePlanetLabel(params.counterpartLabel);

  if (!params.sourceSign || !params.counterpartSign) {
    return {
      system: params.system,
      status: 'unavailable',
      direction: 'unknown',
      sourceLabel,
      sourceSign: params.sourceSign,
      counterpartLabel,
      counterpartSign: params.counterpartSign,
      sourceInCounterpartRulership: false,
      counterpartInSourceRulership: false,
      limitations: [...limitations, 'Reception could not be tested because one or both signs are unavailable in this slice.'],
    };
  }

  if (sourceLabel === counterpartLabel) {
    return {
      system: params.system,
      status: 'unavailable',
      direction: 'unknown',
      sourceLabel,
      sourceSign: params.sourceSign,
      counterpartLabel,
      counterpartSign: params.counterpartSign,
      sourceInCounterpartRulership: false,
      counterpartInSourceRulership: false,
      limitations: [...limitations, 'Reception v1 only compares distinct planets or points; self-comparison is fenced.'],
    };
  }

  const counterpartSigns = ruledSignsFor(counterpartLabel, params.system);
  const sourceSigns = ruledSignsFor(sourceLabel, params.system);

  if (counterpartSigns.length === 0 || sourceSigns.length === 0) {
    return {
      system: params.system,
      status: 'unavailable',
      direction: 'unknown',
      sourceLabel,
      sourceSign: params.sourceSign,
      counterpartLabel,
      counterpartSign: params.counterpartSign,
      sourceInCounterpartRulership: false,
      counterpartInSourceRulership: false,
      limitations: [...limitations, 'Reception could not be tested because one or both bodies have no supported sign rulership in this system.'],
    };
  }

  const sourceInCounterpartRulership = counterpartSigns.includes(params.sourceSign);
  const counterpartInSourceRulership = sourceSigns.includes(params.counterpartSign);
  const status: NatalProjectionReceptionStatus = sourceInCounterpartRulership && counterpartInSourceRulership
    ? 'mutual'
    : sourceInCounterpartRulership || counterpartInSourceRulership
      ? 'one_way'
      : 'none';
  const direction: NatalProjectionReceptionDirection = sourceInCounterpartRulership && counterpartInSourceRulership
    ? 'both'
    : sourceInCounterpartRulership
      ? 'transit_to_natal'
      : counterpartInSourceRulership
        ? 'natal_to_transit'
        : 'neither';

  return {
    system: params.system,
    status,
    direction,
    sourceLabel,
    sourceSign: params.sourceSign,
    counterpartLabel,
    counterpartSign: params.counterpartSign,
    sourceInCounterpartRulership,
    counterpartInSourceRulership,
    limitations,
  };
}

export function buildDispositorChain(params: {
  chart: NatalChart;
  sign: string | null;
  chartRuler: NatalProjectionChartRuler;
  system: 'modern' | 'traditional';
  maxDepth?: number;
}): NatalProjectionDispositorChain {
  const maxDepth = params.maxDepth ?? 4;
  const limitations = [
    'Dispositor depth v1 follows sign rulers from stored natal placements only; it does not add sect, house-strength, term, face, combustion, or reception weighting.',
  ];

  if (!params.sign) {
    return {
      system: params.system,
      steps: [],
      finalRuler: null,
      termination: 'missing_sign',
      limitations,
    };
  }

  const steps: NatalProjectionDispositorStep[] = [];
  const seen = new Set<string>();
  let currentSign: string | null = params.sign;

  while (currentSign && steps.length < maxDepth) {
    const rulers = getSignRulers(currentSign);
    const ruler = params.system === 'modern' ? rulers.modernRuler : rulers.traditionalRuler;
    if (!ruler) {
      return {
        system: params.system,
        steps,
        finalRuler: null,
        termination: 'missing_ruler_placement',
        limitations,
      };
    }

    const placement = lookupRulerPlacement(params.chart, ruler);
    steps.push({
      sourceSign: currentSign,
      ruler,
      rulerSign: placement?.sign ?? null,
      rulerHouse: placement?.house ?? null,
      dignity: placement?.dignity ?? null,
      angularity: placement?.angularity ?? 'unknown',
      targetIsModernChartRuler: ruler === params.chartRuler.modernRuler,
      targetIsTraditionalChartRuler: ruler === params.chartRuler.traditionalRuler,
    });

    if (!placement?.sign) {
      return {
        system: params.system,
        steps,
        finalRuler: ruler,
        termination: 'missing_ruler_placement',
        limitations,
      };
    }

    const stepKey = `${ruler}:${placement.sign}`;
    if (seen.has(stepKey)) {
      return {
        system: params.system,
        steps,
        finalRuler: ruler,
        termination: 'cycle',
        limitations,
      };
    }
    seen.add(stepKey);

    const nextRulers = getSignRulers(placement.sign);
    const nextRuler = params.system === 'modern' ? nextRulers.modernRuler : nextRulers.traditionalRuler;
    if (nextRuler === ruler) {
      return {
        system: params.system,
        steps,
        finalRuler: ruler,
        termination: 'self_ruled',
        limitations,
      };
    }

    currentSign = placement.sign;
  }

  return {
    system: params.system,
    steps,
    finalRuler: steps.at(-1)?.ruler ?? null,
    termination: steps.length >= maxDepth ? 'max_depth' : 'missing_ruler_placement',
    limitations,
  };
}

export function buildNatalProjection(params: {
  chart: NatalChart;
  targetKey: string;
  targetLabel?: string;
  repeatedLifeAreaSignalCount?: number;
}): NatalProjection {
  const natalSummary = buildNatalSummary(params.chart);
  const placement = natalSummary.placementsByKey[params.targetKey];
  const angle = lookupAngle(params.chart, params.targetKey);
  const source = placement ?? angle;
  const chartRuler = getChartRuler(params.chart);
  const targetLabel = params.targetLabel ?? placement?.label ?? angle?.label ?? params.targetKey;
  const targetType: NatalProjectionTargetType = placement ? 'planet' : 'angle';
  const targetHouse = placement?.house ?? angle?.house ?? null;
  const signRulers = getSignRulers(source?.sign ?? null);
  const signRuler = {
    sign: source?.sign ?? null,
    modernRuler: signRulers.modernRuler,
    traditionalRuler: signRulers.traditionalRuler,
    modernRulerPlacement: lookupRulerPlacement(params.chart, signRulers.modernRuler),
    traditionalRulerPlacement: lookupRulerPlacement(params.chart, signRulers.traditionalRuler),
  };

  return {
    targetKey: params.targetKey,
    targetLabel,
    targetType,
    targetSign: source?.sign ?? null,
    targetDegree: source?.degree ?? null,
    targetHouse,
    house: getHouseLifeArea(targetHouse),
    angularity: classifyAngularity(params.targetKey, targetHouse),
    chartRuler,
    signRuler,
    dispositors: [
      buildDispositorChain({ chart: params.chart, sign: source?.sign ?? null, chartRuler, system: 'modern' }),
      buildDispositorChain({ chart: params.chart, sign: source?.sign ?? null, chartRuler, system: 'traditional' }),
    ],
    sect: buildSectContext(params.chart, targetLabel),
    targetIsModernChartRuler: targetLabel === chartRuler.modernRuler || params.targetKey === chartRuler.modernRuler.toLowerCase(),
    targetIsTraditionalChartRuler: targetLabel === chartRuler.traditionalRuler || params.targetKey === chartRuler.traditionalRuler?.toLowerCase(),
    targetIsAngle: !placement && Boolean(angle),
    dignity: source?.sign ? getBasicDignity(targetLabel, source.sign) : null,
    natalAspects: params.chart.aspects
      .filter((aspect) => aspect.between.includes(targetLabel))
      .map((aspect) => ({
        otherBody: aspect.between[0] === targetLabel ? aspect.between[1] : aspect.between[0],
        aspect: aspect.type,
        orb: Number(aspect.orb.toFixed(2)),
        angle: Number(aspect.angle.toFixed(2)),
      }))
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 6),
    repeatedLifeAreaSignalCount: params.repeatedLifeAreaSignalCount ?? 0,
    limitations: [
      'Natal projection in this slice is deterministic and limited to chart data already stored on the natal chart.',
      'Natal aspect context is limited to aspects already computed on the chart; no new aspect families are solved here.',
      'Rulership/dispositorship depth v1 is intentionally bounded to chart ruler placement, sign rulers, and short modern/traditional sign-ruler chains only.',
      'Reception is only attached when the judgment receipt has a second supported planet or point to compare against.',
    ],
  };
}
