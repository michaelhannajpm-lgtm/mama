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
