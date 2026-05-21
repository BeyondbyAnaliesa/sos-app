alter table public.subscriptions
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

create index if not exists idx_subscriptions_price_status
  on public.subscriptions (price_id, status);
