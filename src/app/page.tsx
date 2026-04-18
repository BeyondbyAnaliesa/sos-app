export const runtime = 'nodejs';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { mockNatalChart } from '@/data/natal-chart';
import { buildTransitOverview, interpretTransits } from '@/lib/interpret';
import type { GuidanceResult } from '@/lib/interpret';
import { toSimpleChart } from '@/lib/astrology/transform';
import { calculateTransitsForDate } from '@/lib/astrology/calculate-transits';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { getSubscription, isActive } from '@/lib/subscription';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';
import LifeWheel from '@/components/LifeWheel';
import type { LifeSegmentData, LifeSignal } from '@/components/LifeWheel';
import BottomNav from '@/components/BottomNav';

// ─── Life wheel helpers ───────────────────────────────────────────────────────

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

function buildStateText(guidance: GuidanceResult[]): string {
  const top = [...guidance].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return order[a.intensity] - order[b.intensity];
  })[0];

  if (!top || top.intensity === 'low') {
    return 'The sky is relatively quiet today. Better for noticing than forcing.';
  }

  return top.message.split('. ')[0] ?? top.message;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <LandingPage />;

  const sub = await getSubscription(user.id);
  const paid = isActive(sub);

  let todayDate = new Date().toISOString().split('T')[0];
  let todayTransits: ReturnType<typeof calculateTransitsForDate> | null = null;
  let simpleChart = mockNatalChart;

  const { data: chartRow } = await supabase
    .from('natal_charts')
    .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
    .eq('user_id', user.id)
    .single();

  if (chartRow) {
    const richChart: RichChart = {
      placements: chartRow.placements_json,
      angles:     chartRow.angles_json,
      houses:     chartRow.houses_json ?? [],
      aspects:    chartRow.aspects_json,
      metadata:   chartRow.metadata_json,
    };
    simpleChart = toSimpleChart(richChart);
    todayTransits = calculateTransitsForDate(new Date(), richChart);
    todayDate = todayTransits.date;
  }

  const activeTransits = todayTransits?.transits ?? [];
  const guidance = interpretTransits(activeTransits, simpleChart);
  const overview = buildTransitOverview(activeTransits, simpleChart);
  const lifeSegments = buildLifeSegments(guidance);
  const stateText = buildStateText(guidance);

  const controls = [
    {
      glyph: '◑',
      title: 'Daily Reading',
      desc:  'Your live chart today',
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
      href:  paid ? '/calendar' : '/upgrade',
      locked: !paid,
    },
    {
      glyph: '◆',
      title: 'Companion',
      desc:  'Write & reflect',
      href:  '/journal',
      locked: false,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-8 sm:px-6 sm:pt-12">
      <Header date={todayDate} />

      {/* ── Life Wheel Hero ── */}
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

      <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />

      {/* ── Control Surfaces ── */}
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

      {/* ── Member badge ── */}
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
