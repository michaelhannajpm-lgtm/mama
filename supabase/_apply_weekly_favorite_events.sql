-- ===========================================================================
-- Weekly Favorite — support events in addition to places.
--
-- The Phase 10 schema constrained `weekly_favorites.place_id` to NOT NULL.
-- The admin Featured page now lets a curator pick either a place or an event
-- for the week. This migration:
--   (a) makes place_id nullable,
--   (b) adds event_id (nullable, FK to events with delete-cascade),
--   (c) adds a CHECK ensuring exactly one of {place_id, event_id} is set.
--
-- Existing rows already satisfy the constraint (every row had place_id set).
-- Idempotent and re-runnable.
-- ===========================================================================

ALTER TABLE public.weekly_favorites
  ALTER COLUMN place_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE CASCADE;

-- Drop the constraint if it exists (so subsequent re-runs don't error), then
-- re-add. Using a named constraint so the cleanup is deterministic.
ALTER TABLE public.weekly_favorites
  DROP CONSTRAINT IF EXISTS weekly_favorites_target_xor;

ALTER TABLE public.weekly_favorites
  ADD CONSTRAINT weekly_favorites_target_xor
  CHECK ((place_id IS NULL) <> (event_id IS NULL));

CREATE INDEX IF NOT EXISTS weekly_favorites_event_idx
  ON public.weekly_favorites (city, event_id) WHERE event_id IS NOT NULL;
