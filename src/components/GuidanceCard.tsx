import type { GuidanceResult, Domain, Intensity } from '@/lib/interpret';

const DOMAIN_CONFIG: Record<Domain, { icon: string; accentClass: string }> = {
  relationships: { icon: '◆', accentClass: 'text-violet-400' },
  career:        { icon: '◇', accentClass: 'text-cyan-400'   },
  growth:        { icon: '✦', accentClass: 'text-emerald-400' },
};

const INTENSITY_CONFIG: Record<Intensity, { label: string; dotClass: string }> = {
  high:   { label: 'High',   dotClass: 'bg-rose-400'    },
  medium: { label: 'Active', dotClass: 'bg-amber-400'   },
  low:    { label: 'Mild',   dotClass: 'bg-emerald-400' },
};

export default function GuidanceCard({ result }: { result: GuidanceResult }) {
  const domain    = DOMAIN_CONFIG[result.domain];
  const intensity = INTENSITY_CONFIG[result.intensity];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div
          className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${domain.accentClass}`}
        >
          <span aria-hidden="true">{domain.icon}</span>
          <span>{result.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${intensity.dotClass}`} />
          <span className="text-xs text-zinc-500">{intensity.label}</span>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-zinc-300">{result.message}</p>
    </div>
  );
}
