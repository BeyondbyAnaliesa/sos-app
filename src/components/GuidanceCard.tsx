import type { GuidanceResult, Domain, Intensity } from '@/lib/interpret';

const DOMAIN_CONFIG: Record<Domain, { icon: string; accentClass: string }> = {
  relationships: { icon: '◆', accentClass: 'text-[var(--color-copper)]' },
  career:        { icon: '◇', accentClass: 'text-[var(--color-copper)]' },
  growth:        { icon: '✦', accentClass: 'text-[var(--color-copper)]' },
};

const INTENSITY_CONFIG: Record<Intensity, { label: string; dotClass: string }> = {
  high:   { label: 'High',   dotClass: 'bg-[var(--color-copper)]'     },
  medium: { label: 'Active', dotClass: 'bg-[var(--color-copper-dim)]' },
  low:    { label: 'Mild',   dotClass: 'bg-[var(--color-text-muted)]' },
};

export default function GuidanceCard({ result }: { result: GuidanceResult }) {
  const domain    = DOMAIN_CONFIG[result.domain];
  const intensity = INTENSITY_CONFIG[result.intensity];

  return (
    <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-5">
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
      <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{result.message}</p>
    </div>
  );
}
