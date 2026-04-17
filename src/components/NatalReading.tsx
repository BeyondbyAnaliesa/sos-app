import type { OnboardingReport } from '@/lib/onboarding-prompt';

export default function NatalReading({ report }: { report: OnboardingReport }) {
  return (
    <div className="space-y-6">
      {/* Chart Reading */}
      <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-5">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-copper)]">
          ◆ Your Chart Reading
        </p>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {report.chartReading.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Themes */}
      <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-5">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-copper)]">
          ◇ Themes to Watch
        </p>
        <ol className="space-y-3">
          {report.themes.map((theme, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              <span className="mt-0.5 shrink-0 text-[10px] font-medium text-[var(--color-copper-dim)]">
                {i + 1}
              </span>
              <span>{theme}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Practices */}
      <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-5">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-copper)]">
          ✦ First Practices
        </p>
        <ol className="space-y-3">
          {report.practices.map((practice, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              <span className="mt-0.5 shrink-0 text-[10px] font-medium text-[var(--color-copper-dim)]">
                {i + 1}
              </span>
              <span>{practice}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Look Ahead */}
      <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-5">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-copper)]">
          ◆ What Comes Next
        </p>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {report.lookAhead.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
