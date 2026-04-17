'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

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
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-1.5 py-2 pr-4 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-copper)]"
        >
          <span>←</span>
          <span>Home</span>
        </Link>
        <p className="text-xs text-[var(--color-text-muted)]">{TODAY}</p>
      </div>

      {/* Journal Entry Form (before submission) */}
      {!journalSubmitted && (
        <div className="flex flex-1 flex-col justify-center pb-10">
          <h1 className="mb-2 text-2xl font-light tracking-wide text-[var(--color-text)]">
            Journal
          </h1>
          <p className="mb-6 text-sm text-[var(--color-text-muted)]">
            Write what&apos;s on your mind. SOS is listening.
          </p>
          <form onSubmit={handleJournalSubmit}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={7}
              placeholder="What happened today? What are you feeling? What's on your mind?"
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
      )}

      {/* Chat Thread (after submission) */}
      {journalSubmitted && (
        <>
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
            className="sticky bottom-0 border-t border-[var(--color-border-subtle)] bg-[var(--color-void)] pt-4"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={streaming}
                placeholder="Say something back…"
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
    </main>
  );
}
