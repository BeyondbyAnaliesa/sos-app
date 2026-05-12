export default function LoadingOrb({ label = 'Wait a moment' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-electric)]/35 bg-[rgba(239,68,136,0.06)] shadow-[0_0_30px_rgba(239,68,136,0.18)]">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--color-electric)]" />
        <div className="absolute inset-2 animate-pulse rounded-full bg-[rgba(239,68,136,0.16)]" />
        <span className="relative text-lg text-[var(--color-electric)]">✦</span>
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.22em] text-[var(--color-electric)]">{label}</p>
      <p className="mt-2 max-w-[260px] text-xs leading-relaxed text-[var(--color-text-muted)]">
        SOS is pulling your chart, memory, and timing together.
      </p>
    </div>
  );
}
