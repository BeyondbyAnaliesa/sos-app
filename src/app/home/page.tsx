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
  const domainSignals = new Map<string, LifeSignal>();

  for (const result of guidance as Array<GuidanceResult | (GuidanceResult & { domain: string })>) {
    const hasActiveTransit = result.summary !== 'No significant transits';
    domainSignals.set(
      result.domain,
      !hasActiveTransit ? 'quiet' : result.intensity === 'high' ? 'cautionary' : result.intensity === 'medium' ? 'supportive' : 'quiet',
    );
  }

  const signal = (domains: string[], fallback: LifeSignal = 'quiet'): LifeSignal => {
    for (const domain of domains) {
      const match = domainSignals.get(domain);
      if (match) return match;
    }
    return fallback;
  };

  return [
    { label: 'MONEY', signal: signal(['money']) },
    { label: 'BODY', signal: signal(['body']) },
    { label: 'MIND', signal: signal(['mind']) },
    { label: 'HOME', signal: signal(['home']) },
    { label: 'RELATIONSHIPS', signal: signal(['relationships']) },
    { label: 'LOVE', signal: signal(['love']) },
    { label: 'SPIRIT', signal: signal(['spirit']) },
    { label: 'WORK', signal: signal(['work', 'career']) },
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

      <section className="px-1 pb-8 pt-5 sm:px-2">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[460px]">
            <LifeWheel segments={lifeSegments} />
          </div>

          <div className="mt-5 max-w-[320px] text-center">
            <p className="text-sm leading-relaxed text-[var(--color-text)]">{stateText}</p>
            {overview.detail && (
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--color-text-muted)] opacity-80">
                {overview.detail}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[22px] border border-[var(--color-border-subtle)] bg-[linear-gradient(180deg,rgba(22,20,34,0.92),rgba(22,20,34,0.72))] px-4 py-5 sm:px-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">Navigate</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Simple routes, same fast loading flow.</p>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-[var(--color-border-subtle)] to-transparent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {controls.map((ctrl) => (
            <PendingLink
              key={ctrl.title}
              href={ctrl.href}
              className="relative overflow-hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[linear-gradient(180deg,rgba(30,27,48,0.82),rgba(22,20,34,0.96))] px-4 py-5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] hover:border-[var(--color-border)] hover:bg-[var(--color-input)]"
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
