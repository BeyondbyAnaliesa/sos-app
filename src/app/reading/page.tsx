import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { NatalReadingReport } from '@/lib/natal-reading-prompt';
import { getHouse } from '@/lib/astrology/transform';
import { getSubscription, isActive } from '@/lib/subscription';
import ReadingRefresh from '@/components/ReadingRefresh';
import { track } from '@/lib/analytics';

// ─── Types ────────────────────────────────────────────────────────────────────

type Placement = {
  key: string;
  label: string;
  longitude: number;
  sign: string;
  degree: number;
  minute: number;
  retrograde: boolean;
};

type Aspect = {
  type: string;
  between: [string, string];
  angle: number;
  orb: number;
};

type Angles = {
  ascendant: { sign: string; degree: number; minute: number; longitude: number };
  midheaven: { sign: string; degree: number; minute: number; longitude: number };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BIG_THREE = [
  { key: 'sun',    label: 'Sun',    desc: 'Core identity & life force',   section: 'sunReading'    },
  { key: 'moon',   label: 'Moon',   desc: 'Inner world & emotional needs', section: 'moonReading'   },
  { key: 'rising', label: 'Rising', desc: 'How life filters in',           section: 'risingReading' },
] as const;

const PLANET_ORDER = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
];

const ASPECT_GLYPH: Record<string, string> = {
  conjunction: '☌',
  trine:       '△',
  sextile:     '⚹',
  square:      '□',
  opposition:  '☍',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function splitParagraphs(text: string) {
  return text.split('\n\n').filter(Boolean);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReadingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const [readingResult, chartResult, sub] = await Promise.all([
    supabase
      .from('natal_readings')
      .select('reading_json')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('natal_charts')
      .select('placements_json, angles_json, houses_json, aspects_json')
      .eq('user_id', user.id)
      .single(),
    getSubscription(user.id),
  ]);

  const paid = isActive(sub);

  // ── No chart at all ──
  if (!chartResult.data) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-10 text-center sm:px-6">
        <p className="text-sm text-[var(--color-text-muted)]">Complete onboarding to generate your natal reading.</p>
        <Link href="/onboarding" className="mt-4 block text-xs text-[var(--color-copper-dim)] hover:text-[var(--color-copper)]">
          Start onboarding →
        </Link>
      </main>
    );
  }

  // ── Reading still generating ──
  if (!readingResult.data) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6">
        <Link
          href="/"
          className="mb-8 flex items-center gap-1.5 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-copper)]"
        >
          <span>←</span>
          <span>Home</span>
        </Link>
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
          <p className="text-sm text-[var(--color-text)]">Your natal reading is being generated.</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            This usually takes under a minute. It will be ready when you return.
          </p>
          <ReadingRefresh />
        </div>
      </main>
    );
  }

  track('reading_viewed', { userId: user.id, paid: String(paid) });

  const reading = readingResult.data.reading_json as NatalReadingReport;
  const placements = (chartResult.data.placements_json ?? []) as Placement[];
  const angles = chartResult.data.angles_json as Angles | null;
  const houseCusps = (chartResult.data.houses_json ?? []) as number[];
  const aspects = (chartResult.data.aspects_json ?? []) as Aspect[];

  const placementByKey = Object.fromEntries(placements.map((p) => [p.key, p]));
  const houseFor = (longitude: number) =>
    houseCusps.length === 12 ? getHouse(longitude, houseCusps) : null;

  const chartData: Record<string, { sign: string; degree: number; minute: number; house: number | null } | null> = {
    sun:    placementByKey['sun']    ? { ...placementByKey['sun'],    house: houseFor(placementByKey['sun'].longitude)    } : null,
    moon:   placementByKey['moon']  ? { ...placementByKey['moon'],   house: houseFor(placementByKey['moon'].longitude)   } : null,
    rising: angles?.ascendant       ? { ...angles.ascendant,         house: 1                                            } : null,
  };

  const sortedPlacements = PLANET_ORDER
    .map((key) => placementByKey[key])
    .filter(Boolean);

  const topAspects = aspects
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 8);

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6 sm:py-14">
      <Link
        href="/"
        className="mb-8 flex items-center gap-1.5 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-copper)]"
      >
        <span>←</span>
        <span>Home</span>
      </Link>

      <header className="mb-10 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          Your Natal Chart
        </h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          The cosmic blueprint you were born with
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      <div className="space-y-6">

        {/* ── Big Three ── */}
        {BIG_THREE.map(({ key, label, desc, section }) => {
          const data = chartData[key];
          const text = reading[section];
          if (!text) return null;
          return (
            <section key={key} className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
              <div className="mb-1 flex items-baseline justify-between gap-4">
                <p className="shrink-0 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
                  {label}
                </p>
                {data && (
                  <p className="text-right text-base font-light text-[var(--color-text)]">
                    {data.sign}
                    <span className="ml-1 text-sm text-[var(--color-text-muted)]">
                      {data.degree}°{data.minute}′
                      {data.house != null && (
                        <span className="ml-1 opacity-50">{ordinal(data.house)} house</span>
                      )}
                    </span>
                  </p>
                )}
              </div>
              <p className="mb-4 text-[10px] text-[var(--color-text-muted)] opacity-60">{desc}</p>
              <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                {splitParagraphs(text).map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </section>
          );
        })}

        {/* ── Full planet grid ── */}
        {paid ? (
          <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
              ◈ Full Chart
            </p>
            <div className="space-y-2.5">
              {sortedPlacements.map((p) => {
                const house = houseFor(p.longitude);
                return (
                  <div key={p.key} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="w-20 shrink-0 text-[var(--color-text-muted)]">{p.label}</span>
                    <span className="flex-1 text-[var(--color-text)]">
                      {p.sign}
                      {p.retrograde && (
                        <span className="ml-1 text-[10px] text-[var(--color-text-muted)]" title="Retrograde">℞</span>
                      )}
                    </span>
                    <span className="tabular-nums text-[var(--color-text-muted)]">
                      {p.degree}°{p.minute}′
                    </span>
                    {house != null && (
                      <span className="w-16 shrink-0 text-right text-[10px] text-[var(--color-text-muted)] opacity-50">
                        H{house}
                      </span>
                    )}
                  </div>
                );
              })}
              {angles && (
                <>
                  <div className="my-2 h-px bg-[var(--color-border-subtle)]" />
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="w-20 shrink-0 text-[var(--color-text-muted)]">Rising</span>
                    <span className="flex-1 text-[var(--color-text)]">{angles.ascendant.sign}</span>
                    <span className="tabular-nums text-[var(--color-text-muted)]">{angles.ascendant.degree}°{angles.ascendant.minute}′</span>
                    <span className="w-16 shrink-0 text-right text-[10px] text-[var(--color-text-muted)] opacity-50">H1</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="w-20 shrink-0 text-[var(--color-text-muted)]">Midheaven</span>
                    <span className="flex-1 text-[var(--color-text)]">{angles.midheaven.sign}</span>
                    <span className="tabular-nums text-[var(--color-text-muted)]">{angles.midheaven.degree}°{angles.midheaven.minute}′</span>
                    <span className="w-16 shrink-0 text-right text-[10px] text-[var(--color-text-muted)] opacity-50">H10</span>
                  </div>
                </>
              )}
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
            <div className="pointer-events-none select-none blur-sm">
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
                ◈ Full Chart
              </p>
              <div className="space-y-2.5">
                {sortedPlacements.slice(0, 4).map((p) => (
                  <div key={p.key} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="w-20 shrink-0 text-[var(--color-text-muted)]">{p.label}</span>
                    <span className="flex-1 text-[var(--color-text)]">{p.sign}</span>
                    <span className="tabular-nums text-[var(--color-text-muted)]">{p.degree}°{p.minute}′</span>
                    <span className="w-16 shrink-0 text-right text-[10px] text-[var(--color-text-muted)]">H—</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-void)]/70 px-6 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">All 10 planets · houses · degrees</p>
              <Link
                href="/upgrade"
                className="mt-4 rounded-[10px] border border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-copper)] hover:border-[var(--color-copper)]"
              >
                Unlock full chart →
              </Link>
            </div>
          </section>
        )}

        {/* ── Key Aspects ── */}
        {paid ? (
          <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
              ✦ Key Aspects
            </p>

            {topAspects.length > 0 && (
              <div className="mb-5 space-y-2">
                {topAspects.map((a, i) => {
                  const glyph = ASPECT_GLYPH[a.type] ?? '·';
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-5 shrink-0 text-center text-base text-[var(--color-copper)]">{glyph}</span>
                      <span className="flex-1 text-[var(--color-text)]">
                        {a.between[0]} <span className="text-[var(--color-text-muted)]">{a.type}</span> {a.between[1]}
                      </span>
                      <span className="shrink-0 tabular-nums text-[10px] text-[var(--color-text-muted)] opacity-50">{a.orb}°</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              {splitParagraphs(reading.aspectHighlights).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
            <div className="pointer-events-none select-none blur-sm">
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
                ✦ Key Aspects
              </p>
              <div className="space-y-2">
                {topAspects.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-center text-[var(--color-text-muted)]">·</span>
                    <span className="flex-1 text-[var(--color-text)]">{a.between[0]} · {a.between[1]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-void)]/70 px-6 text-center">
              <p className="text-xs text-[var(--color-text-muted)]">Aspects · interpretations · patterns</p>
              <Link
                href="/upgrade"
                className="mt-4 rounded-[10px] border border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-copper)] hover:border-[var(--color-copper)]"
              >
                Unlock full chart →
              </Link>
            </div>
          </section>
        )}

        {/* ── Synthesis ── */}
        <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
            ◆ The Whole Picture
          </p>
          <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
            {splitParagraphs(reading.synthesis).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="pt-2">
          <Link
            href="/journal"
            className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
          >
            <span>Bring this to your journal</span>
            <span className="text-[var(--color-copper-dim)]">→</span>
          </Link>
        </div>

      </div>
    </main>
  );
}
