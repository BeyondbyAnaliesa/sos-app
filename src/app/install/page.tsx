import Link from 'next/link';
import InstallAppPanel from '@/components/InstallAppPanel';

export const metadata = {
  title: 'Install SOS',
  description: 'Add SOS to your phone home screen.',
};

export default function InstallPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-copper-dim)]">Install SOS</p>
        <h1 className="mt-3 text-3xl font-light tracking-[0.14em] text-[var(--color-text)]">
          Add SOS to your phone
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[var(--color-text-muted)]">
          Get the SOS icon on your home screen and open it like an app. No App Store or Play Store required.
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      <InstallAppPanel />

      <div className="mt-8 grid grid-cols-2 gap-3">
        <Link
          href="/"
          className="rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3 text-center text-xs uppercase tracking-[0.16em] text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
        >
          Waitlist
        </Link>
        <Link
          href="/auth/login"
          className="rounded-[10px] border border-[var(--color-copper)]/45 px-4 py-3 text-center text-xs uppercase tracking-[0.16em] text-[var(--color-copper)] hover:border-[var(--color-copper)]"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
