# Data model — Phase 1: places, events, mom profiles

**Status:** approved 2026-05-07
**Owner:** Go Mama backend
**Scope:** Three new Supabase tables (`places`, `events`, `mom_profiles`), an admin-readable API surface, and a seed script that produces ~200 realistic Tampa-area moms + ~50 places + ~30 events.

## Goal

Move the prototype's mock data (`src/data/{moms,places,events}.js`) into a real Postgres model on Supabase so we can:

1. Hold real signups in `mom_profiles` once a mom finishes onboarding (parallel to the existing `onboarding_profiles` capture row).
2. Seed the database at any scale to develop and test search/matching against realistic distributions.
3. Have a stable surface that Phase 2 (matching, recommendations, likes/passes, blocks, RSVPs) can build on without re-shaping anything.

## Non-goals

- **No matching algorithm in this spec.** That's Phase 2 — its own design doc.
- **No social graph tables** (likes/passes/blocks/matches/messages). All Phase 2.
- **No public read API for moms.** Browsing other moms requires auth + RLS, which we'll wire when we have a real "browse" UI in the app. Phase 1 only adds an admin-side read for the dashboard.
- **The prototype demo stays offline.** `src/data/{moms,places,events}.js` continues to power `/preview` and `/live`. Two parallel data paths is the explicit decision — the demo never breaks for sharing/marketing.
- **No live geocoding service.** Lat/lng on places + moms is set at seed time; we don't call Google/Mapbox.

## Boundary with what already exists

`onboarding_profiles` (already shipped) stays as the per-session capture row. It carries everything a mom enters during onboarding plus auth-tied identifiers. It's the funnel state, not the discoverable profile.

`mom_profiles` (new) is the **discoverable directory** — one row per mom who finished onboarding, joined to `onboarding_profiles` via `auth_user_id`. The promote step (`/api/onboarding/signup`) becomes responsible for creating the `mom_profiles` row when an onboarding completes. The two tables share the same `auth_user_id` so joins are cheap.

Why two tables and not one:

- Onboarding state mutates wildly during signup (current_step, half-filled fields). Profile state is stable post-completion.
- Profile rows have visibility / soft-delete / moderation flags that don't apply to onboarding rows.
- Different RLS policies — Phase 2 needs `mom_profiles` readable by other authenticated moms; `onboarding_profiles` should never leak across sessions.

## Schema — SQL

### `places`

```sql
create table public.places (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,            -- 'buddy-brew', stable referenceable id
  name          text not null,                   -- 'Buddy Brew Coffee'
  area          text,                            -- 'Hyde Park'
  city          text not null,                   -- 'Tampa, FL'
  category      text not null,                   -- 'cafes' | 'parks' | 'playgrounds' | 'museums' | 'indoor' | 'libraries' | 'homes' | 'zoos' | 'water' | 'pools'
  description   text,
  tags          text[] not null default '{}',
  hero_photo    text,                            -- URL or null
  badge         text,                            -- 'Mom favorite' | 'Trending' | 'Top rated' | 'Best for kids' | 'Editor pick' | null
  rating        numeric(3,2),
  review_count  integer default 0,
  lat           numeric(9,6),
  lng           numeric(9,6),
  visible       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index places_category_idx on public.places (category) where visible;
create index places_city_idx     on public.places (city)     where visible;
create index places_geo_idx      on public.places (lat, lng) where visible;

alter table public.places enable row level security;
-- No public RLS yet. Service-role-only writes; reads via API routes.
```

### `events`

```sql
create table public.events (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  place_id      uuid references public.places(id) on delete set null,
  city          text not null,
  day_of_week   text not null check (day_of_week in ('Mon','Tue','Wed','Thu','Fri','Sat','Sun')),
  bucket        text not null check (bucket in ('morning','noon','afternoon','night-owl')),
  time_label    text not null,                   -- '10:00 AM'
  recurring     text default 'Weekly',           -- 'Weekly' | 'Monthly' | 'One-off'
  tags          text[] not null default '{}',
  hero_photo    text,
  going_count   integer not null default 0,
  visible       boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index events_city_day_idx on public.events (city, day_of_week) where visible;
create index events_bucket_idx   on public.events (bucket) where visible;
create index events_place_idx    on public.events (place_id);

alter table public.events enable row level security;
```

### `mom_profiles`

```sql
create table public.mom_profiles (
  id               uuid primary key default gen_random_uuid(),
  auth_user_id     uuid unique references auth.users(id) on delete cascade,

  -- Identity
  display_name     text not null,                  -- 'Sara K.'
  username         text unique,                    -- 'sarak'
  age              smallint,
  bio              text,                           -- max 280 chars (enforced app-side)
  photos           text[] not null default '{}',   -- URLs (Unsplash for seed, S3/Storage later)

  -- Family
  kids_ages        jsonb not null default '{}',    -- { "0–1": 1, "3–5": 2 }
  mom_types        text[] not null default '{}',   -- ['Working mom']

  -- Preference axes (used by matching in Phase 2)
  values           text[] not null default '{}',
  interests        text[] not null default '{}',
  free_slots       text[] not null default '{}',   -- ['Tue-morning','Sat-noon']
  places           uuid[] not null default '{}',   -- references places.id, but Postgres doesn't FK-check arrays
  preferred_event_ids uuid[] not null default '{}',

  -- Geo
  city             text not null,                  -- 'Tampa, FL'
  neighborhood     text,                           -- 'Hyde Park'
  home_lat         numeric(9,6),
  home_lng         numeric(9,6),
  distance_miles   smallint,                       -- 5 | 10 | 20 | 30 | 50 | 100 | 150

  -- Visibility / moderation
  visible          boolean not null default true,  -- soft-hide without delete
  verified         boolean not null default false, -- KYC / phone verified
  blocked_global   boolean not null default false, -- hard moderation flag

  -- Social links (mirrors onboarding_profiles.social_links shape)
  social_links     jsonb not null default '{}',

  -- Audit
  source           text not null default 'onboarding', -- 'onboarding' | 'seed' | 'admin-import'
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  last_active_at   timestamptz
);

create index mom_profiles_visible_city_idx on public.mom_profiles (city) where visible and not blocked_global;
create index mom_profiles_geo_idx          on public.mom_profiles (home_lat, home_lng) where visible and not blocked_global;
create index mom_profiles_kids_idx         on public.mom_profiles using gin (kids_ages);
create index mom_profiles_values_idx       on public.mom_profiles using gin (values);
create index mom_profiles_interests_idx    on public.mom_profiles using gin (interests);
create index mom_profiles_slots_idx        on public.mom_profiles using gin (free_slots);
create index mom_profiles_last_active_idx  on public.mom_profiles (last_active_at desc nulls last);

alter table public.mom_profiles enable row level security;
```

GIN indexes on the array columns let Phase 2 do `WHERE values && ARRAY[...]` (overlap operator) cheaply, which is the bread and butter of affinity matching.

### `updated_at` triggers

Reuse the existing `touch_onboarding_profiles_updated_at` pattern — one trigger per table, all calling a shared `touch_updated_at()` function. Define once:

```sql
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

Then for each new table:

```sql
drop trigger if exists places_updated_at on public.places;
create trigger places_updated_at before update on public.places
for each row execute function public.touch_updated_at();
-- (and same for events, mom_profiles)
```

## RLS policies — minimum for Phase 1

Phase 1 has no in-app browsing, so no policies allow row reads to authenticated users. Service-role bypasses RLS, so the API routes work. Add policies in Phase 2 when we wire the in-app discoverability surface.

If you want signed-in moms to read their own `mom_profiles` row before Phase 2 ships, add only this one policy:

```sql
create policy "moms read own mom_profile"
  on public.mom_profiles for select
  using (auth.uid() = auth_user_id);
```

## API routes (admin only for now)

Three new server-only endpoints under `api/admin/`. All reuse the `supabaseCreds()` + service role pattern.

| Method · Route                  | Returns                              | Used by |
|---------------------------------|--------------------------------------|---------|
| GET  `/api/admin/places`        | `{ ok, count, rows }` — all places   | future admin places tab |
| GET  `/api/admin/events`        | `{ ok, count, rows }` — all events   | future admin events tab |
| GET  `/api/admin/mom-profiles`  | `{ ok, count, rows }` — all mom_profiles | future admin moms-directory tab |

Each is a thin wrapper around `GET /rest/v1/<table>?select=*&limit=5000` mirroring `api/admin/onboarding.js`. The dashboard's existing tabs don't change — these routes exist now so the next pass can light them up.

The admin "Reset database" endpoint (`api/admin/reset.js`) needs to truncate the three new tables too. One-line addition to its `TABLES` array.

## Seed strategy

A new Node script at `scripts/seed-supabase.mjs` that uses `@supabase/supabase-js` with the service role key (read from `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars) to insert:

1. **~50 places** — copied from `src/data/places.js` plus 5 additional Tampa neighborhoods filled in. Each gets `lat`, `lng` from a hand-curated mapping of area → coordinates (e.g., `'Hyde Park' → 27.9355,-82.4795`). Deterministic — running the script twice should upsert by `slug`, not duplicate.

2. **~30 events** — every entry from `src/data/events.js` plus 22 generated variants (different days, places, time buckets) so the dashboard's funnel and slot-coverage views have realistic data.

3. **~200 mom_profiles** — generated. Each mom has:
   - Display name from a 30-name pool (`['Sara K.', 'Mei L.', 'Aisha R.', ...]` cycled with random suffixes).
   - Age 24–44 (skew toward 28–35).
   - 1–3 kids, each placed into a random `KID_AGES` bucket weighted toward 0–5.
   - 1 random `mom_types` (or 2 if random > 0.7).
   - 2–3 random values from `VALUES`, 2–4 random interests from `INTERESTS`.
   - 3–7 random slots biased toward weekday mornings + Sat midday.
   - 2–4 random place ids from the seeded `places` table, biased toward `'cafes'` and `'parks'`.
   - City = `'Tampa, FL'` for ~85%, sprinkled with `'St. Petersburg, FL'` and `'Clearwater, FL'`.
   - Lat/lng generated as `home_lat = 27.95 + (random() - 0.5) * 0.3` (and similar for lng around `-82.45`) — clustered around Tampa.
   - 60% verified, 95% visible, ~5% with `last_active_at` more than 30 days ago.
   - Photos: pick 1–3 from a fixed pool of ~50 known-good Unsplash mom-portrait URLs (verified once at seed-script-write time).
   - `auth_user_id = null` for seeded rows. Real signups get one via the promote handler.
   - `source = 'seed'` so we can wipe seed-only rows with a query later.

Idempotency: each seeded mom has a deterministic `username` derived from a (name, salt) pair so re-running the script produces the same set. Insert with `upsert(... { onConflict: 'username' })`.

The script accepts `--moms 200 --places 50 --events 30 --reset` flags. `--reset` deletes everything where `source='seed'` first.

## Migration to keep the demo offline

Phase 1 does NOT change `src/data/{moms,places,events}.js`. Those keep powering the `/preview` and `/live` routes via direct imports. The prototype's `MatchesTab`, `PlacesTab`, `EventsTab`, etc. all keep importing from `../../data/*` — no changes.

Future work (Phase 2) will introduce a thin data-source abstraction (`src/services/places.js`, etc.) that picks between the local file and the Supabase API based on a `VITE_DATA_SOURCE` env var. Out of scope for this spec.

## File-level changes

| Action | Path | Purpose |
|---|---|---|
| New  | `supabase/places_schema.sql`        | DDL for `places` |
| New  | `supabase/events_schema.sql`        | DDL for `events` |
| New  | `supabase/mom_profiles_schema.sql`  | DDL for `mom_profiles` + shared `touch_updated_at` function |
| New  | `api/admin/places.js`               | GET reader |
| New  | `api/admin/events.js`               | GET reader |
| New  | `api/admin/mom-profiles.js`         | GET reader |
| Edit | `api/admin/reset.js`                | Add three new tables to the `TABLES` array (only seeded rows? or everything? See open questions.) |
| New  | `scripts/seed-supabase.mjs`         | Generative seed |
| New  | `scripts/seed-data/`                | Curated source-of-truth data files imported by the seed script (place-area-to-latlng map, name pool, photo pool) |
| Edit | `package.json`                      | Add `seed` script (`node scripts/seed-supabase.mjs`) |

`src/data/*` is unchanged.

## Verification

After Phase 1 implementation:

1. SQL DDLs apply cleanly to a fresh Supabase project.
2. `npm run seed` (or `node scripts/seed-supabase.mjs`) inserts 50/30/200 rows. Re-running it doesn't duplicate.
3. The three new admin GET endpoints return matching counts.
4. The admin "Reset database" tab still works after the table list grows. (See open question on whether reset should wipe seed data too.)
5. `npm run build` clean. `/preview` and `/live` still demo-work without env vars.

## Open questions for Phase 2

- **Matching algorithm weight tuning.** Equal weights on (slot overlap, place overlap, interest overlap, value overlap, kid-stage compatibility, geographic distance), or load most weight on slot+geo (the hard constraints)?
- **Match score caching.** On-the-fly compute vs. nightly precompute into `recommendations`?
- **Mutual-match write strategy.** Trigger that writes a `matches` row when both sides have liked? Or compute mutuals from the `match_actions` table on read?
- **Block reciprocity.** When user A blocks user B, should B also stop seeing A in their feed (we don't tell B), or only A's feed is affected?
- **Should the admin reset wipe all rows or only `source='seed'`?** Today it wipes everything; once we have real signups, wiping seed-only is safer.

These are not Phase 1 decisions and should be answered in the Phase 2 spec.
