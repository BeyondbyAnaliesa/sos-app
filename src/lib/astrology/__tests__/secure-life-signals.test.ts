import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  JOURNAL_ENCRYPTION_MISSING_KEY,
  createSecureLifeSignal,
  listSecureLifeSignals,
} from '../secure-life-signals';

type LifeSignalRow = {
  id: string;
  user_id: string;
  source: string;
  source_entry_id: string | null;
  source_message_id: string | null;
  source_index: number | null;
  source_start: number | null;
  source_end: number | null;
  signal_timestamp: string;
  content_text_encrypted: string | null;
  content_json: Record<string, unknown> | null;
  signal_kind: string;
  themes_json: string[];
  entities_json: string[];
  emotions_json: string[];
  life_domain: string | null;
  privacy_class: string;
  status: string;
  active_transits_json: unknown[];
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function encrypt(text: string) {
  return `enc::${Buffer.from(text, 'utf8').toString('base64')}`;
}

function decrypt(ciphertext: string) {
  return Buffer.from(ciphertext.replace(/^enc::/, ''), 'base64').toString('utf8');
}

function createFakeRpcClient(options?: { keyMissing?: boolean }) {
  const rows: LifeSignalRow[] = [];
  let seq = 0;

  const maybeError = () => options?.keyMissing
    ? { message: 'vault secret "journal-content-encryption-key" is missing' }
    : null;

  const client = {
    rpc(fn: string, args?: Record<string, unknown>) {
      const error = maybeError();

      if (fn === 'life_signals_create') {
        return {
          async single() {
            if (error) return { data: null, error };
            seq += 1;
            rows.push({
              id: `signal-${seq}`,
              user_id: String(args?.p_user_id),
              source: String(args?.p_source),
              source_entry_id: args?.p_source_entry_id as string | null,
              source_message_id: args?.p_source_message_id as string | null,
              source_index: (args?.p_source_index as number | null) ?? null,
              source_start: (args?.p_source_start as number | null) ?? null,
              source_end: (args?.p_source_end as number | null) ?? null,
              signal_timestamp: String(args?.p_signal_timestamp ?? '2026-04-28T16:00:00.000Z'),
              content_text_encrypted: args?.p_content_text == null ? null : encrypt(String(args?.p_content_text)),
              content_json: (args?.p_content_json as Record<string, unknown> | null) ?? null,
              signal_kind: String(args?.p_signal_kind),
              themes_json: (args?.p_themes_json as string[]) ?? [],
              entities_json: (args?.p_entities_json as string[]) ?? [],
              emotions_json: (args?.p_emotions_json as string[]) ?? [],
              life_domain: (args?.p_life_domain as string | null) ?? null,
              privacy_class: String(args?.p_privacy_class),
              status: String(args?.p_status),
              active_transits_json: (args?.p_active_transits_json as unknown[]) ?? [],
              metadata_json: (args?.p_metadata_json as Record<string, unknown>) ?? {},
              created_at: '2026-04-28T16:00:00.000Z',
              updated_at: '2026-04-28T16:00:00.000Z',
            });
            return { data: { id: `signal-${seq}` }, error: null };
          },
        };
      }

      if (fn === 'life_signals_list') {
        if (error) return Promise.resolve({ data: null, error });
        const limit = Number(args?.p_limit ?? rows.length);
        return Promise.resolve({
          data: rows
            .filter((row) => row.user_id === String(args?.p_user_id))
            .slice(0, limit)
            .map((row) => ({
              ...row,
              content_text: row.content_text_encrypted ? decrypt(row.content_text_encrypted) : null,
            })),
          error: null,
        });
      }

      throw new Error(`Unexpected RPC ${fn}`);
    },
  };

  return { client, rows };
}

describe('secure life signal store', () => {
  it('round-trips life signals through encrypted RPC helpers', async () => {
    const { client, rows } = createFakeRpcClient();

    await createSecureLifeSignal(client, {
      user_id: 'user-1',
      source: 'journal',
      source_entry_id: 'entry-1',
      source_index: 0,
      source_start: 0,
      source_end: 61,
      signal_timestamp: '2026-04-28T16:00:00.000Z',
      content_text: 'I keep circling the same loneliness before big conversations.',
      content_json: null,
      signal_kind: 'thought',
      themes_json: ['communication'],
      entities_json: ['conversation'],
      emotions_json: ['lonely'],
      life_domain: 'relationships',
      privacy_class: 'standard',
      status: 'open',
      active_transits_json: [],
      metadata_json: { source_anchor: { index: 0 } },
    });

    const listed = await listSecureLifeSignals(client, { userId: 'user-1', limit: 5 });

    expect(listed[0]?.content_text).toBe('I keep circling the same loneliness before big conversations.');
    expect(rows[0]?.content_text_encrypted).not.toContain('loneliness');
    expect(rows[0]?.content_text_encrypted).not.toContain('conversations');
  });

  it('surfaces a clear missing-key failure path', async () => {
    const { client } = createFakeRpcClient({ keyMissing: true });

    await expect(createSecureLifeSignal(client, {
      user_id: 'user-1',
      source: 'journal',
      signal_kind: 'thought',
      themes_json: [],
      entities_json: [],
      emotions_json: [],
      privacy_class: 'standard',
      status: 'open',
      active_transits_json: [],
      metadata_json: {},
      content_text: 'hello',
    })).rejects.toMatchObject({ name: JOURNAL_ENCRYPTION_MISSING_KEY });

    await expect(listSecureLifeSignals(client, { userId: 'user-1' })).rejects.toMatchObject({ name: JOURNAL_ENCRYPTION_MISSING_KEY });
  });

  it('writes a migration that removes plaintext life_signal content and exposes decrypted reads safely', () => {
    const migration = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20260428_life_signals_encryption_at_rest.sql'),
      'utf8',
    );

    expect(migration).toContain('alter table public.life_signals add column if not exists content_text_encrypted bytea;');
    expect(migration).toContain('extensions.pgp_sym_encrypt(content_text, private.require_journal_encryption_key())');
    expect(migration).toContain('extensions.pgp_sym_decrypt(life_signal.content_text_encrypted, private.require_journal_encryption_key())');
    expect(migration).toContain('alter table public.life_signals drop column if exists content_text;');
    expect(migration).toContain('create or replace function public.life_signals_create(');
    expect(migration).toContain('create or replace function public.life_signals_list(');
  });
});
