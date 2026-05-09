'use client';

import { useState } from 'react';
import type { NatalShareCardData } from '@/lib/natal-reading-prompt';

function buildShareText(card: NatalShareCardData): string {
  return `${card.quote}\n\n${card.label}\n\nMy natal reading from SOS → https://getsos.app`;
}

export default function NatalShareCard({ card }: { card: NatalShareCardData }) {
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText(card);

  async function copyCard() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  async function shareCard() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText, title: 'My natal reading from SOS' });
        return;
      } catch {
        // User cancelled or platform refused; fall back to copy.
      }
    }

    await copyCard();
  }

  return (
    <aside className="rounded-[18px] border border-[var(--color-electric)]/25 bg-[linear-gradient(145deg,rgba(239,68,136,0.10),rgba(201,162,122,0.06),rgba(22,20,34,0.98))] px-4 py-4 shadow-[0_0_0_1px_rgba(239,68,136,0.05)]">
      <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--color-copper-dim)]">
        ◈ {card.label}
      </p>
      <p className="text-sm leading-relaxed text-[var(--color-text)]">“{card.quote}”</p>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={copyCard}
          className="rounded-full border border-[var(--color-border-subtle)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)] hover:border-[var(--color-copper-dim)] hover:text-[var(--color-copper)]"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={shareCard}
          className="rounded-full border border-[var(--color-electric)]/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-electric)] hover:border-[var(--color-electric)]"
        >
          Share
        </button>
      </div>
    </aside>
  );
}
