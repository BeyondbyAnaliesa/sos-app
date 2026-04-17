'use client';

import { useState } from 'react';
import type { DailyTransits, Aspect } from '@/data/transits';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ASPECT_ENERGY: Record<Aspect, { label: string; dot: string }> = {
  conjunction: { label: 'Intense',     dot: 'bg-[var(--color-copper)]' },
  opposition:  { label: 'Tension',     dot: 'bg-[var(--color-copper)]' },
  square:      { label: 'Friction',    dot: 'bg-[var(--color-copper-dim)]' },
  trine:       { label: 'Flow',        dot: 'bg-[var(--color-text-muted)]' },
  sextile:     { label: 'Opportunity', dot: 'bg-[var(--color-text-muted)]' },
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
}: Props) {
  const [selectedDay, setSelectedDay] = useState<DailyTransits | null>(null);

  const cells = transitDays.map((d) => {
    const dateObj = new Date(`${d.date}T12:00:00`);
    return {
      date: d.date,
      dayNum: dateObj.getDate(),
      inMonth: dateObj.getMonth() === currentMonth,
      transits: d,
    };
  });

  return (
    <>
      {/* Weekday headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isToday = cell.date === todayStr;
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
              className={`relative flex min-h-[52px] flex-col items-center rounded-[10px] py-2 ${
                !cell.inMonth
                  ? 'opacity-25'
                  : isSelected
                    ? 'border border-[var(--color-border)] bg-[var(--color-surface)]'
                    : isToday
                      ? 'border border-[var(--color-copper-dim)] bg-[var(--color-surface)]'
                      : hasTransits
                        ? 'border border-[var(--color-border-subtle)] bg-[var(--color-surface)]'
                        : 'border border-transparent'
              }`}
            >
              <span
                className={`text-sm ${
                  isToday
                    ? 'font-medium text-[var(--color-copper)]'
                    : cell.inMonth
                      ? 'text-[var(--color-text)]'
                      : 'text-[var(--color-text-muted)]'
                }`}
              >
                {cell.dayNum}
              </span>

              {hasTransits && cell.inMonth && (
                <div className="mt-1 flex gap-0.5">
                  {(() => {
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
            <span className="text-[10px] text-[var(--color-text-muted)]">{ASPECT_ENERGY[aspect].label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="mt-6 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
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
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {selectedDay.transits.slice(0, 8).map((t, i) => {
              const energy = ASPECT_ENERGY[t.aspect];
              return (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text)]">
                    {t.transitPlanet}{' '}
                    <span className="text-[var(--color-text-muted)]">{ASPECT_LABELS[t.aspect]}</span>{' '}
                    {formatPlanetName(t.natalPlanet)}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      {t.orb}°
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[var(--color-copper)]">
                      {energy.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedDay.transits.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">A quiet day. No major transits.</p>
          )}
        </div>
      )}
    </>
  );
}
