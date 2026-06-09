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

-- 3. Categories metadata (promotes hardcoded PLACE_CATEGORIES).
create table if not exists public.categories (
  id          text primary key,
  label       text not null,
  icon        text,
  description text,
  kind        text not null default 'place' check (kind in ('place','event')),
  sort_order  integer not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

insert into public.categories (id, label, icon, kind, sort_order) values
  ('fun',             'Fun',             'PartyPopper',   'place', 1),
  ('sports',          'Sports',          'Trophy',        'place', 2),
  ('wellness',        'Wellness',        'Heart',         'place', 3),
  ('schools',         'Schools',         'GraduationCap', 'place', 4),
  ('childcare',       'Childcare',       'Baby',          'place', 5),
  ('extracurricular', 'Extracurricular', 'Palette',       'place', 6),
  ('camps',           'Camps',           'Tent',          'place', 7),
  ('health',          'Health',          'Stethoscope',   'place', 8)
on conflict (id) do nothing;

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute function public.touch_updated_at();

-- 4. Multi-category join (places.category stays the PRIMARY).
create table if not exists public.place_categories (
  place_id    uuid not null references public.places(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  primary key (place_id, category_id)
);
create index if not exists place_categories_cat_idx on public.place_categories (category_id);

-- Backfill: every existing place's primary category becomes a membership.
insert into public.place_categories (place_id, category_id)
select id, category from public.places
on conflict do nothing;

-- 5. Photos: gallery + attribution + provenance.
create table if not exists public.place_photos (
  id          uuid primary key default gen_random_uuid(),
  place_id    uuid not null references public.places(id) on delete cascade,
  url         text,
  google_ref  text,
  source      text not null check (source in ('google','generated','manual')),
  attribution text,
  width       integer,
  height      integer,
  is_hero     boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists place_photos_place_idx on public.place_photos (place_id);
create unique index if not exists place_photos_one_hero
  on public.place_photos (place_id) where is_hero;

-- 6. Ingestion provenance.
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
