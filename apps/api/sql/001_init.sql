create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists birth_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users(id) on delete cascade,
  birth_date date not null,
  birth_time time,
  time_unknown boolean not null default false,
  location_text text not null,
  normalized_location text not null,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists natal_charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references app_users(id) on delete cascade,
  chart_json jsonb not null,
  chart_embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
