'use client';

import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import UnlockCTA from '@/components/UnlockCTA';
import AppBackLink from '@/components/AppBackLink';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AeonUsageStatus {
  paid: boolean;
  monthKey: string;
  firstTouchMonthKey: string | null;
  monthlyTurnsUsed: number;
  onboardingBonusTurnsUsed: number;
  monthlyTurnsRemaining: number;
  onboardingBonusTurnsRemaining: number;
  totalTurnsRemaining: number;
}

const TODAY = new Date().toLocaleDateString('en-US', {
  weekday: 'long',
  year:    'numeric',
  month:   'long',
  day:     'numeric',
});

const PROMPTS = [
  'What is taking up the most space in my mind right now?',
  'Something shifted today and I want to name it.',
  'I need to think out loud about a decision.',
  'What should I be paying attention to right now?',
];

function buildAeonOpening(headline: string | null, context: string | null, starters: string[]) {
  const safeHeadline = headline?.trim() || 'I found a thread in your chart worth starting with.';
  const safeContext = context?.trim() || 'I read your chart and what you shared. There is something live here that we can work with together.';
  const firstStarter = starters[0]?.trim();

  return `${safeHeadline}\n\n${safeContext}\n\n${firstStarter ? `If you want a place to begin, start here: ${firstStarter}` : 'We can start anywhere, but this is the first thread I’d pull.'}`;
}

function describeUsage(usage: AeonUsageStatus | null) {
  if (!usage) return null;
  if (usage.paid) {
    return {
      eyebrow: 'Unlimited with Aeon',
      body: 'You have full access to keep going as deep as you want.',
      locked: false,
    };
  }

  if (usage.totalTurnsRemaining <= 0) {
    return {
      eyebrow: 'You’ve used your free Aeon conversations for now.',
      body: 'Upgrade to keep going deeper with Aeon and let it work with your full history.',
      locked: true,
    };
  }

  if (usage.onboardingBonusTurnsRemaining > 0) {
    return {
      eyebrow: `${usage.totalTurnsRemaining} free Aeon conversations left`,
      body: `${usage.onboardingBonusTurnsRemaining} onboarding bonus ${usage.onboardingBonusTurnsRemaining === 1 ? 'conversation is' : 'conversations are'} still live, plus ${usage.monthlyTurnsRemaining} monthly ${usage.monthlyTurnsRemaining === 1 ? 'conversation' : 'conversations'} after that.`,
      locked: false,
    };
  }

  return {
    eyebrow: `${usage.monthlyTurnsRemaining} free Aeon conversations left this month`,
    body: 'Use them on what feels most alive. Upgrade when you want unlimited depth.',
    locked: false,
  };
}

function JournalPageInner() {
  const searchParams = useSearchParams();
  const [entryId, setEntryId]       = useState<string | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [streaming, setStreaming]   = useState(false);
  const [journalSubmitted, setJournalSubmitted] = useState(false);
  const [usage, setUsage] = useState<AeonUsageStatus | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const seededStarters = searchParams.getAll('starter').filter(Boolean);
  const seededHeadline = searchParams.get('headline');
  const seededContext = searchParams.get('context');
  const fromOnboarding = searchParams.get('source') === 'onboarding';
  const usageSummary = describeUsage(usage);
  const blocked = Boolean(usageSummary?.locked) && !streaming;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function refreshUsage() {
    try {
      const res = await fetch('/api/journal/usage', { cache: 'no-store' });
      if (!res.ok) throw new Error('Unable to load Aeon usage');
      const data = await res.json();
      setUsage(data.usage ?? null);
      setUsageError(null);
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : 'Unable to load Aeon usage');
    }
  }

  useEffect(() => {
    refreshUsage();
  }, []);

  useEffect(() => {
    if (!fromOnboarding || journalSubmitted || messages.length > 0) return;

    setJournalSubmitted(true);
    setMessages([{ role: 'assistant', content: buildAeonOpening(seededHeadline, seededContext, seededStarters) }]);
  }, [fromOnboarding, journalSubmitted, messages.length, seededHeadline, seededContext, seededStarters]);

  async function streamResponse(body: Record<string, string>) {
    setStreaming(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/journal/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: err || 'Something went wrong.' };
          return updated;
        });
        setStreaming(false);
        await refreshUsage();
        return;
      }

      const newEntryId = res.headers.get('X-Entry-Id');
      if (newEntryId) setEntryId(newEntryId);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, content: last.content + text };
          return updated;
        });
      }

      await refreshUsage();
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: 'Connection lost. Try again.' };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  async function handleJournalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming || blocked) return;

    const text = input.trim();
    setInput('');
    setJournalSubmitted(true);
    setMessages([{ role: 'user', content: text }]);

    await streamResponse({ entryText: text });
  }

  async function handlePromptSelect(prompt: string) {
    if (streaming || blocked) return;
    setInput('');
    setJournalSubmitted(true);
    setMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    await streamResponse({ entryText: prompt });
  }

  async function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming || blocked) return;
    if (!entryId) {
      setFollowUpError('Something went wrong — start a new conversation to continue.');
      return;
    }

    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    await streamResponse({ entryId, message: text });
  }

  return (
    <main
      className="mx-auto flex w-full max-w-xl animate-[fade-in_0.35s_ease-out] flex-col px-5 pt-10"
      style={{ minHeight: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {!journalSubmitted && (
        <div className="flex flex-1 flex-col pb-24">
          <AppBackLink />
          <header className="mb-8 text-center">
            <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
            <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
              Chat with Aeon
            </h1>
            <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              {TODAY}
            </p>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
          </header>

          {usageSummary && (
            <div className={`mb-6 rounded-[10px] border px-5 py-4 ${usageSummary.locked ? 'border-[var(--color-electric)] bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(239,68,136,0.02))]' : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)]'}`}>
              <p className={`text-[10px] font-medium uppercase tracking-[0.25em] ${usageSummary.locked ? 'text-[var(--color-electric)]' : 'text-[var(--color-copper)]'}`}>
                {usageSummary.eyebrow}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">
                {usageSummary.body}
              </p>
              {usageSummary.locked && (
                <div className="mt-4">
                  <UnlockCTA label="Go deeper with Aeon" />
                </div>
              )}
            </div>
          )}

          <div className="mb-8 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4">
            <p className="text-sm leading-relaxed text-[var(--color-text)]">
              Aeon is here to help you work with what is active in your chart and your life. Bring the real thing — it will meet you there.
            </p>
          </div>

          <div className="mb-6 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              Start here
            </p>
            {(seededStarters.length ? seededStarters : PROMPTS).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePromptSelect(prompt)}
                disabled={blocked}
                className="w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4 text-left text-sm text-[var(--color-text)] opacity-80 hover:border-[var(--color-border)] hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {prompt}
              </button>
            ))}
          </div>

          <div>
            <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              Or write freely
            </p>
            <form onSubmit={handleJournalSubmit}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={5}
                placeholder="What happened today? What are you feeling?"
                disabled={blocked}
                className="w-full resize-none rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-5 py-4 text-base leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-40"
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!input.trim() || blocked}
                  className="h-[52px] rounded-[10px] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 text-xs font-medium uppercase tracking-widest text-[var(--color-copper)] hover:border-[var(--color-copper)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Talk to Aeon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {journalSubmitted && (
        <>
          <AppBackLink />
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
              ◆ Chat with Aeon
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{TODAY}</p>
          </div>

          {usageSummary && (
            <div className={`mb-5 rounded-[10px] border px-5 py-4 ${usageSummary.locked ? 'border-[var(--color-electric)] bg-[linear-gradient(180deg,rgba(239,68,136,0.08),rgba(239,68,136,0.02))]' : 'border-[var(--color-border-subtle)] bg-[var(--color-surface)]'}`}>
              <p className={`text-[10px] font-medium uppercase tracking-[0.25em] ${usageSummary.locked ? 'text-[var(--color-electric)]' : 'text-[var(--color-copper)]'}`}>
                {usageSummary.eyebrow}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text)]">
                {usageSummary.body}
              </p>
              {usageSummary.locked && (
                <div className="mt-4">
                  <UnlockCTA label="Upgrade for unlimited conversations" />
                </div>
              )}
            </div>
          )}

          {usageError && (
            <div className="mb-4 flex items-center gap-3">
              <p className="text-xs text-red-400">{usageError}</p>
              <button
                onClick={refreshUsage}
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex-1 space-y-6 pb-4">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.role === 'user' ? (
                  <div className="rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">
                      {msg.content}
                    </p>
                  </div>
                ) : (
                  <div className="px-1 py-2">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text)]">
                      {msg.content}
                      {streaming && i === messages.length - 1 && (
                        <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-[var(--color-copper)]" />
                      )}
                    </p>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {followUpError && (
              <p className="mb-3 text-xs text-red-400">{followUpError}</p>
            )}
          <form
            onSubmit={handleFollowUp}
            className="sticky bottom-[60px] border-t border-[var(--color-border-subtle)] bg-[var(--color-void)] pt-4 pb-4"
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setFollowUpError(null); }}
                disabled={streaming || blocked}
                placeholder={blocked ? 'Upgrade to keep going with Aeon' : 'Say something back...'}
                className="h-[52px] flex-1 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming || blocked}
                className="h-[52px] shrink-0 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </>
      )}
      <BottomNav />
    </main>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-xl animate-[fade-in_0.35s_ease-out] px-5 pb-24 pt-10 text-center text-sm text-[var(--color-text-muted)]">Loading Aeon…</main>}>
      <JournalPageInner />
    </Suspense>
  );
}
