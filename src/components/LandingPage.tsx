import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      {/* ── Hero ── */}
      <section className="flex min-h-[85dvh] flex-col items-center justify-center px-6 text-center">
        <div className="mb-10 h-px w-20 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />

        <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--color-copper)]">
          Spiritual Operating System
        </p>

        <h1 className="mt-6 text-5xl font-light leading-[1.1] tracking-[0.08em] text-[var(--color-text)] sm:text-6xl">
          SOS
        </h1>

        <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-[var(--color-text-muted)]">
          Your birth chart decoded into daily guidance.
          <br className="hidden sm:block" />
          {' '}AI that actually knows your sky.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="h-[52px] rounded-[10px] border border-[var(--color-border)] bg-transparent px-8 text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] flex items-center justify-center hover:border-[var(--color-copper)]"
          >
            Get started free
          </Link>
          <Link
            href="/auth/login"
            className="h-[52px] rounded-[10px] border border-[var(--color-border-subtle)] bg-transparent px-8 text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] flex items-center justify-center hover:border-[var(--color-border)]"
          >
            Log in
          </Link>
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
              Your real chart
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--color-text-muted)]">
              Swiss Ephemeris precision. All 10 planets, houses, aspects — calculated from your exact birth data.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] border border-[var(--color-border-subtle)] text-lg text-[var(--color-copper)]">
              ◆
            </div>
            <h3 className="text-base font-light tracking-wide text-[var(--color-text)]">
              Daily guidance that&apos;s actually yours
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--color-text-muted)]">
              Not generic horoscopes. Real transits hitting your real placements, interpreted by AI that knows your chart.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[10px] border border-[var(--color-border-subtle)] text-lg text-[var(--color-copper)]">
              ◇
            </div>
            <h3 className="text-base font-light tracking-wide text-[var(--color-text)]">
              A journal that remembers you
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[var(--color-text-muted)]">
              Write what&apos;s on your mind. SOS connects it to your transits, references what you said yesterday, and notices patterns you can&apos;t see yet.
            </p>
          </div>
        </div>
      </section>

      {/* ── Founding member CTA ── */}
      <section className="mx-auto max-w-xl px-6 pb-20 pt-4">
        <div className="mb-12 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />

        <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-copper)]">
            Founding members
          </p>

          <p className="mt-4 flex items-baseline justify-center gap-2">
            <span className="text-5xl font-light text-[var(--color-text)]">$79</span>
            <span className="text-sm text-[var(--color-text-muted)]">/ year</span>
          </p>

          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Rate locked for life. Never increases.
          </p>

          <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left text-sm text-[var(--color-text-muted)]">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Full natal chart with all placements &amp; aspects</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Daily transit-aware AI guidance</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>Unlimited AI journaling with memory</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-[var(--color-copper)]">✓</span>
              <span>30-day transit calendar</span>
            </li>
          </ul>

          <Link
            href="/auth/signup"
            className="mt-8 inline-flex h-[52px] items-center rounded-[10px] border border-[var(--color-border)] bg-transparent px-8 text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] hover:border-[var(--color-copper)]"
          >
            Become a founding member
          </Link>

          <p className="mt-4 text-xs text-[var(--color-text-muted)] opacity-50">
            Free to sign up. Upgrade when you&apos;re ready.
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
