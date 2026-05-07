create extension if not exists pgcrypto;

create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  place_id      uuid references public.places(id) on delete set null,
  city          text not null,
  day_of_week   text not null check (day_of_week in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  bucket        text not null check (bucket in ('morning','noon','afternoon','night-owl')),
  time_label    text not null,
  recurring     text default 'Weekly',
  tags          text[] not null default '{}',
  hero_photo    text,
  going_count   integer not null default 0,
  visible       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists events_city_day_idx on public.events (city, day_of_week) where visible;
create index if not exists events_bucket_idx   on public.events (bucket) where visible;
create index if not exists events_place_idx    on public.events (place_id);

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

comment on table public.events is
  'Recurring group meetups. Mirror of src/data/events.js for prototype, seeded by scripts/seed-supabase.mjs.';
