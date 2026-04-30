import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  JOURNAL_ENCRYPTION_MISSING_KEY,
  createSecureJournalEntry,
  insertSecureJournalMessage,
  listSecureJournalEntries,
  listSecureJournalMessages,
  updateSecureJournalMessageContent,
} from '../secure-store';

type EntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  created_at: string;
  entry_text_encrypted: string;
};

type MessageRow = {
  id: string;
  entry_id: string;
  role: string;
  created_at: string;
  content_encrypted: string;
};

function encrypt(text: string) {
  return `enc::${Buffer.from(text, 'utf8').toString('base64')}`;
}

function decrypt(ciphertext: string) {
  return Buffer.from(ciphertext.replace(/^enc::/, ''), 'base64').toString('utf8');
}

function createFakeRpcClient(options?: { keyMissing?: boolean }) {
  const entries: EntryRow[] = [];
  const messages: MessageRow[] = [];
  let entrySeq = 0;
  let messageSeq = 0;

  const maybeError = () => options?.keyMissing
    ? { message: 'vault secret "journal-content-encryption-key" is missing' }
    : null;

  const client = {
    rpc(fn: string, args?: Record<string, unknown>) {
      const error = maybeError();

      if (fn === 'journal_create_entry') {
        return {
          async single() {
            if (error) return { data: null, error };
            entrySeq += 1;
            entries.push({
              id: `entry-${entrySeq}`,
              user_id: String(args?.p_user_id),
              entry_date: String(args?.p_entry_date),
              created_at: '2026-04-28T16:00:00.000Z',
              entry_text_encrypted: encrypt(String(args?.p_entry_text ?? '')),
            });
            return { data: { id: `entry-${entrySeq}` }, error: null };
          },
        };
      }

      if (fn === 'journal_list_entries') {
        if (error) return Promise.resolve({ data: null, error });
        const rows = entries
          .filter((row) => row.user_id === String(args?.p_user_id))
          .slice(0, Number(args?.p_limit ?? 7))
          .map((row) => ({
            id: row.id,
            user_id: row.user_id,
            entry_date: row.entry_date,
            created_at: row.created_at,
            entry_text: decrypt(row.entry_text_encrypted),
          }));
        return Promise.resolve({ data: rows, error: null });
      }

      if (fn === 'journal_insert_message') {
        return {
          async single() {
            if (error) return { data: null, error };
            messageSeq += 1;
            messages.push({
              id: `message-${messageSeq}`,
              entry_id: String(args?.p_entry_id),
              role: String(args?.p_role),
              created_at: '2026-04-28T16:01:00.000Z',
              content_encrypted: encrypt(String(args?.p_content ?? '')),
            });
            return { data: { id: `message-${messageSeq}` }, error: null };
          },
        };
      }

      if (fn === 'journal_list_messages') {
        if (error) return Promise.resolve({ data: null, error });
        const rows = messages
          .filter((row) => row.entry_id === String(args?.p_entry_id))
          .map((row) => ({
            id: row.id,
            entry_id: row.entry_id,
            role: row.role,
            created_at: row.created_at,
            content: decrypt(row.content_encrypted),
          }));
        return Promise.resolve({ data: rows, error: null });
      }

      if (fn === 'journal_update_message_content') {
        return {
          async single() {
            if (error) return { data: null, error };
            const target = messages.find((row) => row.id === String(args?.p_message_id));
            if (!target) return { data: null, error: { message: 'not found' } };
            target.content_encrypted = encrypt(String(args?.p_content ?? ''));
            return { data: { id: target.id }, error: null };
          },
        };
      }

      throw new Error(`Unexpected RPC ${fn}`);
    },
  };

  return { client, entries, messages };
}

describe('secure journal store', () => {
  it('round-trips journal entries and messages through the encrypted RPC facade', async () => {
    const { client, entries, messages } = createFakeRpcClient();

    const entry = await createSecureJournalEntry(client, {
      userId: 'user-1',
      entryDate: '2026-04-28',
      entryText: 'I feel lighter after finally writing this down.',
    });

    await insertSecureJournalMessage(client, {
      entryId: entry.id,
      role: 'user',
      content: 'My journal entry:\nI feel lighter after finally writing this down.',
    });

    const audit = await insertSecureJournalMessage(client, {
      entryId: entry.id,
      role: 'assistant',
      content: '[MEMORY_AUDIT]\n{"ok":true}',
    });

    await updateSecureJournalMessageContent(client, {
      messageId: audit.id,
      content: '[MEMORY_AUDIT_FINAL]\n{"responseLength":42}',
    });

    const listedEntries = await listSecureJournalEntries(client, { userId: 'user-1' });
    const listedMessages = await listSecureJournalMessages(client, { entryId: entry.id });

    expect(listedEntries[0]?.entry_text).toBe('I feel lighter after finally writing this down.');
    expect(listedMessages.map((row) => row.content)).toEqual([
      'My journal entry:\nI feel lighter after finally writing this down.',
      '[MEMORY_AUDIT_FINAL]\n{"responseLength":42}',
    ]);

    expect(entries[0]?.entry_text_encrypted).not.toContain('I feel lighter after finally writing this down.');
    expect(messages[0]?.content_encrypted).not.toContain('My journal entry');
    expect(messages[1]?.content_encrypted).not.toContain('responseLength');
  });

  it('surfaces a clear missing-key failure path', async () => {
    const { client } = createFakeRpcClient({ keyMissing: true });

    await expect(createSecureJournalEntry(client, {
      userId: 'user-1',
      entryDate: '2026-04-28',
      entryText: 'hello',
    })).rejects.toMatchObject({ name: JOURNAL_ENCRYPTION_MISSING_KEY });

    await expect(listSecureJournalEntries(client, {
      userId: 'user-1',
    })).rejects.toMatchObject({ name: JOURNAL_ENCRYPTION_MISSING_KEY });
  });

  it('writes a migration that removes plaintext journal columns and uses Vault-backed pgcrypto', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260428_journal_encryption_at_rest.sql'),
      'utf8',
    );

    expect(migration).toContain("create extension if not exists supabase_vault cascade;");
    expect(migration).toContain("create extension if not exists pgcrypto with schema extensions;");
    expect(migration).toContain("vault.decrypted_secrets");
    expect(migration).toContain("extensions.pgp_sym_encrypt");
    expect(migration).toContain("extensions.pgp_sym_decrypt");
    expect(migration).toContain("alter table public.journal_entries drop column if exists entry_text;");
    expect(migration).toContain("alter table public.journal_messages drop column if exists content;");
    expect(migration).toContain("alter table public.journal_reflections drop column if exists ai_response;");
  });
});
