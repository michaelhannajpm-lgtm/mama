-- Cap profile photos at 5 (primary = photos[0]). Applied via Supabase MCP
-- (migration: mom_profiles_max_5_photos). Recorded here for repo traceability.
-- mom_profiles.photos is already text[] NOT NULL default '{}', so no column
-- change is needed — only this guard.
alter table public.mom_profiles
  add constraint mom_profiles_max_5_photos
  check (cardinality(photos) <= 5);
