import Link from 'next/link';

interface Props {
  headline: string;
  body: string;
  starterChips: string[];
}

function buildHref(headline: string, body: string, starterChips: string[]) {
  const params = new URLSearchParams();
  params.set('source', 'onboarding');
  params.set('headline', headline);
  params.set('context', body);
  starterChips.slice(0, 4).forEach((chip) => params.append('starter', chip));
  return `/journal?${params.toString()}`;
}

export default function AeonBridgeBox({ headline, body, starterChips }: Props) {
  const href = buildHref(headline, body, starterChips);

  return (
    <div className="rounded-[10px] border border-[var(--color-electric)] bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(239,68,136,0.02))] px-6 py-5 shadow-[0_0_0_1px_rgba(239,68,136,0.12)]">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-electric)]">
        ✦ Start With Aeon
      </p>
      <h3 className="text-base font-medium leading-relaxed text-[var(--color-text)]">
        {headline}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-[var(--color-text)]">
        {body}
      </p>

      <p className="mt-4 mb-2 text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-muted)]">What we&apos;ll explore</p>
      <div className="flex flex-wrap gap-2">
        {starterChips.slice(0, 3).map((chip) => (
          <span
            key={chip}
            className="pointer-events-none rounded-full border border-[var(--color-electric)]/30 bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text)]"
          >
            {chip}
          </span>
        ))}
      </div>

      <Link
        href={href}
        className="mt-5 flex items-center justify-between rounded-[10px] border border-[var(--color-electric)] bg-[var(--color-surface)] px-5 py-4 text-sm text-[var(--color-text)] hover:border-[var(--color-text)]"
      >
        <span>Ask Aeon about this</span>
        <span className="text-[var(--color-electric)]">→</span>
      </Link>
    </div>
  );
}
