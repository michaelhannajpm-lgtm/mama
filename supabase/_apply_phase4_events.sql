-- Phase 4: Events ingestion foundation.
-- Apply via Supabase MCP execute_sql/apply_migration, or paste into the SQL editor.
-- Idempotent: safe to re-run.

-- 1. Dated + provenance + review columns on events (additive, safe).
alter table public.events
  add column if not exists kind              text not null default 'recurring',
  add column if not exists event_type        text,
  add column if not exists starts_at         timestamptz,
  add column if not exists ends_at           timestamptz,
  add column if not exists timezone          text not null default 'America/New_York',
  add column if not exists description       text,
  add column if not exists place_name        text,
  add column if not exists area              text,
  add column if not exists website           text,
  add column if not exists source_url        text,
  add column if not exists external_id       text,
  add column if not exists age_min           smallint,
  add column if not exists age_max           smallint,
  add column if not exists price_summary     text,
  add column if not exists kid_ages          text[] not null default '{}',
  add column if not exists indoor            boolean,
  add column if not exists hue               text,
  add column if not exists going_label       text,
  add column if not exists review_status     text not null default 'needs_review',
  add column if not exists last_seen_at      timestamptz,
  add column if not exists source_confidence numeric(4,3);

alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check check (kind in ('recurring','dated'));
alter table public.events drop constraint if exists events_review_status_check;
alter table public.events add constraint events_review_status_check
  check (review_status in ('needs_review','approved','rejected','archived'));

create unique index if not exists events_external_id_key
  on public.events (external_id) where external_id is not null;
create index if not exists events_review_status_idx on public.events (review_status);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_kind_idx on public.events (kind);

-- Backfill curated rows to approved/recurring.
update public.events set kind='recurring', review_status='approved'
where review_status='needs_review' and visible=true;

-- 2. Event-type taxonomy (kind='event'). 'other' is the catch-all.
--    Ids 'sports-event'/'camp' deliberately avoid the place-category ids 'sports'/'camps'.
insert into public.categories (id, label, icon, kind, sort_order) values
  ('storytime','Storytime','BookOpen','event',1),
  ('class','Class','Palette','event',2),
  ('workshop','Workshop','Wrench','event',3),
  ('stem','STEM','FlaskConical','event',4),
  ('art-class','Art','Brush','event',5),
  ('music-class','Music','Music','event',6),
  ('dance-class','Dance','Music2','event',7),
  ('cooking-class','Cooking','ChefHat','event',8),
  ('language-class','Language','Languages','event',9),
  ('tutoring','Academic','GraduationCap','event',10),
  ('sports-event','Sports','Trophy','event',11),
  ('swim','Swim','Waves','event',12),
  ('gymnastics','Gymnastics','PersonStanding','event',13),
  ('martial-arts','Martial Arts','Swords','event',14),
  ('kids-fitness','Kids Fitness','Dumbbell','event',15),
  ('family-yoga','Family Yoga','Flower2','event',16),
  ('camp','Camp','Tent','event',17),
  ('break-camp','Break Camp','TreePalm','event',18),
  ('playgroup','Playgroup','Users','event',19),
  ('open-play','Open Play','Blocks','event',20),
  ('parent-meetup','Parent Meetup','Coffee','event',21),
  ('support-group','Support Group','Heart','event',22),
  ('performance','Performance','Drama','event',23),
  ('movie','Movie','Film','event',24),
  ('concert','Concert','Mic2','event',25),
  ('museum-program','Museum Program','Landmark','event',26),
  ('library-program','Library Program','Library','event',27),
  ('animal-encounter','Animal Encounter','PawPrint','event',28),
  ('festival','Festival','PartyPopper','event',29),
  ('fair','Fair','FerrisWheel','event',30),
  ('seasonal','Seasonal','Sparkles','event',31),
  ('farmers-market','Farmers Market','ShoppingBasket','event',32),
  ('community-event','Community','Megaphone','event',33),
  ('outdoor-adventure','Outdoor','Mountain','event',34),
  ('prenatal-class','Prenatal','Baby','event',35),
  ('new-parent','New Parent','HeartHandshake','event',36),
  ('parenting-class','Parenting','UsersRound','event',37),
  ('breastfeeding','Lactation Support','Milk','event',38),
  ('sensory-friendly','Sensory-Friendly','Sparkle','event',39),
  ('special-needs','Special Needs','Accessibility','event',40),
  ('fundraiser','Fundraiser','HandHeart','event',41),
  ('religious','Faith / VBS','Church','event',42),
  ('other','Other','CircleDot','event',99)
on conflict (id) do nothing;

create table if not exists public.event_categories (
  event_id    uuid not null references public.events(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  primary key (event_id, category_id)
);
create index if not exists event_categories_cat_idx on public.event_categories (category_id);

-- 3. Provenance marker on places (this migration spans both tables).
alter table public.places
  add column if not exists origin                  text not null default 'curated',
  add column if not exists generated_from_event_id uuid references public.events(id) on delete set null;
alter table public.places drop constraint if exists places_origin_check;
alter table public.places add constraint places_origin_check
  check (origin in ('curated','google','event'));
create index if not exists places_origin_idx on public.places (origin);

-- Backfill: ingested-but-unpublished places (have a google_place_id) -> 'google'.
update public.places set origin='google'
where origin='curated' and google_place_id is not null and visible=false;
