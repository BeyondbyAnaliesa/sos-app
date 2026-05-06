import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import { transitTitle } from '@/lib/transit-copy';

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / 86_400_000);
}

export function formatTimingDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function daysCopy(days: number) {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 1) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}

export function getNextExactHit(arc: MajorTransitArc, today = new Date().toISOString().split('T')[0]) {
  return arc.exactHits.find((hit) => daysBetween(hit.date, today) >= 0) ?? arc.exactHits[arc.exactHits.length - 1] ?? null;
}

export function getNextStation(arc: MajorTransitArc, today = new Date().toISOString().split('T')[0]) {
  return arc.stations.find((station) => daysBetween(station.date, today) >= 0) ?? null;
}

export function getStationThisWeek(arcs: MajorTransitArc[], today = new Date().toISOString().split('T')[0]) {
  return arcs
    .flatMap((arc) => arc.stations.map((station) => ({ arc, station, days: daysBetween(station.date, today) })))
    .filter((item) => item.days >= 0 && item.days <= 7)
    .sort((a, b) => a.days - b.days)[0] ?? null;
}

export function getPeakThisWeek(arcs: MajorTransitArc[], today = new Date().toISOString().split('T')[0]) {
  return arcs
    .map((arc) => ({ arc, days: daysBetween(arc.peakDate, today) }))
    .filter((item) => item.days >= 0 && item.days <= 7)
    .sort((a, b) => a.days - b.days)[0] ?? null;
}

export function buildTransitTiming(arc: MajorTransitArc, today = new Date().toISOString().split('T')[0]) {
  const nextHit = getNextExactHit(arc, today);
  const nextStation = getNextStation(arc, today);
  const peakDays = daysBetween(arc.peakDate, today);
  const hitDays = nextHit ? daysBetween(nextHit.date, today) : null;
  const stationDays = nextStation ? daysBetween(nextStation.date, today) : null;
  const currentPass = nextHit
    ? Math.max(1, arc.exactHits.findIndex((hit) => hit.date === nextHit.date) + 1)
    : Math.max(1, arc.activeRunCount);

  return {
    title: transitTitle(arc.transit),
    peakLine: peakDays === 0 ? 'This wave peaks today.' : `Peak is ${daysCopy(peakDays)}.`,
    nextHitLine: nextHit
      ? `${nextHit.kind === 'exact' ? 'Next exact hit' : 'Closest pass'} is ${daysCopy(hitDays ?? 0)} on ${formatTimingDate(nextHit.date)}.`
      : 'No exact hit is visible in this scan.',
    passLine: arc.exactHits.length > 1
      ? `Pass ${currentPass} of ${arc.exactHits.length}. Watch what repeats from the earlier hit.`
      : 'One main pass in this scan.',
    stationLine: nextStation
      ? `${nextStation.kind === 'retrograde' ? 'Retrograde' : 'Direct'} station ${daysCopy(stationDays ?? 0)} on ${formatTimingDate(nextStation.date)}.`
      : 'No station marker in this wave window.',
    urgent: (hitDays != null && hitDays >= 0 && hitDays <= 2) || (peakDays >= 0 && peakDays <= 2) || (stationDays != null && stationDays >= 0 && stationDays <= 2),
    nextHit,
    nextStation,
    peakDays,
  };
}

export function buildTransitTimingSummary(arcs: MajorTransitArc[], today = new Date().toISOString().split('T')[0]) {
  const active = arcs.filter((arc) => arc.activeToday);
  const peak = getPeakThisWeek(arcs, today);
  const station = getStationThisWeek(arcs, today);
  const top = peak?.arc ?? active[0] ?? arcs[0] ?? null;

  if (!top) return null;

  const timing = buildTransitTiming(top, today);
  return {
    arc: top,
    headline: peak
      ? `${transitTitle(peak.arc.transit)} peaks ${daysCopy(peak.days)}.`
      : station
        ? `${transitTitle(station.arc.transit)} stations ${daysCopy(station.days)}.`
        : timing.peakLine,
    body: station
      ? `${station.station.kind === 'retrograde' ? 'Retrograde' : 'Direct'} station on ${formatTimingDate(station.station.date)}. ${timing.passLine}`
      : `${timing.nextHitLine} ${timing.passLine}`,
    href: `/transits/${encodeURIComponent(top.key)}`,
  };
}
