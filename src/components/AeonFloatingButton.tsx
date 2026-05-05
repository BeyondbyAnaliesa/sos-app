import Link from 'next/link';

export default function AeonFloatingButton() {
  return (
    <Link
      href="/journal"
      aria-label="Chat with Aeon"
      className="fixed bottom-[76px] right-4 z-40 rounded-full border border-[var(--color-electric)]/50 bg-[var(--color-surface)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-electric)] shadow-[0_12px_36px_rgba(0,0,0,0.35)] hover:border-[var(--color-electric)] sm:right-[calc(50%-270px)]"
    >
      Ask Aeon
    </Link>
  );
}
