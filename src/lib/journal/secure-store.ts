type RpcSingleResult<T> = { data: T | null; error: { message?: string; code?: string } | null };
type RpcMultiResult<T> = { data: T[] | null; error: { message?: string; code?: string } | null };

type SupabaseRpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => {
    single?: () => PromiseLike<RpcSingleResult<Record<string, unknown>>>;
    maybeSingle?: () => PromiseLike<RpcSingleResult<Record<string, unknown>>>;
  } | PromiseLike<RpcMultiResult<Record<string, unknown>>>;
};

export type SecureJournalEntry = {
  id: string;
  user_id?: string;
  entry_date: string;
  created_at?: string;
  entry_text: string;
};

export type SecureJournalMessage = {
  id: string;
  entry_id: string;
  role: string;
  content: string;
  created_at?: string;
};

export const JOURNAL_ENCRYPTION_MISSING_KEY = 'JOURNAL_ENCRYPTION_MISSING_KEY';

export function normalizeJournalCryptoError(error: { message?: string; code?: string } | null, action: string): Error | null {
  if (!error) return null;

  const message = error.message ?? 'Unknown journal encryption error';
  if (message.includes('journal-content-encryption-key')) {
    const wrapped = new Error(`Journal encryption is not configured for ${action}.`);
    wrapped.name = JOURNAL_ENCRYPTION_MISSING_KEY;
    return wrapped;
  }

  return new Error(message);
}

function assertNoJournalError(error: { message?: string; code?: string } | null, action: string) {
  const normalized = normalizeJournalCryptoError(error, action);
  if (normalized) throw normalized;
}

export async function createSecureJournalEntry(
  client: SupabaseRpcClient,
  params: { userId: string; entryText: string; entryDate: string },
): Promise<{ id: string }> {
  const rpc = client.rpc('journal_create_entry', {
    p_user_id: params.userId,
    p_entry_text: params.entryText,
    p_entry_date: params.entryDate,
  }) as { single: () => Promise<RpcSingleResult<{ id: string }>> };

  const { data, error } = await rpc.single();
  assertNoJournalError(error, 'journal entry creation');

  if (!data?.id) {
    throw new Error('Journal entry creation returned no id');
  }

  return { id: data.id };
}

export async function listSecureJournalEntries(
  client: SupabaseRpcClient,
  params: { userId: string; limit?: number },
): Promise<SecureJournalEntry[]> {
  const result = await (client.rpc('journal_list_entries', {
    p_user_id: params.userId,
    p_limit: params.limit ?? 7,
  }) as Promise<RpcMultiResult<SecureJournalEntry>>);

  assertNoJournalError(result.error, 'journal entry listing');
  return result.data ?? [];
}

export async function listSecureJournalMessages(
  client: SupabaseRpcClient,
  params: { entryId: string },
): Promise<SecureJournalMessage[]> {
  const result = await (client.rpc('journal_list_messages', {
    p_entry_id: params.entryId,
  }) as Promise<RpcMultiResult<SecureJournalMessage>>);

  assertNoJournalError(result.error, 'journal message listing');
  return result.data ?? [];
}

export async function insertSecureJournalMessage(
  client: SupabaseRpcClient,
  params: { entryId: string; role: string; content: string },
): Promise<{ id: string }> {
  const rpc = client.rpc('journal_insert_message', {
    p_entry_id: params.entryId,
    p_role: params.role,
    p_content: params.content,
  }) as { single: () => Promise<RpcSingleResult<{ id: string }>> };

  const { data, error } = await rpc.single();
  assertNoJournalError(error, 'journal message insert');

  if (!data?.id) {
    throw new Error('Journal message insert returned no id');
  }

  return { id: data.id };
}

export async function updateSecureJournalMessageContent(
  client: SupabaseRpcClient,
  params: { messageId: string; content: string },
): Promise<void> {
  const rpc = client.rpc('journal_update_message_content', {
    p_message_id: params.messageId,
    p_content: params.content,
  }) as { single: () => Promise<RpcSingleResult<{ id: string }>> };

  const { data, error } = await rpc.single();
  assertNoJournalError(error, 'journal message update');

  if (!data?.id) {
    throw new Error('Journal message update returned no id');
  }
}
