-- Phase 2: structured geo capture from the neighborhood picker.
-- Idempotent. Apply to the live Supabase project (SQL editor or psql).

-- onboarding_profiles: keep `location` (display label) and add structured geo.
alter table public.onboarding_profiles
  add column if not exists location_place_id     text,
  add column if not exists location_city         text,
  add column if not exists location_neighborhood text,
  add column if not exists location_county       text,
  add column if not exists location_lat          numeric(9,6),
  add column if not exists location_lng          numeric(9,6);

-- mom_profiles: city / neighborhood / home_lat / home_lng already exist.
alter table public.mom_profiles
  add column if not exists place_id text,
  add column if not exists county   text;

comment on column public.mom_profiles.place_id is
  'External area/place id from the neighborhood picker (Tampa Bay dataset slug today, Google Places place_id later) — NOT a FK to public.places.';
