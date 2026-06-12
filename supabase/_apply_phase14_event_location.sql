-- Phase 14: Event location / coordinates.
-- Events previously had no coordinates of their own — distance and directions
-- could only borrow the linked place's lat/lng, so standalone events (a one-off
-- festival, a pop-up at a venue not in `places`) had no location at all.
-- This adds first-class coordinates + a freeform street address to events.
-- Apply via Supabase MCP apply_migration, or paste into the SQL editor.
-- Idempotent: safe to re-run.

-- 1. Coordinates + address on events (additive, nullable).
alter table public.events
  add column if not exists lat     double precision,
  add column if not exists lng     double precision,
  add column if not exists address text;

-- Sanity bounds so a bad ingest can't write off-globe coordinates.
alter table public.events drop constraint if exists events_lat_range_chk;
alter table public.events add constraint events_lat_range_chk
  check (lat is null or (lat between -90 and 90));
alter table public.events drop constraint if exists events_lng_range_chk;
alter table public.events add constraint events_lng_range_chk
  check (lng is null or (lng between -180 and 180));

-- 2. Backfill from the linked place where the event has no coords of its own.
update public.events e
   set lat = p.lat,
       lng = p.lng
  from public.places p
 where e.place_id = p.id
   and e.lat is null
   and e.lng is null
   and p.lat is not null
   and p.lng is not null;

-- 3. Index for future radius queries (only rows that actually have a point).
create index if not exists events_lat_lng_idx
  on public.events (lat, lng)
  where lat is not null and lng is not null;
