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

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Load subscription state
  const sub = user ? await getSubscription(user.id) : null;
  const paid = isActive(sub);

  // Load user's real chart or fall back to mock
  let simpleChart = mockNatalChart;
  let todayDate = new Date().toISOString().split('T')[0];
  let todayTransits: ReturnType<typeof calculateTransitsForDate> | null = null;

  if (user) {
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
  }

  // Use real transits if available, otherwise empty (guidance cards will show fallback text)
  const transitsForGuidance = todayTransits?.transits ?? [];
  const guidance = interpretTransits(transitsForGuidance, simpleChart);

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-10 pt-10 sm:px-6 sm:pt-14">
      <Header date={todayDate} />

      <section>
        <p className="mb-5 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          Today&apos;s Guidance
        </p>
        <div className="space-y-3">
          {guidance.map((result) => (
            <GuidanceCard key={result.domain} result={result} />
          ))}
        </div>
      </section>

      {/* Navigation — full-width tap targets for mobile */}
      <nav className="mt-10 flex flex-col gap-1">
        <Link
          href="/journal"
          className="flex items-center justify-between rounded-xl border border-white/[0.05] px-5 py-4 text-sm text-zinc-400 transition-colors hover:border-white/[0.1] hover:text-zinc-300 active:bg-white/[0.03]"
        >
          <span>Write today&apos;s journal</span>
          <span className="text-zinc-600">→</span>
        </Link>
        <Link
          href="/reading"
          className="flex items-center justify-between rounded-xl border border-white/[0.05] px-5 py-4 text-sm text-zinc-400 transition-colors hover:border-white/[0.1] hover:text-zinc-300 active:bg-white/[0.03]"
        >
          <span>Natal reading</span>
          <span className="text-zinc-600">◆</span>
        </Link>
        <Link
          href={paid ? '/calendar' : '/upgrade'}
          className="flex items-center justify-between rounded-xl border border-white/[0.05] px-5 py-4 text-sm text-zinc-400 transition-colors hover:border-white/[0.1] hover:text-zinc-300 active:bg-white/[0.03]"
        >
          <span>Transit calendar</span>
          <span className="text-zinc-600">{paid ? '◇' : '◈'}</span>
        </Link>
      </nav>

      {/* Plan badge */}
      {user && (
        <div className="mt-6 text-center">
          {paid ? (
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-700">
              {sub?.plan === 'founding_annual' ? 'Founding Member' : 'Member'}
            </p>
          ) : (
            <Link
              href="/upgrade"
              className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 transition-colors hover:text-zinc-400"
            >
              Unlock full access →
            </Link>
          )}
        </div>
      )}
    </main>
  );
}
