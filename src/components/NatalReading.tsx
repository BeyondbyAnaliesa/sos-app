import type { OnboardingReport } from '@/lib/onboarding-prompt';
import AeonBridgeBox from '@/components/onboarding/AeonBridgeBox';

function buildFallbackBridge(report: OnboardingReport) {
  const headline = report.aeonBridgeHeadline ?? report.themes[0] ?? 'There is a live thread in your chart worth following right now.';
  const body = report.aeonBridgeBody ?? report.lookAhead.split('\n\n')[0] ?? 'Aeon can help you work with what is active right now in your chart and your life.';
  const starterChips = report.aeonStarterChips?.filter(Boolean)?.slice(0, 3) ?? report.practices?.filter(Boolean)?.slice(0, 3) ?? [
    'How do I work with this love pattern?',
    'What is my chart trying to show me?',
    'Where should I start with Aeon?',
  ];

  return { headline, body, starterChips };
}

export default function NatalReading({ report }: { report: OnboardingReport }) {
  const bridge = buildFallbackBridge(report);
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

      <AeonBridgeBox
        headline={bridge.headline}
        body={bridge.body}
        starterChips={bridge.starterChips}
      />

      {/* Look Ahead */}
      <div className="rounded-[10px] border border-[var(--color-electric)] bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(239,68,136,0.02))] px-6 py-5 shadow-[0_0_0_1px_rgba(239,68,136,0.12)]">
        <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-electric)]">
          ◆ What Comes Next
        </p>
        <div className="space-y-3 text-sm leading-relaxed text-[var(--color-text)]">
          {report.lookAhead.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
