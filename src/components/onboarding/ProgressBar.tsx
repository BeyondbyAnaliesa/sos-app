const TOTAL_STEPS = 12;

export default function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="mb-10">
      <div className="h-px w-full bg-[var(--color-border-subtle)]">
        <div
          className="h-px bg-[var(--color-copper)]"
          style={{ width: `${pct}%`, transition: 'width 600ms cubic-bezier(0.25, 0.1, 0.25, 1)' }}
        />
      </div>
      <p className="mt-2 text-right text-[10px] text-[var(--color-text-muted)]">
        {step} / {TOTAL_STEPS - 1}
      </p>
    </div>
  );
}
