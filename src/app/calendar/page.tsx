export const runtime = 'nodejs'; // required for sweph

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import { getSubscription, isActive } from '@/lib/subscription';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import type { DailyTransits } from '@/data/transits';
import CalendarGrid from './CalendarGrid';
import { track } from '@/lib/analytics';
import BottomNav from '@/components/BottomNav';

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
        <p className="text-sm text-[var(--color-text-muted)]">Complete onboarding to see your transit calendar.</p>
        <Link href="/" className="mt-4 block text-xs text-[var(--color-copper-dim)] hover:text-[var(--color-copper)]">
          ← Back to home
        </Link>
      </main>
    );
  }

  track('calendar_viewed', { userId: user.id });

  const richChart: RichChart = {
    placements: chartRow.placements_json,
    angles:     chartRow.angles_json,
    houses:     chartRow.houses_json ?? [],
    aspects:    chartRow.aspects_json,
    metadata:   chartRow.metadata_json,
  };

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthStart = new Date(year, month, 1);
  const startDayOfWeek = monthStart.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calcStart = new Date(year, month, 1 - startDayOfWeek);
  const totalDays = startDayOfWeek + daysInMonth;
  const gridDays = Math.ceil(totalDays / 7) * 7;

  const allTransits = calculateTransitsForRange(calcStart, gridDays, richChart);
  const filteredTransits: DailyTransits[] = allTransits.map((d) => ({
    ...d,
    transits: d.transits.filter((t) => t.transitPlanet !== 'Moon'),
  }));

  const monthLabel = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const todayStr = today.toISOString().split('T')[0];

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-8">
        <div className="mx-auto mb-6 h-px w-16 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-center text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          {monthLabel}
        </h1>
        <p className="mt-2 text-center text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Transit Calendar
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      <CalendarGrid
        transitDays={filteredTransits}
        todayStr={todayStr}
        currentMonth={month}
        startDayOfWeek={startDayOfWeek}
        daysInMonth={daysInMonth}
      />
      <BottomNav />
    </main>
  );
}
