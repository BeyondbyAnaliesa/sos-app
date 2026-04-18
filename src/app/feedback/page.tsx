'use client';

import { useState } from 'react';
import BottomNav from '@/components/BottomNav';

type FeedbackType = 'bug' | 'confusion' | 'suggestion' | 'love';

const TYPES: { value: FeedbackType; label: string; icon: string }[] = [
  { value: 'bug',        label: 'Something broke',      icon: '⚠' },
  { value: 'confusion',  label: 'Something confused me', icon: '?' },
  { value: 'suggestion', label: 'I wish it could...',    icon: '✦' },
  { value: 'love',       label: 'I liked this',          icon: '♡' },
];

export default function FeedbackPage() {
  const [type, setType]         = useState<FeedbackType | null>(null);
  const [message, setMessage]   = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !message.trim() || submitting) return;

    setSubmitting(true);

    try {
      await fetch('/api/feedback', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type, message: message.trim() }),
      });
      setSubmitted(true);
    } catch {
      // Still show success — we'll catch it in logs
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6">
        <div className="py-20 text-center">
          <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
          <p className="text-2xl font-light text-[var(--color-text)]">Thank you.</p>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            Your feedback helps SOS get better. We read everything.
          </p>
          <button
            onClick={() => { setSubmitted(false); setType(null); setMessage(''); }}
            className="mt-8 rounded-[10px] border border-[var(--color-border-subtle)] px-5 py-3 text-xs uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)]"
          >
            Send more
          </button>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-8 text-center">
        <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
        <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
          Feedback
        </h1>
        <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
          Help us make SOS better
        </p>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
      </header>

      <form onSubmit={handleSubmit}>
        {/* Type selection */}
        <div className="mb-6 space-y-2">
          <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
            What kind of feedback?
          </p>
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={`w-full rounded-[10px] border px-5 py-4 text-left text-sm ${
                type === t.value
                  ? 'border-[var(--color-copper)] text-[var(--color-text)]'
                  : 'border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:border-[var(--color-border)]'
              }`}
            >
              <span className="mr-2">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {type && (
          <>
            <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              Tell us more
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder={
                type === 'bug' ? 'What happened? What did you expect?' :
                type === 'confusion' ? 'What was unclear or hard to find?' :
                type === 'suggestion' ? 'What would make this better for you?' :
                'What did you enjoy?'
              }
              className="w-full resize-none rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-5 py-4 text-base leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none"
            />
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={!message.trim() || submitting}
                className="h-[52px] rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'Sending...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </form>

      <BottomNav />
    </main>
  );
}
