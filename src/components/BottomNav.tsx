'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/',        glyph: '◑', label: 'Home' },
  { href: '/reading', glyph: '◈', label: 'Reading' },
  { href: '/journal', glyph: '◆', label: 'Companion' },
  { href: '/more', glyph: '⋯', label: 'More' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border-subtle)] bg-[var(--color-void)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex h-[60px] max-w-xl items-center justify-around px-4">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 ${
                active ? 'text-[var(--color-copper)]' : 'text-[var(--color-text-muted)]'
              }`}
            >
              <span className="text-lg">{item.glyph}</span>
              <span className="text-[9px] uppercase tracking-[0.15em]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
