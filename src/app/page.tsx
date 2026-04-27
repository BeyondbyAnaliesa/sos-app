export const runtime = 'nodejs';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { buildTransitOverview, interpretTransits } from '@/lib/interpret';
import type { GuidanceResult } from '@/lib/interpret';
import { calculateTransitsForDate } from '@/lib/astrology/calculate-transits';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { buildNatalSummary } from '@/lib/astrology/domain-types';
import { getSubscription, isActive } from '@/lib/subscription';
import { getRelevantTransitMemoryForToday } from '@/lib/astrology/memory-store';
import { buildHomeMemoryCue, buildStateText } from '@/lib/astrology/pure-fns';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';
import LifeWheel from '@/components/LifeWheel';
import type { LifeSegmentData, LifeSignal } from '@/components/LifeWheel';
import BottomNav from '@/components/BottomNav';

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

  const [chartResult, reportResult, signalResult] = await Promise.all([
    supabase
      .from('natal_charts')
      .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('onboarding_reports')
      .select('report_json')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('life_signals')
      .select('life_domain, content_text, themes_json, signal_timestamp')
      .eq('user_id', user.id)
      .order('signal_timestamp', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const chartRow = chartResult.data;
  if (!chartRow) {
    redirect('/onboarding');
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

  const activeTransits = todayTransits.transits;
  const guidance = interpretTransits(activeTransits, natalSummary);
  const overview = buildTransitOverview(activeTransits, natalSummary);
  const lifeSegments = buildLifeSegments(guidance);
  const stateText = buildStateText(guidance);
  // Arc memory: fetch structured transit memory context (non-fatal — falls back to signal-based cue)
  const arcMemory = await getRelevantTransitMemoryForToday(user.id).catch(() => null);

  const memoryCue = buildHomeMemoryCue({
    signal: signalResult.data as { life_domain?: string | null; content_text?: string | null; themes_json?: string[] | null } | null,
    report: (reportResult.data?.report_json ?? null) as { themes?: string[] | null } | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arcMemory: arcMemory as any,
    nowMs: Date.now(),
  });

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
      href:  paid ? '/calendar' : '/transits',
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
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-8 sm:px-6 sm:pt-12">
      <Header date={todayDate} />

      <section className="flex flex-col items-center pb-8 pt-2">
        <LifeWheel segments={lifeSegments} />
        <p className="mt-5 max-w-[260px] text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
          {stateText}
        </p>
        {overview.detail && (
          <p className="mt-2 max-w-[300px] text-center text-[11px] leading-relaxed text-[var(--color-text-muted)] opacity-80">
            {overview.detail}
          </p>
        )}
      </section>

      <div className="rounded-[10px] border border-[var(--color-electric)]/40 bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(239,68,136,0.02))] px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-electric)]">
          SOS noticed
        </p>
        <p className="mt-2 text-sm text-[var(--color-text)]">{memoryCue.headline}</p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">{memoryCue.body}</p>
      </div>

      <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />

      <section className="pt-7">
        <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Navigate
        </p>
        <div className="grid grid-cols-2 gap-3">
          {controls.map((ctrl) => (
            <Link
              key={ctrl.title}
              href={ctrl.href}
              className="relative rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-5 hover:border-[var(--color-border)] hover:bg-[var(--color-input)]"
            >
              <span className="block text-lg text-[var(--color-copper-dim)]">{ctrl.glyph}</span>
              <span className="mt-2 block text-sm text-[var(--color-text)]">{ctrl.title}</span>
              <span className="mt-0.5 block text-[11px] text-[var(--color-text-muted)]">{ctrl.desc}</span>
              {ctrl.locked && (
                <span className="absolute right-3 top-3 text-[9px] text-[var(--color-text-muted)] opacity-40">
                  ◈
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 text-center">
        {paid ? (
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-50">
            {sub?.plan === 'founding_annual' ? 'Founding Member' : 'Member'}
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
