import Link from 'next/link';

export default function CancelPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="py-16 text-center">
        <div className="mx-auto mb-8 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />

        <h1 className="text-2xl font-light tracking-wide text-[var(--color-text)]">
          No rush.
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[var(--color-text-muted)]">
          Your free access is still here whenever you want it. Come back when it feels right.
        </p>

        <div className="mt-10 space-y-3">
          <Link
            href="/"
            className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
          >
            <span>Back to home</span>
            <span className="text-[var(--color-copper-dim)]">→</span>
          </Link>
          <Link
            href="/upgrade"
            className="flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-4 text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
          >
            <span>See pricing again</span>
            <span className="text-[var(--color-copper-dim)]">◇</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
