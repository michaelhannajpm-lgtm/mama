# Family Data Ingestion — Places vertical slice (design)

**Date:** 2026-06-08
**Status:** Approved design, pre-implementation
**Skill:** `.claude/skills/family-data-ingestion/SKILL.md` (+ `references/data-contract.md`, `references/source-strategy.md`)

## Goal

Turn Go Mama's place directory from hardcoded data into a live, ingested, admin-curated
dataset. Pull real Tampa family places from Google Places, stage them for human review,
let an admin see/filter/edit/approve them, and have the app's screens read approved
("visible") data from a server API instead of `src/data/places.js`.

This spec covers **Places only** — the first of three vertical slices. Events and
Meetups reuse the same proven pattern in later specs.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Sequencing | **Vertical slice, Places first** (schema → API → screens → ingest → admin), then Events, then Meetups |
| Place source | **Google Places only** (best quality: address, geo, phone, rating, hours) |
| API key | User adds `GOOGLE_PLACES_API_KEY` **now** → live ingestion run this session |
| Admin depth | **Full CRUD** + dedupe-merge + map preview + in-app card preview + photo picker |
| App data access | **Server API routes** (service-role, visible-only), consumed via `src/lib` client |
| Screen wiring | **Approach A** — central loader in `App.jsx` + prop drilling (matches conventions), hardcoded data kept as dev fallback |
| Image Tier 2 | **No AI yet** — Tier 1 Google photo (proxied + attribution), Tier 3 branded `sharp` gradient fallback; `place_photos` schema ready for AI later |
| DB changes | Via **Supabase MCP** (project `jsclxwvgeirbdovsjbnv`); fallback = versioned `supabase/_apply_*.sql` applied with service-role, per existing pattern |

## Out of scope (this slice)

- Events and Meetups ingestion/wiring (later specs, same pattern).
- Cron/scheduled ingestion (CLI only for now; schema + endpoint shape leave room).
- AI image generation (Tier 2) — schema supports it; not wired.
- Non-Google place sources (OSM, venue JSON-LD) — not built.

---

## 1. Data model

First action: **verify the live `places.category` CHECK constraint via Supabase MCP.**
The on-disk `supabase/places_schema.sql` is stale (it lists `cafes/parks/...`), but
`seed.js` already writes the new taxonomy, so the live constraint likely already accepts
`schools, childcare, extracurricular, camps, health, wellness, sports, fun`. If it does
not, `ALTER` it. Never trust the `.sql` file alone.

### 1.1 `places` — extended columns (additive, safe)

Existing columns stay. Add:

```sql
alter table public.places
  add column if not exists aka              text[] not null default '{}',
  add column if not exists address          text,
  add column if not exists website          text,
  add column if not exists reference_url    text,            -- canonical info/source page (≠ website)
  add column if not exists phone            text,
  add column if not exists social_links     jsonb not null default '{}'::jsonb,
  add column if not exists google_place_id  text,            -- Google external id
  add column if not exists google_maps_url  text,
  add column if not exists hours            jsonb,           -- weekly opening hours
  add column if not exists business_status  text,            -- operational / closed_temporarily / closed
  add column if not exists price_level      smallint,        -- 0..4 (Google)
  add column if not exists age_min          smallint,
  add column if not exists age_max          smallint,
  add column if not exists amenities        jsonb not null default '{}'::jsonb,
  add column if not exists good_for         text[] not null default '{}',
  add column if not exists review_status    text not null default 'needs_review'
       check (review_status in ('needs_review','approved','rejected','archived')),
  add column if not exists last_seen_at     timestamptz,
  add column if not exists source_confidence numeric(4,3);

create unique index if not exists places_google_place_id_key
  on public.places (google_place_id) where google_place_id is not null;
create index if not exists places_review_status_idx on public.places (review_status);
```

`amenities` jsonb shape (all optional booleans):
`stroller_friendly, changing_table, nursing_room, highchairs, indoor, outdoor,
restrooms, free, parking, membership_required, food_onsite`.

**Backfill:** existing curated rows → `review_status='approved'` (they are hand-curated
and already `visible=true`). New ingested rows → `review_status='needs_review'`,
`visible=false`.

### 1.2 `categories` — metadata table

Promotes hardcoded `PLACE_CATEGORIES` to a managed table.

```sql
create table if not exists public.categories (
  id          text primary key,        -- 'fun','sports',...
  label       text not null,
  icon        text,                    -- lucide icon name
  description text,
  kind        text not null default 'place' check (kind in ('place','event')),
  sort_order  integer not null default 0,
  visible     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
```

Seed it from the current 8 place categories (id, label, icon, sort_order).

### 1.3 `place_categories` — multi-category join

```sql
create table if not exists public.place_categories (
  place_id    uuid not null references public.places(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  primary key (place_id, category_id)
);
```

`places.category` remains the single **primary** category (drives existing tab grouping);
this join adds secondary memberships (e.g. a swim school in `sports` **and** `fun`).

### 1.4 `place_photos` — gallery + attribution + provenance

```sql
create table if not exists public.place_photos (
  id            uuid primary key default gen_random_uuid(),
  place_id      uuid not null references public.places(id) on delete cascade,
  url           text,                  -- Supabase Storage URL (owned imgs) OR null for google-ref
  google_ref    text,                  -- Google photo resource name (served via proxy)
  source        text not null check (source in ('google','generated','manual')),
  attribution   text,                  -- required for google
  width         integer,
  height        integer,
  is_hero       boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists place_photos_place_idx on public.place_photos (place_id);
```

`places.hero_photo` mirrors the chosen hero (Storage URL or proxy URL) for cheap reads.

### 1.5 Provenance tables (from data-contract.md)

`ingestion_sources`, `ingestion_runs`, `source_records` exactly as specified in
`references/data-contract.md`, with `source_records` unique on
`(source_id, external_id, record_type)` for idempotent re-runs. Google `place_id` is the
external id.

### 1.6 Supabase Storage

Create a **public** bucket `place-photos` for owned/generated images (Tier 3 gradients
now; Tier 2 AI later). Google photos are **not** rehosted here.

---

## 2. API surface

### Public (new)
- `GET /api/places` — service-role server route, returns **only `visible=true`**, joined
  with `place_categories`/`categories`/`place_photos`, shaped into the existing client
  structures (`PLACES` grouped by primary category, `TOP_PICKS`, plus a flat list).
  `Cache-Control` short TTL.
- `GET /api/categories` — visible categories (kind='place'), ordered by `sort_order`.
- `GET /api/places/photo?ref=<google_ref>` — server proxy that 302-redirects to the
  Google Place Photo endpoint with the key applied server-side; keeps key secret, honors
  attribution. Owned images skip the proxy (direct Storage URL).

### Admin
- `GET /api/admin/places` — **exists**; `select=*` already surfaces new columns. Extend to
  embed `place_categories`/`place_photos` for the review UI.
- `POST /api/admin/places/update` — **new**, admin-gated (modeled on
  `api/admin/mom-profiles/update.js`). Actions: set `review_status`, set `visible`,
  bulk approve+publish, edit fields, set/reorder photos + set hero, regenerate gradient,
  merge duplicate (fold source_records + delete loser), delete, create.

---

## 3. Ingestion pipeline

Mirrors the seed split — core in `api/_lib/`, thin CLI in `scripts/`.

```
api/_lib/ingestion/
  sources.js              # config registry: Tampa query→category set, limit, cadence, parserVersion
  connectors/
    google-places.js      # Places API (New): places:searchText + Place Details with field
                          #   masks (cost control), locationBias around Tampa, bounded
                          #   retry/backoff honoring Retry-After; place_id = external id
  normalize.js            # google place → placeCandidate: map google types → primary + secondary
                          #   categories (data-contract mapping), derive amenities/age hints from
                          #   types, compose magazine-voice description, collect photo refs,
                          #   normalize city to 'Tampa, FL', area via place-coords/geo
  dedupe.js               # 1) source_records(place_id) 2) name+city/area
                          #   3) geo ~75m + name similarity → ambiguous flagged for admin merge
  images.js               # hero resolve: google photo ref(+attribution); else sharp branded
                          #   gradient → upload to Storage 'place-photos'
  writer.js               # service-role client (like seed.js): upsert places by slug, write
                          #   place_categories, place_photos, source_records, ingestion_runs;
                          #   NEW rows visible=false, review_status='needs_review'; never
                          #   overwrite curated/admin-edited fields on existing approved rows
  runIngestion.js         # orchestrate per source: fetch→normalize→dedupe→images→write;
                          #   per-source try/catch; write ingestion_runs summary row
scripts/ingest-family-data.mjs   # thin CLI wrapper
scripts/ingestion/fixtures/      # checked-in Google sample → expected normalized output
```

- `package.json`: add `"ingest": "node scripts/ingest-family-data.mjs"`.
- Flags: `--dry-run`, `--source <id>`, `--limit <n>`, `--since <date>`.
- Dry-run prints counts: fetched, normalized, deduped, would-create, would-update,
  skipped, errors.
- `GOOGLE_PLACES_API_KEY` read **server-side only**.
- Slug safety: generated `name+city` slugs must never collide with curated short ids
  (`'bayshore'`, `'glazer'`); namespace if needed. Upsert key is `slug`.

### Source registry (initial Tampa queries)

`google-places-tampa` runs a set of `(query, primaryCategory)` searches biased to Tampa,
e.g. children's museum→fun, playground→fun, library→fun, aquarium/zoo→fun, swim
school→sports, gymnastics→sports, soccer→sports, kids dentist/pediatrics→health,
prenatal yoga→wellness, preschool/VPK→schools, daycare→childcare, art/music/coding
class→extracurricular, summer camp→camps, family cafe→fun. Exact list lives in
`sources.js` and is verified live during implementation.

---

## 4. Admin CRUD (full)

New "Places" management view inside the existing `/admin` dashboard (`AdminPage.jsx`).

- **Filterable review queue:** review_status, category, neighborhood, has-photo,
  min-rating, source, confidence + name search.
- **Per-row:** Approve / Reject / Hide.
- **Bulk:** checkbox multi-select → Approve+Publish / Reject.
- **Edit modal:** name, primary + secondary categories, area, address, description, tags,
  amenities, hours, age range, photos (picker, reorder, set hero, regenerate gradient),
  `visible`.
- **Preview:** map pin (lat/lng) + in-app card preview (renders exactly as the app shows
  it) so the admin vets before publishing.
- **Dedupe merge:** incoming vs existing side-by-side → Merge.
- **Add / delete** place.

All writes go through `POST /api/admin/places/update` (admin-gated).

---

## 5. Screen wiring (Approach A)

- `App.jsx` fetches `GET /api/places` + `GET /api/categories` on mount, stores in state,
  drills to screens as props (matches "state lives in App.jsx").
- New `src/lib/places-api.js` reshapes the API payload into existing client shapes
  (`PLACES` grouped, `TOP_PICKS`, `PLACE_CATEGORIES`) so consumers change minimally.
- Consumers updated to read props/loaded data instead of importing constants:
  `screens/MainApp/PlacesTab.jsx`, `ActivitiesTab.jsx`, `FavoritesTab.jsx`,
  `screens/onboarding/AboutYou.jsx`, and sheets referencing `findPlace`
  (`MyPlansSheet`, `MyVillageSheet`).
- Hardcoded `src/data/places.js` stays as **dev fallback** so the app never renders blank
  if the API is unavailable.
- Loading / empty / error states handled once in `App.jsx`.

---

## 6. Seed script update

Extend `api/_lib/seed.js` so seeded data shares the new shape:
- Populate `categories` (8 place categories) and `place_categories`.
- Set curated places `review_status='approved'`.
- Optionally create a `place_photos` row per curated place (gradient) so seeded cards have
  a hero.
- Keep idempotent upsert-by-slug behavior.

---

## 7. Validation

- **No test framework exists.** Use built-in `node --test` for parser fixtures
  (`scripts/ingestion/fixtures/*.test.mjs`) — never hit live Google in tests.
- `node --check` on changed `.mjs`/`.js` (ingestion code is not covered by `npm run build`,
  which only bundles the Vite frontend).
- `npm run build` must pass if `src/` changed.
- Live ingestion: `npm run ingest -- --source google-places-tampa --dry-run --limit 5`
  before any write; inspect counts; then a real bounded run.
- Verify new rows land `visible=false` / `review_status='needs_review'`.
- End-to-end check: ingest → admin filter/approve → `/api/places` returns it → app screen
  shows it.

---

## 8. Dependencies / preconditions

- `GOOGLE_PLACES_API_KEY` in `.env` with billing enabled (user provides).
- Supabase MCP available, or service-role SQL fallback.
- Supabase Storage `place-photos` public bucket created.
- `sharp` (already a devDependency) used for gradient generation.

---

## 9. Implementation milestones (suggested order)

1. DB: verify/alter taxonomy; add columns; create `categories`, `place_categories`,
   `place_photos`, provenance tables; backfill; create Storage bucket; seed `categories`.
2. Public API: `GET /api/categories`, `GET /api/places` (visible-only), `/api/places/photo`.
3. Screen wiring (Approach A) on seeded/approved data — app goes live-dynamic.
4. Ingestion pipeline + CLI + fixtures; dry-run; live bounded Tampa run.
5. Admin: `POST /api/admin/places/update` + full CRUD/review UI in `AdminPage.jsx`.
6. Approve a batch in admin → confirm end-to-end in app.
7. Update `seed.js` for the new shape; update the skill's references if reality shifted.

Milestone 3 before 4 means the app is already reading live data when ingested rows start
arriving, so admin approvals are immediately visible end-to-end.
