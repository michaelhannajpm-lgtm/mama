-- Phase 9 — Mom presence (online / away / offline).
-- Heartbeat target on mom_profiles + admin-editable recency thresholds in
-- app_config. Status is DERIVED client-side from (now - last_seen_at) against
-- these thresholds; there is no stored status column to keep in sync. Apply once.

-- Heartbeat target: the browser updates this ~every 60s while the app is open.
alter table public.mom_profiles add column if not exists last_seen_at timestamptz;

-- Recency thresholds (seconds), editable from Admin → Config.
--   online  : age <= presence_online_max_seconds
--   away    : age <= presence_away_max_seconds
--   offline : older, or last_seen_at is null
insert into public.app_config (key, value) values
  ('presence_online_max_seconds', to_jsonb(300)),   -- 5 min
  ('presence_away_max_seconds',   to_jsonb(1800))   -- 30 min
on conflict (key) do nothing;
