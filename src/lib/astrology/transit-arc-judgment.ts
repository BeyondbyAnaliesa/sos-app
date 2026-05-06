import { buildNatalProjection } from '@/lib/astrology/natal-projection';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import type { NatalChart } from '@/lib/astrology/types';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import type { ArcLifecycleDurationClass, ArcLifecycleJudgment, ArcLifecycleMemoryLinkage } from '@/lib/astrology/judgment-types';

function dateAtUtcNoon(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

function diffDays(a: string, b: string) {
  return Math.round((dateAtUtcNoon(a).getTime() - dateAtUtcNoon(b).getTime()) / 86_400_000);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function compactText(value: string | null | undefined, max = 120) {
  return value?.replace(/\s+/g, ' ').trim().slice(0, max) ?? '';
}

export function findRelevantArcLifeSignals(arc: MajorTransitArc, memory: MajorWaveMemoryInput) {
  const areaWords = arc.context.lifeArea.toLowerCase().split(/[^a-z]+/).filter((word) => word.length > 3);
  const target = arc.context.targetLabel.toLowerCase();

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

function durationClass(totalDays: number): ArcLifecycleDurationClass {
  if (totalDays < 3) return 'event';
  if (totalDays <= 21) return 'short';
  if (totalDays <= 90) return 'medium';
  if (totalDays <= 730) return 'long';
  if (totalDays <= 1825) return 'structural';
  return 'generational';
}

function currentPass(arc: MajorTransitArc, date: string) {
  if (arc.exactHits.length === 0) return arc.activeRunCount > 0 ? 1 : null;
  const nextIndex = arc.exactHits.findIndex((hit) => hit.date >= date);
  if (nextIndex >= 0) return nextIndex + 1;
  return Math.max(arc.exactHits.length, arc.activeRunCount, 1);
}

function inferPassDirection(arc: MajorTransitArc, hitDate: string): 'direct' | 'retrograde' | 'unknown' {
  const priorStationCount = arc.stations.filter((station) => station.date < hitDate).length;
  return priorStationCount % 2 === 0 ? 'direct' : 'retrograde';
}

function buildMemoryLinkage(arc: MajorTransitArc, memory: MajorWaveMemoryInput) {
  const matches = findRelevantArcLifeSignals(arc, memory);
  const mostRecentSignalDate = matches
    .map((signal) => signal.signal_timestamp?.slice(0, 10) ?? null)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  const matchedDomains = [...new Set(matches.map((signal) => signal.life_domain).filter((value): value is string => Boolean(value)))].slice(0, 4);
  const excerpts = matches
    .map((signal) => compactText(signal.content_text, 90) || signal.themes_json?.[0] || signal.life_domain || '')
    .filter(Boolean)
    .slice(0, 3);

  let confidence: ArcLifecycleMemoryLinkage['confidence'] = 'none';
  if (matches.length >= 3) confidence = 'high';
  else if (matches.length === 2) confidence = 'medium';
  else if (matches.length === 1) confidence = 'low';

  return {
    matchedSignalCount: matches.length,
    repeatedLifeAreaSignalCount: matches.length,
    mostRecentSignalDate,
    matchedDomains,
    excerpts,
    confidence,
  } satisfies ArcLifecycleMemoryLinkage;
}

export function buildTransitArcJudgment(params: {
  arc: MajorTransitArc;
  chart: NatalChart;
  memory: MajorWaveMemoryInput;
  date: string;
}): ArcLifecycleJudgment {
  const { arc, chart, memory, date } = params;
  const totalPasses = Math.max(arc.exactHits.length, arc.activeRunCount, 1);
  const currentPassNumber = currentPass(arc, date);
  const daysActive = clamp(diffDays(date, arc.startDate) + 1, 0, Math.max(1, arc.totalDays));
  const daysRemaining = clamp(diffDays(arc.endDate, date), 0, Math.max(0, arc.totalDays));
  const percentComplete = arc.totalDays > 0 ? Number(((daysActive / arc.totalDays) * 100).toFixed(1)) : null;
  const repeatedLifeAreaSignalCount = findRelevantArcLifeSignals(arc, memory).length;
  const natalProjection = buildNatalProjection({
    chart,
    targetKey: arc.transit.natalPlanet,
    targetLabel: arc.context.targetLabel,
    repeatedLifeAreaSignalCount,
  });
  const memoryLinkage = buildMemoryLinkage(arc, memory);
  const nextExactHit = arc.exactHits.find((hit) => hit.date >= date) ?? null;
  const nextStation = arc.stations.find((station) => station.date >= date) ?? null;
  const watchNextDate = nextExactHit?.date ?? nextStation?.date ?? (arc.endDate >= date ? arc.endDate : null);
  const watchNextType = nextExactHit ? 'exact_hit' : nextStation ? 'station' : arc.endDate >= date ? 'arc_close' : null;

  return {
    durationDays: arc.totalDays,
    daysActive,
    daysRemaining,
    percentComplete,
    durationClass: durationClass(arc.totalDays),
    totalPasses,
    currentPass: currentPassNumber,
    exactHitCount: arc.exactHits.length,
    passSequence: arc.exactHits.map((hit, index) => ({
      passNumber: index + 1,
      hitDate: hit.date,
      kind: hit.kind,
      orb: hit.orb,
      direction: inferPassDirection(arc, hit.date),
      status: hit.date < date ? 'past' : currentPassNumber === index + 1 ? 'current' : 'upcoming',
      daysFromNow: diffDays(hit.date, date),
    })),
    stationMarkers: arc.stations.map((station) => ({
      ...station,
      daysFromNow: diffDays(station.date, date),
      status: station.date < date ? 'past' : 'upcoming',
    })),
    currentOrb: arc.todayOrb ?? arc.peakOrb,
    phaseLabel: arc.phase === 'building'
      ? `building_pass_${currentPassNumber ?? 1}`
      : arc.phase === 'peaking'
        ? `peak_pass_${currentPassNumber ?? 1}`
        : `integration_after_pass_${currentPassNumber ?? totalPasses}`,
    phaseDemand: arc.phase === 'building' ? 'prepare' : arc.phase === 'peaking' ? 'respond' : 'integrate',
    natalSummary: {
      targetLabel: natalProjection.targetLabel,
      targetType: natalProjection.targetType,
      targetSign: natalProjection.targetSign,
      targetDegree: natalProjection.targetDegree,
      targetHouse: natalProjection.targetHouse,
      houseLabel: natalProjection.house.label,
      axisLabel: natalProjection.house.axisLabel,
      angularity: natalProjection.angularity,
      targetIsAngle: natalProjection.targetIsAngle,
      targetIsModernChartRuler: natalProjection.targetIsModernChartRuler,
      targetIsTraditionalChartRuler: natalProjection.targetIsTraditionalChartRuler,
      dignity: natalProjection.dignity,
      natalAspects: natalProjection.natalAspects,
    },
    memoryLinkage,
    watchNextDate,
    watchNextType,
    limitations: [
      'Pass directions are inferred from exact-hit order plus station markers already on the arc, not from a fresh retrograde solve.',
      'Watch-next only uses visible exact hits, station markers, and the scanned arc end date.',
      'This slice does not claim historical rarity or station precision beyond the stored arc data.',
    ],
  };
}
