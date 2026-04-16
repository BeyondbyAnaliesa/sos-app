import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { NatalReadingReport } from '@/lib/natal-reading-prompt';

const BIG_THREE = [
  { key: 'sun',    label: 'Sun',    desc: 'Your core identity',         accent: 'text-amber-400',  section: 'sunReading'    },
  { key: 'moon',   label: 'Moon',   desc: 'Your inner emotional world', accent: 'text-violet-400', section: 'moonReading'   },
  { key: 'rising', label: 'Rising', desc: 'How you move through life',  accent: 'text-cyan-400',   section: 'risingReading' },
] as const;

export default async function ReadingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch natal reading and chart data in parallel
  const [readingResult, chartResult] = await Promise.all([
    supabase.from('natal_readings').select('reading_json').eq('user_id', user.id).single(),
    supabase.from('natal_charts').select('placements_json, angles_json').eq('user_id', user.id).single(),
  ]);

  if (!readingResult.data) {
    return (
      <main className="mx-auto w-full max-w-xl px-6 py-16 text-center">
        <p className="text-sm text-zinc-400">Your natal reading is still being generated. Check back in a moment.</p>
        <Link href="/" className="mt-4 block text-xs text-zinc-600 hover:text-zinc-400">
          ← Back to home
        </Link>
      </main>
    );
  }

  const reading = readingResult.data.reading_json as NatalReadingReport;

  // Extract big three placements
  type Placement = { key: string; sign: string; degree: number; minute: number };
  const placements = (chartResult.data?.placements_json ?? []) as Placement[];
  const angles = chartResult.data?.angles_json as { ascendant: { sign: string; degree: number; minute: number } } | null;

  const chartData: Record<string, { sign: string; degree: number; minute: number } | null> = {
    sun:    placements.find((p) => p.key === 'sun') ?? null,
    moon:   placements.find((p) => p.key === 'moon') ?? null,
    rising: angles?.ascendant ?? null,
  };

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <Link
        href="/"
        className="mb-10 flex items-center gap-1.5 text-xs text-zinc-600 transition-colors hover:text-zinc-400"
      >
        <span>←</span>
        <span>Home</span>
      </Link>

      <header className="mb-10 text-center">
        <div className="mx-auto mb-6 h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-white">
          Your Natal Reading
        </h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
          The cosmic blueprint you were born with
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>

      {/* Big Three — each with placement data + deep reading */}
      <div className="space-y-8">
        {BIG_THREE.map(({ key, label, desc, accent, section }) => {
          const data = chartData[key];
          const text = reading[section];
          return (
            <section key={key}>
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5">
                <div className="mb-4 flex items-baseline justify-between">
                  <p className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>
                    {label}
                  </p>
                  {data && (
                    <p className="text-lg font-light text-white">
                      {data.sign}{' '}
                      <span className="text-sm text-zinc-500">
                        {data.degree}°{data.minute}′
                      </span>
                    </p>
                  )}
                </div>
                <p className="mb-4 text-[10px] text-zinc-600">{desc}</p>
                <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
                  {text.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* Aspect Highlights */}
        <section>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-emerald-400">
              ✦ Key Aspects
            </p>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              {reading.aspectHighlights.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        {/* Synthesis */}
        <section>
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-amber-400">
              ◆ The Whole Picture
            </p>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
              {reading.synthesis.split('\n\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
