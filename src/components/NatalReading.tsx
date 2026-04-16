import type { OnboardingReport } from '@/lib/onboarding-prompt';

export default function NatalReading({ report }: { report: OnboardingReport }) {
  return (
    <div className="space-y-6">
      {/* Chart Reading */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-400">
          ◆ Your Chart Reading
        </p>
        <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
          {report.chartReading.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Themes */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-cyan-400">
          ◇ Themes to Watch
        </p>
        <ol className="space-y-3">
          {report.themes.map((theme, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold text-zinc-600">
                {i + 1}
              </span>
              <span>{theme}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Practices */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5">
        <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          ✦ First Practices
        </p>
        <ol className="space-y-3">
          {report.practices.map((practice, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-zinc-300">
              <span className="mt-0.5 shrink-0 text-[10px] font-semibold text-zinc-600">
                {i + 1}
              </span>
              <span>{practice}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Look Ahead */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-6 py-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-400">
          ◆ What Comes Next
        </p>
        <div className="space-y-3 text-sm leading-relaxed text-zinc-300">
          {report.lookAhead.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
