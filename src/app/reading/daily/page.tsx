export const runtime = 'nodejs';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { toSimpleChart } from '@/lib/astrology/transform';
import { calculateTransitsForDate } from '@/lib/astrology/calculate-transits';
import { interpretTransits, buildTransitOverview } from '@/lib/interpret';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { track } from '@/lib/analytics';
import BottomNav from '@/components/BottomNav';
import GuidanceCard from '@/components/GuidanceCard';

export default async function DailyReadingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: chartRow } = await supabase
    .from('natal_charts')
    .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
    .eq('user_id', user.id)
    .single();

  if (!chartRow) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 text-center sm:px-6">
        <p className="text-sm text-[var(--color-text-muted)]">Complete onboarding to see your daily reading.</p>
        <Link href="/onboarding" className="mt-4 block text-xs text-[var(--color-copper-dim)] hover:text-[var(--color-copper)]">
          Start onboarding →
        </Link>
        <BottomNav />
      </main>
    );
  }

  track('daily_reading_viewed', { userId: user.id });

  const richChart: RichChart = {
    placements: chartRow.placements_json,
    angles:     chartRow.angles_json,
    houses:     chartRow.houses_json ?? [],
    aspects:    chartRow.aspects_json,
    metadata:   chartRow.metadata_json,
  };

  const simpleChart = toSimpleChart(richChart);
  const todayTransits = calculateTransitsForDate(new Date(), richChart);
  const guidance = interpretTransits(todayTransits.transits, simpleChart);
  const overview = buildTransitOverview(todayTransits.transits, simpleChart);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  // Filter to domains that actually have signal
  const activeGuidance = guidance.filter((g) => g.intensity !== 'low');
  const quietGuidance = guidance.filter((g) => g.intensity === 'low');

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          Daily Reading
        </h1>
        <time className="mt-2 block text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          {today}
        </time>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      {/* Overview */}
      <section className="mb-8 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
          ◑ Today's Sky
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

      {/* Active domains */}
      {activeGuidance.length > 0 && (
        <section className="mb-6">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            What's Active
          </p>
          <div className="space-y-4">
            {activeGuidance.map((result) => (
              <GuidanceCard key={result.domain} result={result} />
            ))}
          </div>
        </section>
      )}

      {/* Quiet domains */}
      {quietGuidance.length > 0 && (
        <section className="mb-8">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            Quieter Today
          </p>
          <div className="space-y-3">
            {quietGuidance.map((result) => (
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

      {/* Transit list */}
      <section className="mb-6 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
          ✦ Active Transits
        </p>
        <div className="space-y-2">
          {todayTransits.transits.slice(0, 10).map((t, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text)]">
                {t.transitPlanet} <span className="text-[var(--color-text-muted)]">{t.aspect}</span> {t.natalPlanet}
              </span>
              <span className="tabular-nums text-[10px] text-[var(--color-text-muted)] opacity-50">
                {t.orb}°
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA to journal */}
      <div className="pt-2">
        <Link
          href="/journal"
          className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          <span>Bring this to your journal</span>
          <span className="text-[var(--color-copper-dim)]">→</span>
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
