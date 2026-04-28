begin;

create extension if not exists supabase_vault cascade;
create schema if not exists private;

create or replace function private.require_journal_encryption_key()
returns text
language plpgsql
security definer
set search_path = vault, public, pg_catalog
as $$
declare
  secret_value text;
begin
  select ds.decrypted_secret
    into secret_value
    from vault.decrypted_secrets ds
   where ds.name = 'journal-content-encryption-key'
   order by ds.updated_at desc nulls last, ds.created_at desc
   limit 1;

  if secret_value is null or btrim(secret_value) = '' then
    raise exception 'vault secret "journal-content-encryption-key" is missing';
  end if;

  return secret_value;
end;
$$;

revoke all on function private.require_journal_encryption_key() from public;

do $$
begin
  alter table public.journal_entries add column if not exists entry_text_encrypted bytea;
  alter table public.journal_messages add column if not exists content_encrypted bytea;
  alter table public.journal_reflections add column if not exists ai_response_encrypted bytea;

  update public.journal_entries
     set entry_text_encrypted = pgp_sym_encrypt(entry_text, private.require_journal_encryption_key())
   where entry_text_encrypted is null
     and entry_text is not null;

  update public.journal_messages
     set content_encrypted = pgp_sym_encrypt(content, private.require_journal_encryption_key())
   where content_encrypted is null
     and content is not null;

  update public.journal_reflections
     set ai_response_encrypted = pgp_sym_encrypt(ai_response, private.require_journal_encryption_key())
   where ai_response_encrypted is null
     and ai_response is not null;

  alter table public.journal_entries alter column entry_text_encrypted set not null;
  alter table public.journal_messages alter column content_encrypted set not null;
  alter table public.journal_reflections alter column ai_response_encrypted set not null;

  alter table public.journal_entries drop column if exists entry_text;
  alter table public.journal_messages drop column if exists content;
  alter table public.journal_reflections drop column if exists ai_response;
end;
$$;

create or replace function public.journal_create_entry(
  p_user_id uuid,
  p_entry_text text,
  p_entry_date date
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, private, vault, pg_catalog
as $$
begin
  if p_entry_text is null or btrim(p_entry_text) = '' then
    raise exception 'journal entry text is required';
  end if;

  return query
  insert into public.journal_entries (user_id, entry_date, entry_text_encrypted)
  values (p_user_id, p_entry_date, pgp_sym_encrypt(p_entry_text, private.require_journal_encryption_key()))
  returning journal_entries.id;
end;
$$;

create or replace function public.journal_list_entries(
  p_user_id uuid,
  p_limit integer default 7
)
returns table (
  id uuid,
  user_id uuid,
  entry_date date,
  created_at timestamptz,
  entry_text text
)
language sql
security definer
set search_path = public, private, vault, pg_catalog
as $$
  select
    je.id,
    je.user_id,
    je.entry_date,
    je.created_at,
    pgp_sym_decrypt(je.entry_text_encrypted, private.require_journal_encryption_key()) as entry_text
  from public.journal_entries je
  where je.user_id = p_user_id
  order by je.entry_date desc, je.created_at desc
  limit greatest(coalesce(p_limit, 7), 1);
$$;

create or replace function public.journal_insert_message(
  p_entry_id uuid,
  p_role text,
  p_content text
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, private, vault, pg_catalog
as $$
begin
  if p_content is null or btrim(p_content) = '' then
    raise exception 'journal message content is required';
  end if;

  return query
  insert into public.journal_messages (entry_id, role, content_encrypted)
  values (p_entry_id, p_role, pgp_sym_encrypt(p_content, private.require_journal_encryption_key()))
  returning journal_messages.id;
end;
$$;

create or replace function public.journal_list_messages(
  p_entry_id uuid
)
returns table (
  id uuid,
  entry_id uuid,
  role text,
  content text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, private, vault, pg_catalog
as $$
  select
    jm.id,
    jm.entry_id,
    jm.role,
    pgp_sym_decrypt(jm.content_encrypted, private.require_journal_encryption_key()) as content,
    jm.created_at
  from public.journal_messages jm
  where jm.entry_id = p_entry_id
  order by jm.created_at asc;
$$;

create or replace function public.journal_update_message_content(
  p_message_id uuid,
  p_content text
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, private, vault, pg_catalog
as $$
begin
  if p_content is null or btrim(p_content) = '' then
    raise exception 'journal message content is required';
  end if;

  return query
  update public.journal_messages
     set content_encrypted = pgp_sym_encrypt(p_content, private.require_journal_encryption_key())
   where journal_messages.id = p_message_id
  returning journal_messages.id;
end;
$$;

revoke all on function public.journal_create_entry(uuid, text, date) from public;
revoke all on function public.journal_list_entries(uuid, integer) from public;
revoke all on function public.journal_insert_message(uuid, text, text) from public;
revoke all on function public.journal_list_messages(uuid) from public;
revoke all on function public.journal_update_message_content(uuid, text) from public;

grant execute on function public.journal_create_entry(uuid, text, date) to service_role;
grant execute on function public.journal_list_entries(uuid, integer) to service_role;
grant execute on function public.journal_insert_message(uuid, text, text) to service_role;
grant execute on function public.journal_list_messages(uuid) to service_role;
grant execute on function public.journal_update_message_content(uuid, text) to service_role;

commit;
