begin;

alter table public.journal_entries add column if not exists entry_text text;
alter table public.journal_messages add column if not exists content text;
alter table public.journal_reflections add column if not exists ai_response text;

update public.journal_entries
   set entry_text = pgp_sym_decrypt(entry_text_encrypted, private.require_journal_encryption_key())
 where entry_text is null
   and entry_text_encrypted is not null;

update public.journal_messages
   set content = pgp_sym_decrypt(content_encrypted, private.require_journal_encryption_key())
 where content is null
   and content_encrypted is not null;

update public.journal_reflections
   set ai_response = pgp_sym_decrypt(ai_response_encrypted, private.require_journal_encryption_key())
 where ai_response is null
   and ai_response_encrypted is not null;

alter table public.journal_entries drop column if exists entry_text_encrypted;
alter table public.journal_messages drop column if exists content_encrypted;
alter table public.journal_reflections drop column if exists ai_response_encrypted;

drop function if exists public.journal_update_message_content(uuid, text);
drop function if exists public.journal_list_messages(uuid);
drop function if exists public.journal_insert_message(uuid, text, text);
drop function if exists public.journal_list_entries(uuid, integer);
drop function if exists public.journal_create_entry(uuid, text, date);

drop function if exists private.require_journal_encryption_key();

commit;
