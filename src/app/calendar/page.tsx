export const runtime = 'nodejs'; // required for sweph

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import type { Aspect } from '@/data/transits';

const ASPECT_LABELS: Record<Aspect, string> = {
  conjunction: 'conjunct',
  opposition:  'opposite',
  trine:       'trine',
  square:      'square',
  sextile:     'sextile',
};

const ASPECT_ENERGY: Record<Aspect, { label: string; color: string }> = {
  conjunction: { label: 'Intense',     color: 'text-rose-400'    },
  opposition:  { label: 'Tension',     color: 'text-rose-400'    },
  square:      { label: 'Friction',    color: 'text-amber-400'   },
  trine:       { label: 'Flow',        color: 'text-emerald-400' },
  sextile:     { label: 'Opportunity', color: 'text-cyan-400'    },
};

function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
  });
}

function formatPlanetName(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: chartRow } = await supabase
    .from('natal_charts')
    .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
    .eq('user_id', user.id)
    .single();

  if (!chartRow) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-16 text-center">
        <p className="text-sm text-zinc-400">Complete onboarding to see your transit calendar.</p>
        <Link href="/" className="mt-4 block text-xs text-zinc-600 hover:text-zinc-400">
          ← Back to home
        </Link>
      </main>
    );
  }

  const richChart: RichChart = {
    placements: chartRow.placements_json,
    angles:     chartRow.angles_json,
    houses:     chartRow.houses_json ?? [],
    aspects:    chartRow.aspects_json,
    metadata:   chartRow.metadata_json,
  };

  const today = new Date();
  const transitDays = calculateTransitsForRange(today, 30, richChart);
  const todayStr = today.toISOString().split('T')[0];

  // Filter to days with notable transits (skip Moon transits for calendar — too frequent)
  const notableDays = transitDays.map((d) => ({
    ...d,
    transits: d.transits.filter((t) => t.transitPlanet !== 'Moon'),
  })).filter((d) => d.transits.length > 0);

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="mb-8 flex items-center gap-1.5 py-2 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
      >
        <span>←</span>
        <span>Home</span>
      </Link>

      <header className="mb-10">
        <div className="mx-auto mb-6 h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-center text-3xl font-light tracking-[0.15em] text-white">
          Transit Calendar
        </h1>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          Next 30 days
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>

      <div className="space-y-4">
        {notableDays.map((day) => {
          const isToday = day.date === todayStr;
          return (
            <div
              key={day.date}
              className={`rounded-2xl border px-5 py-4 ${
                isToday
                  ? 'border-violet-500/20 bg-violet-500/[0.04]'
                  : 'border-white/[0.07] bg-white/[0.03]'
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <p className={`text-xs font-semibold uppercase tracking-widest ${isToday ? 'text-violet-400' : 'text-zinc-500'}`}>
                  {isToday ? 'Today' : formatDate(day.date)}
                </p>
                {isToday && (
                  <p className="text-[10px] text-zinc-600">{formatDate(day.date)}</p>
                )}
              </div>

              <div className="space-y-2">
                {day.transits.slice(0, 5).map((t, i) => {
                  const energy = ASPECT_ENERGY[t.aspect];
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">
                        {t.transitPlanet}{' '}
                        <span className="text-zinc-500">{ASPECT_LABELS[t.aspect]}</span>{' '}
                        {formatPlanetName(t.natalPlanet)}
                      </span>
                      <span className={`text-[10px] uppercase tracking-wider ${energy.color}`}>
                        {energy.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {notableDays.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-500">
            No major transits in the next 30 days. A quiet season.
          </p>
        )}
      </div>
    </main>
  );
}
