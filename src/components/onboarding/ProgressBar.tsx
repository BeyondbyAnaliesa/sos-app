const TOTAL_STEPS = 12; // 0-11

export default function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((step / (TOTAL_STEPS - 1)) * 100);

  return (
    <div className="mb-10">
      <div className="h-px w-full bg-white/[0.06]">
        <div
          className="h-px bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-right text-[10px] text-zinc-600">
        {step} / {TOTAL_STEPS - 1}
      </p>
    </div>
  );
}
