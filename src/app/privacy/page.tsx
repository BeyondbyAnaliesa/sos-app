import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | SOS',
  description: 'How SOS handles account, chart, journal, billing, and support data.',
};

const UPDATED = 'April 30, 2026';

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
      <header className="mb-10">
        <Link href="/" className="text-xs uppercase tracking-[0.25em] text-[var(--color-copper)] hover:underline">
          SOS
        </Link>
        <h1 className="mt-5 text-3xl font-light tracking-[0.08em] text-[var(--color-text)]">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[var(--color-text-muted)]">Last updated: {UPDATED}</p>
      </header>

      <div className="space-y-8 text-sm leading-7 text-[var(--color-text-muted)]">
        <section className="space-y-3">
          <h2 className="text-base font-medium text-[var(--color-text)]">What SOS collects</h2>
          <p>
            SOS collects the information needed to create your account, calculate your chart, personalize your readings, run the journal companion, process billing, and answer support requests.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Email address and authentication information.</li>
            <li>Birth date, birth time, birthplace text, and geocoded birthplace coordinates for chart calculation.</li>
            <li>Journal entries, journal messages, onboarding answers, and feedback you choose to send.</li>
            <li>Subscription status and billing identifiers from payment providers.</li>
            <li>Basic product analytics, diagnostic logs, and support metadata such as user agent when needed to troubleshoot issues.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-[var(--color-text)]">How SOS uses your data</h2>
          <p>
            SOS uses your data to provide the app, personalize chart-based guidance, maintain your account, process access and billing, improve reliability, and respond to support requests.
          </p>
          <p>
            SOS does not sell your personal data. SOS does not use your data for third-party ad tracking.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-[var(--color-text)]">Service providers</h2>
          <p>SOS uses trusted providers to operate the app:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Supabase for authentication, sessions, and database storage.</li>
            <li>OpenAI for AI-generated readings and journal companion responses.</li>
            <li>Stripe for web billing and subscription processing.</li>
            <li>OpenStreetMap Nominatim for geocoding typed birthplace text.</li>
            <li>Vercel for hosting, logs, and app delivery.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-[var(--color-text)]">Journal and personal context</h2>
          <p>
            Journal text and onboarding answers can be personal. SOS uses this context to make the app more relevant to you. Only share what you want the app to use for guidance and reflection.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-[var(--color-text)]">Payments</h2>
          <p>
            For web purchases, payment details are handled by Stripe. SOS does not store your full card number. Subscription status and related billing identifiers may be stored so the app can manage access.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-[var(--color-text)]">Your choices</h2>
          <p>
            You can contact SOS to ask about your account, request support, or ask for deletion where applicable. Some data may need to be retained for legal, security, billing, or operational reasons.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium text-[var(--color-text)]">Contact</h2>
          <p>
            For privacy or support questions, email{' '}
            <a href="mailto:support@getsos.app" className="text-[var(--color-copper)] hover:underline">
              support@getsos.app
            </a>
            .
          </p>
        </section>

        <p className="border-t border-[var(--color-border-subtle)] pt-6 text-xs opacity-70">
          This policy is a product-facing summary and should be reviewed before final App Store filing or wider commercial launch.
        </p>
      </div>
    </main>
  );
}
