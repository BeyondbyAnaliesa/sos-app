export const runtime = 'nodejs';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { buildTransitOverview, interpretTransits } from '@/lib/interpret';
import type { GuidanceResult } from '@/lib/interpret';
import { calculateTransitsForDate, calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { buildNatalSummary } from '@/lib/astrology/domain-types';
import { getSubscription, isActive } from '@/lib/subscription';
import { buildStateText } from '@/lib/astrology/pure-fns';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';
import LifeWheel from '@/components/LifeWheel';
import type { LifeSegmentData, LifeSignal } from '@/components/LifeWheel';
import BottomNav from '@/components/BottomNav';
import PendingLink from '@/components/PendingLink';

function buildLifeSegments(guidance: GuidanceResult[]): LifeSegmentData[] {
  const g = Object.fromEntries(guidance.map((r) => [r.domain, r]));
  const signal = (domain: string): LifeSignal => {
    const r = g[domain];
    if (!r) return 'quiet';
    return r.intensity === 'high' ? 'cautionary' : r.intensity === 'medium' ? 'supportive' : 'ambient';
  };
  return [
    { label: 'BODY',   signal: signal('body') },
    { label: 'MIND',   signal: signal('mind') },
    { label: 'SPIRIT', signal: signal('spirit') },
    { label: 'RELATE', signal: signal('relationships') },
    { label: 'WORK',   signal: signal('career') },
    { label: 'HOME',   signal: signal('home') },
  ];
}

// buildStateText has been extracted to pure-fns.ts.
// buildMemoryCue has been extracted to pure-fns.ts as buildHomeMemoryCue.
// Delegating here preserves the same runtime behavior while enabling direct unit tests.

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <LandingPage />;

  const sub = await getSubscription(user.id);
  const paid = isActive(sub);

  const { data: chartRow } = await supabase
    .from('natal_charts')
    .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
    .eq('user_id', user.id)
    .single();
  // Guard: row exists but columns are null/malformed (partial write, schema mismatch, or
  // old migration) — redirect to chart-error so the user can regenerate without re-entering
  // birth data. Option B from sos-stability-audit-2026-04-27.md P1-4.
  if (!chartRow || !chartRow.placements_json || !chartRow.angles_json) {
    redirect('/chart-error');
  }

  const richChart: RichChart = {
    placements: chartRow.placements_json,
    angles:     chartRow.angles_json,
    houses:     chartRow.houses_json ?? [],
    aspects:    chartRow.aspects_json,
    metadata:   chartRow.metadata_json,
  };
  const natalSummary = buildNatalSummary(richChart);
  const todayTransits = calculateTransitsForDate(new Date(), richChart);
  const todayDate = todayTransits.date;
  const todayRef = new Date(`${todayDate}T12:00:00Z`);
  const tomorrowRef = new Date(todayRef);
  tomorrowRef.setUTCDate(tomorrowRef.getUTCDate() + 1);

  const activeTransits = todayTransits.transits;
  // DR-2: 7-day look-ahead for calm-day context on the home screen.
  const lookAheadTransits = calculateTransitsForRange(
    tomorrowRef,
    7,
    richChart,
  );
  const guidance = interpretTransits(activeTransits, natalSummary);
  const overview = buildTransitOverview(activeTransits, natalSummary, { lookAheadTransits });
  const lifeSegments = buildLifeSegments(guidance);
  const stateText = buildStateText(guidance);

  const controls = [
    {
      glyph: '◑',
      title: paid ? 'Advanced Daily Reading' : 'Daily Reading',
      desc:  paid ? 'Everything active in your chart today' : 'See what is active right now',
      href:  '/reading/daily',
      locked: false,
    },
    {
      glyph: '◈',
      title: 'Charts',
      desc:  'Your natal map',
      href:  '/reading',
      locked: false,
    },
    {
      glyph: '◎',
      title: 'Transits',
      desc:  'Planetary positions now',
      href:  '/transits',
      locked: !paid,
    },
    {
      glyph: '◆',
      title: 'Chat with Aeon',
      desc:  'Talk through what is alive',
      href:  '/journal',
      locked: false,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-xl animate-[fade-in_0.35s_ease-out] px-5 pb-24 pt-8 sm:px-6 sm:pt-12">
      <Header date={todayDate} />

      <section className="flex flex-col items-center pb-8 pt-2">
        <LifeWheel segments={lifeSegments} />
        <p className="mt-5 max-w-[280px] text-center text-sm leading-relaxed text-[var(--color-text-muted)]">
          {stateText}
        </p>
        {overview.detail && (
          <p className="mt-2 max-w-[300px] text-center text-[11px] leading-relaxed text-[var(--color-text-muted)] opacity-80">
            {overview.detail}
          </p>
        )}
      </section>

      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />

      <section className="pt-7">
        <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Navigate
        </p>
        <div className="grid grid-cols-2 gap-3">
          {controls.map((ctrl) => (
            <PendingLink
              key={ctrl.title}
              href={ctrl.href}
              className="relative overflow-hidden rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-5 hover:border-[var(--color-border)] hover:bg-[var(--color-input)]"
              pendingLabel={ctrl.title === 'Transits' ? 'Opening transits' : 'Wait a moment'}
            >
              <span className="block text-lg text-[var(--color-copper-dim)]">{ctrl.glyph}</span>
              <span className="mt-2 block text-sm text-[var(--color-text)]">{ctrl.title}</span>
              <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">{ctrl.desc}</span>
              {ctrl.locked && (
                <span className="absolute right-3 top-3 text-[9px] text-[var(--color-text-muted)] opacity-40">
                  ◈
                </span>
              )}
            </PendingLink>
          ))}
        </div>
      </section>

      <div className="mt-8 text-center">
        {paid ? (
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-50">
            {sub?.plan === 'charter_annual' ? 'Charter Member' : 'Member'}
          </p>
        ) : (
          <Link
            href="/upgrade"
            className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-copper-dim)] hover:text-[var(--color-copper)]"
          >
            Unlock full access →
          </Link>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
