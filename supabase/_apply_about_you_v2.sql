-- AboutYou v2 — 4-step carousel rewrite (2026-06-10).
--
-- The new onboarding screen captures three taxonomies that didn't exist
-- in the original 8-step flow:
--   Q1 stage       — kid life-stage tags
--   Q2 looking_for — what the mom hopes to find on Go Mama
--   Q3 describes   — self-description tags (Working Mom, Solo Mom, …)
--
-- The legacy kids_ages / mom_types / values / interests columns are kept
-- so historical rows stay readable; new rows simply leave them null.
--
-- Apply once in Supabase SQL editor, Supabase MCP execute_sql, or psql.

alter table public.onboarding_profiles
  add column if not exists stage        text[],
  add column if not exists looking_for  text[],
  add column if not exists describes    text[];

comment on column public.onboarding_profiles.stage is
  'AboutYou Q1 — kid life-stage tags (Expecting, Newborn, Toddler, Preschool, School-age, Tween, Teen).';

comment on column public.onboarding_profiles.looking_for is
  'AboutYou Q2 — what the mom hopes to find (Mom friends, Things to do, Local picks, Kids activities, Schools & daycare, Support groups).';

comment on column public.onboarding_profiles.describes is
  'AboutYou Q3 — self-description tags (Working Mom, Stay at home, Solo Mom, Multicultural, Fighter mom, Prefer not to say).';
