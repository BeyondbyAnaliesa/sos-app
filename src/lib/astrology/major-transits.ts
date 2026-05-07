import { calculateTransitsForRange, getPlanetaryPositions } from '@/lib/astrology/calculate-transits';
import type { DailyTransits, Transit } from '@/lib/astrology/domain-types';
import type { NatalChart } from '@/lib/astrology/types';
import { transitKey } from '@/lib/transit-copy';

export const MAJOR_TRANSIT_PLANETS = new Set([
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
  'North Node',
]);

export type MajorTransitPhase = 'building' | 'peaking' | 'fading';

export interface MajorTransitHit {
  date: string;
  orb: number;
  kind: 'exact' | 'closest';
}

export interface MajorTransitStation {
  date: string;
  kind: 'retrograde' | 'direct';
  degree: number;
  sign: string;
}

export interface MajorTransitContext {
  targetLabel: string;
  targetSign: string | null;
  targetHouse: number | null;
  targetDegree: number | null;
  lifeArea: string;
}

export interface MajorTransitArc {
  key: string;
  transit: Transit;
  startDate: string;
  endDate: string;
  peakDate: string;
  peakOrb: number;
  todayOrb: number | null;
  phase: MajorTransitPhase;
  activeToday: boolean;
  daysUntilPeak: number;
  totalDays: number;
  visibleDates: string[];
  exactHits: MajorTransitHit[];
  stations: MajorTransitStation[];
  activeRunCount: number;
  context: MajorTransitContext;
}

type TransitEntry = { date: string; transit: Transit };

const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

function formatLongitude(longitude: number) {
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degree = Number((normalized - signIndex * 30).toFixed(2));
  return { sign: SIGNS[signIndex], degree };
}

const HOUSE_AREAS: Record<number, string> = {
  1: 'identity, body, and how life meets you',
  2: 'money, self-worth, appetite, and what you rely on',
  3: 'thoughts, siblings, messages, decisions, and daily movement',
  4: 'home, family, roots, privacy, and emotional ground',
  5: 'desire, creativity, children, dating, and aliveness',
  6: 'work rhythm, health, habits, service, and the daily load',
  7: 'partnership, clients, mirrors, and direct relationship patterns',
  8: 'shared money, sex, grief, power, trust, and deep entanglements',
  9: 'beliefs, travel, study, publishing, faith, and larger meaning',
  10: 'career, visibility, reputation, authority, and public direction',
  11: 'friends, networks, audience, groups, and future plans',
  12: 'rest, endings, hidden material, solitude, and what works under the surface',
};

function getHouse(longitude: number, cusps: number[]) {
  for (let i = 0; i < 12; i++) {
    const nextI = (i + 1) % 12;
    const start = cusps[i];
    const end = cusps[nextI];
    if (start < end) {
      if (longitude >= start && longitude < end) return i + 1;
    } else if (longitude >= start || longitude < end) {
      return i + 1;
    }
  }
  return null;
}

function buildContext(natalChart: NatalChart, natalPoint: string): MajorTransitContext {
  const placement = natalChart.placements.find((p) => p.key === natalPoint);
  const angle = natalPoint === 'ascendant'
    ? natalChart.angles.ascendant
    : natalPoint === 'midheaven'
      ? natalChart.angles.midheaven
      : natalPoint === 'descendant'
        ? {
            longitude: ((natalChart.angles.ascendant.longitude + 180) % 360 + 360) % 360,
            sign: formatLongitude(((natalChart.angles.ascendant.longitude + 180) % 360 + 360) % 360).sign,
            degree: formatLongitude(((natalChart.angles.ascendant.longitude + 180) % 360 + 360) % 360).degree,
            minute: natalChart.angles.ascendant.minute,
          }
        : natalPoint === 'imumCoeli'
          ? {
              longitude: ((natalChart.angles.midheaven.longitude + 180) % 360 + 360) % 360,
              sign: formatLongitude(((natalChart.angles.midheaven.longitude + 180) % 360 + 360) % 360).sign,
              degree: formatLongitude(((natalChart.angles.midheaven.longitude + 180) % 360 + 360) % 360).degree,
              minute: natalChart.angles.midheaven.minute,
            }
          : null;
  const source = placement ?? angle;
  const house = source?.longitude != null && natalChart.houses?.length === 12 ? getHouse(source.longitude, natalChart.houses) : null;
  const targetLabel = placement?.label
    ?? (natalPoint === 'ascendant'
      ? 'Ascendant'
      : natalPoint === 'midheaven'
        ? 'Midheaven'
        : natalPoint === 'descendant'
          ? 'Descendant'
          : natalPoint === 'imumCoeli'
            ? 'IC'
            : natalPoint.charAt(0).toUpperCase() + natalPoint.slice(1));

  return {
    targetLabel,
    targetSign: source?.sign ?? null,
    targetHouse: house,
    targetDegree: source?.degree ?? null,
    lifeArea: house ? HOUSE_AREAS[house] : 'a core chart point',
  };
}

function isoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export function dateAtUtcNoon(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

export function diffDays(a: string, b: string) {
  return Math.round((dateAtUtcNoon(a).getTime() - dateAtUtcNoon(b).getTime()) / 86_400_000);
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function isMajorTransit(t: Transit) {
  return MAJOR_TRANSIT_PLANETS.has(t.transitPlanet);
}

function phaseFor(today: string, peak: string, todayOrb: number | null): MajorTransitPhase {
  if (todayOrb != null && todayOrb <= 0.75) return 'peaking';
  const days = diffDays(peak, today);
  if (Math.abs(days) <= 3) return 'peaking';
  return days > 0 ? 'building' : 'fading';
}

function splitActiveRuns(entries: TransitEntry[]) {
  const runs: TransitEntry[][] = [];
  let run: TransitEntry[] = [];

  for (const entry of entries) {
    const prev = run[run.length - 1];
    if (prev && diffDays(entry.date, prev.date) > 1) {
      runs.push(run);
      run = [];
    }
    run.push(entry);
  }

  if (run.length) runs.push(run);
  return runs;
}

export function findStationsInRange(startDate: string, endDate: string, transitPlanet: string): MajorTransitStation[] {
  const start = dateAtUtcNoon(startDate);
  const total = diffDays(endDate, startDate) + 1;
  const daily = Array.from({ length: total }, (_, i) => {
    const date = addDays(start, i);
    const position = getPlanetaryPositions(date).find((p) => p.label === transitPlanet);
    return position ? { date: isoDate(date), speed: position.speed, longitude: position.longitude } : null;
  }).filter((value): value is { date: string; speed: number; longitude: number } => value != null);

  const stations: MajorTransitStation[] = [];
  for (let i = 1; i < daily.length; i++) {
    const prev = daily[i - 1];
    const curr = daily[i];
    if ((prev.speed >= 0 && curr.speed < 0) || (prev.speed <= 0 && curr.speed > 0)) {
      const station = Math.abs(prev.speed) <= Math.abs(curr.speed) ? prev : curr;
      const { sign, degree } = formatLongitude(station.longitude);
      stations.push({
        date: station.date,
        kind: curr.speed < 0 ? 'retrograde' : 'direct',
        degree,
        sign,
      });
    }
  }

  return stations.filter((station, index, arr) => index === 0 || diffDays(station.date, arr[index - 1].date) > 5);
}

function buildStations(startDate: string, endDate: string, transitPlanet: string): MajorTransitStation[] {
  return findStationsInRange(startDate, endDate, transitPlanet).slice(0, 6);
}

function buildHits(entries: TransitEntry[]): MajorTransitHit[] {
  const runs = splitActiveRuns(entries);
  const hits: MajorTransitHit[] = [];

  for (const run of runs) {
    if (run.length === 0) continue;
    const localHits: MajorTransitHit[] = [];

    for (let i = 0; i < run.length; i++) {
      const prev = run[i - 1];
      const curr = run[i];
      const next = run[i + 1];
      const isLocalMin = (!prev || curr.transit.orb <= prev.transit.orb) && (!next || curr.transit.orb <= next.transit.orb);
      if (isLocalMin && curr.transit.orb <= 1.25) {
        localHits.push({
          date: curr.date,
          orb: curr.transit.orb,
          kind: curr.transit.orb <= 0.25 ? 'exact' : 'closest',
        });
      }
    }

    if (localHits.length > 0) {
      hits.push(...localHits);
    } else {
      const closest = run.reduce((best, item) => item.transit.orb < best.transit.orb ? item : best, run[0]);
      hits.push({ date: closest.date, orb: closest.transit.orb, kind: 'closest' });
    }
  }

  // Deduplicate adjacent equal minima while keeping multi-pass hits.
  return hits
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((hit, index, arr) => index === 0 || diffDays(hit.date, arr[index - 1].date) > 2)
    .slice(0, 6);
}

export function calculateMajorTransitArcs(
  natalChart: NatalChart,
  options?: { centerDate?: Date; pastDays?: number; futureDays?: number },
): { arcs: MajorTransitArc[]; days: DailyTransits[]; todayStr: string } {
  const center = options?.centerDate ?? new Date();
  const todayStr = isoDate(center);
  const pastDays = options?.pastDays ?? 120;
  const futureDays = options?.futureDays ?? 240;
  const start = addDays(new Date(`${todayStr}T12:00:00Z`), -pastDays);
  const total = pastDays + futureDays + 1;

  const days = calculateTransitsForRange(start, total, natalChart).map((day) => ({
    ...day,
    transits: day.transits.filter(isMajorTransit),
  }));

  const grouped = new Map<string, TransitEntry[]>();
  for (const day of days) {
    for (const transit of day.transits) {
      const key = transitKey(transit);
      const arr = grouped.get(key) ?? [];
      arr.push({ date: day.date, transit });
      grouped.set(key, arr);
    }
  }

  const arcs: MajorTransitArc[] = [];
  for (const [key, entries] of grouped.entries()) {
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // A real outer-planet transit can leave orb and come back months later because of retrograde motion.
    // Treat gaps under ~4 months as one lifecycle with multiple active runs/hits, not separate “daily” events.
    let cycle: TransitEntry[] = [];
    const flush = () => {
      if (cycle.length < 5) {
        cycle = [];
        return;
      }

      const peak = cycle.reduce((best, item) => item.transit.orb < best.transit.orb ? item : best, cycle[0]);
      const todayEntry = cycle.find((item) => item.date === todayStr);
      const startDate = cycle[0].date;
      const endDate = cycle[cycle.length - 1].date;
      const visibleDates = cycle.map((item) => item.date);
      const todayOrb = todayEntry?.transit.orb ?? null;
      const activeToday = Boolean(todayEntry);
      const daysUntilPeak = diffDays(peak.date, todayStr);
      const totalDays = diffDays(endDate, startDate) + 1;
      const exactHits = buildHits(cycle);
      const stations = buildStations(startDate, endDate, peak.transit.transitPlanet);
      const activeRunCount = splitActiveRuns(cycle).length;
      const context = buildContext(natalChart, peak.transit.natalPlanet);

      // Keep currently active arcs and near-future arcs. Drop old completed arcs from the main list.
      if (activeToday || daysUntilPeak >= 0 || exactHits.some((hit) => diffDays(hit.date, todayStr) >= 0)) {
        arcs.push({
          key,
          transit: todayEntry?.transit ?? peak.transit,
          startDate,
          endDate,
          peakDate: peak.date,
          peakOrb: peak.transit.orb,
          todayOrb,
          phase: phaseFor(todayStr, peak.date, todayOrb),
          activeToday,
          daysUntilPeak,
          totalDays,
          visibleDates,
          exactHits,
          stations,
          activeRunCount,
          context,
        });
      }
      cycle = [];
    };

    for (const entry of entries) {
      const prev = cycle[cycle.length - 1];
      if (prev && diffDays(entry.date, prev.date) > 120) flush();
      cycle.push(entry);
    }
    flush();
  }

  arcs.sort((a, b) => {
    if (a.activeToday !== b.activeToday) return a.activeToday ? -1 : 1;
    const aPhaseRank = a.phase === 'peaking' ? 0 : a.phase === 'building' ? 1 : 2;
    const bPhaseRank = b.phase === 'peaking' ? 0 : b.phase === 'building' ? 1 : 2;
    if (aPhaseRank !== bPhaseRank) return aPhaseRank - bPhaseRank;
    return Math.abs(a.daysUntilPeak) - Math.abs(b.daysUntilPeak);
  });

  return { arcs, days, todayStr };
}
