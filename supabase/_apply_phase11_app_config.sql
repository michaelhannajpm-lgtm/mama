-- Phase 11: Application Configuration — richer app_config schema + JSON lookups.
-- Apply via Supabase MCP / SQL editor. Idempotent (safe to re-run).
--
-- Extends the existing app_config key/value store (created in
-- _apply_phase7_top_places.sql) with category grouping, human descriptions,
-- a value_type tag, and client-cache controls. Adds two runtime-cache meta
-- rows and migrates several hardcoded src/data/*.js lookups into editable
-- jsonb so they can be managed from the admin console without a deploy.

-- 1. New columns (additive — existing key/value/updated_at unchanged, so the
--    live /api/config and /api/admin/config keep working untouched).
alter table public.app_config
  add column if not exists category         text,
  add column if not exists description       text,
  add column if not exists value_type        text not null default 'json',  -- 'number'|'boolean'|'json'|'string'
  add column if not exists client_cacheable  boolean not null default true,
  add column if not exists cache_ttl_seconds integer,                        -- per-row TTL (null = use global)
  add column if not exists created_at        timestamptz not null default now();

-- 2. Backfill category / description / value_type for the 8 scalar knobs that
--    already exist. (No-ops where a row is absent; seeded below if missing.)
update public.app_config set category = 'Discovery & matching', value_type = 'number',
  description = 'Fallback radius (miles) for the Top Spots section when a user has not set their own.'
  where key = 'default_places_radius_miles';
update public.app_config set category = 'Discovery & matching', value_type = 'boolean',
  description = 'When on, new users see only verified moms in nearby discovery until they change the filter.'
  where key = 'default_verified_only_discovery';
update public.app_config set category = 'Presence', value_type = 'number',
  description = 'How recent a mom''s last activity must be (seconds) to show as online.'
  where key = 'presence_online_max_seconds';
update public.app_config set category = 'Presence', value_type = 'number',
  description = 'How recent a mom''s last activity must be (seconds) to show as away rather than offline.'
  where key = 'presence_away_max_seconds';
update public.app_config set category = 'Trust & safety', value_type = 'boolean',
  description = 'When on, the Verified badge also requires a linked social account (the verified-only moat).'
  where key = 'verified_requires_social';
update public.app_config set category = 'Monetization', value_type = 'number',
  description = 'Messages a free mom can send each match before Plus is required. Protected lever — default 3.'
  where key = 'dm_free_message_limit';
update public.app_config set category = 'Monetization', value_type = 'number',
  description = 'Go Mama Plus monthly price in USD shown on upsell screens. Display only — no real billing.'
  where key = 'plus_price_monthly';
update public.app_config set category = 'Monetization', value_type = 'number',
  description = 'Go Mama Plus free-trial length in days.'
  where key = 'plus_trial_days';

-- 3. Seed scalar defaults that were defined in the API validators but never
--    inserted (so they show in the editor with sane starting values).
insert into public.app_config (key, value, category, value_type, description) values
  ('default_verified_only_discovery', 'true'::jsonb, 'Discovery & matching', 'boolean',
   'When on, new users see only verified moms in nearby discovery until they change the filter.'),
  ('verified_requires_social', 'true'::jsonb, 'Trust & safety', 'boolean',
   'When on, the Verified badge also requires a linked social account (the verified-only moat).'),
  ('dm_free_message_limit', '3'::jsonb, 'Monetization', 'number',
   'Messages a free mom can send each match before Plus is required. Protected lever — default 3.'),
  ('plus_price_monthly', '7.99'::jsonb, 'Monetization', 'number',
   'Go Mama Plus monthly price in USD shown on upsell screens. Display only — no real billing.'),
  ('plus_trial_days', '7'::jsonb, 'Monetization', 'number',
   'Go Mama Plus free-trial length in days.')
on conflict (key) do nothing;

-- 4. Runtime-cache meta. These control the client-side runtime config cache:
--    the app re-syncs config from this table every runtime_cache_ttl_seconds,
--    so edits here reach live clients without a reload. runtime_cache_expires
--    is the master switch — set false to make the client cache sticky (no
--    interval re-sync, no TTL expiry) until manually invalidated.
insert into public.app_config (key, value, category, value_type, description, client_cacheable) values
  ('runtime_cache_ttl_seconds', '300'::jsonb, 'Runtime cache', 'number',
   'How often (seconds) the app re-syncs configuration from the database. Lower = edits propagate faster.', true),
  ('runtime_cache_expires', 'true'::jsonb, 'Runtime cache', 'boolean',
   'Master switch for client-side config caching. When off, the cache is sticky until manually refreshed.', true)
on conflict (key) do nothing;

-- 5. JSON lookups migrated verbatim from src/data/*.js so DB == current app
--    behavior on day one. Editable in the admin JSON editor; consumed at
--    runtime with the static array as a fallback (data/* stays as the default).
insert into public.app_config (key, value, category, value_type, description) values
  ('family_values',
   '[{"label":"Gentle parenting","emoji":"🌱"},{"label":"Outdoors","emoji":"🌳"},{"label":"Education-focused","emoji":"📚"},{"label":"Faith-based","emoji":"🙏"},{"label":"Multilingual home","emoji":"💬"},{"label":"Adventure","emoji":"🧭"},{"label":"Creativity","emoji":"🎨"},{"label":"Honest communication","emoji":"🗣️"},{"label":"Play-based learning","emoji":"🧩"},{"label":"Community involvement","emoji":"🤝"}]'::jsonb,
   'Taxonomy & vocabulary', 'json',
   'Family "values" picker options (onboarding + profile). Shared matching vocabulary — label strings must stay stable.'),
  ('activities',
   '[{"label":"Coffee meetups","emoji":"☕"},{"label":"Playground visits","emoji":"🛝"},{"label":"Stroller walks","emoji":"🚶"},{"label":"Arts & crafts","emoji":"🎨"},{"label":"Library visits","emoji":"📚"},{"label":"Music activities","emoji":"🎵"},{"label":"Beach days","emoji":"🏖️"},{"label":"Pool & swim","emoji":"🏊"},{"label":"Zoo trips","emoji":"🦁"},{"label":"Farmers markets","emoji":"🧺"},{"label":"Bike rides","emoji":"🚲"},{"label":"Theme parks","emoji":"🎡"},{"label":"Fitness","emoji":"🏋️"},{"label":"Weekend outings","emoji":"🗓️"}]'::jsonb,
   'Taxonomy & vocabulary', 'json',
   'Activities/interests picker options. Shared matching vocabulary — keep an even count for the 2-up grid.'),
  ('mom_describes',
   '[{"id":"working","emoji":"💼","label":"Working Mom","sub":"Balancing career"},{"id":"sahm","emoji":"🏠","label":"Stay at home","sub":"Home with kids"},{"id":"solo","emoji":"💪","label":"Solo Mom","sub":"Single parent"},{"id":"multicultural","emoji":"🌎","label":"Multicultural","sub":"Diverse background"},{"id":"fighter","emoji":"🦁","label":"Fighter mom","sub":"Special care kids"},{"id":"prefer_not","emoji":"🤐","label":"Prefer not to say","sub":null}]'::jsonb,
   'Taxonomy & vocabulary', 'json',
   '"What describes you?" options in onboarding. id must match a MOM_TYPES id so selections persist consistently.'),
  ('kid_ages',
   '["0–1","1–3","3–5","5–8","8–12","12–18"]'::jsonb,
   'Taxonomy & vocabulary', 'json',
   'Kid age buckets used across onboarding, profiles, and matching.'),
  ('kid_stage',
   '{"0–1":"baby","1–3":"toddler","3–5":"preschooler","5–8":"big kid","8–12":"tween","12–18":"teen"}'::jsonb,
   'Taxonomy & vocabulary', 'json',
   'Friendly life-stage noun per kid-age bucket (e.g. "Mom of a toddler"). Keys must match kid_ages.'),
  ('time_windows',
   '[{"id":"morning","label":"6 AM–12 PM","emoji":"☀️"},{"id":"noon","label":"12–2 PM","emoji":"🌞"},{"id":"afternoon","label":"2–5 PM","emoji":"🌤️"},{"id":"night-owl","label":"5 PM+","emoji":"🦉"}]'::jsonb,
   'Taxonomy & vocabulary', 'json',
   'Availability time-of-day windows. id is persisted, so changing an id orphans existing selections.')
on conflict (key) do nothing;

-- RLS already enabled (service-role only) and the app_config_updated_at trigger
-- already maintains updated_at — both inherited from _apply_phase7_top_places.sql.
