export default function Header({ date }: { date: string }) {
  const parsed = new Date(`${date}T12:00:00`);
  const formatted = parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  return (
    <header className="mb-8 text-center">
      <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />

      <h1 className="text-4xl font-light tracking-[0.35em] text-[var(--color-text)] sm:text-5xl">SOS</h1>

      <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
        Spiritual Operating System
      </p>

      <time
        dateTime={date}
        className="mt-3 block text-sm text-[var(--color-text-muted)]"
      >
        {formatted}
      </time>

      <div className="mx-auto mt-6 h-px w-full max-w-xs bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
    </header>
  );
}
