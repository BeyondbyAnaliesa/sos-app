interface ChartSummary {
  sun:    { sign: string; degree: number };
  moon:   { sign: string; degree: number };
  rising: { sign: string; degree: number };
}

interface Props {
  chart: ChartSummary;
  onContinue: () => void;
}

const placements = [
  { key: 'sun',    label: 'Sun',    desc: 'Your core identity', accent: 'text-amber-400'   },
  { key: 'moon',   label: 'Moon',   desc: 'Your inner world',   accent: 'text-violet-400'  },
  { key: 'rising', label: 'Rising', desc: 'How the world sees you', accent: 'text-cyan-400' },
] as const;

export default function ChartRevealStep({ chart, onContinue }: Props) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-light tracking-wide text-white">
        Your Chart
      </h2>
      <p className="mb-8 text-sm text-zinc-500">
        These are the three pillars of who you are.
      </p>

      <div className="space-y-3">
        {placements.map(({ key, label, desc, accent }) => {
          const data = chart[key];
          return (
            <div
              key={key}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5"
            >
              <div className="flex items-baseline justify-between">
                <p className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>
                  {label}
                </p>
                <p className="text-lg font-light text-white">
                  {data.sign}{' '}
                  <span className="text-sm text-zinc-500">{data.degree}°</span>
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{desc}</p>
            </div>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        className="mt-8 w-full rounded-xl border border-white/[0.07] bg-white/[0.05] py-4 text-sm font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:bg-white/[0.08]"
      >
        Continue
      </button>
    </div>
  );
}
