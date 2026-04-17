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
  { key: 'sun',    label: 'Sun',    desc: 'Your core identity' },
  { key: 'moon',   label: 'Moon',   desc: 'Your inner world' },
  { key: 'rising', label: 'Rising', desc: 'How the world sees you' },
] as const;

export default function ChartRevealStep({ chart, onContinue }: Props) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-light tracking-wide text-[var(--color-text)]">
        Your Chart
      </h2>
      <p className="mb-8 text-sm text-[var(--color-text-muted)]">
        These are the three pillars of who you are.
      </p>

      <div className="space-y-3">
        {placements.map(({ key, label, desc }) => {
          const data = chart[key];
          return (
            <div
              key={key}
              className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-5"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
                  {label}
                </p>
                <p className="text-lg font-light text-[var(--color-text)]">
                  {data.sign}{' '}
                  <span className="text-sm text-[var(--color-text-muted)]">{data.degree}°</span>
                </p>
              </div>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{desc}</p>
            </div>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        className="mt-8 h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
      >
        Continue
      </button>
    </div>
  );
}
