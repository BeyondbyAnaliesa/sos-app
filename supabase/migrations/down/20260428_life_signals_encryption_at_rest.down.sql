begin;

alter table public.life_signals add column if not exists content_text text;

update public.life_signals
   set content_text = pgp_sym_decrypt(content_text_encrypted, private.require_journal_encryption_key())
 where content_text is null
   and content_text_encrypted is not null;

alter table public.life_signals drop column if exists content_text_encrypted;

drop function if exists public.life_signals_list(uuid, integer);
drop function if exists public.life_signals_create(uuid, text, uuid, uuid, integer, integer, integer, timestamptz, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, jsonb, jsonb);
drop function if exists public.content_text(public.life_signals);

commit;
