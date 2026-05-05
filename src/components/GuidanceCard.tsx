import Link from 'next/link';
import type { GuidanceResult, Domain, Intensity } from '@/lib/interpret';

const DOMAIN_CONFIG: Record<Domain, { icon: string; accentClass: string; borderClass: string }> = {
  body:          { icon: '◑', accentClass: 'text-[var(--color-copper)]', borderClass: 'border-l-[rgba(201,162,122,0.42)]' },
  mind:          { icon: '✦', accentClass: 'text-[var(--color-copper)]', borderClass: 'border-l-[rgba(201,162,122,0.58)]' },
  spirit:        { icon: '◎', accentClass: 'text-[var(--color-copper)]', borderClass: 'border-l-[rgba(239,68,136,0.3)]' },
  relationships: { icon: '◆', accentClass: 'text-[var(--color-copper)]', borderClass: 'border-l-[var(--color-copper)]' },
  career:        { icon: '◇', accentClass: 'text-[var(--color-copper)]', borderClass: 'border-l-[var(--color-border)]' },
  home:          { icon: '⌂', accentClass: 'text-[var(--color-copper)]', borderClass: 'border-l-[var(--color-copper-dim)]' },
};

const INTENSITY_CONFIG: Record<Intensity, { label: string; dotClass: string }> = {
  high:   { label: 'High',   dotClass: 'bg-[var(--color-copper)]'     },
  medium: { label: 'Active', dotClass: 'bg-[var(--color-copper-dim)]' },
  low:    { label: 'Mild',   dotClass: 'bg-[var(--color-text-muted)]' },
};

export default function GuidanceCard({ result, showAskAeon = false }: { result: GuidanceResult; showAskAeon?: boolean }) {
  const domain    = DOMAIN_CONFIG[result.domain];
  const intensity = INTENSITY_CONFIG[result.intensity];

  return (
    <div className={`rounded-2xl border border-l-2 border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-5 ${domain.borderClass}`}>
      <div className="mb-4 flex items-center justify-between">
        <div
          className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${domain.accentClass}`}
        >
          <span aria-hidden="true">{domain.icon}</span>
          <span>{result.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${intensity.dotClass}`} />
          <span className="text-xs text-[var(--color-text-muted)]">{intensity.label}</span>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-[var(--color-text)]">{result.message}</p>
      {showAskAeon && (
        <Link
          href={`/journal?starter=${encodeURIComponent(`Go deeper on this ${result.title.toLowerCase()} reading.`)}&context=${encodeURIComponent(result.message)}`}
          className="mt-4 flex items-center justify-between rounded-[10px] border border-[var(--color-border-subtle)] px-4 py-3 text-xs uppercase tracking-[0.18em] text-[var(--color-electric)] hover:border-[var(--color-electric)]"
        >
          <span>Ask Aeon about this</span>
          <span>→</span>
        </Link>
      )}
    </div>
  );
}
