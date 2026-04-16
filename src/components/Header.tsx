export default function Header({ date }: { date: string }) {
  // Add noon to avoid UTC-vs-local timezone edge cases
  const parsed = new Date(`${date}T12:00:00`);
  const formatted = parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });

  return (
    <header className="mb-10 text-center">
      <div className="mx-auto mb-8 h-px w-16 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <h1 className="text-5xl font-light tracking-[0.35em] text-white">SOS</h1>

      <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        Spiritual Operating System
      </p>

      <time
        dateTime={date}
        className="mt-4 block text-sm text-zinc-400"
      >
        {formatted}
      </time>

      <div className="mx-auto mt-8 h-px w-full max-w-xs bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </header>
  );
}
