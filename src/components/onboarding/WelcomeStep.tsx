export default function WelcomeStep({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-8 h-px w-16 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />

      <h1 className="text-4xl font-light tracking-[0.3em] text-[var(--color-text)]">SOS</h1>
      <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
        Spiritual Operating System
      </p>

      <div className="mx-auto mt-10 max-w-md space-y-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
        <p>
          You are about to teach SOS who you are. The deeper you go here, the
          more intelligent your experience becomes — and it only gets smarter
          from here.
        </p>
        <p>
          This will take about <span className="text-[var(--color-text)]">10–15 minutes</span>.
          There are no wrong answers. Write honestly and write enough — the
          system learns from what you share.
        </p>
        <p className="opacity-60">
          We will start with your birth data, reveal your natal chart, then ask
          you seven questions about your life right now.
        </p>
      </div>

      <button
        onClick={onBegin}
        className="mt-10 h-[52px] w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-sm font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] sm:w-auto sm:px-10"
      >
        Begin
      </button>
    </div>
  );
}
