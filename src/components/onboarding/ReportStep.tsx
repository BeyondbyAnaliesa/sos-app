import type { OnboardingReport } from '@/lib/onboarding-prompt';
import NatalReading from '@/components/NatalReading';

interface Props {
  report: OnboardingReport;
  onEnter: () => void;
}

export default function ReportStep({ report, onEnter }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-light tracking-wide text-[var(--color-text)]">
          Your First Reading
        </h2>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          This is what the stars and your story tell us.
        </p>
      </div>

      <NatalReading report={report} />

      <div className="pt-4 text-center">
        <button
          onClick={onEnter}
          className="h-[52px] w-full rounded-[10px] border border-[var(--color-border)] bg-transparent text-sm font-medium uppercase tracking-widest text-[var(--color-copper)] hover:border-[var(--color-copper)] sm:w-auto sm:px-10"
        >
          Enter SOS
        </button>
      </div>
    </div>
  );
}
