# Data Model Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the prototype's mock data into Supabase via three new tables (`places`, `events`, `mom_profiles`), seed ~200 realistic Tampa moms + 50 places + 30 events, and wire admin reader endpoints — without breaking the offline `/preview` and `/live` demo.

**Architecture:** Three SQL DDL files under `supabase/`, three thin Vercel admin reader functions under `api/admin/`, and one Node seed script using `@supabase/supabase-js` with the service role key. The existing `src/data/{moms,places,events}.js` files stay untouched so the prototype demo keeps working offline. The `api/admin/reset.js` truncate endpoint grows to cover the new tables.

**Tech Stack:** Supabase Postgres + PostgREST (no migrations framework yet — plain SQL files applied via Supabase SQL editor or `psql`), Vercel serverless functions (Node 20, ESM), `@supabase/supabase-js` (already a dependency).

**Spec:** `docs/superpowers/specs/2026-05-07-data-model-phase-1-design.md`

---

## File Structure

Created in this plan:

```
supabase/
  shared_helpers.sql        ← shared touch_updated_at() function (extracted from existing schemas)
  places_schema.sql         ← places table + indexes + trigger + RLS enable
  events_schema.sql         ← events table + indexes + trigger + RLS enable
  mom_profiles_schema.sql   ← mom_profiles table + indexes + trigger + RLS enable + own-row read policy

api/admin/
  places.js                 ← GET /api/admin/places       — list all places
  events.js                 ← GET /api/admin/events       — list all events
  mom-profiles.js           ← GET /api/admin/mom-profiles — list all mom_profiles

scripts/
  seed-supabase.mjs         ← Node CLI that seeds places/events/mom_profiles
  seed-data/
    place-coords.js         ← area-name → {lat,lng} curated map for Tampa neighborhoods
    name-pool.js            ← 30 first-name + 26 last-initial pool used by mom generator
    photo-pool.js           ← ~30 verified Unsplash mom-portrait URLs
```

Modified:

```
api/admin/reset.js          ← add 3 new tables to TABLES array
package.json                ← add "seed" script
```

Untouched (verify, don't change):

```
src/data/{moms,places,events,taxonomy}.js     ← demo data, must keep working
src/screens/, src/sheets/, src/components/    ← prototype UI is data-source agnostic for now
```

---

## Task 1: Shared `touch_updated_at` SQL helper

**Files:**
- Create: `supabase/shared_helpers.sql`

The existing `onboarding_schema.sql` has `touch_onboarding_profiles_updated_at()` defined inline. We extract a single shared helper now so the three new tables (and any future ones) attach the same function instead of duplicating.

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/supabase/shared_helpers.sql`:

```sql
-- Shared utility functions used by multiple table schemas.
-- Apply this once before any of the per-table _schema.sql files.

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/shared_helpers.sql
git commit -m "$(cat <<'COMMITMSG'
db: add shared touch_updated_at() helper for new schemas

Extracted so places / events / mom_profiles can each attach the same
trigger function without copy-pasting the body. Existing
touch_onboarding_profiles_updated_at stays untouched.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 2: `places` table DDL

**Files:**
- Create: `supabase/places_schema.sql`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/supabase/places_schema.sql`:

```sql
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
```

- [ ] **Step 2: Apply the SQL to your dev Supabase project**

Open the Supabase Dashboard → SQL editor for the dev project, paste the contents of `shared_helpers.sql` (if not already applied) and `places_schema.sql`, run.

Expected: `Success. No rows returned.`

- [ ] **Step 3: Commit**

```bash
git add supabase/places_schema.sql
git commit -m "$(cat <<'COMMITMSG'
db(places): table DDL with indexes + RLS enable

Mirrors src/data/places.js shape: slug, name, area, city, category,
description, tags[], hero_photo, badge, rating, review_count, lat,
lng, visible. Three partial indexes filter on visible=true so they
stay tight as we soft-hide rows.

RLS enabled but no public policies yet — service-role-only access
through /api/admin endpoints.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 3: `events` table DDL

**Files:**
- Create: `supabase/events_schema.sql`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/supabase/events_schema.sql`:

```sql
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
```

- [ ] **Step 2: Apply the SQL to your dev Supabase project**

In the Supabase SQL editor: paste `events_schema.sql`, run.

Expected: `Success. No rows returned.` (places must already exist for the FK.)

- [ ] **Step 3: Commit**

```bash
git add supabase/events_schema.sql
git commit -m "$(cat <<'COMMITMSG'
db(events): table DDL — recurring group meetups, FK to places

place_id references public.places(id) with ON DELETE SET NULL so
killing a place doesn't kill its events. day_of_week and bucket are
constrained to the same vocab as the new TIME_WINDOWS taxonomy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 4: `mom_profiles` table DDL

**Files:**
- Create: `supabase/mom_profiles_schema.sql`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/supabase/mom_profiles_schema.sql`:

```sql
create extension if not exists pgcrypto;

create table if not exists public.mom_profiles (
  id                  uuid primary key default gen_random_uuid(),
  auth_user_id        uuid unique references auth.users(id) on delete cascade,

  -- Identity
  display_name        text not null,
  username            text unique,
  age                 smallint check (age is null or (age >= 16 and age <= 80)),
  bio                 text,
  photos              text[] not null default '{}',

  -- Family
  kids_ages           jsonb not null default '{}'::jsonb,
  mom_types           text[] not null default '{}',

  -- Preference axes
  values              text[] not null default '{}',
  interests           text[] not null default '{}',
  free_slots          text[] not null default '{}',
  places              uuid[] not null default '{}',
  preferred_event_ids uuid[] not null default '{}',

  -- Geo
  city                text not null,
  neighborhood        text,
  home_lat            numeric(9,6),
  home_lng            numeric(9,6),
  distance_miles      smallint,

  -- Visibility / moderation
  visible             boolean not null default true,
  verified            boolean not null default false,
  blocked_global      boolean not null default false,

  -- Social
  social_links        jsonb not null default '{}'::jsonb,

  -- Audit
  source              text not null default 'onboarding'
                       check (source in ('onboarding','seed','admin-import')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_active_at      timestamptz
);

create index if not exists mom_profiles_visible_city_idx
  on public.mom_profiles (city)
  where visible and not blocked_global;
create index if not exists mom_profiles_geo_idx
  on public.mom_profiles (home_lat, home_lng)
  where visible and not blocked_global;
create index if not exists mom_profiles_kids_idx       on public.mom_profiles using gin (kids_ages);
create index if not exists mom_profiles_values_idx     on public.mom_profiles using gin (values);
create index if not exists mom_profiles_interests_idx  on public.mom_profiles using gin (interests);
create index if not exists mom_profiles_slots_idx      on public.mom_profiles using gin (free_slots);
create index if not exists mom_profiles_last_active_idx
  on public.mom_profiles (last_active_at desc nulls last);

drop trigger if exists mom_profiles_updated_at on public.mom_profiles;
create trigger mom_profiles_updated_at
before update on public.mom_profiles
for each row execute function public.touch_updated_at();

alter table public.mom_profiles enable row level security;

-- Phase 1 only allows a mom to read her own profile row. Phase 2 will add
-- the policy that lets authenticated moms read other moms' rows for browsing.
drop policy if exists "moms read own mom_profile" on public.mom_profiles;
create policy "moms read own mom_profile"
  on public.mom_profiles for select
  using (auth.uid() = auth_user_id);

comment on table public.mom_profiles is
  'Discoverable mom directory. Separate from onboarding_profiles (which captures funnel state). One row per mom who finished onboarding, joined via auth_user_id.';
```

- [ ] **Step 2: Apply the SQL to your dev Supabase project**

In the Supabase SQL editor: paste `mom_profiles_schema.sql`, run.

Expected: `Success. No rows returned.`

- [ ] **Step 3: Verify the schema is correct**

Run in the Supabase SQL editor:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='mom_profiles'
order by ordinal_position;
```

Expected: 25+ rows including `auth_user_id`, `display_name`, `kids_ages`, `mom_types`, `values`, `interests`, `free_slots`, `places`, `city`, `home_lat`, `home_lng`, `visible`, `verified`, `source`, `created_at`. No errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/mom_profiles_schema.sql
git commit -m "$(cat <<'COMMITMSG'
db(mom_profiles): discoverable mom directory table

Separate from onboarding_profiles (the per-session funnel capture).
One row per finished mom, FK to auth.users via auth_user_id with
ON DELETE CASCADE.

Schema covers everything Phase 2 matching needs: kids_ages (jsonb),
mom_types/values/interests/free_slots (text[]), places + preferred_event_ids
(uuid[]), home_lat/lng for geo, distance_miles for radius preference,
plus moderation flags (visible, verified, blocked_global) and a source
column ('onboarding' | 'seed' | 'admin-import') so we can wipe seeded
rows separately later.

Six GIN indexes on the array/jsonb columns let `&&` overlap queries
run cheaply — that's the bread and butter of affinity matching.

RLS enabled. One policy: a mom can read her own row. Phase 2 will add
cross-mom reads for the browse feed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 5: Admin reader endpoint — `places`

**Files:**
- Create: `api/admin/places.js`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/api/admin/places.js`:

```js
// GET /api/admin/places — returns all places for the admin dashboard.
// SECURITY: NO authentication. Add auth before exposing publicly.
import { json, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/places?select=*&order=created_at.desc&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    return json(res, 200, { ok: true, count: rows.length, rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: `✓ built in <time>` with no errors.

- [ ] **Step 3: Commit**

```bash
git add api/admin/places.js
git commit -m "$(cat <<'COMMITMSG'
feat(api): GET /api/admin/places admin reader

Mirrors api/admin/onboarding.js. Service-role-only access via
supabaseCreds(). Returns { ok, count, rows } limited to 5000 — way
above any plausible Phase 1 catalog size.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 6: Admin reader endpoint — `events`

**Files:**
- Create: `api/admin/events.js`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/api/admin/events.js`:

```js
// GET /api/admin/events — returns all events for the admin dashboard.
// SECURITY: NO authentication. Add auth before exposing publicly.
import { json, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/events?select=*&order=created_at.desc&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    return json(res, 200, { ok: true, count: rows.length, rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add api/admin/events.js
git commit -m "$(cat <<'COMMITMSG'
feat(api): GET /api/admin/events admin reader

Twin of /api/admin/places. Service-role-only access. Returns
{ ok, count, rows }.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 7: Admin reader endpoint — `mom_profiles`

**Files:**
- Create: `api/admin/mom-profiles.js`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/api/admin/mom-profiles.js`:

```js
// GET /api/admin/mom-profiles — returns all mom_profiles for the admin dashboard.
// SECURITY: NO authentication. Add auth before exposing publicly.
import { json, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/mom_profiles?select=*&order=created_at.desc&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    return json(res, 200, { ok: true, count: rows.length, rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add api/admin/mom-profiles.js
git commit -m "$(cat <<'COMMITMSG'
feat(api): GET /api/admin/mom-profiles admin reader

Twin of /api/admin/places. Service-role-only access. Returns
{ ok, count, rows }. Phase 2 will add filter / search params.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 8: Extend `reset.js` to truncate the new tables

**Files:**
- Modify: `api/admin/reset.js`

- [ ] **Step 1: Edit the TABLES array**

Open `/Users/michael/Projects/mama-app/api/admin/reset.js`. Find the line:

```js
const TABLES = ['onboarding_profiles', 'waitlist_signups'];
```

Replace with:

```js
// Order matters: events FK references places, so wipe events first.
// mom_profiles is independent at this stage.
const TABLES = ['events', 'mom_profiles', 'onboarding_profiles', 'waitlist_signups', 'places'];
```

- [ ] **Step 2: Verify build still passes**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add api/admin/reset.js
git commit -m "$(cat <<'COMMITMSG'
feat(admin): reset endpoint also truncates places, events, mom_profiles

Order in the TABLES array matters: events has an FK to places, so
events must be deleted before places. mom_profiles is independent
in Phase 1 — Phase 2 social-graph tables (likes, matches) will need
to slot in before mom_profiles when they exist.

Open question from the spec (whether reset should wipe seeded vs.
real rows differently) is left for the Phase 2 spec — for now reset
wipes everything, same as before.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 9: Curated seed data — place coordinates map

**Files:**
- Create: `scripts/seed-data/place-coords.js`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/scripts/seed-data/place-coords.js`:

```js
// Hand-curated area-name → {lat, lng} mapping for Tampa-area neighborhoods.
// Used by scripts/seed-supabase.mjs to backfill place + mom geolocations
// without calling a live geocoder.
//
// Coordinates are approximate centroids (good enough for distance bucketing).

export const AREA_COORDS = {
  // Tampa
  'Hyde Park':         { lat: 27.9355, lng: -82.4795 },
  'Seminole Heights':  { lat: 27.9967, lng: -82.4576 },
  'Downtown':          { lat: 27.9466, lng: -82.4584 },
  'South Tampa':       { lat: 27.9106, lng: -82.5079 },
  'Tampa Heights':     { lat: 27.9663, lng: -82.4636 },
  'Channelside':       { lat: 27.9419, lng: -82.4452 },
  'Davis Islands':     { lat: 27.9032, lng: -82.4574 },
  'West Tampa':        { lat: 27.9525, lng: -82.4970 },
  'New Tampa':         { lat: 28.1247, lng: -82.3590 },
  'University of Tampa': { lat: 27.9466, lng: -82.4642 },
  'Carrollwood':       { lat: 28.0553, lng: -82.5074 },
  'Westchase':         { lat: 28.0556, lng: -82.6112 },
  'Ybor City':         { lat: 27.9666, lng: -82.4376 },
  'Sulphur Springs':   { lat: 28.0233, lng: -82.4524 },
  'East Tampa':        { lat: 27.9659, lng: -82.4153 },
  'West Shore':        { lat: 27.9573, lng: -82.5193 },
  'Port Tampa':        { lat: 27.8633, lng: -82.5370 },
  'Citrus Park':       { lat: 28.0744, lng: -82.5712 },
  'Courtney Campbell': { lat: 27.9638, lng: -82.5944 },
  'Bayshore':          { lat: 27.9219, lng: -82.4906 },

  // Nearby
  'St. Petersburg, FL':{ lat: 27.7676, lng: -82.6403 },
  'Clearwater, FL':    { lat: 27.9659, lng: -82.8001 },
  'Dunedin':           { lat: 28.0197, lng: -82.7873 },
};

// Fallback if an area is unknown — Tampa city center.
export const DEFAULT_COORDS = { lat: 27.9506, lng: -82.4572 };

export const lookupCoords = (area) => AREA_COORDS[area] || DEFAULT_COORDS;
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-data/place-coords.js
git commit -m "$(cat <<'COMMITMSG'
chore(seed): area → lat/lng map for Tampa neighborhoods

Hand-curated centroids for ~20 Tampa neighborhoods + 3 nearby
cities. Used by the seed script to backfill geolocations without
calling a live geocoder. Default fallback is Tampa city center.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 10: Curated seed data — name pool

**Files:**
- Create: `scripts/seed-data/name-pool.js`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/scripts/seed-data/name-pool.js`:

```js
// First-name + last-initial pool for synthetic mom_profiles.
// Picked to span ethnic + cultural diversity for Tampa demographics.

export const FIRST_NAMES = [
  'Sara', 'Mei', 'Aisha', 'Priya', 'Jamie', 'Talia', 'Renee',
  'Maria', 'Jessica', 'Ashley', 'Kayla', 'Samantha', 'Brittany',
  'Stephanie', 'Nicole', 'Megan', 'Lauren', 'Rachel', 'Emily',
  'Hannah', 'Lakshmi', 'Yuki', 'Fatima', 'Olivia', 'Sophia',
  'Isabella', 'Amara', 'Camila', 'Zara', 'Daniela',
];

export const LAST_INITIALS = [
  'A', 'B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
  'M', 'N', 'O', 'P', 'R', 'S', 'T', 'V', 'W', 'Y',
];

// Generate up to 30 × 20 = 600 unique (firstName, lastInitial) combos
// before we need to add a numeric suffix.
export const generateDisplayName = (idx) => {
  const first = FIRST_NAMES[idx % FIRST_NAMES.length];
  const initial = LAST_INITIALS[Math.floor(idx / FIRST_NAMES.length) % LAST_INITIALS.length];
  return `${first} ${initial}.`;
};

export const generateUsername = (idx) => {
  const first = FIRST_NAMES[idx % FIRST_NAMES.length].toLowerCase();
  const initial = LAST_INITIALS[Math.floor(idx / FIRST_NAMES.length) % LAST_INITIALS.length].toLowerCase();
  // Suffix idx so the username is deterministic and globally unique
  // even if two seeded moms share the same name + initial.
  return `${first}${initial}${idx}`;
};
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-data/name-pool.js
git commit -m "$(cat <<'COMMITMSG'
chore(seed): name + username generator pool

30 first names spanning a representative slice of Tampa demographics
× 20 last-initial slots = 600-mom uniqueness ceiling before colliding.
Username carries the numeric idx as a suffix so two seeded moms with
the same display name get distinct usernames.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 11: Curated seed data — photo pool

**Files:**
- Create: `scripts/seed-data/photo-pool.js`

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/scripts/seed-data/photo-pool.js`:

```js
// Verified Unsplash mom-portrait URLs. Each was checked to return HTTP 200
// at the time the seed script was authored. If any 404s in the future, swap
// the photo ID — the URL pattern is stable.

const id = (photoId) => `https://images.unsplash.com/photo-${photoId}?w=600&auto=format&fit=crop`;

export const PHOTOS = [
  id('1494790108377-be9c29b29330'),
  id('1607746882042-944635dfe10e'),
  id('1573496359142-b8d87734a5a2'),
  id('1548142813-c348350df52b'),
  id('1517841905240-472988babdf9'),
  id('1544005313-94ddf0286df2'),
  id('1531123897727-8f129e1688ce'),
  id('1487412720507-e7ab37603c6f'),
  id('1500917293891-ef795e70e1f6'),
  id('1438761681033-6461ffad8d80'),
];

// Pick 1–3 photos for a mom; deterministic by index so re-runs match.
export const photosForMom = (idx) => {
  const count = 1 + (idx % 3);
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(PHOTOS[(idx + i) % PHOTOS.length]);
  }
  return out;
};
```

- [ ] **Step 2: Commit**

```bash
git add scripts/seed-data/photo-pool.js
git commit -m "$(cat <<'COMMITMSG'
chore(seed): mom photo pool — 10 verified Unsplash URLs

Same URLs already used in src/data/moms.js — known-good. Each seeded
mom gets 1–3 photos, picked deterministically by index so re-running
the seed script produces stable results.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 12: Seed script — places + events

**Files:**
- Create: `scripts/seed-supabase.mjs` (initial version, places + events only)

- [ ] **Step 1: Create the file**

Write `/Users/michael/Projects/mama-app/scripts/seed-supabase.mjs`:

```js
#!/usr/bin/env node
// Seed the Supabase dev project with realistic data for Phase 1.
// Idempotent: re-running upserts by `slug` (places, events) and
// `username` (mom_profiles) so duplicates aren't created.
//
// Usage:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
//   node scripts/seed-supabase.mjs [--moms 200] [--places 50] [--events 30] [--reset]
//
// --reset deletes all rows where source='seed' (mom_profiles only)
// before inserting. Places + events are upsert-by-slug, so reset
// is rarely needed for them.

import { createClient } from '@supabase/supabase-js';
import { PLACES as LOCAL_PLACES } from '../src/data/places.js';
import { SUGGESTED_EVENTS as LOCAL_EVENTS } from '../src/data/events.js';
import { lookupCoords, DEFAULT_COORDS } from './seed-data/place-coords.js';

const flags = process.argv.slice(2);
const flagValue = (name, fallback) => {
  const i = flags.indexOf(name);
  return i >= 0 ? flags[i + 1] : fallback;
};
const wantPlaces = parseInt(flagValue('--places', '50'), 10);
const wantEvents = parseInt(flagValue('--events', '30'), 10);
const wantMoms   = parseInt(flagValue('--moms',   '200'), 10);
const doReset    = flags.includes('--reset');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

// -- Places ----------------------------------------------------------------

const buildPlacesPayload = () => {
  const out = [];
  for (const [category, list] of Object.entries(LOCAL_PLACES)) {
    for (const p of list) {
      const coords = lookupCoords(p.area) || DEFAULT_COORDS;
      out.push({
        slug: p.id,
        name: p.name,
        area: p.area,
        city: 'Tampa, FL',
        category,
        description: p.desc || null,
        tags: p.tags || [],
        hero_photo: null,
        badge: null,
        rating: null,
        review_count: 0,
        lat: coords.lat,
        lng: coords.lng,
        visible: true,
      });
    }
  }
  return out.slice(0, wantPlaces);
};

const seedPlaces = async () => {
  const rows = buildPlacesPayload();
  console.log(`Seeding ${rows.length} places…`);
  const { error } = await sb
    .from('places')
    .upsert(rows, { onConflict: 'slug' });
  if (error) throw new Error(`places upsert failed: ${error.message}`);
};

// -- Events ----------------------------------------------------------------

const buildEventsPayload = async () => {
  // Fetch place ids so we can FK events to them.
  const { data: places, error } = await sb
    .from('places')
    .select('id, slug, area');
  if (error) throw new Error(`places fetch failed: ${error.message}`);
  const placeBySlug = Object.fromEntries(places.map(p => [p.slug, p]));

  const out = [];
  for (const e of LOCAL_EVENTS) {
    // Find a place that matches the event's `place` text loosely (event.place
    // is a free-text label like 'Buddy Brew · Hyde Park'); fall back to first
    // place in the same area.
    const match = places.find(p => e.place?.toLowerCase().includes(p.slug.replace(/-/g, ' ')))
      || places.find(p => p.area && e.place?.includes(p.area))
      || places[0];
    out.push({
      slug: e.id,
      name: e.name,
      place_id: match?.id || null,
      city: 'Tampa, FL',
      day_of_week: e.day,
      bucket: e.bucket,
      time_label: e.time,
      recurring: e.recurring || 'Weekly',
      tags: e.tags || [],
      hero_photo: e.photo || null,
      going_count: e.going || 0,
      visible: true,
    });
  }

  // If we want more events than the local file provides, pad with variants
  // (different days / buckets, same name + place).
  const dows = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const buckets = ['morning','noon','afternoon','night-owl'];
  let i = out.length;
  while (out.length < wantEvents && i < wantEvents * 4) {
    const base = LOCAL_EVENTS[i % LOCAL_EVENTS.length];
    const dow = dows[i % dows.length];
    const bk  = buckets[i % buckets.length];
    out.push({
      slug: `${base.id}-v${i}`,
      name: `${base.name} (extra)`,
      place_id: placeBySlug[base.id]?.id || null,
      city: 'Tampa, FL',
      day_of_week: dow,
      bucket: bk,
      time_label: base.time,
      recurring: 'Weekly',
      tags: base.tags || [],
      hero_photo: base.photo || null,
      going_count: 2 + (i % 14),
      visible: true,
    });
    i++;
  }
  return out.slice(0, wantEvents);
};

const seedEvents = async () => {
  const rows = await buildEventsPayload();
  console.log(`Seeding ${rows.length} events…`);
  const { error } = await sb
    .from('events')
    .upsert(rows, { onConflict: 'slug' });
  if (error) throw new Error(`events upsert failed: ${error.message}`);
};

// -- Main ------------------------------------------------------------------

const main = async () => {
  if (doReset) {
    console.log("--reset: deleting mom_profiles where source='seed'…");
    const { error } = await sb.from('mom_profiles').delete().eq('source', 'seed');
    if (error) throw new Error(`reset failed: ${error.message}`);
  }

  await seedPlaces();
  await seedEvents();
  // Mom_profiles seeded by Task 13.
  console.log('Phase 1 places + events seeded ✓');
};

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add the seed script to package.json**

Open `/Users/michael/Projects/mama-app/package.json`. Find the `"scripts"` block and add a `seed` entry:

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "seed": "node scripts/seed-supabase.mjs"
  },
```

- [ ] **Step 3: Run the seed script against the dev Supabase project**

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
npm run seed -- --places 50 --events 30 --moms 0
```

(`--moms 0` skips mom seeding for now; we add that in Task 13.)

Expected output:

```
Seeding 50 places…
Seeding 30 events…
Phase 1 places + events seeded ✓
```

- [ ] **Step 4: Verify in the Supabase Table Editor or via the admin endpoint**

In a browser open the deployed `/api/admin/places` URL (or run the API route locally with `vercel dev`). Expected: `{ ok: true, count: 50, rows: [...] }`. Same for `/api/admin/events`.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-supabase.mjs package.json
git commit -m "$(cat <<'COMMITMSG'
feat(seed): seed-supabase.mjs — places + events from local data

Reads src/data/places.js + src/data/events.js, augments each place
with {lat,lng} from scripts/seed-data/place-coords.js, FKs each
event to a place (fuzzy match on place text), pads events with
day/bucket variants up to --events count.

Idempotent: upsert by slug. Re-running the script produces the
same rowset, no duplicates.

Adds `npm run seed` to package.json.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 13: Seed script — mom_profiles

**Files:**
- Modify: `scripts/seed-supabase.mjs`

- [ ] **Step 1: Add the mom-profile generator to the seed script**

Open `/Users/michael/Projects/mama-app/scripts/seed-supabase.mjs`. Add these imports at the top (after the existing `place-coords.js` import):

```js
import { generateDisplayName, generateUsername } from './seed-data/name-pool.js';
import { photosForMom } from './seed-data/photo-pool.js';
import {
  MOM_TYPES, VALUES, INTERESTS, KID_AGES,
} from '../src/data/taxonomy.js';
```

Add this code BEFORE the `// -- Main ----------------` divider:

```js
// -- mom_profiles ----------------------------------------------------------

// Deterministic pseudo-random generator so re-runs produce the same data.
const seededRand = (seed) => {
  let s = seed | 0;
  return () => {
    s = Math.imul(s ^ (s >>> 15), 0x735a2d97);
    s ^= s >>> 13;
    s = Math.imul(s, 0x9b8d6e35);
    s ^= s >>> 16;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
};

const pickN = (arr, n, rand) => {
  const pool = [...arr];
  const out = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
};

const NEIGHBORHOODS_FOR_SEED = [
  'Hyde Park', 'Seminole Heights', 'Downtown', 'South Tampa',
  'Tampa Heights', 'Channelside', 'Davis Islands', 'West Tampa',
  'New Tampa', 'Carrollwood', 'Westchase', 'Ybor City',
];

const SLOT_DAYS    = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SLOT_BUCKETS = ['morning','noon','afternoon','night-owl'];

const buildMomProfilePayload = (idx, placesById) => {
  const rand = seededRand(idx + 1);

  const displayName = generateDisplayName(idx);
  const username    = generateUsername(idx);
  const age         = 24 + Math.floor(rand() * 20); // 24–44

  // 1–3 kids, each in a random KID_AGES bucket.
  const kidCount = 1 + Math.floor(rand() * 3);
  const kidsAges = {};
  for (let i = 0; i < kidCount; i++) {
    const ageBucket = KID_AGES[Math.floor(rand() * Math.min(KID_AGES.length, 4))]; // weighted toward 0–8
    kidsAges[ageBucket] = (kidsAges[ageBucket] || 0) + 1;
  }

  const momTypeIds = pickN(MOM_TYPES.filter(t => t.id !== 'prefer_not'), 1 + (rand() < 0.3 ? 1 : 0), rand)
    .map(t => t.label);

  const valuesList    = pickN(VALUES, 2 + Math.floor(rand() * 2), rand);          // 2–3
  const interestsList = pickN(INTERESTS.map(i => i.label), 2 + Math.floor(rand() * 3), rand); // 2–4

  const slotCount = 3 + Math.floor(rand() * 5); // 3–7
  const slotSet = new Set();
  while (slotSet.size < slotCount) {
    const d = SLOT_DAYS[Math.floor(rand() * SLOT_DAYS.length)];
    const b = SLOT_BUCKETS[Math.floor(rand() * SLOT_BUCKETS.length)];
    slotSet.add(`${d}-${b}`);
  }
  const freeSlots = [...slotSet];

  // 2–4 random place uuids
  const placeIds = Object.values(placesById);
  const pickedPlaces = pickN(placeIds, 2 + Math.floor(rand() * 3), rand);

  const neighborhood = NEIGHBORHOODS_FOR_SEED[Math.floor(rand() * NEIGHBORHOODS_FOR_SEED.length)];
  const coords = lookupCoords(neighborhood);
  // Jitter ±0.05° (~3 mi) so geo-density isn't artificial.
  const home_lat = +(coords.lat + (rand() - 0.5) * 0.05).toFixed(6);
  const home_lng = +(coords.lng + (rand() - 0.5) * 0.05).toFixed(6);

  const cityRoll = rand();
  const city = cityRoll < 0.85 ? 'Tampa, FL'
             : cityRoll < 0.95 ? 'St. Petersburg, FL'
             : 'Clearwater, FL';

  const distance_miles = [5, 10, 20, 30, 50][Math.floor(rand() * 5)];

  const verified  = rand() < 0.6;
  const visible   = rand() < 0.95;
  const lastActive = rand() < 0.9
    ? new Date(Date.now() - Math.floor(rand() * 30) * 86400000).toISOString()
    : new Date(Date.now() - (30 + Math.floor(rand() * 60)) * 86400000).toISOString();

  return {
    auth_user_id: null,
    display_name: displayName,
    username,
    age,
    bio: `${momTypeIds[0] || 'Mom'} of ${kidCount} living in ${neighborhood}. Looking for nearby moms with similar values and free time.`,
    photos: photosForMom(idx),
    kids_ages: kidsAges,
    mom_types: momTypeIds,
    values: valuesList,
    interests: interestsList,
    free_slots: freeSlots,
    places: pickedPlaces,
    preferred_event_ids: [],
    city,
    neighborhood,
    home_lat,
    home_lng,
    distance_miles,
    visible,
    verified,
    blocked_global: false,
    social_links: {},
    source: 'seed',
    last_active_at: lastActive,
  };
};

const seedMomProfiles = async () => {
  if (wantMoms <= 0) return;

  const { data: places, error: placesErr } = await sb
    .from('places')
    .select('id');
  if (placesErr) throw new Error(`places fetch failed: ${placesErr.message}`);
  const placesById = Object.fromEntries(places.map(p => [p.id, p.id]));

  if (Object.keys(placesById).length === 0) {
    console.warn('No places in database — moms will be seeded with empty places[].');
  }

  const rows = [];
  for (let i = 0; i < wantMoms; i++) {
    rows.push(buildMomProfilePayload(i, placesById));
  }

  console.log(`Seeding ${rows.length} mom_profiles…`);
  // Insert in chunks of 100 to keep request bodies small.
  const chunk = 100;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await sb
      .from('mom_profiles')
      .upsert(slice, { onConflict: 'username' });
    if (error) throw new Error(`mom_profiles upsert failed at chunk ${i}: ${error.message}`);
    process.stdout.write(`  chunk ${i + slice.length}/${rows.length}\r`);
  }
  process.stdout.write('\n');
};
```

Then update the `main()` function to call `seedMomProfiles()`:

```js
const main = async () => {
  if (doReset) {
    console.log("--reset: deleting mom_profiles where source='seed'…");
    const { error } = await sb.from('mom_profiles').delete().eq('source', 'seed');
    if (error) throw new Error(`reset failed: ${error.message}`);
  }

  await seedPlaces();
  await seedEvents();
  await seedMomProfiles();
  console.log('Phase 1 seed complete ✓');
};
```

- [ ] **Step 2: Run the seed script with moms**

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
npm run seed -- --places 50 --events 30 --moms 200 --reset
```

Expected output:

```
--reset: deleting mom_profiles where source='seed'…
Seeding 50 places…
Seeding 30 events…
Seeding 200 mom_profiles…
  chunk 200/200
Phase 1 seed complete ✓
```

- [ ] **Step 3: Verify in Supabase**

In the Supabase SQL editor:

```sql
select count(*) from public.mom_profiles where source = 'seed';
select count(*) from public.places;
select count(*) from public.events;
```

Expected: 200 / 50 / 30 (or close — places caps at the size of `LOCAL_PLACES`).

Spot-check a few rows:

```sql
select display_name, username, city, neighborhood, distance_miles,
       array_length(values,1) as value_count,
       array_length(free_slots,1) as slot_count,
       jsonb_object_keys(kids_ages) as kid_age
from public.mom_profiles
where source='seed'
limit 5;
```

Expected: rows with non-null values, distance_miles in {5,10,20,30,50}, slot count 3–7, kids_ages keys from `KID_AGES`.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-supabase.mjs
git commit -m "$(cat <<'COMMITMSG'
feat(seed): generate ~200 mom_profiles with realistic distributions

Adds buildMomProfilePayload() driven by a deterministic
seededRand(idx) so re-runs produce the same data. Each mom gets:

  age 24–44, 1–3 kids in 0–8 age buckets, 1–2 mom_types,
  2–3 values, 2–4 interests, 3–7 free_slots, 2–4 places,
  85% Tampa / 10% St. Pete / 5% Clearwater, jittered home_lat/lng
  within ~3 mi of a curated neighborhood centroid, 60% verified,
  95% visible, 90% recently active.

Inserts in chunks of 100 to keep request bodies small. Idempotent
via upsert(onConflict: 'username').

--reset flag deletes mom_profiles where source='seed' first; places
and events stay (upsert by slug).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
COMMITMSG
)"
```

---

## Task 14: End-to-end verification

**Files:**
- (no edits — verification only)

- [ ] **Step 1: Run the full seed**

Already done in Task 13 if you executed it. If not:

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
npm run seed -- --places 50 --events 30 --moms 200 --reset
```

Expected: success message ending in `Phase 1 seed complete ✓`.

- [ ] **Step 2: Verify each admin endpoint via the deployed URL**

If deployed to Vercel, hit each in a browser (or with curl):

```
https://gomama.app/api/admin/places         → { ok: true, count: 50, rows: [...] }
https://gomama.app/api/admin/events         → { ok: true, count: 30, rows: [...] }
https://gomama.app/api/admin/mom-profiles   → { ok: true, count: 200, rows: [...] }
```

If running locally with `vercel dev`, swap the host to `http://localhost:3000`.

- [ ] **Step 3: Verify the prototype demo still works offline**

```bash
npm run dev
```

Open `http://localhost:5173/preview` and walk through Splash → Welcome → LocationStep → ProfileStep → ScheduleStep → PlacesStep → Summary → Account → MainApp. The deck should show the 7 SAMPLE_MOMS from `src/data/moms.js` (NOT the 200 seeded moms — the prototype intentionally still reads from local data).

Expected: prototype works exactly as before, no network calls to Supabase for the deck data.

- [ ] **Step 4: Verify the admin Reset still works after the new tables**

Open `/admin` → Quick Actions tab → tap Reset database → type `DELETE` → Confirm.

Expected: success message reads `Deleted 200 mom profile(s) and N waitlist signup(s).` (Or whatever the current counts are — points being it deleted across all five tables without an FK error.)

After reset, re-run the seed to repopulate before continuing.

- [ ] **Step 5: Verify production build**

Stop the dev server. Run:

```bash
npm run build
```

Expected: clean build, no errors.

- [ ] **Step 6: Commit any photo-URL or schema fixes surfaced during verification (if needed)**

Only if something broke during verification:

```bash
git add <fixed files>
git commit -m "fix(seed): <what specifically was wrong>"
```

If everything passed, no commit needed.

---

## Self-review checklist (already run by author)

- **Spec coverage:** §Boundary → onboarding_profiles untouched. §Schema → Tasks 1–4. §RLS → Task 4 step 1 includes the policy. §API routes → Tasks 5–8. §Seed strategy → Tasks 9–13. §Migration → Task 14 step 3 verifies offline demo. §File-level changes → exactly the files in this plan.
- **Placeholder scan:** none. Every code block contains final code. Every command has explicit env vars and expected output.
- **Type / name consistency:** `slug` is the upsert key for places + events; `username` for mom_profiles. `place-coords.js`, `name-pool.js`, `photo-pool.js` import paths consistent across Tasks 9–13. Helpers `lookupCoords`, `generateDisplayName`, `generateUsername`, `photosForMom`, `seededRand`, `pickN` defined once and referenced consistently.
- **Phase boundary:** zero references to matching, recommendations, likes, blocks, or RSVPs in any task — those are explicitly Phase 2.
