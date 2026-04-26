create table if not exists public.journal_messages (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.journal_entries(id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_journal_messages_entry_created
  on public.journal_messages (entry_id, created_at asc);

alter table public.journal_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'journal_messages' and policyname = 'journal_messages_owner_all'
  ) then
    create policy journal_messages_owner_all on public.journal_messages
      for all
      using (
        exists (
          select 1
          from public.journal_entries je
          where je.id = entry_id and je.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.journal_entries je
          where je.id = entry_id and je.user_id = auth.uid()
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'journal_messages' and policyname = 'journal_messages_service_all'
  ) then
    create policy journal_messages_service_all on public.journal_messages
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;
