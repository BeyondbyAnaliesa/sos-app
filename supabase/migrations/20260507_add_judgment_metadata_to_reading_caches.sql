alter table if exists public.daily_ai_readings
  add column if not exists judgment_metadata_json jsonb;

alter table if exists public.major_transit_readings
  add column if not exists judgment_metadata_json jsonb;
