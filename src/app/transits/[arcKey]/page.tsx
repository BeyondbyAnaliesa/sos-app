export const runtime = 'nodejs';

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AppBackLink from '@/components/AppBackLink';
import AeonFloatingButton from '@/components/AeonFloatingButton';
import BottomNav from '@/components/BottomNav';
import { buildReadingContext } from '@/lib/transit-reading-context';
import type { MajorTransitArc } from '@/lib/astrology/major-transits';
import { getOrCreateMajorTransitAiReadings, majorTransitReadingKey } from '@/lib/major-transit-ai-reading';
import { buildTransitFeel, buildTransitReading, buildWaveUse, transitColor, transitTitle } from '@/lib/transit-copy';
import { buildPassMemoryCue, buildTransitTiming } from '@/lib/transit-timing';

function formatShortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatLongDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

function diffDaysLocal(a: string, b: string) {
  return Math.round((new Date(`${a}T12:00:00Z`).getTime() - new Date(`${b}T12:00:00Z`).getTime()) / 86_400_000);
}

function percentForDate(arc: MajorTransitArc, date: string) {
  const elapsed = Math.max(0, Math.min(arc.totalDays, diffDaysLocal(date, arc.startDate)));
  return Math.max(2, Math.min(98, Math.round((elapsed / Math.max(1, arc.totalDays)) * 100)));
}

function progressPercent(arc: MajorTransitArc) {
  const elapsed = Math.max(0, Math.min(arc.totalDays, diffDaysLocal(new Date().toISOString().split('T')[0], arc.startDate)));
  return Math.max(4, Math.min(100, Math.round((elapsed / Math.max(1, arc.totalDays)) * 100)));
}

function phaseCopy(arc: MajorTransitArc) {
  if (arc.phase === 'peaking') return 'Peaking now';
  if (arc.phase === 'building') return arc.daysUntilPeak === 1 ? 'Peaks tomorrow' : `Peaks in ${arc.daysUntilPeak} days`;
  const daysPast = Math.abs(arc.daysUntilPeak);
  return daysPast === 1 ? 'Peaked yesterday' : `Peaked ${daysPast} days ago`;
}

function hitLabel(kind: 'exact' | 'closest') {
  return kind === 'exact' ? 'Exact hit' : 'Closest pass';
}

function stationLabel(kind: 'retrograde' | 'direct') {
  return kind === 'retrograde' ? 'Retrograde station' : 'Direct station';
}

export default async function MajorTransitDetailPage({ params }: { params: Promise<{ arcKey: string }> }) {
  const { arcKey } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const decodedKey = decodeURIComponent(arcKey);
  const context = await buildReadingContext(supabase, user.id);
  const arc = context.majorArcs.find((candidate) => candidate.key === decodedKey);
  if (!arc) notFound();

  const readings = await getOrCreateMajorTransitAiReadings({
    userId: user.id,
    arcs: [arc],
    chart: context.chart,
    memory: context.memory,
  });
  const reading = readings[majorTransitReadingKey(arc)];
  const color = transitColor(arc.transit);
  const title = transitTitle(arc.transit);
  const aeonQuestion = reading?.aeonQuestion ?? `What is this ${title} wave asking me to see?`;
  const timing = buildTransitTiming(arc);
  const passMemory = buildPassMemoryCue(arc, context.memory.lifeSignals ?? []);

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <AppBackLink href="/transits" label="Back to transits" />
      <header className="mb-8">
        <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-[var(--color-electric)]">
          Major transit wave
        </p>
        <h1 className="text-3xl font-light leading-tight tracking-[0.08em] text-[var(--color-text)]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {formatLongDate(arc.startDate)} to {formatLongDate(arc.endDate)} · {phaseCopy(arc)} · {arc.totalDays} day lifecycle
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-[var(--color-electric)]/45 bg-[rgba(239,68,136,0.05)] px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-electric)]">Timing alert</p>
        <p className="mt-2 text-lg leading-snug text-[var(--color-text)]">{timing.peakLine}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">Next hit</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{timing.nextHitLine}</p>
          </div>
          <div className="rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">Pass count</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{timing.passLine}</p>
          </div>
          <div className="rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">Station watch</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-muted)]">{timing.stationLine}</p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-copper)]">Pass memory</p>
        <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text)]">{passMemory.headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{passMemory.body}</p>
        {passMemory.hasMemory && (
          <p className="mt-3 text-xs leading-relaxed text-[var(--color-electric)]">This is the comparison layer: what repeated, what changed, and what is no longer negotiable.</p>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
          <span>{formatShortDate(arc.startDate)}</span>
          <span>{arc.activeRunCount > 1 ? `${arc.activeRunCount} passes` : 'One pass'}</span>
          <span>{formatShortDate(arc.endDate)}</span>
        </div>
        <div className="relative h-4 rounded-full bg-[rgba(244,239,232,0.08)]">
          <div className="absolute left-0 top-0 h-full rounded-full opacity-80" style={{ width: `${progressPercent(arc)}%`, backgroundColor: color }} />
          {arc.exactHits.map((hit, index) => (
            <span
              key={`${hit.date}-${index}`}
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--color-void)] shadow-[0_0_0_1px_rgba(244,239,232,0.45)]"
              style={{ left: `${percentForDate(arc, hit.date)}%`, backgroundColor: color }}
            />
          ))}
          {arc.stations.map((station, index) => (
            <span
              key={`${station.date}-station-${index}`}
              className="absolute top-1/2 h-6 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--color-void)] bg-[var(--color-text)] shadow-[0_0_0_1px_rgba(239,68,136,0.45)]"
              style={{ left: `${percentForDate(arc, station.date)}%` }}
            />
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {arc.exactHits.map((hit, index) => (
            <div key={`${hit.date}-detail-${index}`} className="rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">{hitLabel(hit.kind)}</p>
              <p className="mt-1 text-sm text-[var(--color-text)]">{formatLongDate(hit.date)}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">Orb {hit.orb}°</p>
            </div>
          ))}
          {arc.stations.map((station, index) => (
            <div key={`${station.date}-station-detail-${index}`} className="rounded-[10px] border border-[var(--color-electric)]/45 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-electric)]">{stationLabel(station.kind)}</p>
              <p className="mt-1 text-sm text-[var(--color-text)]">{formatLongDate(station.date)}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{station.degree}° {station.sign}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--color-electric)]/40 bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(22,20,34,0.92))] px-5 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--color-electric)]">
          Full memory reading
        </p>
        {reading ? (
          <div className="mt-4 space-y-4">
            <h2 className="text-xl font-light leading-tight text-[var(--color-text)]">{reading.headline}</h2>
            <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">{reading.wave}</p>
            <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">{reading.whyYou}</p>
            <p className="text-[15px] leading-relaxed text-[var(--color-text-muted)]">{reading.feel}</p>
            {reading.memoryNote && <p className="text-xs leading-relaxed text-[var(--color-text-muted)] opacity-75">{reading.memoryNote}</p>}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
            SOS has the transit structure, but this wave does not have a generated memory reading yet. It will sharpen as the cache warms and more life signals are saved.
          </p>
        )}
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">Where it lands</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Natal {arc.context.targetLabel}{arc.context.targetHouse ? ` · House ${arc.context.targetHouse}` : ''}{arc.context.targetSign ? ` · ${arc.context.targetSign}` : ''}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">{arc.context.lifeArea}</p>
        </div>
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">How to use it</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">{reading?.use ?? buildWaveUse(arc.transit, arc.context.lifeArea)}</p>
          {reading?.doNotForce && <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)] opacity-80">Do not force: {reading.doNotForce}</p>}
        </div>
      </section>

      <section className="mb-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-copper)]">Astrology mechanics</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{buildTransitReading(arc.transit)}</p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">{buildTransitFeel(arc.transit)}</p>
      </section>

      <Link
        href={`/journal?starter=${encodeURIComponent(aeonQuestion)}&context=${encodeURIComponent(`${title} is active ${formatShortDate(arc.startDate)} to ${formatShortDate(arc.endDate)}. ${reading?.wave ?? ''}`)}`}
        className="mb-4 flex items-center justify-between rounded-[10px] border border-[var(--color-electric)]/45 px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--color-electric)] hover:border-[var(--color-electric)]"
      >
        <span>Ask Aeon about this wave</span>
        <span>→</span>
      </Link>

      <Link href="/transits" className="block text-center text-xs uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:text-[var(--color-electric)]">
        Back to all transits
      </Link>

      <AeonFloatingButton />
      <BottomNav />
    </main>
  );
}
