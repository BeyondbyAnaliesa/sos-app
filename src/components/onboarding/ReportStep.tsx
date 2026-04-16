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
        <h2 className="text-2xl font-light tracking-wide text-white">
          Your First Reading
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          This is what the stars and your story tell us.
        </p>
      </div>

      <NatalReading report={report} />

      <div className="pt-4 text-center">
        <button
          onClick={onEnter}
          className="w-full rounded-xl border border-white/[0.07] bg-white/[0.05] py-4 text-sm font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:border-white/[0.15] hover:bg-white/[0.08] sm:w-auto sm:px-10"
        >
          Enter SOS
        </button>
      </div>
    </div>
  );
}
