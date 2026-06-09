# Data Contract

Use this reference when designing schema migrations, mapping source data, or writing upserts.

## Existing Mismatch To Resolve First

`src/data/places.js` uses the current app taxonomy:

- `schools`
- `childcare`
- `extracurricular`
- `camps`
- `health`
- `wellness`
- `sports`
- `fun`

`supabase/places_schema.sql` on disk still *lists* an older taxonomy in its CHECK constraint:

- `cafes`
- `parks`
- `playgrounds`
- `museums`
- `indoor`
- `libraries`
- `homes`
- `zoos`
- `water`
- `pools`

**But the on-disk `.sql` is stale.** `api/_lib/seed.js` writes the new taxonomy keys (`schools` … `fun`) straight into `places.category` and seeding succeeds — which means the *live* deployed constraint already accepts the new taxonomy. So:

1. Inspect the live constraint before doing anything (`select pg_get_constraintdef(oid) from pg_constraint where conname like '%places_category%';` via service-role/SQL editor). Trust the live DB, not the file.
2. If the live constraint already matches `src/data/places.js`, no migration is needed — just import into the new taxonomy. Optionally update the `.sql` file to stop misleading future readers.
3. Only if the live constraint is genuinely still the old set, migrate the DB to the app taxonomy (unless the user asks to keep the old one).

Either way: never import into the old taxonomy.

## Recommended Place Fields

Keep existing fields, then add only what ingestion uses:

- `address text`
- `website text`
- `phone text`
- `source_url text`
- `review_status text not null default 'needs_review'`
- `last_seen_at timestamptz`
- `source_confidence numeric(4,3)`

Useful review statuses:

- `needs_review`
- `approved`
- `rejected`
- `archived`

Existing `visible` should remain the public visibility gate. New imported rows should start as `visible=false`.

**Field-format conventions to match existing rows:**

- `city` is stored *with state*: `'Tampa, FL'`, `'St. Petersburg, FL'`, `'Clearwater, FL'`. Normalize ingested `city` to this exact form — bare `'Tampa'` will break city-based dedupe and admin filters.
- `area` is the neighborhood (`'Hyde Park'`, `'Channelside'`, …). `scripts/seed-data/place-coords.js` maps area→`{lat,lng}`; reuse `lookupCoords(area)` / `DEFAULT_COORDS` as a geo fallback when a source lacks coordinates.
- `tags text[]` defaults to `'{}'` — pass an array, never null.

## Recommended Event Fields

The current `events` table is shaped for recurring prototype meetups. External calendars need exact times:

- `starts_at timestamptz`
- `ends_at timestamptz`
- `timezone text not null default 'America/New_York'`
- `source_url text`
- `review_status text not null default 'needs_review'`
- `last_seen_at timestamptz`
- `source_confidence numeric(4,3)`
- `age_min integer`
- `age_max integer`
- `price_summary text`

Continue writing these existing UI fields:

- `day_of_week`
- `bucket`
- `time_label`
- `recurring`
- `place_id` when a confident place match exists

Bucket mapping in local time:

- `morning`: 5:00 AM through 10:59 AM
- `noon`: 11:00 AM through 1:59 PM
- `afternoon`: 2:00 PM through 5:59 PM
- `night-owl`: 6:00 PM through 4:59 AM

## Provenance Tables

Add source tracking so the importer is idempotent and auditable.

```sql
create table if not exists public.ingestion_sources (
  id text primary key,
  name text not null,
  source_type text not null,
  url text,
  city text,
  county text,
  enabled boolean not null default true,
  cadence_hours integer not null default 24,
  parser_version text not null default 'v1',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id text references public.ingestion_sources(id) on delete set null,
  status text not null check (status in ('running','succeeded','failed','partial')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  fetched_count integer not null default 0,
  normalized_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb
);

create table if not exists public.source_records (
  id uuid primary key default gen_random_uuid(),
  source_id text not null references public.ingestion_sources(id) on delete cascade,
  external_id text,
  source_url text,
  record_type text not null check (record_type in ('place','event')),
  place_id uuid references public.places(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  content_hash text,
  raw jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (source_id, external_id, record_type)
);
```

If a source has no stable external id, derive `content_hash` from canonical source URL plus normalized name/date/place.

## Category Mapping

Map external categories into the app taxonomy:

- Schools, school districts, VPK, preschool: `schools`
- Daycare, drop-in care, babysitting, after-school care: `childcare`
- Art, music, coding, tutoring, dance, language classes: `extracurricular`
- Summer camp, break camp, day camp, specialty camp: `camps`
- Pediatrics, dental, urgent care, hospital, therapy: `health`
- Prenatal/postpartum yoga, support groups, spa, lactation support, pelvic PT: `wellness`
- Swim, soccer, gymnastics, martial arts, tennis, public pools: `sports`
- Museums, zoos, aquariums, playgrounds, parks, cafes, libraries, attractions: `fun`

When confidence is low, set category to `fun`, add explanatory tags, and keep `review_status='needs_review'`.

## Dedupe Rules

Places:

1. Exact `source_records(source_id, external_id, place)` match.
2. Existing place with same normalized name and same city/area.
3. Existing place within roughly 75 meters with similar normalized name.
4. Manual review if multiple plausible matches exist.

Events:

1. Exact `source_records(source_id, external_id, event)` match.
2. Same normalized name, same start time, same matched place.
3. Same source URL and same start date.
4. Manual review for recurring events when the source has no stable event id.

Never duplicate an event just because its description or image changed.

## Slugs

Use stable slugs:

- Places: normalized name plus city, with a numeric suffix only on collision.
- Events: normalized name plus local date, or normalized name plus recurring marker.

Do not change an existing slug during updates.

**Collision hazard with curated rows.** `slug` is the upsert key (`onConflict: 'slug'`), and curated rows use short hand-authored ids — places like `'bayshore'`, `'glazer'`; events like `'e-coffee-mom'`. A generated slug that happens to equal a curated id would *clobber* a curated, admin-owned row on upsert. Guard against this: generated `name+city` slugs are long enough to rarely collide, but to be safe, namespace ingested slugs (e.g. prefix with the source id) or check against existing slugs before writing. Curated rows are the ones you must never overwrite.
