import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-dvh">
      {/* ── Hero ── */}
      <section className="flex min-h-[85dvh] flex-col items-center justify-center px-6 text-center">
        {/* Subtle top accent */}
        <div className="mb-10 h-px w-20 bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

        <p className="text-[10px] uppercase tracking-[0.4em] text-violet-400">
          Spiritual Operating System
        </p>

        <h1 className="mt-6 text-5xl font-light leading-[1.1] tracking-[0.08em] text-white sm:text-6xl">
          SOS
        </h1>

        <p className="mx-auto mt-6 max-w-md text-lg leading-relaxed text-zinc-400">
          Your birth chart decoded into daily guidance.
          <br className="hidden sm:block" />
          {' '}AI that actually knows your sky.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-violet-300 transition-colors hover:bg-violet-500/20 active:bg-violet-500/25"
          >
            Get started free
          </Link>
          <Link
            href="/auth/login"
            className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-8 py-4 text-sm font-semibold uppercase tracking-widest text-zinc-400 transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          >
            Log in
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="mt-16 animate-bounce text-zinc-700">
          <span className="text-xs">↓</span>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-xl px-6 py-20">
        <div className="mb-12 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <p className="mb-10 text-center text-[10px] uppercase tracking-[0.3em] text-zinc-600">
          How it works
        </p>

        <div className="space-y-10">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/[0.06] text-lg text-violet-400">
              ✦
            </div>
            <h3 className="text-base font-light tracking-wide text-white">
              Your real chart
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">
              Swiss Ephemeris precision. All 10 planets, houses, aspects — calculated from your exact birth data.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/[0.06] text-lg text-amber-400">
              ◆
            </div>
            <h3 className="text-base font-light tracking-wide text-white">
              Daily guidance that&apos;s actually yours
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">
              Not generic horoscopes. Real transits hitting your real placements, interpreted by AI that knows your chart.
            </p>
          </div>

          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/[0.06] text-lg text-cyan-400">
              ◇
            </div>
            <h3 className="text-base font-light tracking-wide text-white">
              A journal that remembers you
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">
              Write what&apos;s on your mind. SOS connects it to your transits, references what you said yesterday, and notices patterns you can&apos;t see yet.
            </p>
          </div>
        </div>
      </section>

      {/* ── Founding member CTA ── */}
      <section className="mx-auto max-w-xl px-6 pb-20 pt-4">
        <div className="mb-12 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.03] px-6 py-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-violet-400">
            Founding members
          </p>

          <p className="mt-4 flex items-baseline justify-center gap-2">
            <span className="text-5xl font-light text-white">$79</span>
            <span className="text-sm text-zinc-500">/ year</span>
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Rate locked for life. Never increases.
          </p>

          <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left text-sm text-zinc-400">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>Full natal chart with all placements &amp; aspects</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>Daily transit-aware AI guidance</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>Unlimited AI journaling with memory</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 text-violet-400">✓</span>
              <span>30-day transit calendar</span>
            </li>
          </ul>

          <Link
            href="/auth/signup"
            className="mt-8 inline-block rounded-xl border border-violet-500/30 bg-violet-500/10 px-8 py-4 text-sm font-semibold uppercase tracking-widest text-violet-300 transition-colors hover:bg-violet-500/20 active:bg-violet-500/25"
          >
            Become a founding member
          </Link>

          <p className="mt-4 text-xs text-zinc-700">
            Free to sign up. Upgrade when you&apos;re ready.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] px-6 py-8 text-center">
        <p className="text-xs tracking-widest text-zinc-700">SOS</p>
        <p className="mt-1 text-[10px] text-zinc-800">
          © {new Date().getFullYear()} · Built with real ephemeris data
        </p>
      </footer>
    </main>
  );
}
