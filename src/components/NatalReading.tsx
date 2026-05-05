import type { OnboardingReport } from '@/lib/onboarding-prompt';

// splitReport: safe paragraph splitter for report fields — handles null/undefined from GPT
function splitReport(text: string | null | undefined): string[] {
  if (!text) return [];
  return text.split('\n\n').filter(Boolean);
}

export default function NatalReading({ report }: { report: OnboardingReport }) {
  return (
    <div className="space-y-6">
      {/* Chart Reading */}
      <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 py-5">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-copper)]">
          ◆ Your Chart Reading
        </p>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {splitReport(report.chartReading).map((paragraph, i) => (
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
          {(Array.isArray(report.themes) ? report.themes : []).map((theme, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
              <span className="mt-0.5 shrink-0 text-[10px] font-medium text-[var(--color-copper-dim)]">
                {i + 1}
              </span>
              <span>{theme}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Look Ahead */}
      <div className="rounded-[10px] border border-[var(--color-electric)] bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(239,68,136,0.02))] px-6 py-5 shadow-[0_0_0_1px_rgba(239,68,136,0.12)]">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-electric)]">
          ◆ What Comes Next
        </p>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text)]">
          {splitReport(report.lookAhead).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
