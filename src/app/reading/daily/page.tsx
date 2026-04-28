export const runtime = 'nodejs';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateTransitsForDate, calculateTransitsForRange } from '@/lib/astrology/calculate-transits';
import { interpretTransits, buildTransitOverview, scanIncomingHighlights } from '@/lib/interpret';
import type { IncomingHighlight } from '@/lib/interpret';
import type { NatalChart as RichChart } from '@/lib/astrology/types';
import { buildNatalSummary } from '@/lib/astrology/domain-types';
import { track } from '@/lib/analytics';
import BottomNav from '@/components/BottomNav';
import GuidanceCard from '@/components/GuidanceCard';
import { getSubscription, isActive } from '@/lib/subscription';
import { getRelevantTransitMemoryForToday } from '@/lib/astrology/memory-store';
import { buildExplainabilityNote, buildDailyMemoryCue, describeHiddenDomains } from '@/lib/astrology/pure-fns';
import UnlockCTA from '@/components/UnlockCTA';

// DOMAIN_LABELS and describeHiddenDomains have been extracted to pure-fns.ts.
// buildMemoryCue has been extracted to pure-fns.ts as buildDailyMemoryCue.
// Delegating here preserves the same runtime behavior while enabling direct unit tests.

export default async function DailyReadingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const [chartResult, signalResult, sub] = await Promise.all([
    supabase
      .from('natal_charts')
      .select('placements_json, angles_json, houses_json, aspects_json, metadata_json')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('life_signals')
      .select('life_domain, themes_json, signal_timestamp')
      .eq('user_id', user.id)
      .order('signal_timestamp', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getSubscription(user.id),
  ]);

  const paid = isActive(sub);

  // Guard: no chart, or chart row exists with null/malformed columns (partial write, old migration).
  // Both cases send the user to onboarding to generate a clean chart.
  // Product decision: Option A (re-onboard). See sos-stability-audit-2026-04-27.md P1-4.
  if (!chartResult.data || !chartResult.data.placements_json || !chartResult.data.angles_json) {
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

  track('daily_reading_viewed', { userId: user.id, paid: String(paid) });

  const richChart: RichChart = {
    placements: chartResult.data.placements_json,
    angles:     chartResult.data.angles_json,
    houses:     chartResult.data.houses_json ?? [],
    aspects:    chartResult.data.aspects_json,
    metadata:   chartResult.data.metadata_json,
  };

  const natalSummary = buildNatalSummary(richChart);
  const todayTransits = calculateTransitsForDate(new Date(), richChart);
  // DR-2: 7-day look-ahead so buildTransitOverview (and the quiet-sky section below)
  // can surface incoming transits on calm days instead of a generic empty state.
  const lookAheadTransits = calculateTransitsForRange(
    new Date(Date.now() + 86_400_000), // tomorrow
    7,
    richChart,
  );
  const guidance = interpretTransits(todayTransits.transits, natalSummary);
  const overview = buildTransitOverview(todayTransits.transits, natalSummary, { lookAheadTransits });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  const activeGuidance = guidance.filter((g) => g.intensity !== 'low');
  const quietGuidance = guidance.filter((g) => g.intensity === 'low');
  const visibleGuidance = paid ? activeGuidance : activeGuidance.slice(0, 1);
  const hiddenGuidance = paid ? [] : activeGuidance.slice(1);
  const hiddenTransitCount = Math.max(todayTransits.transits.length - visibleGuidance.length, 0);
  const hiddenDomainText = describeHiddenDomains(hiddenGuidance.map((g) => g.domain));

  // Arc memory: fetch structured transit memory context (non-fatal — falls back to signal-based cue)
  const arcMemory = await getRelevantTransitMemoryForToday(user.id).catch(() => null);

  const memoryCue = buildDailyMemoryCue({
    signal: signalResult.data as { life_domain?: string | null; themes_json?: string[] | null } | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    arcMemory: arcMemory as any,
    nowMs: Date.now(),
  });

  // Explainability note: deterministic "why am I seeing this?" evidence trail.
  // Non-fatal: only rendered when arcMemory has qualifying arc evidence.
  // Evidence-bounded: only reads recurrence_count, first_active_date, tightest_orb,
  // state, signalCount, arcCount — all stored columns, no inference.
  const explanationNote =
    arcMemory && arcMemory.confidence !== 'none'
      ? buildExplainabilityNote({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activeArcs: (arcMemory.activeArcs ?? []) as any[],
          recurringDomains: arcMemory.recurringDomains,
        })
      : null;

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          {paid ? 'Advanced Daily Reading' : 'Daily Reading'}
        </h1>
        <time className="mt-2 block text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          {today}
        </time>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

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

      <section className="mb-6 rounded-[10px] border border-[var(--color-electric)]/40 bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(239,68,136,0.02))] px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-electric)]">
          SOS noticed
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">
          {memoryCue}
        </p>
        {explanationNote?.hasExplanation && (
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--color-text-muted)] opacity-50">
            {explanationNote.explanationLine}
          </p>
        )}
      </section>

      {/* DR-2: Quiet-sky section — when no major transits are active today, show upcoming */}
      {activeGuidance.length === 0 && (() => {
        const upcoming: IncomingHighlight[] = scanIncomingHighlights(lookAheadTransits, natalSummary);
        return (
          <section className="mb-6 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
            {upcoming.length > 0 ? (
              <>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)]">
                  {/* SOS voice: concrete, not vibes-speak */}
                  A quiet day in your chart. Coming up:
                </p>
                <div className="space-y-2">
                  {upcoming.map((h, i) => {
                    const title = [
                      h.transitPlanet,
                      h.aspect,
                      h.natalPlanet.charAt(0).toUpperCase() + h.natalPlanet.slice(1),
                    ].join(' ');
                    const dateLabel = new Date(`${h.dateStr}T12:00:00Z`).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric', timeZone: 'UTC' },
                    );
                    return (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--color-text)]">{title}</span>
                        <span className="ml-3 shrink-0 tabular-nums text-[11px] text-[var(--color-text-muted)] opacity-70">
                          {dateLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">
                {/* Hard fall-through: no upcoming transits in the look-ahead window */}
                Nothing building in the next few days. A genuine pause in the pattern.
              </p>
            )}
          </section>
        );
      })()}

      {visibleGuidance.length > 0 && (
        <section className="mb-6">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            {paid ? `What's Active` : 'Unlocked Today'}
          </p>
          <div className="space-y-4">
            {visibleGuidance.map((result) => (
              <GuidanceCard key={result.domain} result={result} />
            ))}
          </div>
        </section>
      )}

      {!paid && hiddenTransitCount > 0 && (
        <section className="mb-8 rounded-[10px] border border-[var(--color-electric)] bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(239,68,136,0.02))] px-5 py-5 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-electric)]">
            ✦ More is active today
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
            {hiddenTransitCount} more transits are active today — affecting {hiddenDomainText}.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Get full access to everything moving in your chart, not just the first thread.
          </p>
          <div className="mt-5">
            <UnlockCTA />
          </div>
        </section>
      )}



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

      <section className="mb-6 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5 sm:px-6">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
          ✦ Active Transits
        </p>
        <div className="space-y-2">
          {todayTransits.transits.slice(0, paid ? 10 : 3).map((t, i) => (
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

      <div className="pt-2">
        <Link
          href="/journal"
          className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          <span>Bring this to Chat with Aeon</span>
          <span className="text-[var(--color-copper-dim)]">→</span>
        </Link>
      </div>

      <BottomNav />
    </main>
  );
}
