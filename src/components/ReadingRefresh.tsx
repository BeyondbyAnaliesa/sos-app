'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReadingRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      try {
        router.refresh();
      } catch {
        // ignore
      }
    }, 8000);

    return () => clearInterval(id);
  }, [router]);

  return (
    <p className="mt-6 text-xs text-[var(--color-text-muted)] opacity-50">
      Checking automatically every few seconds…
    </p>
  );
}
