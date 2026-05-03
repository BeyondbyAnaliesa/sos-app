import type { ReactNode } from 'react';
import WaitlistForm from '@/components/WaitlistForm';

const intelligenceLayers = [
  {
    number: '01',
    title: 'Your exact chart',
    body: 'SOS starts with your birth chart and the transits moving through it now. Not a sun-sign forecast. Not a recycled daily vibe.',
  },
  {
    number: '02',
    title: 'Your lived context',
    body: 'Save reflections, questions, people, and moments. The app can remember what keeps coming back, privately.',
  },
  {
    number: '03',
    title: 'A useful map',
    body: 'The reading connects timing to real life: what is active, what it is probably about, and what move makes sense now.',
  },
] as const;

const useCases = [
  'Know when to answer, wait, ask, cut, commit, or leave it alone.',
  'Track why the same pattern keeps returning at the same kind of sky pressure.',
  'Bring a real question to Aeon and get context-aware guidance from your chart.',
  'Build a private record of what happened when the sky was active in your life.',
] as const;

const outcomeCards = [
  {
    label: 'Today',
    title: 'What is active now',
    body: 'The current transits most likely to matter for your actual chart, translated into plain next-step language.',
  },
  {
    label: 'Context',
    title: 'What your life is making relevant',
    body: 'The question, person, decision, or recurring pattern you chose to save, kept private and brought back when useful.',
  },
  {
    label: 'Pattern',
    title: 'What keeps repeating',
    body: 'A memory layer that can notice when the same kind of sky pressure returns around the same kind of life event.',
  },
] as const;

const included = [
  'Your natal chart and generated reading',
  'Daily transit guidance based on your chart',
  'Aeon conversation layer for real-life context',
  'Private memory that helps readings sharpen over time',
  '$49/year founding rate, locked for charter members',
] as const;

const faqs = [
  {
    q: 'Is SOS just another horoscope app?',
    a: 'No. SOS is built around exact chart timing plus private lived context. The promise is not a prettier horoscope. It is continuity.',
  },
  {
    q: 'Does the app need my journal to work?',
    a: 'No. Your chart gives SOS a starting map. The more context you choose to save, the more specific the guidance can become.',
  },
  {
    q: 'Why join as a charter member?',
    a: 'Charter members get the founding annual rate for life while the intelligence layer is being sharpened around real use.',
  },
] as const;

function Eyebrow({ children, tone = 'copper' }: { children: ReactNode; tone?: 'copper' | 'pink' | 'dark' }) {
  const color = tone === 'dark' ? 'text-[#6f4a34]' : tone === 'pink' ? 'text-[rgba(247,185,214,0.9)]' : 'text-[rgba(201,162,122,0.92)]';
  return <p className={`text-[11px] font-semibold uppercase tracking-[0.34em] ${color}`}>{children}</p>;
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <a
      href="#waitlist"
      className={`inline-flex h-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#f1c08b,#b9784a_48%,#8f5536)] px-7 text-sm font-bold uppercase tracking-[0.2em] text-[#140c0e] shadow-[0_18px_55px_rgba(201,120,76,0.34)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_70px_rgba(201,120,76,0.42)] ${className}`}
    >
      Join Waitlist
    </a>
  );
}

function SecondaryCta({ className = '' }: { className?: string }) {
  return (
    <a
      href="#how-it-works"
      className={`inline-flex h-14 items-center justify-center rounded-2xl border border-[rgba(247,185,214,0.42)] bg-[rgba(7,7,17,0.5)] px-7 text-sm font-semibold uppercase tracking-[0.18em] text-[rgba(247,185,214,0.96)] backdrop-blur transition hover:border-[rgba(247,185,214,0.72)] ${className}`}
    >
      See How It Works
    </a>
  );
}

function SectionShell({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`relative overflow-hidden px-5 py-16 sm:px-8 lg:px-12 lg:py-24 ${className}`}>{children}</section>;
}

export default function LandingPage() {
  return (
    <main className="min-h-dvh w-full max-w-full overflow-x-hidden bg-[#080713] text-[var(--color-text)]">
      <section className="relative min-h-dvh overflow-hidden bg-[#05050d]">
        <div className="absolute inset-0">
          <video
            className="absolute inset-0 h-full w-full object-cover object-[60%_50%] opacity-100 brightness-[0.98] contrast-[1.04] saturate-[1.05]"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster="/brand/sos-field-command-cockpit.png"
            aria-hidden="true"
          >
            <source src="/brand/sos-hero-approved-v5-line-shimmer-2026-05-01.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,13,0.72)_0%,rgba(5,5,13,0.48)_38%,rgba(5,5,13,0.18)_68%,rgba(5,5,13,0.06)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,#05050d,rgba(5,5,13,0))]" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-[linear-gradient(180deg,rgba(5,5,13,0),#080713_84%)]" />
        </div>

        <nav className="relative z-10 flex w-full items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-12">
          <a href="#top" className="text-sm uppercase tracking-[0.42em] text-[rgba(247,241,236,0.94)]">SOS</a>
          <PrimaryCta className="hidden h-11 rounded-full px-5 text-[10px] tracking-[0.22em] sm:inline-flex" />
        </nav>

        <div id="top" className="relative z-10 flex min-h-[calc(100dvh-76px)] items-center px-5 py-8 sm:px-8 lg:px-12">
          <div className="w-full max-w-7xl">
            <div className="max-w-[48rem]">
              <Eyebrow>Private astrology intelligence</Eyebrow>
              <h1 className="mt-5 text-[3.1rem] font-light leading-[0.9] tracking-[-0.06em] text-[rgba(247,241,236,0.99)] sm:text-[clamp(4.6rem,8vw,7.8rem)]">
                Astrology that remembers your life.
              </h1>
              <p className="mt-7 max-w-[39rem] text-[18px] leading-8 text-[rgba(244,239,232,0.9)] sm:text-[21px] sm:leading-9">
                SOS reads your real chart timing beside the context you choose to save, so guidance gets specific instead of generic.
              </p>
              <div className="mt-9 flex w-full max-w-[25rem] flex-col gap-4 sm:max-w-none sm:flex-row">
                <PrimaryCta className="w-full sm:w-auto" />
                <SecondaryCta className="w-full sm:w-auto" />
              </div>
              <p className="mt-5 max-w-[34rem] text-sm leading-6 text-[rgba(233,221,214,0.76)]">
                Charter access is being prepared now. Join the list first; founding annual rate is <span className="text-[rgba(247,241,236,0.96)]">$49/year for life</span> when access opens.
              </p>
            </div>
          </div>
        </div>
      </section>

      <SectionShell id="how-it-works" className="bg-[#f4efe8] text-[#170f17]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.36] bg-[radial-gradient(circle_at_16%_18%,rgba(239,68,136,0.16),transparent_24%),radial-gradient(circle_at_82%_22%,rgba(201,122,70,0.18),transparent_28%)]" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <Eyebrow tone="dark">Why it converts differently</Eyebrow>
            <h2 className="mt-5 text-4xl font-light leading-[0.98] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              The promise is easy to understand: the app knows the sky and remembers the context.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {intelligenceLayers.map((item) => (
              <article key={item.number} className="rounded-[30px] border border-[#d5c1ad] bg-[rgba(255,255,255,0.58)] p-6 shadow-[0_24px_80px_rgba(55,34,25,0.1)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#9b613f]">{item.number}</p>
                <h3 className="mt-7 text-3xl font-light leading-tight tracking-[-0.04em] text-[#180f17]">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-[#5a4a45]">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="bg-[linear-gradient(180deg,#080713,#191225)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_12%,rgba(239,68,136,0.13),transparent_26%),radial-gradient(circle_at_20%_70%,rgba(201,162,122,0.12),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow tone="pink">What you come here for</Eyebrow>
            <h2 className="mt-5 text-4xl font-light leading-tight tracking-[-0.05em] text-[rgba(247,241,236,0.98)] sm:text-6xl">
              A calmer next move. Not another thing to decode.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-9 text-[rgba(233,221,214,0.72)]">
              SOS should feel like someone turned the lights on inside the moment. You still make the decision. The app gives you timing, context, and a sharper read on the pattern.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {useCases.map((item) => (
              <div key={item} className="min-h-44 rounded-[30px] border border-[rgba(201,162,122,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)]">
                <span className="text-[rgba(201,162,122,0.95)]">✦</span>
                <p className="mt-5 text-xl leading-8 text-[rgba(247,241,236,0.92)]">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell className="bg-[linear-gradient(180deg,#2a2030,#1a1322)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(201,162,122,0.16),transparent_24%),radial-gradient(circle_at_82%_70%,rgba(239,68,136,0.11),transparent_24%)]" />
        <div className="relative mx-auto max-w-7xl rounded-[42px] border border-[rgba(244,239,232,0.14)] bg-[rgba(244,239,232,0.08)] p-6 shadow-[0_40px_140px_rgba(0,0,0,0.32)] sm:p-10 lg:p-14">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <Eyebrow>Inside SOS</Eyebrow>
              <h2 className="mt-5 text-4xl font-light leading-tight tracking-[-0.05em] text-[rgba(247,241,236,0.98)] sm:text-6xl">
                The product proof is the kind of answer the app can give.
              </h2>
            </div>
            <p className="text-lg leading-9 text-[rgba(233,221,214,0.78)]">
              Final mobile screenshots should come from the real locked UI, not invented mockups. Until then, the site sells the concrete value: SOS connects exact timing, saved context, and pattern memory into one clearer read.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {outcomeCards.map((item) => (
              <article key={item.title} className="rounded-[28px] border border-[rgba(247,241,236,0.12)] bg-[linear-gradient(180deg,rgba(244,239,232,0.13),rgba(244,239,232,0.06))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgba(247,185,214,0.88)]">{item.label}</p>
                <h3 className="mt-5 text-2xl font-light leading-tight tracking-[-0.035em] text-[rgba(247,241,236,0.96)]">{item.title}</h3>
                <p className="mt-4 text-base leading-8 text-[rgba(233,221,214,0.7)]">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-4 rounded-[32px] border border-[rgba(247,241,236,0.12)] bg-[rgba(8,8,17,0.34)] p-5 sm:p-7 lg:grid-cols-[0.72fr_1.28fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgba(201,162,122,0.92)]">Example output</p>
              <h3 className="mt-4 text-3xl font-light leading-tight tracking-[-0.04em] text-[rgba(247,241,236,0.96)]">What a useful read sounds like.</h3>
            </div>
            <div className="rounded-[24px] bg-[rgba(244,239,232,0.09)] p-5 text-[rgba(247,241,236,0.92)]">
              <p className="text-base leading-8 sm:text-lg">
                You are in the part of the pattern where answering fast feels responsible, but it is actually how you lose the thread. Wait for the spike to pass. Then ask for the thing in writing.
              </p>
              <p className="mt-4 text-sm leading-7 text-[rgba(233,221,214,0.64)]">
                The point is not prediction. It is timing plus context turned into one usable move.
              </p>
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell id="waitlist" className="bg-[#f4efe8] text-[#170f17]">
        <div className="relative mx-auto grid max-w-7xl gap-8 rounded-[42px] border border-[#d5c1ad] bg-[linear-gradient(135deg,#fff8ef,#ead9c8)] p-6 shadow-[0_34px_110px_rgba(80,46,28,0.16)] sm:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:p-14">
          <div>
            <Eyebrow tone="dark">Charter access</Eyebrow>
            <h2 className="mt-5 text-4xl font-light leading-tight tracking-[-0.055em] sm:text-6xl">
              If this is the tool you wanted, get on the list before Charter opens.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#5a4a45]">
              Charter access is being prepared now: the private intelligence layer, the founding annual price for life, and a product that sharpens around real use.
            </p>
          </div>

          <div className="rounded-[32px] border border-[#c8aa91] bg-[#170f17] p-5 text-[rgba(247,241,236,0.94)] shadow-[0_26px_80px_rgba(55,34,25,0.18)] sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[rgba(247,185,214,0.9)]">Included</p>
            <div className="mt-6 space-y-4">
              {included.map((item) => (
                <div key={item} className="flex gap-3 border-t border-[rgba(201,162,122,0.16)] pt-4 first:border-t-0 first:pt-0">
                  <span className="mt-1 text-[rgba(201,162,122,0.95)]">✦</span>
                  <p className="text-base leading-7 text-[rgba(247,241,236,0.88)]">{item}</p>
                </div>
              ))}
            </div>
            <WaitlistForm className="mt-8" />
            <p className="mt-4 text-center text-sm leading-6 text-[rgba(233,221,214,0.62)]">Founding annual rate. No founder story. No generic horoscope pitch.</p>
          </div>
        </div>
      </SectionShell>

      <SectionShell className="bg-[#080713]">
        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>Questions people should not have to guess</Eyebrow>
            <h2 className="mt-5 text-4xl font-light leading-tight tracking-[-0.05em] text-[rgba(247,241,236,0.98)] sm:text-6xl">
              Clear beats clever.
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((item) => (
              <article key={item.q} className="rounded-[28px] border border-[rgba(201,162,122,0.16)] bg-[rgba(255,255,255,0.035)] p-6">
                <h3 className="text-xl leading-7 text-[rgba(247,241,236,0.94)]">{item.q}</h3>
                <p className="mt-3 text-base leading-8 text-[rgba(233,221,214,0.66)]">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </SectionShell>

      <section className="relative overflow-hidden bg-[#05050d] px-5 py-20 text-center sm:px-8 lg:px-12 lg:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,136,0.14),transparent_28%)]" />
        <div className="relative mx-auto max-w-4xl">
          <Eyebrow>Start here</Eyebrow>
          <h2 className="mt-5 text-5xl font-light leading-[0.95] tracking-[-0.06em] text-[rgba(247,241,236,0.99)] sm:text-7xl">
            Let the app remember what the sky keeps repeating.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-9 text-[rgba(233,221,214,0.72)]">
            Your chart gives the timing. Your context gives the target. SOS turns both into a clearer next move.
          </p>
          <div className="mx-auto mt-9 max-w-2xl">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </main>
  );
}
