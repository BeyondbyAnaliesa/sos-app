'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useState, useTransition } from 'react';

type PendingLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  pendingLabel?: string;
};

export default function PendingLink({ href, children, className, pendingLabel = 'Wait a moment', onClick, ...props }: PendingLinkProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clicked, setClicked] = useState(false);
  const showing = clicked || isPending;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setClicked(true);
    startTransition(() => router.push(href));
  }

  return (
    <Link href={href} className={className} onClick={handleClick} aria-busy={showing} {...props}>
      {children}
      {showing && (
        <span className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-[rgba(10,8,12,0.72)] backdrop-blur-sm">
          <span className="flex flex-col items-center gap-2 text-[var(--color-electric)]">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-electric)]/40 bg-[rgba(239,68,136,0.10)]">
              <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--color-electric)]" />
              <span className="relative text-sm">✦</span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em]">{pendingLabel}</span>
          </span>
        </span>
      )}
    </Link>
  );
}
