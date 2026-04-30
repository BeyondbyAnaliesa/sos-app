import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      {/* ── Hero ── */}
      <section className="flex min-h-[85dvh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-10 h-px w-20 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />

        <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--color-copper)]">
          Timing for real life
        </p>

        <h1 className="mt-6 max-w-2xl text-4xl font-light leading-[1.15] tracking-[0.04em] text-[var(--color-text)] sm:text-6xl">
          SOS reads your chart timing with your real life.
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-text-muted)]">
          The planets give the timing. Your lived experience gives the context. SOS reads both together, so guidance changes with what is actually happening.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="flex h-[52px] items-center justify-center rounded-[10px] border border-[var(--color-border)] bg-transparent px-8 text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] hover:border-[var(--color-copper)]"
          >
            Get started free
          </Link>
          <a
            href="#proof"
            className="flex h-[52px] items-center justify-center rounded-[10px] border border-[var(--color-border-subtle)] bg-transparent px-8 text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)]"
          >
            See how it works
          </a>
        </div>

        <div className="mt-16 animate-bounce text-[var(--color-text-muted)] opacity-30">
          <span className="text-xs">↓</span>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-xl px-6 py-20">
        <div className="mb-12 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />

        <p className="mb-10 text-center text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
          How it works
        </p>

        <div className="space-y-10">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] border border-[var(--color-border-subtle)] text-lg text-[var(--color-copper)]">
              ✦
            </div>
            <h3 className="text-base font-light tracking-wide text-[var(--color-text)]">
              The planets give the timing
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--color-text-muted)]">
              SOS calculates the transits active for your exact birth chart, not a generic sign forecast.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] border border-[var(--color-border-subtle)] text-lg text-[var(--color-copper)]">
              ◆
            </div>
            <h3 className="text-base font-light tracking-wide text-[var(--color-text)]">
              Your life gives the context
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--color-text-muted)]">
              What you write, ask, and return to gives SOS the lived context the chart alone cannot provide.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] border border-[var(--color-border-subtle)] text-lg text-[var(--color-copper)]">
              ◇
            </div>
            <h3 className="text-base font-light tracking-wide text-[var(--color-text)]">
              The reading changes with both
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--color-text-muted)]">
              The same transit reads differently when SOS knows what is actually active in your life.
            </p>
          </div>
        </div>
      </section>

      {/* ── Proof ── */}
      <section id="proof" className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-12 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />

        <p className="mb-3 text-center text-[10px] uppercase tracking-[0.3em] text-[var(--color-text-muted)]">
          Product proof
        </p>
        <h2 className="mx-auto max-w-xl text-center text-2xl font-light leading-snug tracking-wide text-[var(--color-text)]">
          See what changes when SOS reads both.
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-copper)]">
              1 · Chart timing
            </p>
            <div className="mt-5 rounded-[8px] border border-[var(--color-border-subtle)] bg-black/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-copper)]">
                ◑ Today&apos;s Sky
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
                Active transits are calculated against your exact chart for today.
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
              This shows what is active in the sky for you, not for everyone with your sun sign.
            </p>
          </div>

          <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-copper)]">
              2 · Lived context
            </p>
            <div className="mt-5 rounded-[8px] border border-[var(--color-border-subtle)] bg-black/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
                Aeon journal
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
                Write what is taking up space, what shifted, or what decision needs timing.
              </p>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
              This gives SOS the real-life context the chart cannot know by itself.
            </p>
          </div>

          <div className="rounded-[10px] border border-[var(--color-electric)]/60 bg-[linear-gradient(180deg,rgba(239,68,136,0.14),rgba(239,68,136,0.03))] p-5 shadow-[0_0_40px_rgba(239,68,136,0.08)]">
            <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-electric)]">
              3 · What changes
            </p>
            <div className="mt-5 rounded-[8px] border border-[var(--color-electric)]/40 bg-black/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-electric)]">
                SOS noticed
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
                The reading connects today’s timing to the pattern you keep returning to.
              </p>
            </div>
            <p className="mt-4 text-sm font-medium leading-relaxed text-[var(--color-text)]">
              This is the product: chart timing and lived context read together.
            </p>
          </div>
        </div>
      </section>

      {/* ── Charter CTA ── */}
      <section className="mx-auto max-w-xl px-6 pb-20 pt-4">
        <div className="mb-12 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />

        <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-copper)]">
            Charter
          </p>

          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--color-copper-dim)] opacity-80">
            100 Charter spots at $49/year
          </p>

          <p className="mt-4 flex items-baseline justify-center gap-2">
            <span className="text-5xl font-light text-[var(--color-text)]">$49</span>
            <span className="text-sm text-[var(--color-text-muted)]">/ year</span>
          </p>

          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Locked forever for Charter members.
          </p>

          <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left text-sm text-[var(--color-text-muted)]">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Full natal chart with all placements and aspects</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Daily guidance based on active transits</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Journal context SOS can remember</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>30-day transit calendar</span>
            </li>
          </ul>

          <div className="mx-auto mt-6 max-w-xs rounded-[8px] border border-[var(--color-border-subtle)] px-4 py-3 text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">
              After Charter
            </p>
            <p className="mt-1 text-sm text-[var(--color-text)]">
              Standard pricing is $99/year or $12.99/month.
            </p>
          </div>

          <Link
            href="/auth/signup"
            className="mt-8 inline-flex h-[52px] items-center rounded-[10px] border border-[var(--color-border)] bg-transparent px-8 text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] hover:border-[var(--color-copper)]"
          >
            Claim $49 Charter Spot
          </Link>

          <p className="mt-4 text-xs text-[var(--color-text-muted)] opacity-50">
            Start free. Upgrade when you&apos;re ready. Charter keeps the $49/year rate.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--color-border-subtle)] px-6 py-8 text-center">
        <p className="text-xs tracking-widest text-[var(--color-text-muted)] opacity-40">SOS</p>
        <p className="mt-1 text-[10px] text-[var(--color-text-muted)] opacity-25">
          © {new Date().getFullYear()}
        </p>
      </footer>
    </main>
  );
}
