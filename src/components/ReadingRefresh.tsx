'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Polls for the natal reading every 8 seconds.
 * When the reading exists, refreshes the server component so the full
 * reading renders without requiring a manual page reload.
 */
export default function ReadingRefresh() {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        // A lightweight signal — if the reading route returns non-empty
        // we reload the page. The simplest check is just to trigger a
        // router.refresh() which re-runs the server component.
        router.refresh();
      } catch {
        // ignore network errors, keep polling
      }
    }, 8000);

    return () => clearInterval(id);
  }, [router]);

  return (
    <p className="mt-6 text-xs text-zinc-700">
      Checking automatically every few seconds…
    </p>
  );
}
