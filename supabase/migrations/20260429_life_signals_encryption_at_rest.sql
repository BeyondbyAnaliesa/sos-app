begin;

alter table public.life_signals add column if not exists content_text_encrypted bytea;

update public.life_signals
   set content_text_encrypted = extensions.pgp_sym_encrypt(content_text, private.require_journal_encryption_key())
 where content_text_encrypted is null
   and content_text is not null;

alter table public.life_signals drop column if exists content_text;

create or replace function public.content_text(life_signal public.life_signals)
returns text
language sql
stable
security definer
set search_path = public, private, vault, extensions, pg_catalog
as $$
  select case
    when life_signal.content_text_encrypted is null then null
    else extensions.pgp_sym_decrypt(life_signal.content_text_encrypted, private.require_journal_encryption_key())
  end;
$$;

create or replace function public.life_signals_create(
  p_user_id uuid,
  p_source text,
  p_source_entry_id uuid default null,
  p_source_message_id uuid default null,
  p_source_index integer default null,
  p_source_start integer default null,
  p_source_end integer default null,
  p_signal_timestamp timestamptz default null,
  p_content_text text default null,
  p_content_json jsonb default null,
  p_signal_kind text default 'mixed',
  p_themes_json jsonb default '[]'::jsonb,
  p_entities_json jsonb default '[]'::jsonb,
  p_emotions_json jsonb default '[]'::jsonb,
  p_life_domain text default null,
  p_privacy_class text default 'standard',
  p_status text default 'open',
  p_active_transits_json jsonb default '[]'::jsonb,
  p_metadata_json jsonb default '{}'::jsonb
)
returns table (id uuid)
language plpgsql
security definer
set search_path = public, private, vault, extensions, pg_catalog
as $$
begin
  return query
  insert into public.life_signals (
    user_id,
    source,
    source_entry_id,
    source_message_id,
    source_index,
    source_start,
    source_end,
    signal_timestamp,
    content_text_encrypted,
    content_json,
    signal_kind,
    themes_json,
    entities_json,
    emotions_json,
    life_domain,
    privacy_class,
    status,
    active_transits_json,
    metadata_json
  )
  values (
    p_user_id,
    p_source,
    p_source_entry_id,
    p_source_message_id,
    p_source_index,
    p_source_start,
    p_source_end,
    coalesce(p_signal_timestamp, now()),
    case
      when p_content_text is null then null
      else extensions.pgp_sym_encrypt(p_content_text, private.require_journal_encryption_key())
    end,
    p_content_json,
    p_signal_kind,
    coalesce(p_themes_json, '[]'::jsonb),
    coalesce(p_entities_json, '[]'::jsonb),
    coalesce(p_emotions_json, '[]'::jsonb),
    p_life_domain,
    p_privacy_class,
    p_status,
    coalesce(p_active_transits_json, '[]'::jsonb),
    coalesce(p_metadata_json, '{}'::jsonb)
  )
  returning life_signals.id;
end;
$$;

create or replace function public.life_signals_list(
  p_user_id uuid,
  p_limit integer default null
)
returns table (
  id uuid,
  user_id uuid,
  source text,
  source_entry_id uuid,
  source_message_id uuid,
  source_index integer,
  source_start integer,
  source_end integer,
  signal_timestamp timestamptz,
  content_text text,
  content_json jsonb,
  signal_kind text,
  themes_json jsonb,
  entities_json jsonb,
  emotions_json jsonb,
  life_domain text,
  privacy_class text,
  status text,
  active_transits_json jsonb,
  metadata_json jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, vault, extensions, pg_catalog
as $$
begin
  if auth.role() <> 'service_role' and auth.uid() is distinct from p_user_id then
    raise exception 'life signals can only be listed for the authenticated user';
  end if;

  return query
  select
    ls.id,
    ls.user_id,
    ls.source,
    ls.source_entry_id,
    ls.source_message_id,
    ls.source_index,
    ls.source_start,
    ls.source_end,
    ls.signal_timestamp,
    public.content_text(ls) as content_text,
    ls.content_json,
    ls.signal_kind,
    ls.themes_json,
    ls.entities_json,
    ls.emotions_json,
    ls.life_domain,
    ls.privacy_class,
    ls.status,
    ls.active_transits_json,
    ls.metadata_json,
    ls.created_at,
    ls.updated_at
  from public.life_signals ls
  where ls.user_id = p_user_id
  order by ls.signal_timestamp desc, ls.created_at desc
  limit case when p_limit is null then null else greatest(p_limit, 1) end;
end;
$$;

revoke all on function public.content_text(public.life_signals) from public;
revoke all on function public.life_signals_create(uuid, text, uuid, uuid, integer, integer, integer, timestamptz, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, jsonb, jsonb) from public;
revoke all on function public.life_signals_list(uuid, integer) from public;

grant execute on function public.content_text(public.life_signals) to authenticated, service_role;
grant execute on function public.life_signals_create(uuid, text, uuid, uuid, integer, integer, integer, timestamptz, text, jsonb, text, jsonb, jsonb, jsonb, text, text, text, jsonb, jsonb) to service_role;
grant execute on function public.life_signals_list(uuid, integer) to authenticated, service_role;

commit;
