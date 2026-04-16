import Link from 'next/link';

export default function CancelPage() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="py-16 text-center">
        <div className="mx-auto mb-8 h-px w-12 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <h1 className="text-2xl font-light tracking-wide text-white">
          No rush.
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
          Your free access is still here whenever you want it. Come back when it feels right.
        </p>

        <div className="mt-10 space-y-3">
          <Link
            href="/"
            className="flex items-center justify-between rounded-xl border border-white/[0.07] px-5 py-4 text-sm text-zinc-400 transition-colors hover:border-white/[0.1] hover:text-zinc-300"
          >
            <span>Back to home</span>
            <span className="text-zinc-600">→</span>
          </Link>
          <Link
            href="/upgrade"
            className="flex items-center justify-between rounded-xl border border-white/[0.07] px-5 py-4 text-sm text-zinc-600 transition-colors hover:text-zinc-400"
          >
            <span>See pricing again</span>
            <span className="text-zinc-700">◇</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
