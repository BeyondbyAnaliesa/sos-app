import { describe, expect, it } from 'vitest';

import { shouldUseJournalStarterFastPath } from '@/lib/journal/chat-path';

describe('shouldUseJournalStarterFastPath', () => {
  it('uses the fast path for a fresh starter entry', () => {
    expect(shouldUseJournalStarterFastPath({ entryText: 'What should I be paying attention to right now?' })).toBe(true);
  });

  it('does not use the fast path for follow-up chat messages', () => {
    expect(shouldUseJournalStarterFastPath({ message: 'Go deeper on that.' })).toBe(false);
  });

  it('does not use the fast path when both entry text and a follow-up message are present', () => {
    expect(shouldUseJournalStarterFastPath({ entryText: 'today was weird', message: 'help me unpack it' })).toBe(false);
  });
});
