export const runtime = 'nodejs'; // required for sweph

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateTransitsForDate, calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import { interpretTransits, buildTransitOverview } from '@/lib/interpret';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { buildNatalSummary } from '@/lib/astrology/domain-types';
import type { DailyTransits, Transit } from '@/lib/astrology/domain-types';
import { getSubscription, isActive } from '@/lib/subscription';
import {
  partitionTransitRoomGuidance,
  getTransitDomainLabel,
} from '@/lib/astrology/transit-domain-map';
import GuidanceCard from '@/components/GuidanceCard';
import UnlockCTA from '@/components/UnlockCTA';
import BottomNav from '@/components/BottomNav';
import AppBackLink from '@/components/AppBackLink';
import AeonFloatingButton from '@/components/AeonFloatingButton';
import { buildOrbTimeframe, buildTransitFeel, buildTransitReading, transitColor, transitKey, transitTitle } from '@/lib/transit-copy';
import CalendarGrid from '@/app/calendar/CalendarGrid';

/**
 * Transit Room — the free-user thirst trap for the Transits card.
 *
 * Free users: one current transit fully read + all other active domains
 *   visible but locked with their life-domain label. UnlockCTA at bottom.
 *
 * Paid users: redirected to /calendar (the full transit calendar).
 *   Redirect happens before any expensive computation.
 *
 * H-1 spec: https://github.com/BeyondbyAnaliesa/SOS-App (sos-decisions-2026-04-27.md)
 */
function formatShortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function transitWindow(transit: Transit, days: DailyTransits[]) {
  const key = transitKey(transit);
  const dates = days
    .filter((day) => day.transits.some((t) => transitKey(t) === key))
    .map((day) => day.date)
    .sort();
  if (dates.length === 0) return 'Active today';
  const start = dates[0];
  const end = dates[dates.length - 1];
  return start === end ? formatShortDate(start) : `${formatShortDate(start)}–${formatShortDate(end)}`;
}

export default async function TransitRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const [chartResult, sub] = await Promise.all([
    supabase
      .from('natal_charts')
      .select(
        'placements_json, angles_json, houses_json, aspects_json, metadata_json',
      )
      .eq('user_id', user.id)
      .single(),
    getSubscription(user.id),
  ]);

  const paid = isActive(sub);

  // Guard: no chart, or chart row exists with null/malformed columns (partial write, old migration).
  // No chart row → onboarding. Corrupted chart row → chart-error (Option B, P1-4).
  if (!chartResult.data) {
    redirect('/onboarding');
  }
  if (!chartResult.data.placements_json || !chartResult.data.angles_json) {
    redirect('/chart-error');
  }

  const richChart: RichChart = {
    placements: chartResult.data.placements_json,
    angles: chartResult.data.angles_json,
    houses: chartResult.data.houses_json ?? [],
    aspects: chartResult.data.aspects_json,
    metadata: chartResult.data.metadata_json,
  };

  const natalSummary = buildNatalSummary(richChart);
  const now = new Date();
  const todayTransits = calculateTransitsForDate(now, richChart);
  const todayRef = new Date(`${todayTransits.date}T12:00:00Z`);
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1);
  const startDayOfWeek = monthStart.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calcStart = new Date(year, month, 1 - startDayOfWeek);
  const totalDays = startDayOfWeek + daysInMonth;
  const gridDays = Math.ceil(totalDays / 7) * 7;
  const monthTransits: DailyTransits[] = calculateTransitsForRange(calcStart, gridDays, richChart).map((d) => ({
    ...d,
    transits: d.transits.filter((t) => t.transitPlanet !== 'Moon'),
  }));
  const tomorrowRef = new Date(todayRef);
  tomorrowRef.setUTCDate(tomorrowRef.getUTCDate() + 1);
  // DR-2: 72-hour look-ahead for calm-day context in the transit room.
  const lookAheadTransits = calculateTransitsForRange(
    tomorrowRef,
    3,
    richChart,
  );
  const guidance = interpretTransits(todayTransits.transits, natalSummary);
  const overview = buildTransitOverview(todayTransits.transits, natalSummary, { lookAheadTransits });

  // Free users: 1 visible, rest locked. Paid users see all current guidance here and can also open Calendar.
  const { visible, locked, quiet } = partitionTransitRoomGuidance(guidance, paid);

  const today = todayRef.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lockedDomainLabels = locked.map((r) => getTransitDomainLabel(r.domain));
  const todayStr = todayTransits.date;

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <AppBackLink />
      <header className="mb-10 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          Transits
        </h1>
        <time className="mt-2 block text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          {today}
        </time>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      <section className="mb-8 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-5 sm:px-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
              Transit calendar
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
              Each dot is a live transit. Matching colors connect the day to the transit list below.
            </p>
          </div>
          {paid && (
            <a href="/calendar" className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--color-electric)] hover:underline">
              Month →
            </a>
          )}
        </div>
        <CalendarGrid
          transitDays={monthTransits}
          todayStr={todayStr}
          currentMonth={month}
          startDayOfWeek={startDayOfWeek}
          daysInMonth={daysInMonth}
        />
      </section>

      {/* Sky overview */}
      <section className="mb-8 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
          ◎ Today&apos;s Sky
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
          {overview.summary}
        </p>
        {overview.detail && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {overview.detail}
          </p>
        )}
      </section>

      {todayTransits.transits.length > 0 && (
        <section className="mb-8 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
            What is active now
          </p>
          <div className="space-y-4">
            {todayTransits.transits.slice(0, paid ? 8 : 3).map((transit, i) => (
              <div key={`${transitTitle(transit)}-${i}`} className="border-b border-[var(--color-border-subtle)] pb-4 last:border-b-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: transitColor(transit) }} />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{transitTitle(transit)}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--color-electric)]">
                        Active in this month view: {transitWindow(transit, monthTransits)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper-dim)]">{transit.orb}° orb</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{buildTransitReading(transit)}</p>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)] opacity-80">{buildTransitFeel(transit)}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-electric)]">{buildOrbTimeframe(transit.orb)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Free unlocked transit — full depth reading */}
      {visible.length > 0 && (
        <section className="mb-6">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Unlocked for you
          </p>
          <div className="space-y-4">
            {visible.map((result) => (
              <GuidanceCard key={result.domain} result={result} showAskAeon />
            ))}
          </div>
        </section>
      )}

      {/* Locked transits — thirst trap: visible label, content hidden */}
      {locked.length > 0 && (
        <section className="mb-8">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Also active today
          </p>
          <div className="space-y-3">
            {locked.map((result) => (
              <div
                key={result.domain}
                data-testid="locked-transit-card"
                className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4"
              >
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
                    {getTransitDomainLabel(result.domain)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)] opacity-50">
                    {result.summary}
                  </p>
                </div>
                <span
                  className="ml-4 shrink-0 text-[var(--color-text-muted)] opacity-30"
                  aria-label="Locked"
                >
                  ◈
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quiet domains */}
      {quiet.length > 0 && (
        <section className="mb-8">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Quieter Today
          </p>
          <div className="space-y-3">
            {quiet.map((result) => (
              <div
                key={result.domain}
                className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4"
              >
                <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
                  {result.title}
                </p>
                <p className="mt-1 text-[11px] text-[var(--color-text-muted)] opacity-60">
                  {result.summary}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upgrade CTA — shown for free users. */}
      {!paid && <section
        data-testid="transit-room-unlock-cta"
        className="mb-8 rounded-[10px] border border-[var(--color-electric)] bg-[rgba(239,68,136,0.06)] px-5 py-5 sm:px-6"
      >
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-electric)]">
          ✦ Full access unlocks everything
        </p>
        {lockedDomainLabels.length > 0 && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {lockedDomainLabels.length} more life{' '}
            {lockedDomainLabels.length === 1 ? 'area is' : 'areas are'} active in your
            chart today —{' '}
            {lockedDomainLabels.length === 1
              ? lockedDomainLabels[0]
              : lockedDomainLabels.length === 2
              ? `${lockedDomainLabels[0]} and ${lockedDomainLabels[1]}`
              : `${lockedDomainLabels.slice(0, -1).join(', ')}, and ${lockedDomainLabels[lockedDomainLabels.length - 1]}`}
            .
          </p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
          Get the full 30-day transit calendar, your complete chart, and everything
          moving in your sky.
        </p>
        <div className="mt-5">
          <UnlockCTA />
        </div>
      </section>}

      <AeonFloatingButton />
      <BottomNav />
    </main>
  );
}
