'use client';

import { useState } from 'react';
import type { DailyTransits, Aspect } from '@/data/transits';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ASPECT_ENERGY: Record<Aspect, { label: string; color: string; dot: string }> = {
  conjunction: { label: 'Intense',     color: 'text-rose-400',    dot: 'bg-rose-400'    },
  opposition:  { label: 'Tension',     color: 'text-rose-400',    dot: 'bg-rose-400'    },
  square:      { label: 'Friction',    color: 'text-amber-400',   dot: 'bg-amber-400'   },
  trine:       { label: 'Flow',        color: 'text-emerald-400', dot: 'bg-emerald-400' },
  sextile:     { label: 'Opportunity', color: 'text-cyan-400',    dot: 'bg-cyan-400'    },
};

const ASPECT_LABELS: Record<Aspect, string> = {
  conjunction: 'conjunct',
  opposition:  'opposite',
  trine:       'trine',
  square:      'square',
  sextile:     'sextile',
};

function formatPlanetName(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function getDayIntensity(transits: DailyTransits['transits']): 'high' | 'medium' | 'low' | 'none' {
  if (transits.length === 0) return 'none';
  const hasHigh = transits.some(
    (t) => (t.aspect === 'conjunction' || t.aspect === 'opposition') && t.orb < 2,
  );
  if (hasHigh) return 'high';
  if (transits.length >= 3) return 'medium';
  return 'low';
}

interface Props {
  transitDays: DailyTransits[];
  todayStr: string;
  currentMonth: number;
  startDayOfWeek: number;
  daysInMonth: number;
}

export default function CalendarGrid({
  transitDays,
  todayStr,
  currentMonth,
  startDayOfWeek,
  daysInMonth,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<DailyTransits | null>(null);

  // Build a map for quick lookup
  const transitMap = new Map<string, DailyTransits>();
  for (const d of transitDays) {
    transitMap.set(d.date, d);
  }

  // Generate grid cells
  const cells: Array<{
    date: string;
    dayNum: number;
    inMonth: boolean;
    transits: DailyTransits;
  }> = [];

  for (let i = 0; i < transitDays.length; i++) {
    const d = transitDays[i];
    const dateObj = new Date(`${d.date}T12:00:00`);
    const dayNum = dateObj.getDate();
    const inMonth = dateObj.getMonth() === currentMonth;

    cells.push({ date: d.date, dayNum, inMonth, transits: d });
  }

  return (
    <>
      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[10px] uppercase tracking-widest text-zinc-600"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isToday = cell.date === todayStr;
          const intensity = getDayIntensity(cell.transits.transits);
          const isSelected = selectedDay?.date === cell.date;
          const hasTransits = cell.transits.transits.length > 0;

          return (
            <button
              key={cell.date}
              onClick={() =>
                hasTransits
                  ? setSelectedDay(isSelected ? null : cell.transits)
                  : setSelectedDay(null)
              }
              className={`relative flex min-h-[52px] flex-col items-center rounded-xl py-2 transition-all ${
                !cell.inMonth
                  ? 'opacity-30'
                  : isSelected
                    ? 'border border-violet-500/30 bg-violet-500/10'
                    : isToday
                      ? 'border border-violet-500/20 bg-violet-500/[0.06]'
                      : hasTransits
                        ? 'border border-white/[0.05] bg-white/[0.02] active:bg-white/[0.05]'
                        : 'border border-transparent'
              }`}
            >
              <span
                className={`text-sm ${
                  isToday
                    ? 'font-semibold text-violet-400'
                    : cell.inMonth
                      ? 'text-zinc-300'
                      : 'text-zinc-700'
                }`}
              >
                {cell.dayNum}
              </span>

              {/* Transit intensity dots */}
              {hasTransits && cell.inMonth && (
                <div className="mt-1 flex gap-0.5">
                  {(() => {
                    // Show colored dots for the dominant aspect types (max 3)
                    const aspects = new Set(cell.transits.transits.map((t) => t.aspect));
                    const sorted: Aspect[] = ['conjunction', 'opposition', 'square', 'trine', 'sextile'];
                    const active = sorted.filter((a) => aspects.has(a)).slice(0, 3);
                    return active.map((aspect) => (
                      <span
                        key={aspect}
                        className={`h-1.5 w-1.5 rounded-full ${ASPECT_ENERGY[aspect].dot}`}
                      />
                    ));
                  })()}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {(['conjunction', 'square', 'trine', 'sextile'] as Aspect[]).map((aspect) => (
          <div key={aspect} className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${ASPECT_ENERGY[aspect].dot}`} />
            <span className="text-[10px] text-zinc-600">{ASPECT_ENERGY[aspect].label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail panel */}
      {selectedDay && (
        <div className="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              {selectedDay.date === todayStr
                ? 'Today'
                : new Date(`${selectedDay.date}T12:00:00`).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
            </p>
            <button
              onClick={() => setSelectedDay(null)}
              className="text-xs text-zinc-600 hover:text-zinc-400"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {selectedDay.transits.slice(0, 8).map((t, i) => {
              const energy = ASPECT_ENERGY[t.aspect];
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">
                    {t.transitPlanet}{' '}
                    <span className="text-zinc-500">{ASPECT_LABELS[t.aspect]}</span>{' '}
                    {formatPlanetName(t.natalPlanet)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-600">
                      {t.orb}°
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider ${energy.color}`}>
                      {energy.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDay.transits.length === 0 && (
            <p className="text-sm text-zinc-600">A quiet day. No major transits.</p>
          )}
        </div>
      )}
    </>
  );
}
