'use client';

import { useState, useRef, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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

export default function JournalPage() {
  const [entryId, setEntryId]       = useState<string | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [streaming, setStreaming]   = useState(false);
  const [journalSubmitted, setJournalSubmitted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

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
          updated[updated.length - 1] = { role: 'assistant', content: `Something went wrong: ${err}` };
          return updated;
        });
        setStreaming(false);
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
    if (!input.trim() || streaming) return;

    const text = input.trim();
    setInput('');
    setJournalSubmitted(true);
    setMessages([{ role: 'user', content: text }]);

    await streamResponse({ entryText: text });
  }

  async function handlePromptSelect(prompt: string) {
    if (streaming) return;
    setInput('');
    setJournalSubmitted(true);
    setMessages([{ role: 'user', content: prompt }]);
    await streamResponse({ entryText: prompt });
  }

  async function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming || !entryId) return;

    const text = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);

    await streamResponse({ entryId, message: text });
  }

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-col px-5 pt-10"
      style={{ minHeight: '100dvh', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Journal Entry Form (before submission) */}
      {!journalSubmitted && (
        <div className="flex flex-1 flex-col pb-24">
          {/* Header */}
          <header className="mb-8 text-center">
            <div className="mx-auto mb-6 h-px w-12 bg-gradient-to-r from-transparent via-[var(--color-copper-dim)] to-transparent" />
            <h1 className="text-3xl font-light tracking-[0.15em] text-[var(--color-text)]">
              Companion
            </h1>
            <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              {TODAY}
            </p>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent" />
          </header>

          {/* Welcome */}
          <div className="mb-8">
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              SOS remembers what you&apos;ve shared before. Write what&apos;s real today - it will meet you where you are.
            </p>
          </div>

          {/* Quick prompts */}
          <div className="mb-6 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--color-text-muted)]">
              Start here
            </p>
            {PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePromptSelect(prompt)}
                className="w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5 py-4 text-left text-sm text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Or write freely */}
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
                className="w-full resize-none rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-5 py-4 text-base leading-relaxed text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none"
              />
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="h-[52px] rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-6 text-xs font-medium uppercase tracking-widest text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reflect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Chat Thread (after submission) */}
      {journalSubmitted && (
        <>
          {/* Compact header in chat mode */}
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-copper)]">
              ◆ Companion
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{TODAY}</p>
          </div>

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

          {/* Follow-up input */}
          <form
            onSubmit={handleFollowUp}
            className="sticky bottom-[60px] border-t border-[var(--color-border-subtle)] bg-[var(--color-void)] pt-4 pb-4"
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={streaming}
                placeholder="Say something back..."
                className="h-[52px] flex-1 rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-input)] px-4 text-base text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border)] focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
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
