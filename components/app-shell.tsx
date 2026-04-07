'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

const navItems = [
  { href: '/app', label: 'Home' },
  { href: '/app/today', label: 'Today' },
  { href: '/app/journal', label: 'Journal' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <Link className="app-shell__brand" href="/app">
          SOS
        </Link>
        <div className="app-shell__header-actions">
          <Link className="button-ghost" href="/app/onboard">
            Onboard
          </Link>
          <form action="/auth/logout" method="post">
            <button className="button-ghost" type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="app-shell__content">{children}</main>

      <nav className="app-shell__nav" aria-label="Primary">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} className="app-nav-link" data-active={active} href={item.href}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
