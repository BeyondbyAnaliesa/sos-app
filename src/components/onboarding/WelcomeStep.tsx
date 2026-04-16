export default function WelcomeStep({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-8 h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <h1 className="text-4xl font-light tracking-[0.3em] text-white">SOS</h1>
      <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        Spiritual Operating System
      </p>

      <div className="mx-auto mt-10 max-w-md space-y-4 text-sm leading-relaxed text-zinc-400">
        <p>
          You are about to teach SOS who you are. The deeper you go here, the
          more intelligent your experience becomes — and it only gets smarter
          from here.
        </p>
        <p>
          This will take about <span className="text-zinc-200">10–15 minutes</span>.
          There are no wrong answers. Write honestly and write enough — the
          system learns from what you share.
        </p>
        <p className="text-zinc-500">
          We will start with your birth data, reveal your natal chart, then ask
          you seven questions about your life right now.
        </p>
      </div>

      <button
        onClick={onBegin}
        className="mt-10 rounded-xl border border-white/[0.07] bg-white/[0.05] px-10 py-3 text-xs font-semibold uppercase tracking-widest text-zinc-300 transition-colors hover:border-white/[0.15] hover:bg-white/[0.08]"
      >
        Begin
      </button>
    </div>
  );
}
