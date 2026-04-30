import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Support | SOS',
  description: 'Get help with SOS accounts, access, subscriptions, feedback, and app issues.',
};

export default function SupportPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <header className="mb-10">
        <Link href="/" className="text-xs uppercase tracking-[0.25em] text-[var(--color-copper)] hover:underline">
          SOS
        </Link>
        <h1 className="mt-5 text-3xl font-light tracking-[0.08em] text-[var(--color-text)]">
          Support
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--color-text-muted)]">
          Need help with your account, tester access, subscription, journal, chart, or daily reading? Start here.
        </p>
      </header>

      <div className="space-y-6 text-sm leading-7 text-[var(--color-text-muted)]">
        <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
          <h2 className="text-base font-medium text-[var(--color-text)]">Email support</h2>
          <p className="mt-2">
            Email{' '}
            <a href="mailto:support@getsos.app" className="text-[var(--color-copper)] hover:underline">
              support@getsos.app
            </a>{' '}
            with the email address on your SOS account and a short note about what happened.
          </p>
        </section>

        <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
          <h2 className="text-base font-medium text-[var(--color-text)]">Send in-app feedback</h2>
          <p className="mt-2">
            If you can open the app, use the feedback form so the issue reaches the product queue with the right context.
          </p>
          <Link href="/feedback" className="mt-4 inline-block text-xs uppercase tracking-widest text-[var(--color-copper)] hover:underline">
            Open feedback
          </Link>
        </section>

        <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
          <h2 className="text-base font-medium text-[var(--color-text)]">Tester access</h2>
          <p className="mt-2">
            If you have an invite code, enter it on the tester access page while signed in.
          </p>
          <Link href="/access" className="mt-4 inline-block text-xs uppercase tracking-widest text-[var(--color-copper)] hover:underline">
            Open tester access
          </Link>
        </section>

        <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
          <h2 className="text-base font-medium text-[var(--color-text)]">Include this when you write</h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>What page you were on.</li>
            <li>What you expected to happen.</li>
            <li>What actually happened.</li>
            <li>Your device and browser if you know them.</li>
          </ul>
        </section>

        <p className="text-xs opacity-70">
          SOS does not provide medical, mental health, legal, or financial advice. For urgent personal safety concerns, contact local emergency services or a qualified professional.
        </p>
      </div>
    </main>
  );
}
