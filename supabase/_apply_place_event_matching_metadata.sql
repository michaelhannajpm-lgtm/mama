-- ===========================================================================
-- Matching-algorithm metadata for places + events.
--
-- The admin Mom-profiles section surfaces a rich set of mom signals
-- (mom_types, values, interests, kid age ranges, neighborhoods). Place and
-- event rows previously only had `tags`, `good_for`, and `age_min/max`, which
-- doesn't carry enough structure for a discoverability-driven match. This
-- migration introduces explicit, taxonomy-aligned columns so the matcher can
-- score a (mom, place) or (mom, event) pair without inferring intent from
-- free-text tags.
--
-- New columns (idempotent: re-runnable):
--   kid_age_ranges   text[]      — uses the same buckets as mom.kids_ages keys
--                                 ('0–1','1–3','3–5','5–8','8–12','12–18')
--   value_tags       text[]      — family values it suits (FAMILY_VALUES labels)
--   interest_tags    text[]      — activities it supports (ACTIVITIES labels)
--   mom_type_fit     text[]      — best-fit mom types (MOM_TYPES ids)
--   neighborhoods    text[]      — additional neighborhoods served beyond `area`
--   metadata         jsonb       — open-ended bag for future signals
--
-- All default to empty so existing rows remain valid.
-- ===========================================================================

ALTER TABLE public.places
  ADD COLUMN IF NOT EXISTS kid_age_ranges  text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS value_tags      text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS interest_tags   text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS mom_type_fit    text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS neighborhoods   text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS metadata        jsonb  DEFAULT '{}'::jsonb;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS kid_age_ranges  text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS value_tags      text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS interest_tags   text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS mom_type_fit    text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS neighborhoods   text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS metadata        jsonb  DEFAULT '{}'::jsonb;

-- GIN indexes for the array columns so filtered queries (e.g. "places matching
-- mom's interests") stay fast as the dataset grows.
CREATE INDEX IF NOT EXISTS places_value_tags_idx     ON public.places     USING gin (value_tags);
CREATE INDEX IF NOT EXISTS places_interest_tags_idx  ON public.places     USING gin (interest_tags);
CREATE INDEX IF NOT EXISTS places_mom_type_fit_idx   ON public.places     USING gin (mom_type_fit);
CREATE INDEX IF NOT EXISTS places_kid_age_ranges_idx ON public.places     USING gin (kid_age_ranges);

CREATE INDEX IF NOT EXISTS events_value_tags_idx     ON public.events     USING gin (value_tags);
CREATE INDEX IF NOT EXISTS events_interest_tags_idx  ON public.events     USING gin (interest_tags);
CREATE INDEX IF NOT EXISTS events_mom_type_fit_idx   ON public.events     USING gin (mom_type_fit);
CREATE INDEX IF NOT EXISTS events_kid_age_ranges_idx ON public.events     USING gin (kid_age_ranges);
