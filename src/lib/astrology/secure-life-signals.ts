import { JOURNAL_ENCRYPTION_MISSING_KEY, normalizeJournalCryptoError } from '@/lib/journal/secure-store';
import type { LifeSignalRecord } from './memory-types';

type RpcSingleResult<T> = { data: T | null; error: { message?: string; code?: string } | null };
type RpcMultiResult<T> = { data: T[] | null; error: { message?: string; code?: string } | null };

type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => {
    single?: () => PromiseLike<RpcSingleResult<Record<string, unknown>>>;
    maybeSingle?: () => PromiseLike<RpcSingleResult<Record<string, unknown>>>;
  } | PromiseLike<RpcMultiResult<Record<string, unknown>>>;
};

export { JOURNAL_ENCRYPTION_MISSING_KEY };

export type SecureLifeSignal = {
  id: string;
  user_id: string;
  source: string;
  source_entry_id?: string | null;
  source_message_id?: string | null;
  source_index?: number | null;
  source_start?: number | null;
  source_end?: number | null;
  signal_timestamp: string;
  content_text?: string | null;
  content_json?: Record<string, unknown> | null;
  signal_kind: string;
  themes_json: string[];
  entities_json: string[];
  emotions_json: string[];
  life_domain?: string | null;
  privacy_class: string;
  status: string;
  active_transits_json: unknown[];
  metadata_json: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

function assertNoLifeSignalError(error: { message?: string; code?: string } | null, action: string) {
  const normalized = normalizeJournalCryptoError(error, action);
  if (normalized) throw normalized;
}

export async function createSecureLifeSignal(
  client: SupabaseRpcClient,
  signal: LifeSignalRecord,
): Promise<{ id: string }> {
  const rpc = client.rpc('life_signals_create', {
    p_user_id: signal.user_id,
    p_source: signal.source,
    p_source_entry_id: signal.source_entry_id ?? null,
    p_source_message_id: signal.source_message_id ?? null,
    p_source_index: signal.source_index ?? null,
    p_source_start: signal.source_start ?? null,
    p_source_end: signal.source_end ?? null,
    p_signal_timestamp: signal.signal_timestamp ?? null,
    p_content_text: signal.content_text ?? null,
    p_content_json: signal.content_json ?? null,
    p_signal_kind: signal.signal_kind,
    p_themes_json: signal.themes_json,
    p_entities_json: signal.entities_json,
    p_emotions_json: signal.emotions_json,
    p_life_domain: signal.life_domain ?? null,
    p_privacy_class: signal.privacy_class,
    p_status: signal.status,
    p_active_transits_json: signal.active_transits_json,
    p_metadata_json: signal.metadata_json,
  }) as { single: () => Promise<RpcSingleResult<{ id: string }>> };

  const { data, error } = await rpc.single();
  assertNoLifeSignalError(error, 'life signal creation');

  if (!data?.id) {
    throw new Error('Life signal creation returned no id');
  }

  return { id: data.id };
}

export async function listSecureLifeSignals(
  client: SupabaseRpcClient,
  params: { userId: string; limit?: number },
): Promise<SecureLifeSignal[]> {
  const result = await (client.rpc('life_signals_list', {
    p_user_id: params.userId,
    p_limit: params.limit ?? null,
  }) as Promise<RpcMultiResult<SecureLifeSignal>>);

  assertNoLifeSignalError(result.error, 'life signal listing');
  return result.data ?? [];
}
