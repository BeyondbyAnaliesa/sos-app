'use client';

import { useState } from 'react';
import type { DailyTransits, Aspect, Transit } from '@/lib/astrology/domain-types';
import { buildOrbTimeframe, buildTransitFeel, buildTransitReading, transitColor, transitKey } from '@/lib/transit-copy';

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

function buildWindow(transit: Transit, selectedDate: string, transitDays: DailyTransits[]): { label: string; trend: 'building' | 'easing' | 'steady' } {
  const key = transitKey(transit);
  const dates = transitDays
    .filter((day) => day.transits.some((t) => transitKey(t) === key))
    .map((day) => day.date)
    .sort();

  const selectedIndex = dates.indexOf(selectedDate);
  const start = dates[0] ?? selectedDate;
  const end = dates[dates.length - 1] ?? selectedDate;
  const selectedOrb = transit.orb;
  const nextDate = selectedIndex >= 0 ? dates[selectedIndex + 1] : undefined;
  const nextTransit = nextDate
    ? transitDays.find((day) => day.date === nextDate)?.transits.find((t) => transitKey(t) === key)
    : undefined;
  const trend = nextTransit
    ? nextTransit.orb < selectedOrb ? 'building' : nextTransit.orb > selectedOrb ? 'easing' : 'steady'
    : 'steady';

  const label = start === end
    ? new Date(`${start}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : `${new Date(`${start}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${new Date(`${end}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return { label, trend };
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
                <div className="mt-1 flex max-w-[42px] flex-wrap justify-center gap-0.5">
                  {cell.transits.transits.slice(0, 12).map((transit, i) => (
                    <span
                      key={`${transitKey(transit)}-${i}`}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: transitColor(transit) }}
                      aria-label={`${transit.transitPlanet} ${transit.aspect} ${formatPlanetName(transit.natalPlanet)}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-center text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
        Tap a day to see active transits and windows
      </p>

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

          <div className="space-y-4">
            {selectedDay.transits.slice(0, 8).map((t, i) => {
              const energy = ASPECT_ENERGY[t.aspect];
              const window = buildWindow(t, selectedDay.date, transitDays);
              return (
                <div key={i} className="border-b border-[var(--color-border-subtle)] pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3 text-sm">
                    <span className="flex items-start gap-2 text-[var(--color-text)]">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: transitColor(t) }} />
                      <span>{t.transitPlanet}{' '}
                      <span className="text-[var(--color-text-muted)]">{ASPECT_LABELS[t.aspect]}</span>{' '}
                      {formatPlanetName(t.natalPlanet)}</span>
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] text-[var(--color-text-muted)]">
                        {t.orb}°
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[var(--color-copper)]">
                        {energy.label}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
                    {buildTransitReading(t)}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)] opacity-80">
                    {buildTransitFeel(t)}
                  </p>
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-electric)]">
                    Active in this calendar view: {window.label}. {buildOrbTimeframe(t.orb, window.trend)}
                  </p>
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
