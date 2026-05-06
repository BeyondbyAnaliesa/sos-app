export const runtime = 'nodejs'; // required for sweph

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateTransitsForDate, calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import { calculateMajorTransitArcs } from '@/lib/astrology/major-transits';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import { interpretTransits, buildTransitOverview } from '@/lib/interpret';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { buildNatalSummary } from '@/lib/astrology/domain-types';
import type { DailyTransits } from '@/lib/astrology/domain-types';
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
import { buildTransitFeel, buildTransitReading, buildWaveUse, transitColor, transitTitle } from '@/lib/transit-copy';
import CalendarGrid from '@/app/calendar/CalendarGrid';
import { listSecureLifeSignals } from '@/lib/astrology/secure-life-signals';
import { buildMajorWaveMemoryReading } from '@/lib/major-transit-reading';
import type { MajorWaveMemoryInput } from '@/lib/major-transit-reading';
import { getOrCreateMajorTransitAiReadings, majorTransitReadingKey } from '@/lib/major-transit-ai-reading';
import type { MajorTransitAiReading } from '@/lib/major-transit-ai-reading';

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

function arcWindow(arc: MajorTransitArc) {
  return `${formatShortDate(arc.startDate)}–${formatShortDate(arc.endDate)}`;
}

function phaseCopy(arc: MajorTransitArc) {
  if (arc.phase === 'peaking') return 'Peaking now';
  if (arc.phase === 'building') return arc.daysUntilPeak === 1 ? 'Peaks tomorrow' : `Peaks in ${arc.daysUntilPeak} days`;
  const daysPast = Math.abs(arc.daysUntilPeak);
  return daysPast === 1 ? 'Peaked yesterday' : `Peaked ${daysPast} days ago`;
}

function progressPercent(arc: MajorTransitArc) {
  const elapsed = Math.max(0, Math.min(arc.totalDays, diffDaysLocal(new Date().toISOString().split('T')[0], arc.startDate)));
  return Math.max(4, Math.min(100, Math.round((elapsed / Math.max(1, arc.totalDays)) * 100)));
}

function percentForDate(arc: MajorTransitArc, date: string) {
  const elapsed = Math.max(0, Math.min(arc.totalDays, diffDaysLocal(date, arc.startDate)));
  return Math.max(2, Math.min(98, Math.round((elapsed / Math.max(1, arc.totalDays)) * 100)));
}

function hitLabel(kind: 'exact' | 'closest') {
  return kind === 'exact' ? 'Exact' : 'Closest';
}

function stationLabel(kind: 'retrograde' | 'direct') {
  return kind === 'retrograde' ? 'Rx station' : 'Direct station';
}

function diffDaysLocal(a: string, b: string) {
  return Math.round((new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / 86_400_000);
}

function MajorTransitCard({ arc, memory, aiReading }: { arc: MajorTransitArc; memory: MajorWaveMemoryInput; aiReading?: MajorTransitAiReading }) {
  const memoryReading = buildMajorWaveMemoryReading(arc, memory);
  const color = transitColor(arc.transit);
  return (
    <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">{transitTitle(arc.transit)}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--color-electric)]">{phaseCopy(arc)}</p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper-dim)]">
          {arc.todayOrb != null ? `${arc.todayOrb}° now` : `${arc.peakOrb}° peak`}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <span>{formatShortDate(arc.startDate)}</span>
          <span>{arc.activeRunCount > 1 ? `${arc.activeRunCount} passes` : 'One pass'}</span>
          <span>{formatShortDate(arc.endDate)}</span>
        </div>
        <div className="relative h-3 rounded-full bg-[rgba(244,239,232,0.08)]">
          <div className="absolute left-0 top-0 h-full rounded-full opacity-80" style={{ width: `${progressPercent(arc)}%`, backgroundColor: color }} />
          {arc.exactHits.map((hit, index) => (
            <span
              key={`${hit.date}-${index}`}
              className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-void)] shadow-[0_0_0_1px_rgba(244,239,232,0.35)]"
              style={{ left: `${percentForDate(arc, hit.date)}%`, backgroundColor: color }}
              aria-label={`${hitLabel(hit.kind)} hit ${formatShortDate(hit.date)}`}
            />
          ))}
          {arc.stations.map((station, index) => (
            <span
              key={`${station.date}-station-${index}`}
              className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-void)] bg-[var(--color-text)] shadow-[0_0_0_1px_rgba(239,68,136,0.45)]"
              style={{ left: `${percentForDate(arc, station.date)}%` }}
              aria-label={`${stationLabel(station.kind)} ${formatShortDate(station.date)}`}
            />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {arc.exactHits.map((hit, index) => (
            <span key={`${hit.date}-chip-${index}`} className="rounded-full border border-[var(--color-border-subtle)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
              {hitLabel(hit.kind)} {formatShortDate(hit.date)} · {hit.orb}°
            </span>
          ))}
          {arc.stations.map((station, index) => (
            <span key={`${station.date}-station-chip-${index}`} className="rounded-full border border-[var(--color-electric)]/45 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-electric)]">
              {stationLabel(station.kind)} {formatShortDate(station.date)} · {station.degree}° {station.sign}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
          Active lifecycle: {arcWindow(arc)} · {arc.totalDays} days from first contact to final fade in this scan.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        {arc.context.targetSign && (
          <div className="rounded-[10px] border border-[var(--color-border-subtle)] px-3 py-2">
            {arc.context.targetSign}{arc.context.targetDegree != null ? ` ${arc.context.targetDegree}°` : ''}
          </div>
        )}
        {arc.context.targetHouse && (
          <div className="rounded-[10px] border border-[var(--color-border-subtle)] px-3 py-2">
            House {arc.context.targetHouse}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">What this is</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{buildTransitReading(arc.transit)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">Where it lands</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">
            This is hitting your natal {arc.context.targetLabel}{arc.context.targetHouse ? ` in the ${arc.context.targetHouse} house` : ''}: {arc.context.lifeArea}.
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">Memory read</p>
          {aiReading ? (
            <div className="mt-1 space-y-3">
              <p className="text-base leading-relaxed text-[var(--color-text)]">{aiReading.headline}</p>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{aiReading.wave}</p>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{aiReading.whyYou}</p>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{aiReading.feel}</p>
              {aiReading.memoryNote && <p className="text-xs leading-relaxed text-[var(--color-text-muted)] opacity-75">{aiReading.memoryNote}</p>}
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{memoryReading.personalLine}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)] opacity-80">{memoryReading.memoryLine}</p>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-electric)]">{memoryReading.lifecycleLine}</p>
            </>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">How to use it</p>
          <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{aiReading?.use ?? buildWaveUse(arc.transit, arc.context.lifeArea)}</p>
          {aiReading?.doNotForce && <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)] opacity-80">Do not force: {aiReading.doNotForce}</p>}
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-[var(--color-text-muted)] opacity-80">{buildTransitFeel(arc.transit)}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Link
          href={`/transits/${encodeURIComponent(arc.key)}`}
          className="flex items-center justify-between rounded-[10px] border border-[var(--color-electric)]/45 px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--color-electric)] hover:border-[var(--color-electric)]"
        >
          <span>Open full wave</span>
          <span>→</span>
        </Link>
        <a
          href={`/journal?starter=${encodeURIComponent(aiReading?.aeonQuestion ?? `Go deeper on this ${transitTitle(arc.transit)} transit.`)}&context=${encodeURIComponent(`${transitTitle(arc.transit)} is active ${arcWindow(arc)} and ${phaseCopy(arc).toLowerCase()}.`)}`}
          className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--color-electric)] hover:border-[var(--color-electric)]"
        >
          <span>Ask Aeon</span>
          <span>→</span>
        </a>
      </div>
    </div>
  );
}

export default async function TransitRoomPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const [chartResult, reportResult, natalReadingResult, sub] = await Promise.all([
    supabase
      .from('natal_charts')
      .select(
        'placements_json, angles_json, houses_json, aspects_json, metadata_json',
      )
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('onboarding_reports')
      .select('report_json')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('natal_readings')
      .select('reading_json')
      .eq('user_id', user.id)
      .maybeSingle(),
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
  const gridEnd = new Date(calcStart);
  gridEnd.setDate(gridEnd.getDate() + gridDays - 1);
  const { arcs: majorArcs, days: majorDays, todayStr } = calculateMajorTransitArcs(richChart, {
    centerDate: now,
    pastDays: 150,
    futureDays: 240,
  });
  const startStr = calcStart.toISOString().split('T')[0];
  const endStr = gridEnd.toISOString().split('T')[0];
  const monthTransits: DailyTransits[] = majorDays.filter((day) => day.date >= startStr && day.date <= endStr);
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
  const lifeSignals = await listSecureLifeSignals(supabase, { userId: user.id, limit: 12 }).catch(() => []);
  const waveMemory: MajorWaveMemoryInput = {
    report: (reportResult.data?.report_json ?? null) as MajorWaveMemoryInput['report'],
    natalReading: natalReadingResult.data?.reading_json ?? null,
    lifeSignals,
  };
  const activeMajorArcs = majorArcs.filter((arc) => arc.activeToday).slice(0, paid ? 8 : 2);
  const upcomingMajorArcs = majorArcs.filter((arc) => !arc.activeToday).slice(0, paid ? 6 : 2);
  const displayedMajorArcs = [...activeMajorArcs, ...upcomingMajorArcs];
  const aiReadings = await getOrCreateMajorTransitAiReadings({
    userId: user.id,
    arcs: displayedMajorArcs,
    chart: richChart,
    memory: waveMemory,
  });

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
              Each dot is a major personal transit wave. Matching colors connect the calendar to the arcs below.
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

      <section className="mb-8">
        <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Major waves active now
        </p>
        {activeMajorArcs.length > 0 ? (
          <div className="space-y-4">
            {activeMajorArcs.map((arc) => <MajorTransitCard key={arc.key} arc={arc} memory={waveMemory} aiReading={aiReadings[majorTransitReadingKey(arc)]} />)}
          </div>
        ) : (
          <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              No major long-arc transit is exact enough today in the current calculation window. The daily weather below can still trigger shorter moments, but the big waves are quiet right now.
            </p>
          </div>
        )}
      </section>

      {upcomingMajorArcs.length > 0 && (
        <section className="mb-8">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Building next
          </p>
          <div className="space-y-4">
            {upcomingMajorArcs.map((arc) => <MajorTransitCard key={arc.key} arc={arc} memory={waveMemory} aiReading={aiReadings[majorTransitReadingKey(arc)]} />)}
          </div>
        </section>
      )}

      {/* Daily weather, demoted: useful triggers, not the main transit product. */}
      <section className="mb-8 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
          Daily sky weather
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
          {overview.summary}
        </p>
        {overview.detail && (
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {overview.detail}
          </p>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-text-muted)] opacity-70">
          These are short-term contacts. They can describe mood, timing, or a quick trigger, but the major waves above are the real Transit Info layer.
        </p>
      </section>

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
