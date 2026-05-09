import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { NatalReadingReport } from '@/lib/natal-reading-prompt';
import { getHouse } from '@/lib/astrology/domain-types';
import { getSubscription, isActive } from '@/lib/subscription';
import ReadingRefresh from '@/components/ReadingRefresh';
import { track } from '@/lib/analytics';
import UnlockCTA from '@/components/UnlockCTA';
import BottomNav from '@/components/BottomNav';
import AppBackLink from '@/components/AppBackLink';
import AeonFloatingButton from '@/components/AeonFloatingButton';
import NatalShareCard from '@/components/NatalShareCard';
import NatalReadingUpgradeButton from '@/components/NatalReadingUpgradeButton';

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

const FULL_CHART_READING_SECTIONS: Array<{ label: string; section: keyof NatalReadingReport; paidOnly?: boolean }> = [
  { label: 'Chart architecture', section: 'chartArchitectureReading' },
  { label: 'Chart ruler', section: 'chartRulerReading', paidOnly: true },
  { label: 'Mercury', section: 'mercuryReading', paidOnly: true },
  { label: 'Venus', section: 'venusReading', paidOnly: true },
  { label: 'Mars', section: 'marsReading', paidOnly: true },
  { label: 'Jupiter', section: 'jupiterReading', paidOnly: true },
  { label: 'Saturn', section: 'saturnReading', paidOnly: true },
  { label: 'Lunar Nodes', section: 'lunarNodesReading', paidOnly: true },
  { label: 'Chiron', section: 'chironReading', paidOnly: true },
  { label: 'Shadow patterns', section: 'shadowPatterns', paidOnly: true },
  { label: 'Relationship architecture', section: 'relationshipArchitecture', paidOnly: true },
  { label: 'Vocational architecture', section: 'vocationalArchitecture', paidOnly: true },
  { label: 'The whole picture', section: 'synthesis' },
  { label: 'Full chart map', section: 'fullChartReading', paidOnly: true },
];

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

// Guard against null/undefined from GPT-generated reading fields.
function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.split('\n\n').filter(Boolean);
}

function ReadingText({ text }: { text: string | null | undefined }) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return null;

  return (
    <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

function ReadingDropdown({
  title,
  eyebrow,
  children,
  defaultOpen = false,
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4 sm:px-6"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="mb-1 text-[10px] uppercase tracking-[0.24em] text-[var(--color-copper-dim)]">
              {eyebrow}
            </p>
          )}
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-copper)]">
            {title}
          </p>
        </div>
        <span className="text-lg text-[var(--color-copper-dim)] transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-5">
        {children}
      </div>
    </details>
  );
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
      .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
      .eq('user_id', user.id)
      .single(),
    getSubscription(user.id),
  ]);

  const paid = isActive(sub);

  // No chart row → onboarding. Corrupted chart row → chart-error.
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
  if (!chartResult.data.placements_json || !chartResult.data.angles_json) {
    redirect('/chart-error');
  }

  const metadata = chartResult.data.metadata_json as { natalReading?: NatalReadingReport } | null;
  const savedReading = (readingResult.data?.reading_json as NatalReadingReport | undefined)
    ?? metadata?.natalReading;

  // ── Reading still generating ──
  if (!savedReading) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6">
        <AppBackLink />
        <div className="py-16 text-center">
          <div className="mx-auto mb-6 flex items-center justify-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[var(--color-electric)]/40">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--color-electric)]" />
              <span className="text-lg text-[var(--color-electric)] animate-pulse">✦</span>
            </div>
            <div className="flex gap-1 text-[var(--color-electric)]">
              <span className="animate-bounce [animation-delay:-0.3s]">✦</span>
              <span className="animate-bounce [animation-delay:-0.15s]">✦</span>
              <span className="animate-bounce">✦</span>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text)]">Building your natal reading…</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            SOS is reading the chart in more detail now. Keep this screen open for a moment.
          </p>
          <ReadingRefresh repairNatalReading />
        </div>
        <AeonFloatingButton />
        <BottomNav />
      </main>
    );
  }

  track('reading_viewed', { userId: user.id, paid: String(paid) });

  const reading = savedReading;
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

  const hasPremiumNatalReading = Boolean(
    reading.fullChartReading
    || reading.chartArchitectureReading
    || reading.saturnReading
    || (reading.shareCards && reading.shareCards.length > 0),
  );

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <AppBackLink />
      <header className="mb-8 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          Your Natal Chart
        </h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          The cosmic blueprint you were born with
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      {paid && !hasPremiumNatalReading && <NatalReadingUpgradeButton />}

      {/* Quick link to daily reading */}
      <Link
        href="/reading/daily"
        className="mb-8 flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
      >
        <div>
          <span className="text-[var(--color-copper)]">◑</span>
          <span className="ml-2">Today&apos;s transit reading</span>
        </div>
        <span className="text-[var(--color-copper-dim)]">&rarr;</span>
      </Link>

      <div className="space-y-5">

        {/* ── Big Three ── */}
        {BIG_THREE.map(({ key, label, desc, section }) => {
          const data = chartData[key];
          const text = reading[section];
          if (!text) return null;
          return (
            <ReadingDropdown key={key} title={label} eyebrow={desc} defaultOpen={key === 'sun'}>
              <div className="mb-5 flex items-baseline justify-between gap-4 rounded-[12px] border border-[var(--color-border-subtle)] bg-[rgba(244,239,232,0.02)] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Placement</span>
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
              <ReadingText text={text} />
            </ReadingDropdown>
          );
        })}

        {/* ── Key Aspects ── */}
        <ReadingDropdown title="Key Aspects" eyebrow="The strongest chart patterns">
          {paid ? (
            <>
              {topAspects.length > 0 && (
                <div className="mb-5 space-y-2 rounded-[12px] border border-[var(--color-border-subtle)] bg-[rgba(244,239,232,0.02)] px-4 py-4">
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
              <ReadingText text={reading.aspectHighlights} />
            </>
          ) : (
            <div className="text-center">
              <div className="pointer-events-none mb-5 select-none space-y-2 blur-sm">
                {topAspects.slice(0, 3).map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 shrink-0 text-center text-[var(--color-text-muted)]">·</span>
                    <span className="flex-1 text-[var(--color-text)]">{a.between[0]} · {a.between[1]}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">Aspects · interpretations · patterns</p>
              <Link
                href="/upgrade"
                className="mt-4 inline-flex rounded-[10px] border border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-copper)] hover:border-[var(--color-copper)]"
              >
                Unlock key aspects →
              </Link>
            </div>
          )}
        </ReadingDropdown>

        {/* ── Full chart ── */}
        <ReadingDropdown title="Full Chart" eyebrow="Planets, houses, architecture, and synthesis">
          {paid ? (
            <div className="space-y-7">
              <div className="rounded-[12px] border border-[var(--color-border-subtle)] bg-[rgba(244,239,232,0.02)] px-4 py-4">
                <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-copper-dim)]">
                  Planetary placements
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
              </div>

              {FULL_CHART_READING_SECTIONS.map(({ label, section, paidOnly }) => {
                if (paidOnly && !paid) return null;
                const text = reading[section];
                if (typeof text !== 'string' || !text.trim()) return null;
                return (
                  <section key={section}>
                    <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-copper-dim)]">
                      {label}
                    </p>
                    <ReadingText text={text} />
                  </section>
                );
              })}

              {reading.shareCards && reading.shareCards.length > 0 && (
                <section>
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-copper-dim)]">
                    Shareable chart truths
                  </p>
                  <div className="space-y-3">
                    {reading.shareCards.slice(0, 6).map((card, i) => (
                      <NatalShareCard key={`${card.label}-${i}`} card={card} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="pointer-events-none mb-5 select-none blur-sm">
                <div className="space-y-2.5">
                  {sortedPlacements.slice(0, 4).map((p) => (
                    <div key={p.key} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="w-20 shrink-0 text-[var(--color-text-muted)]">{p.label}</span>
                      <span className="flex-1 text-[var(--color-text)]">{p.sign}</span>
                      <span className="tabular-nums text-[var(--color-text-muted)]">{p.degree}°{p.minute}′</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">All planets · houses · deeper chart architecture</p>
              <Link
                href="/upgrade"
                className="mt-4 inline-flex rounded-[10px] border border-[var(--color-border)] px-5 py-3 text-sm text-[var(--color-copper)] hover:border-[var(--color-copper)]"
              >
                Unlock full chart →
              </Link>
            </div>
          )}
        </ReadingDropdown>

        {/* Global unlock CTA — shown at the bottom for free users on every locked surface */}
        {!paid && (
          <div className="pt-4">
            <UnlockCTA label="Unlock your full chart" />
          </div>
        )}

      </div>
      <AeonFloatingButton />
      <BottomNav />
    </main>
  );
}
