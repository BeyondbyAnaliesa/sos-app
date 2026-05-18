'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';

type PendingLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  pendingLabel?: string;
};

export default function PendingLink({ href, children, className, pendingLabel, onClick, ...props }: PendingLinkProps) {
  void pendingLabel;

  return (
    <Link href={href} className={className} onClick={onClick} {...props}>
      {children}
    </Link>
  );
}
