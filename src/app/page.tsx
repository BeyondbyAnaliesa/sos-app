export const runtime = 'nodejs'; // required for sweph

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { mockNatalChart } from '@/data/natal-chart';
import { interpretTransits } from '@/lib/interpret';
import { toSimpleChart } from '@/lib/astrology/transform';
import { calculateTransitsForDate } from '@/lib/astrology/calculate-transits';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import GuidanceCard from '@/components/GuidanceCard';
import Header from '@/components/Header';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Header date={todayDate} />

      <section>
        <p className="mb-6 text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          Today&apos;s Guidance
        </p>
        <div className="space-y-4">
          {guidance.map((result) => (
            <GuidanceCard key={result.domain} result={result} />
          ))}
        </div>
      </section>

      <div className="mt-10 flex flex-col items-center gap-3">
        <Link
          href="/journal"
          className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
        >
          → Write today&apos;s journal
        </Link>
        <div className="flex gap-6">
          <Link
            href="/reading"
            className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
          >
            ◆ Natal reading
          </Link>
          <Link
            href="/calendar"
            className="text-xs text-zinc-600 transition-colors hover:text-zinc-400"
          >
            ◇ Transit calendar
          </Link>
        </div>
      </div>
    </main>
  );
}
