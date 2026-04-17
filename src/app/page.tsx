export const runtime = 'nodejs'; // required for sweph

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { mockNatalChart } from '@/data/natal-chart';
import { interpretTransits } from '@/lib/interpret';
import { toSimpleChart } from '@/lib/astrology/transform';
import { calculateTransitsForDate } from '@/lib/astrology/calculate-transits';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { getSubscription, isActive } from '@/lib/subscription';
import GuidanceCard from '@/components/GuidanceCard';
import Header from '@/components/Header';
import LandingPage from '@/components/LandingPage';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Unauthenticated → show landing/marketing page
  if (!user) return <LandingPage />;

  // Load subscription state
  const sub = await getSubscription(user.id);
  const paid = isActive(sub);

  // Load user's real chart or fall back to mock
  let simpleChart = mockNatalChart;
  let todayDate = new Date().toISOString().split('T')[0];
  let todayTransits: ReturnType<typeof calculateTransitsForDate> | null = null;

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

  const transitsForGuidance = todayTransits?.transits ?? [];
  const guidance = interpretTransits(transitsForGuidance, simpleChart);

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-10 pt-10 sm:px-6 sm:pt-14">
      <Header date={todayDate} />

      <section>
        <p className="mb-5 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Today&apos;s Guidance
        </p>
        <div className="space-y-3">
          {guidance.map((result) => (
            <GuidanceCard key={result.domain} result={result} />
          ))}
        </div>
      </section>

      {/* Navigation */}
      <nav className="mt-10 flex flex-col gap-1">
        <Link
          href="/journal"
          className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          <span>Write today&apos;s journal</span>
          <span className="text-[var(--color-copper-dim)]">→</span>
        </Link>
        <Link
          href="/reading"
          className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          <span>Natal reading</span>
          <span className="text-[var(--color-copper-dim)]">◆</span>
        </Link>
        <Link
          href={paid ? '/calendar' : '/upgrade'}
          className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          <span>Transit calendar</span>
          <span className="text-[var(--color-copper-dim)]">{paid ? '◇' : '◈'}</span>
        </Link>
      </nav>

      {/* Plan badge */}
      {user && (
        <div className="mt-6 text-center">
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
      )}
    </main>
  );
}
