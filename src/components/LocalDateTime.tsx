'use client';

import { useEffect, useState } from 'react';

export default function LocalDateTime({ fallbackDate }: { fallbackDate: string }) {
  const [label, setLabel] = useState<string>(() => {
    const parsed = new Date(`${fallbackDate}T12:00:00`);
    return parsed.toLocaleDateString('en-US', {
      weekday: 'long',
      year:    'numeric',
      month:   'long',
      day:     'numeric',
    });
  });

  useEffect(() => {
    function update() {
      const now = new Date();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const datePart = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year:    'numeric',
        month:   'long',
        day:     'numeric',
      });
      const timePart = now.toLocaleTimeString('en-US', {
        hour:   'numeric',
        minute: '2-digit',
      });
      const zoneLabel = timeZone?.split('/').pop()?.replaceAll('_', ' ') ?? 'local time';
      setLabel(`${datePart} · ${timePart} ${zoneLabel}`);
    }

    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return <>{label}</>;
}
