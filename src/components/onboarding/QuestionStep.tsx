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
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--color-copper)]">
        {domain}
      </p>
      <h2 className="mb-8 text-lg font-light leading-relaxed text-[var(--color-text)]">
        {questionText}
      </h2>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Write freely. The more honest and detailed you are, the more SOS can do for you."
        className="w-full resize-none rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-5 py-4 text-base leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none"
      />

      <div className="mt-2 flex items-center justify-between">
        <p className={`text-xs ${met ? 'text-[var(--color-copper)]' : 'text-[var(--color-text-muted)]'}`}>
          {count} / {minChars} characters minimum
        </p>
      </div>

      <button
        onClick={onContinue}
        disabled={!met}
        className="mt-6 h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Continue
      </button>
    </div>
  );
}
