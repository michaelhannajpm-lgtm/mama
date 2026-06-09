-- Phase 3: Places ingestion foundation.
-- Apply via Supabase MCP execute_sql/apply_migration, or paste into the Supabase SQL editor.
-- Idempotent: safe to re-run.

-- 1. Reconcile taxonomy to the app's 8 categories.
--    The live constraint + the 50 curated rows used the legacy taxonomy
--    (cafes/parks/museums/water/playgrounds/libraries/indoor/zoos/homes/pools),
--    so remap existing rows BEFORE swapping the CHECK or it fails validation.
--    Mapping (product-approved 2026-06-08): water+pools -> sports, rest -> fun.
--    Drop the old CHECK FIRST so the remap values aren't rejected by it.
alter table public.places drop constraint if exists places_category_check;

update public.places set category = 'sports' where category in ('water','pools');
update public.places set category = 'fun'
  where category in ('cafes','parks','museums','playgrounds','libraries','indoor','zoos','homes');

alter table public.places add constraint places_category_check
  check (category in (
    'schools','childcare','extracurricular','camps',
    'health','wellness','sports','fun'
  ));

-- 2. Rich + provenance columns on places (additive, safe).
alter table public.places
  add column if not exists aka               text[] not null default '{}',
  add column if not exists address           text,
  add column if not exists website           text,
  add column if not exists reference_url      text,
  add column if not exists phone             text,
  add column if not exists social_links      jsonb not null default '{}'::jsonb,
  add column if not exists google_place_id   text,
  add column if not exists google_maps_url   text,
  add column if not exists hours             jsonb,
  add column if not exists business_status   text,
  add column if not exists price_level       smallint,
  add column if not exists age_min           smallint,
  add column if not exists age_max           smallint,
  add column if not exists amenities         jsonb not null default '{}'::jsonb,
  add column if not exists good_for          text[] not null default '{}',
  add column if not exists review_status     text not null default 'needs_review',
  add column if not exists last_seen_at      timestamptz,
  add column if not exists source_confidence numeric(4,3);

alter table public.places drop constraint if exists places_review_status_check;
alter table public.places add constraint places_review_status_check
  check (review_status in ('needs_review','approved','rejected','archived'));

create unique index if not exists places_google_place_id_key
  on public.places (google_place_id) where google_place_id is not null;
create index if not exists places_review_status_idx on public.places (review_status);

-- Backfill: curated rows are hand-vetted + already visible -> approved.
update public.places set review_status = 'approved'
where review_status = 'needs_review' and visible = true;
