create extension if not exists pgcrypto;

create table if not exists public.places (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  area          text,
  city          text not null,
  category      text not null check (category in (
    'cafes','parks','playgrounds','museums','indoor',
    'libraries','homes','zoos','water','pools'
  )),
  description   text,
  tags          text[] not null default '{}',
  hero_photo    text,
  badge         text,
  rating        numeric(3,2),
  review_count  integer not null default 0,
  lat           numeric(9,6),
  lng           numeric(9,6),
  visible       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists places_category_idx on public.places (category) where visible;
create index if not exists places_city_idx     on public.places (city)     where visible;
create index if not exists places_geo_idx      on public.places (lat, lng) where visible;

drop trigger if exists places_updated_at on public.places;
create trigger places_updated_at
before update on public.places
for each row execute function public.touch_updated_at();

alter table public.places enable row level security;
-- No public RLS yet. Service-role only writes; reads via /api/admin routes.

comment on table public.places is
  'Global place directory (cafes, parks, playgrounds, etc.). Mirror of src/data/places.js for prototype, seeded by scripts/seed-supabase.mjs.';
