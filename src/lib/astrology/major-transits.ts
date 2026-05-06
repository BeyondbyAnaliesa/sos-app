import { calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import type { DailyTransits, Transit } from '@/lib/astrology/domain-types';
import type { NatalChart } from '@/lib/astrology/types';
import { transitKey } from '@/lib/transit-copy';

export const MAJOR_TRANSIT_PLANETS = new Set([
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'North Node',
]);

export type MajorTransitPhase = 'building' | 'peaking' | 'fading';

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
}

function isoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function dateAtUtcNoon(iso: string) {
  return new Date(`${iso}T12:00:00Z`);
}

function diffDays(a: string, b: string) {
  return Math.round((dateAtUtcNoon(a).getTime() - dateAtUtcNoon(b).getTime()) / 86_400_000);
}

function addDays(date: Date, days: number) {
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

  const grouped = new Map<string, Array<{ date: string; transit: Transit }>>();
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

    let segment: Array<{ date: string; transit: Transit }> = [];
    const flush = () => {
      if (segment.length < 5) {
        segment = [];
        return;
      }
      const peak = segment.reduce((best, item) => item.transit.orb < best.transit.orb ? item : best, segment[0]);
      const todayEntry = segment.find((item) => item.date === todayStr);
      const startDate = segment[0].date;
      const endDate = segment[segment.length - 1].date;
      const visibleDates = segment.map((item) => item.date);
      const todayOrb = todayEntry?.transit.orb ?? null;
      const activeToday = Boolean(todayEntry);
      const daysUntilPeak = diffDays(peak.date, todayStr);
      const totalDays = diffDays(endDate, startDate) + 1;

      // Keep currently active arcs and near-future arcs. Drop old completed arcs from the main list.
      if (activeToday || daysUntilPeak >= 0) {
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
        });
      }
      segment = [];
    };

    for (const entry of entries) {
      const prev = segment[segment.length - 1];
      if (prev && diffDays(entry.date, prev.date) > 1) flush();
      segment.push(entry);
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
