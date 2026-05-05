import Link from 'next/link';

export default function AppBackLink({ href = '/home', label = 'Back' }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-2 py-2 text-xs uppercase tracking-[0.2em] text-[var(--color-text-muted)] hover:text-[var(--color-copper)]"
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </Link>
  );
}
