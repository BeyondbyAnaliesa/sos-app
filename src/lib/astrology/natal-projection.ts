import { buildNatalSummary, getHouse } from '@/lib/astrology/domain-types';
import type { NatalChart } from '@/lib/astrology/types';

export type NatalProjectionDignityCondition = 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine';
export type NatalProjectionAngularity = 'angle' | 'angular' | 'succedent' | 'cadent' | 'unknown';
export type NatalProjectionTargetType = 'planet' | 'angle';

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

export interface NatalProjectionChartRuler {
  ascSign: string;
  modernRuler: string;
  traditionalRuler: string | null;
}

export interface NatalProjectionDignity {
  condition: NatalProjectionDignityCondition;
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

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

function oppositeHouse(house: number | null) {
  if (house == null) return null;
  return ((house + 5) % 12) + 1;
}

function signFromLongitude(longitude: number) {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)] ?? 'Aries';
}

function degreeFromLongitude(longitude: number) {
  const normalized = ((longitude % 360) + 360) % 360;
  return Number((normalized % 30).toFixed(2));
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

export function getChartRuler(chart: NatalChart): NatalProjectionChartRuler {
  const ascSign = chart.angles.ascendant.sign;
  return {
    ascSign,
    modernRuler: MODERN_RULERS[ascSign],
    traditionalRuler: TRADITIONAL_RULERS[ascSign] === MODERN_RULERS[ascSign] ? null : TRADITIONAL_RULERS[ascSign],
  };
}

export function getBasicDignity(label: string, sign: string): NatalProjectionDignity | null {
  const rules = DIGNITY_RULES[label];
  if (!rules) return null;

  let condition: NatalProjectionDignityCondition = 'peregrine';
  if (rules.domicile?.includes(sign)) condition = 'domicile';
  else if (rules.exaltation?.includes(sign)) condition = 'exaltation';
  else if (rules.detriment?.includes(sign)) condition = 'detriment';
  else if (rules.fall?.includes(sign)) condition = 'fall';

  const limitations = [
    'Dignity is simplified in this slice: essential dignity only, with no sect, term, face, combustion, or dispositor-chain weighting.',
  ];
  if (['Uranus', 'Neptune', 'Pluto'].includes(label)) {
    limitations.push('Outer-planet dignity is limited to modern domicile/detriment only here; no exaltation or fall claims are made for those planets.');
  }

  return { condition, limitations };
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
    ],
  };
}
