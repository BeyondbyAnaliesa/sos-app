export const runtime = 'nodejs'; // required for sweph

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import { getSubscription, isActive } from '@/lib/subscription';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import type { DailyTransits, Aspect } from '@/data/transits';
import CalendarGrid from './CalendarGrid';

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const sub = await getSubscription(user.id);
  if (!isActive(sub)) redirect('/upgrade');

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

  // Calculate transits for the current month + padding
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  // Start from the 1st of the month
  const monthStart = new Date(year, month, 1);
  // Calculate days in month + days we need before (to fill the first week)
  const startDayOfWeek = monthStart.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Calculate from a few days before month start to fill the grid
  const calcStart = new Date(year, month, 1 - startDayOfWeek);
  const totalDays = startDayOfWeek + daysInMonth;
  const gridDays = Math.ceil(totalDays / 7) * 7; // fill complete weeks

  const allTransits = calculateTransitsForRange(calcStart, gridDays, richChart);

  // Filter out Moon transits (too frequent for calendar view)
  const filteredTransits: DailyTransits[] = allTransits.map((d) => ({
    ...d,
    transits: d.transits.filter((t) => t.transitPlanet !== 'Moon'),
  }));

  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = today.toISOString().split('T')[0];

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="mb-8 flex items-center gap-1.5 py-2 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
      >
        <span>←</span>
        <span>Home</span>
      </Link>

      <header className="mb-8">
        <div className="mx-auto mb-6 h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-center text-3xl font-light tracking-[0.15em] text-white">
          {monthLabel}
        </h1>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          Transit Calendar
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>

      <CalendarGrid
        transitDays={filteredTransits}
        todayStr={todayStr}
        currentMonth={month}
        startDayOfWeek={startDayOfWeek}
        daysInMonth={daysInMonth}
      />
    </main>
  );
}
