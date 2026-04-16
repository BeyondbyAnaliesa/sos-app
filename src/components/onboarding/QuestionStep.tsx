'use client';

interface Props {
  domain: string;
  questionText: string;
  minChars: number;
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}

export default function QuestionStep({
  domain,
  questionText,
  minChars,
  value,
  onChange,
  onContinue,
}: Props) {
  const count = value.length;
  const met = count >= minChars;

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-violet-400">
        {domain}
      </p>
      <h2 className="mb-8 text-lg font-light leading-relaxed text-white">
        {questionText}
      </h2>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Write freely. The more honest and detailed you are, the more SOS can do for you."
        className="w-full resize-none rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-base leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.15] focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-between">
        <p className={`text-xs ${met ? 'text-emerald-400' : 'text-zinc-600'}`}>
          {count} / {minChars} characters minimum
        </p>
      </div>

      <button
        onClick={onContinue}
        disabled={!met}
        className="mt-6 w-full rounded-xl border border-white/[0.07] bg-white/[0.05] py-4 text-sm font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
