# Family Data Ingestion — Places Vertical Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Go Mama's hardcoded place directory with a live pipeline — ingest real Tampa family places from Google Places, stage them for admin review, approve/edit them in a full-CRUD admin tool, and serve approved ("visible") places to the app via server API routes.

**Architecture:** Additive DB schema (extend `places`, add `categories`/`place_categories`/`place_photos` + provenance tables) → public service-role read routes (`/api/places`, `/api/categories`, `/api/places/photo`) → `App.jsx` central loader drills live data to screens (hardcoded data kept as fallback) → config-driven ingestion pipeline under `api/_lib/ingestion/` with a CLI → full-CRUD admin review view in `AdminPage.jsx`. Mirrors the existing `seed.js` + `scripts/seed-supabase.mjs` split.

**Tech Stack:** Vite/React 18, Supabase (Postgres + Storage, `@supabase/supabase-js` + PostgREST/fetch), Vercel serverless functions, Node built-in `fetch`, `node:test` for fixtures, `sharp` for gradient images, Google Places API (New).

**Spec:** `docs/superpowers/specs/2026-06-08-family-data-ingestion-places-design.md`

**Conventions that constrain this plan:**
- Named exports only, one component per file (except `MainApp/index.jsx`). State lives in `App.jsx`; prop-drill, no Context/store.
- Always reference `C.tokenName` (from `src/theme.js`) — never hardcode hex. Coral=1:1, sage=community, saffron=premium.
- All data access goes through `/api/*`; admin routes gated by `requireAdmin`. New rows: `visible=false`, `review_status='needs_review'`.
- City stored as `'Tampa, FL'` (with state). Generated slugs must never collide with curated short ids (`'bayshore'`).
- DB DDL applied via the **Supabase MCP** (project `jsclxwvgeirbdovsjbnv`) `execute_sql`/`apply_migration`; if MCP tools are unavailable, paste the versioned `supabase/_apply_phase3_*.sql` into the Supabase SQL editor. The stale `places_schema.sql` is NOT ground truth — verify the live constraint first.

---

## Preconditions

- [ ] **Confirm env vars exist** (server-only, not `VITE_`-prefixed): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`. Add `GOOGLE_PLACES_API_KEY` to `.env` (Google Cloud project with Places API (New) enabled + billing).

```bash
grep -E 'SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|ADMIN_PASSWORD|ADMIN_SESSION_SECRET|GOOGLE_PLACES_API_KEY' .env | sed 's/=.*/=***/'
```
Expected: all five names present.

- [ ] **Add a test runner script.** Edit `package.json` scripts, add `"test": "node --test"` and `"ingest": "node scripts/ingest-family-data.mjs"`.

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "seed": "node scripts/seed-supabase.mjs",
  "ingest": "node scripts/ingest-family-data.mjs",
  "test": "node --test"
}
```

- [ ] Commit: `git add package.json && git commit -m "chore: add test + ingest npm scripts"`

---

# Phase 1 — Database foundation

All Phase 1 SQL is collected into one versioned file `supabase/_apply_phase3_places.sql` (source of truth, matches the repo's `_apply_phase*.sql` convention), then applied live via the Supabase MCP. Build the file task-by-task, applying each block as you go.

### Task 1: Verify & reconcile the `places.category` constraint

**Files:** Create `supabase/_apply_phase3_places.sql` (start it)

- [ ] **Step 1: Read the live constraint** via Supabase MCP `execute_sql` (project `jsclxwvgeirbdovsjbnv`):

```sql
select pg_get_constraintdef(c.oid) as def, c.conname
from pg_constraint c
join pg_class t on t.oid = c.conrelid
where t.relname = 'places' and c.contype = 'c';
```
Expected: one or more CHECK defs. Note whether `category` allows the app taxonomy
(`schools, childcare, extracurricular, camps, health, wellness, sports, fun`) or the old set
(`cafes, parks, ...`).

- [ ] **Step 2: Begin the migration file.** Create `supabase/_apply_phase3_places.sql`:

```sql
-- Phase 3: Places ingestion foundation.
-- Apply via Supabase MCP execute_sql, or paste into the Supabase SQL editor.
-- Idempotent: safe to re-run.

-- 1. Reconcile taxonomy to the app's 8 categories (only needed if the live
--    constraint still lists the old taxonomy; harmless if already correct).
alter table public.places drop constraint if exists places_category_check;
alter table public.places add constraint places_category_check
  check (category in (
    'schools','childcare','extracurricular','camps',
    'health','wellness','sports','fun'
  ));
```

- [ ] **Step 3: Apply this block** via MCP `execute_sql`. Expected: `ALTER TABLE` success, no rows.
- [ ] **Step 4: Re-run the Step 1 query.** Expected: `category` CHECK now lists the 8 app categories.
- [ ] **Step 5: Commit** `git add supabase/_apply_phase3_places.sql && git commit -m "feat(db): reconcile places.category taxonomy"`

### Task 2: Extend `places` with ingestion + rich fields

**Files:** Modify `supabase/_apply_phase3_places.sql`

- [ ] **Step 1: Append the column additions** to `supabase/_apply_phase3_places.sql`:

```sql
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
```

- [ ] **Step 2: Apply via MCP.** Expected: success.
- [ ] **Step 3: Backfill curated rows to approved** (they're hand-curated + already visible):

```sql
update public.places set review_status = 'approved'
where review_status = 'needs_review' and visible = true;
```
Apply via MCP. Expected: `UPDATE <n>` where n = current curated place count.

- [ ] **Step 4: Verify columns exist:**

```sql
select column_name from information_schema.columns
where table_name = 'places' and column_name in
  ('address','reference_url','review_status','google_place_id','amenities');
```
Expected: 5 rows.

- [ ] **Step 5: Commit** `git add supabase/_apply_phase3_places.sql && git commit -m "feat(db): rich + provenance columns on places"`

### Task 3: `categories` metadata table + seed

**Files:** Modify `supabase/_apply_phase3_places.sql`

- [ ] **Step 1: Append** to the migration file:

```sql
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
```

- [ ] **Step 2: Apply via MCP.** Expected: success.
- [ ] **Step 3: Verify:** `select count(*) from public.categories where kind='place';` Expected: `8`.
- [ ] **Step 4: Commit** `git add supabase/_apply_phase3_places.sql && git commit -m "feat(db): categories metadata table + seed 8"`

### Task 4: `place_categories` join

**Files:** Modify `supabase/_apply_phase3_places.sql`

- [ ] **Step 1: Append + apply:**

```sql
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
```

- [ ] **Step 2: Verify:** `select count(*) from public.place_categories;` Expected: ≥ current place count.
- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(db): place_categories join + backfill"`

### Task 5: `place_photos` table

**Files:** Modify `supabase/_apply_phase3_places.sql`

- [ ] **Step 1: Append + apply:**

```sql
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
```

- [ ] **Step 2: Verify:** `select count(*) from public.place_photos;` Expected: `0`.
- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(db): place_photos table"`

### Task 6: Provenance tables

**Files:** Modify `supabase/_apply_phase3_places.sql`

- [ ] **Step 1: Append + apply** (verbatim from `references/data-contract.md`):

```sql
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
```

- [ ] **Step 2: Verify:** `select count(*) from public.ingestion_sources;` Expected: `0` (no error = tables exist).
- [ ] **Step 3: Commit** `git add -A && git commit -m "feat(db): ingestion provenance tables"`

### Task 7: Storage bucket `place-photos`

**Files:** none (live resource)

- [ ] **Step 1: Create a public bucket** via Supabase MCP, or via the Storage REST API with the service-role key:

```bash
curl -s -X POST "$SUPABASE_URL/storage/v1/bucket" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"place-photos","name":"place-photos","public":true}'
```
Expected: `{"name":"place-photos"}` (or `Duplicate` if it already exists — fine).

- [ ] **Step 2: Verify public read** — list buckets:

```bash
curl -s "$SUPABASE_URL/storage/v1/bucket/place-photos" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: JSON with `"public": true`.

---

# Phase 2 — Public read API

### Task 8: `GET /api/categories`

**Files:** Create `api/categories.js`

- [ ] **Step 1: Write the handler:**

```js
// GET /api/categories — public. Visible place categories ordered by sort_order.
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/categories` +
      `?select=id,label,icon,description,sort_order&kind=eq.place&visible=eq.true&order=sort_order.asc`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    return json(res, 200, { ok: true, rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
```

- [ ] **Step 2: Syntax check:** `node --check api/categories.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/categories.js && git commit -m "feat(api): GET /api/categories"`

### Task 9: Reshape helper + `GET /api/places`

**Files:** Create `api/_lib/places-shape.js`, `api/_lib/places-shape.test.mjs`, `api/places.js`

- [ ] **Step 1: Write the failing test** `api/_lib/places-shape.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupPlaces } from './places-shape.js';

test('groups visible rows by primary category into PLACES shape', () => {
  const rows = [
    { id: '1', slug: 'a', name: 'A', category: 'fun', area: 'Hyde Park', tags: [], hero_photo: null },
    { id: '2', slug: 'b', name: 'B', category: 'sports', area: 'Westshore', tags: ['Swim'], hero_photo: 'x' },
    { id: '3', slug: 'c', name: 'C', category: 'fun', area: 'Downtown', tags: [], hero_photo: null },
  ];
  const out = groupPlaces(rows);
  assert.equal(out.fun.length, 2);
  assert.equal(out.sports.length, 1);
  assert.equal(out.fun[0].id, '1');
});

test('derives TOP_PICKS from highest-rated rows with a rating', () => {
  const rows = [
    { id: '1', slug: 'a', name: 'A', category: 'fun', rating: 4.9, review_count: 10, badge: 'Mom favorite' },
    { id: '2', slug: 'b', name: 'B', category: 'fun', rating: null, review_count: 0 },
  ];
  const { topPicks } = groupPlaces(rows, { withTopPicks: true });
  assert.equal(topPicks.length, 1);
  assert.equal(topPicks[0].placeId, 'a');
});
```

- [ ] **Step 2: Run, verify it fails:** `node --test api/_lib/places-shape.test.mjs` Expected: FAIL (`groupPlaces` not found).

- [ ] **Step 3: Implement** `api/_lib/places-shape.js`:

```js
// Reshape flat DB place rows into the client structures the app already uses:
//   PLACES (object keyed by primary category) and TOP_PICKS.
const CATEGORY_ORDER = ['fun','sports','wellness','schools','childcare','extracurricular','camps','health'];

export const groupPlaces = (rows, { withTopPicks = false } = {}) => {
  const grouped = {};
  for (const cat of CATEGORY_ORDER) grouped[cat] = [];
  for (const row of rows) {
    const cat = grouped[row.category] ? row.category : 'fun';
    grouped[cat].push(row);
  }
  if (!withTopPicks) return grouped;

  const topPicks = rows
    .filter(r => typeof r.rating === 'number' && r.rating > 0)
    .sort((a, b) => (b.rating - a.rating) || ((b.review_count || 0) - (a.review_count || 0)))
    .slice(0, 5)
    .map(r => ({ placeId: r.slug, rating: r.rating, reviews: r.review_count || 0, badge: r.badge || 'Top rated' }));
  return { ...grouped, topPicks };
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/places-shape.test.mjs` Expected: PASS (2 tests).

- [ ] **Step 5: Write the route** `api/places.js`:

```js
// GET /api/places — public. Visible places only, grouped + top picks.
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';
import { groupPlaces } from './_lib/places-shape.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=120');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const select = 'id,slug,name,category,area,city,description,tags,hero_photo,badge,' +
      'rating,review_count,lat,lng,address,website,reference_url,phone,hours,amenities,' +
      'good_for,age_min,age_max,price_level';
    const url = `${creds.supabaseUrl}/rest/v1/places` +
      `?select=${select}&visible=eq.true&order=name.asc&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    const { topPicks, ...grouped } = groupPlaces(rows, { withTopPicks: true });
    return json(res, 200, { ok: true, count: rows.length, places: grouped, topPicks, flat: rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
```

- [ ] **Step 6: Syntax check:** `node --check api/places.js` Expected: no output.
- [ ] **Step 7: Commit** `git add api/_lib/places-shape.js api/_lib/places-shape.test.mjs api/places.js && git commit -m "feat(api): GET /api/places (visible-only, grouped) + reshape helper"`

### Task 10: `GET /api/places/photo` proxy

**Files:** Create `api/places/photo.js`

- [ ] **Step 1: Write the handler** (keeps the Google key server-side; redirects to Google's Place Photo media endpoint):

```js
// GET /api/places/photo?ref=<google photo resource name>&w=800
// 302-redirects to the Google Places (New) photo media URL with the key applied
// server-side, so the key never reaches the browser and we don't rehost Google imagery.
import { json } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return json(res, 500, { error: 'GOOGLE_PLACES_API_KEY not configured' });

  const ref = typeof req.query?.ref === 'string' ? req.query.ref : '';
  // resource name looks like: places/XXX/photos/YYY  — allow only that shape.
  if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(ref)) {
    return json(res, 400, { error: 'invalid photo ref' });
  }
  const w = Math.min(parseInt(req.query?.w, 10) || 800, 1600);
  const target = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${w}&key=${key}`;
  res.statusCode = 302;
  res.setHeader('Location', target);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end();
}
```

- [ ] **Step 2: Syntax check:** `node --check api/places/photo.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/places/photo.js && git commit -m "feat(api): GET /api/places/photo proxy"`

---

# Phase 3 — Wire app screens to live data (Approach A)

### Task 11: `src/lib/places-api.js` client + reshape fallback

**Files:** Create `src/lib/places-api.js`, `src/lib/places-api.test.mjs`

- [ ] **Step 1: Write the failing test** `src/lib/places-api.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlacesPayload } from './places-api.js';

test('passes through a well-formed payload', () => {
  const out = normalizePlacesPayload({ places: { fun: [{ id: '1' }] }, topPicks: [{ placeId: 'a' }] });
  assert.equal(out.places.fun.length, 1);
  assert.equal(out.topPicks.length, 1);
});

test('falls back to empty groups when payload is missing', () => {
  const out = normalizePlacesPayload(null);
  assert.deepEqual(out.topPicks, []);
  assert.ok(out.places && typeof out.places === 'object');
});
```

- [ ] **Step 2: Run, verify fail:** `node --test src/lib/places-api.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `src/lib/places-api.js`:

```js
// Client for the public places API. Fetches /api/places + /api/categories and
// normalizes into the shapes screens consume (PLACES grouped, TOP_PICKS).
const EMPTY_GROUPS = { fun: [], sports: [], wellness: [], schools: [], childcare: [], extracurricular: [], camps: [], health: [] };

export const normalizePlacesPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return { places: { ...EMPTY_GROUPS }, topPicks: [], flat: [] };
  return {
    places: { ...EMPTY_GROUPS, ...(payload.places || {}) },
    topPicks: Array.isArray(payload.topPicks) ? payload.topPicks : [],
    flat: Array.isArray(payload.flat) ? payload.flat : [],
  };
};

export const fetchPlaces = async () => {
  const res = await fetch('/api/places', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`places ${res.status}`);
  return normalizePlacesPayload(await res.json());
};

export const fetchCategories = async () => {
  const res = await fetch('/api/categories', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`categories ${res.status}`);
  const body = await res.json();
  return Array.isArray(body.rows) ? body.rows : [];
};
```

- [ ] **Step 4: Run, verify pass:** `node --test src/lib/places-api.test.mjs` Expected: PASS.
- [ ] **Step 5: Commit** `git add src/lib/places-api.js src/lib/places-api.test.mjs && git commit -m "feat(lib): places-api client + normalize"`

### Task 12: `App.jsx` central loader

**Files:** Modify `src/App.jsx`

- [ ] **Step 1: Add imports** near the top of `src/App.jsx` (after existing imports):

```jsx
import { fetchPlaces } from './lib/places-api';
import { PLACES as FALLBACK_PLACES, TOP_PICKS as FALLBACK_TOP_PICKS } from './data/places';
```

- [ ] **Step 2: Add loader state + effect** inside the `App` component, alongside the other `useState` declarations:

```jsx
const [livePlaces, setLivePlaces] = useState(null);   // { places, topPicks, flat } | null
const [placesError, setPlacesError] = useState(false);

useEffect(() => {
  let alive = true;
  fetchPlaces()
    .then(data => { if (alive) { setLivePlaces(data); setPlacesError(false); } })
    .catch(() => { if (alive) setPlacesError(true); });
  return () => { alive = false; };
}, []);

// Live data when available; hardcoded fallback so the app never renders blank.
const placesData = livePlaces?.places || FALLBACK_PLACES;
const topPicksData = livePlaces?.topPicks?.length ? livePlaces.topPicks : FALLBACK_TOP_PICKS;
```

- [ ] **Step 3: Pass props to MainApp** — find where `<MainApp ... />` is rendered and add `places={placesData} topPicks={topPicksData}`. (Search: `grep -n "MainApp" src/App.jsx`.)

- [ ] **Step 4: Build:** `npm run build` Expected: builds OK (no new screen reads yet — props are additive).
- [ ] **Step 5: Commit** `git add src/App.jsx && git commit -m "feat(app): load live places in App.jsx with fallback"`

### Task 13: Consume live places in screens

**Files:** Modify `src/screens/MainApp/index.jsx`, `PlacesTab.jsx`, `ActivitiesTab.jsx`, `FavoritesTab.jsx`

> Goal: screens read `places`/`topPicks` from props, defaulting to the imported constants so each file still works in isolation. Keep changes minimal — replace the *source* of `PLACES`/`TOP_PICKS`, not the rendering.

- [ ] **Step 1: Thread props through `MainApp/index.jsx`.** Accept `places` and `topPicks` in the shell's props and pass them to `PlacesTab` and `ActivitiesTab`. (Search `grep -n "PlacesTab\|ActivitiesTab" src/screens/MainApp/index.jsx`.)

- [ ] **Step 2: `PlacesTab.jsx`** — change the import to keep the constant as a fallback and read from props:

```jsx
// was: import { PLACES, PLACE_CATEGORIES, ... } from '../../data/places';
import { PLACES as PLACES_FALLBACK, PLACE_CATEGORIES, BADGE_META, TOP_PICKS as TOP_PICKS_FALLBACK, findPlace } from '../../data/places';

export const PlacesTab = ({ places, topPicks, ...rest }) => {
  const PLACES = places || PLACES_FALLBACK;
  const TOP_PICKS = topPicks || TOP_PICKS_FALLBACK;
  // ...existing body unchanged, now referencing the local PLACES/TOP_PICKS
};
```

- [ ] **Step 3: `ActivitiesTab.jsx`** — same pattern: import `PLACES as PLACES_FALLBACK`, `TOP_PICKS as TOP_PICKS_FALLBACK`; accept `places`/`topPicks` props; `const PLACES = places || PLACES_FALLBACK;` etc.

- [ ] **Step 4: `findPlace` across live data.** `findPlace` in `src/data/places.js` only searches the hardcoded object. Add a prop-aware lookup helper in `src/lib/places-api.js`:

```js
// Look up a place by slug/id across a grouped PLACES object (live or fallback).
export const findPlaceIn = (grouped, id) => {
  for (const cat of Object.keys(grouped || {})) {
    const hit = (grouped[cat] || []).find(p => p.id === id || p.slug === id);
    if (hit) return { ...hit, category: hit.category || cat };
  }
  return null;
};
```
Use `findPlaceIn(PLACES, id)` in `FavoritesTab.jsx` (and any sheet that resolves a saved place) instead of the static `findPlace`, falling back to `findPlace(id)` when the live lookup misses.

- [ ] **Step 5: Build:** `npm run build` Expected: builds OK.
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(app): screens consume live places via props with fallback"`

---

# Phase 4 — Ingestion pipeline (Google Places)

### Task 14: Source registry

**Files:** Create `api/_lib/ingestion/sources.js`

- [ ] **Step 1: Write the registry:**

```js
// Config-driven source registry. Adding a source must not require touching
// ingestion control flow. Each Google query maps to a PRIMARY app category.
export const SOURCES = [
  {
    id: 'google-places-tampa',
    name: 'Google Places — Tampa family',
    type: 'google_places',
    city: 'Tampa, FL',
    county: 'Hillsborough',
    enabled: true,
    cadenceHours: 168,
    parserVersion: 'v1',
    // locationBias circle ~ Tampa city center, 25km radius.
    bias: { lat: 27.9506, lng: -82.4572, radiusM: 25000 },
    queries: [
      { q: "children's museum",         category: 'fun' },
      { q: 'playground',                category: 'fun' },
      { q: 'public library',            category: 'fun' },
      { q: 'aquarium',                  category: 'fun' },
      { q: 'zoo',                       category: 'fun' },
      { q: 'family friendly cafe',      category: 'fun' },
      { q: 'trampoline park',           category: 'fun' },
      { q: 'swim school for kids',      category: 'sports' },
      { q: 'gymnastics for kids',       category: 'sports' },
      { q: 'youth soccer',              category: 'sports' },
      { q: 'kids martial arts',         category: 'sports' },
      { q: 'pediatrician',              category: 'health' },
      { q: 'pediatric dentist',         category: 'health' },
      { q: 'prenatal yoga',             category: 'wellness' },
      { q: 'preschool',                 category: 'schools' },
      { q: 'daycare',                   category: 'childcare' },
      { q: "children's art classes",    category: 'extracurricular' },
      { q: 'kids music classes',        category: 'extracurricular' },
      { q: 'summer camp for kids',      category: 'camps' },
    ],
  },
];

export const getSource = (id) => SOURCES.find(s => s.id === id) || null;
```

- [ ] **Step 2: Syntax check:** `node --check api/_lib/ingestion/sources.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/_lib/ingestion/sources.js && git commit -m "feat(ingestion): Tampa Google Places source registry"`

### Task 15: Normalizer (TDD)

**Files:** Create `api/_lib/ingestion/normalize.js`, `api/_lib/ingestion/normalize.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/ingestion/normalize.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, normalizeGooglePlace } from './normalize.js';

test('slugify includes city and is collision-safe', () => {
  assert.equal(slugify('Glazer Children’s Museum', 'Tampa, FL'), 'glazer-childrens-museum-tampa');
});

const SAMPLE = {
  id: 'ChIJabc123',
  displayName: { text: 'Goldfish Swim School' },
  formattedAddress: '123 Main St, Tampa, FL 33602',
  location: { latitude: 27.95, longitude: -82.46 },
  rating: 4.7,
  userRatingCount: 88,
  internationalPhoneNumber: '+1 813-555-0100',
  websiteUri: 'https://goldfishswimschool.com',
  googleMapsUri: 'https://maps.google.com/?cid=1',
  businessStatus: 'OPERATIONAL',
  priceLevel: 'PRICE_LEVEL_MODERATE',
  photos: [{ name: 'places/ChIJabc123/photos/AXYZ', authorAttributions: [{ displayName: 'Jane' }] }],
};

test('maps a Google place into a place candidate', () => {
  const c = normalizeGooglePlace(SAMPLE, { category: 'sports', city: 'Tampa, FL' });
  assert.equal(c.name, 'Goldfish Swim School');
  assert.equal(c.category, 'sports');
  assert.equal(c.city, 'Tampa, FL');
  assert.equal(c.googlePlaceId, 'ChIJabc123');
  assert.equal(c.rating, 4.7);
  assert.equal(c.reviewCount, 88);
  assert.equal(c.phone, '+1 813-555-0100');
  assert.equal(c.slug, 'goldfish-swim-school-tampa');
  assert.equal(c.priceLevel, 2);
  assert.equal(c.photos[0].googleRef, 'places/ChIJabc123/photos/AXYZ');
  assert.ok(c.confidence > 0 && c.confidence <= 1);
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/ingestion/normalize.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `api/_lib/ingestion/normalize.js`:

```js
const PRICE_MAP = {
  PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export const slugify = (name, city) => {
  const base = `${name} ${(city || '').split(',')[0]}`
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base;
};

// Confidence: more complete records score higher. Bounded (0,1].
const scoreConfidence = (p) => {
  let s = 0.4;
  if (p.formattedAddress) s += 0.2;
  if (p.location) s += 0.2;
  if (typeof p.rating === 'number') s += 0.1;
  if (p.websiteUri) s += 0.1;
  return Math.min(1, +s.toFixed(3));
};

export const normalizeGooglePlace = (p, { category, city }) => {
  const name = p.displayName?.text || 'Unknown place';
  return {
    name,
    slug: slugify(name, city),
    category,
    city,
    address: p.formattedAddress || null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.internationalPhoneNumber || null,
    website: p.websiteUri || null,
    referenceUrl: p.googleMapsUri || null,
    googlePlaceId: p.id,
    googleMapsUrl: p.googleMapsUri || null,
    businessStatus: p.businessStatus || null,
    priceLevel: p.priceLevel != null ? (PRICE_MAP[p.priceLevel] ?? null) : null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
    tags: [],
    photos: (p.photos || []).slice(0, 5).map(ph => ({
      googleRef: ph.name,
      attribution: ph.authorAttributions?.[0]?.displayName || 'Google',
    })),
    sourceUrl: p.googleMapsUri || null,
    externalId: p.id,
    confidence: scoreConfidence(p),
  };
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/ingestion/normalize.test.mjs` Expected: PASS (3 tests).
- [ ] **Step 5: Commit** `git add api/_lib/ingestion/normalize.js api/_lib/ingestion/normalize.test.mjs && git commit -m "feat(ingestion): normalize Google place → candidate (TDD)"`

### Task 16: Dedupe (TDD)

**Files:** Create `api/_lib/ingestion/dedupe.js`, `api/_lib/ingestion/dedupe.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/ingestion/dedupe.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineMeters, classifyCandidate } from './dedupe.js';

test('haversine ~ 0 for same point', () => {
  assert.ok(haversineMeters(27.95, -82.46, 27.95, -82.46) < 1);
});

test('exact google_place_id match => update', () => {
  const existing = [{ id: 'x', google_place_id: 'G1', name: 'A', city: 'Tampa, FL', lat: 27.9, lng: -82.4 }];
  const cand = { googlePlaceId: 'G1', name: 'A', city: 'Tampa, FL', lat: 27.9, lng: -82.4 };
  assert.deepEqual(classifyCandidate(cand, existing), { action: 'update', matchId: 'x' });
});

test('near-duplicate by geo+name => review', () => {
  const existing = [{ id: 'y', google_place_id: null, name: 'Goldfish Swim School', city: 'Tampa, FL', lat: 27.9500, lng: -82.4600 }];
  const cand = { googlePlaceId: 'G9', name: 'Goldfish Swim', city: 'Tampa, FL', lat: 27.95005, lng: -82.46005 };
  assert.equal(classifyCandidate(cand, existing).action, 'review');
});

test('novel candidate => create', () => {
  const cand = { googlePlaceId: 'G2', name: 'Brand New Place', city: 'Tampa, FL', lat: 28.1, lng: -82.3 };
  assert.deepEqual(classifyCandidate(cand, []), { action: 'create', matchId: null });
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/ingestion/dedupe.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `api/_lib/ingestion/dedupe.js`:

```js
export const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nameSimilar = (a, b) => {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

// Returns { action: 'create'|'update'|'review', matchId }.
export const classifyCandidate = (cand, existing) => {
  // 1. Exact external id.
  const byId = existing.find(e => e.google_place_id && e.google_place_id === cand.googlePlaceId);
  if (byId) return { action: 'update', matchId: byId.id };

  // 2. Same normalized name + same city.
  const byName = existing.find(e => norm(e.name) === norm(cand.name) && norm(e.city) === norm(cand.city));
  if (byName) return { action: 'review', matchId: byName.id };

  // 3. Geo ~75m + similar name.
  if (cand.lat != null && cand.lng != null) {
    const near = existing.find(e =>
      e.lat != null && e.lng != null &&
      haversineMeters(cand.lat, cand.lng, e.lat, e.lng) <= 75 &&
      nameSimilar(cand.name, e.name));
    if (near) return { action: 'review', matchId: near.id };
  }
  return { action: 'create', matchId: null };
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/ingestion/dedupe.test.mjs` Expected: PASS (4 tests).
- [ ] **Step 5: Commit** `git add api/_lib/ingestion/dedupe.js api/_lib/ingestion/dedupe.test.mjs && git commit -m "feat(ingestion): dedupe classifier (TDD)"`

### Task 17: Gradient image generator (TDD)

**Files:** Create `api/_lib/ingestion/images.js`, `api/_lib/ingestion/images.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/ingestion/images.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradientForName, makeGradientPng } from './images.js';

test('gradient is deterministic per name', () => {
  assert.deepEqual(gradientForName('Glazer'), gradientForName('Glazer'));
});

test('produces a non-trivial PNG buffer', async () => {
  const buf = await makeGradientPng('Bayshore Boulevard');
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 1000);
  // PNG magic number.
  assert.equal(buf[0], 0x89); assert.equal(buf[1], 0x50);
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/ingestion/images.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `api/_lib/ingestion/images.js` (uses `sharp`, already a devDependency):

```js
import sharp from 'sharp';

// Brand palette ends (coral/sage/saffron families) for deterministic gradients.
const PAIRS = [
  ['#E96B7D', '#D9A441'], ['#7E9678', '#B5C9AB'], ['#D9A441', '#E96B7D'],
  ['#B98EB6', '#E96B7D'], ['#D7997D', '#D9A441'], ['#5A7E55', '#7E9678'],
];

const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export const gradientForName = (name) => PAIRS[hash(name || '') % PAIRS.length];

const escapeXml = (s) => (s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

export const makeGradientPng = async (name, { w = 800, h = 600 } = {}) => {
  const [c1, c2] = gradientForName(name);
  const label = escapeXml((name || '').slice(0, 40));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <text x="40" y="${h - 48}" font-family="Georgia, serif" font-size="40"
      fill="#ffffff" opacity="0.92">${label}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
};

// Upload a generated PNG to the public Storage bucket; returns its public URL.
export const uploadGeneratedPng = async ({ supabaseUrl, serviceRoleKey, slug, buffer }) => {
  const path = `generated/${slug}.png`;
  const r = await fetch(`${supabaseUrl}/storage/v1/object/place-photos/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey,
      'Content-Type': 'image/png', 'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!r.ok && r.status !== 200) {
    const t = await r.text().catch(() => '');
    throw new Error(`storage upload ${r.status}: ${t.slice(0, 150)}`);
  }
  return `${supabaseUrl}/storage/v1/object/public/place-photos/${path}`;
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/ingestion/images.test.mjs` Expected: PASS (2 tests).
- [ ] **Step 5: Commit** `git add api/_lib/ingestion/images.js api/_lib/ingestion/images.test.mjs && git commit -m "feat(ingestion): branded gradient image generator (TDD)"`

### Task 18: Google Places connector + fixture parse test

**Files:** Create `api/_lib/ingestion/connectors/google-places.js`, `api/_lib/ingestion/connectors/google-places.test.mjs`, `scripts/ingestion/fixtures/google-searchText.json`

- [ ] **Step 1: Save a fixture** `scripts/ingestion/fixtures/google-searchText.json` (a minimal Places API (New) `searchText` response):

```json
{ "places": [
  { "id": "ChIJfixture1", "displayName": { "text": "Glazer Children's Museum" },
    "formattedAddress": "110 W Gasparilla Plaza, Tampa, FL 33602",
    "location": { "latitude": 27.9487, "longitude": -82.4606 },
    "rating": 4.6, "userRatingCount": 1200, "businessStatus": "OPERATIONAL",
    "websiteUri": "https://glazermuseum.org",
    "googleMapsUri": "https://maps.google.com/?cid=2",
    "photos": [{ "name": "places/ChIJfixture1/photos/AF1", "authorAttributions": [{ "displayName": "Visitor" }] }] }
] }
```

- [ ] **Step 2: Write the failing test** `api/_lib/ingestion/connectors/google-places.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSearchText } from './google-places.js';

test('parseSearchText returns the places array', async () => {
  const raw = JSON.parse(await readFile(new URL('../../../../scripts/ingestion/fixtures/google-searchText.json', import.meta.url)));
  const places = parseSearchText(raw);
  assert.equal(places.length, 1);
  assert.equal(places[0].id, 'ChIJfixture1');
});

test('parseSearchText tolerates an empty body', () => {
  assert.deepEqual(parseSearchText({}), []);
});
```

- [ ] **Step 3: Run, verify fail:** `node --test api/_lib/ingestion/connectors/google-places.test.mjs` Expected: FAIL.

- [ ] **Step 4: Implement** `api/_lib/ingestion/connectors/google-places.js`:

```js
// Google Places API (New) connector. Uses places:searchText with a field mask
// (cost control). Network calls live behind fetchRaw; parseSearchText is pure
// so it can be fixture-tested without hitting Google.
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.internationalPhoneNumber',
  'places.websiteUri', 'places.googleMapsUri', 'places.businessStatus',
  'places.priceLevel', 'places.photos',
].join(',');

export const parseSearchText = (body) => (body && Array.isArray(body.places) ? body.places : []);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// fetchRaw runs one query, returns raw Google place objects. Bounded retry/backoff.
export async function fetchRaw({ query, bias, limit = 20, apiKey, logger = console }) {
  const body = {
    textQuery: `${query} in Tampa, FL`,
    maxResultCount: Math.min(limit, 20),
    locationBias: bias ? { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: bias.radiusM } } : undefined,
  };
  let attempt = 0;
  while (true) {
    attempt++;
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
    if (r.ok) return parseSearchText(await r.json());
    if ((r.status === 429 || r.status >= 500) && attempt <= 3) {
      const wait = Number(r.headers.get('Retry-After')) * 1000 || attempt * 1000;
      logger.warn?.(`google-places ${r.status}, retry ${attempt} in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    const t = await r.text().catch(() => '');
    throw new Error(`google-places ${r.status}: ${t.slice(0, 200)}`);
  }
}
```

- [ ] **Step 5: Run, verify pass:** `node --test api/_lib/ingestion/connectors/google-places.test.mjs` Expected: PASS (2 tests).
- [ ] **Step 6: Commit** `git add api/_lib/ingestion/connectors/ scripts/ingestion/fixtures/ && git commit -m "feat(ingestion): Google Places connector + fixture test"`

### Task 19: Writer

**Files:** Create `api/_lib/ingestion/writer.js`

- [ ] **Step 1: Implement** `api/_lib/ingestion/writer.js` (service-role client, like `seed.js`; never clobbers admin-edited approved rows):

```js
import { createClient } from '@supabase/supabase-js';

export const makeClient = (supabaseUrl, serviceRoleKey) =>
  createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

// Map a normalized candidate → places row. NEW rows are staged for review.
const candidateToRow = (c) => ({
  slug: c.slug, name: c.name, category: c.category, area: c.area || null,
  city: c.city, description: c.description || null, tags: c.tags || [],
  address: c.address || null, website: c.website || null, reference_url: c.referenceUrl || null,
  phone: c.phone || null, google_place_id: c.googlePlaceId || null,
  google_maps_url: c.googleMapsUrl || null, business_status: c.businessStatus || null,
  price_level: c.priceLevel ?? null, rating: c.rating ?? null, review_count: c.reviewCount || 0,
  lat: c.lat ?? null, lng: c.lng ?? null, amenities: c.amenities || {}, good_for: c.goodFor || [],
  hero_photo: c.heroPhoto || null, last_seen_at: new Date().toISOString(),
  source_confidence: c.confidence ?? null,
  visible: false, review_status: 'needs_review',
});

// Insert a brand-new place; returns its id.
export const createPlace = async (sb, candidate) => {
  const { data, error } = await sb.from('places').insert(candidateToRow(candidate)).select('id').single();
  if (error) throw new Error(`create place failed: ${error.message}`);
  return data.id;
};

// Update an existing place WITHOUT touching curator-owned fields. Only refresh
// source-of-truth facts + last_seen_at; never flip visible/review_status here.
export const refreshPlace = async (sb, placeId, candidate) => {
  const patch = {
    address: candidate.address ?? null, phone: candidate.phone ?? null,
    website: candidate.website ?? null, rating: candidate.rating ?? null,
    review_count: candidate.reviewCount || 0, business_status: candidate.businessStatus ?? null,
    google_place_id: candidate.googlePlaceId ?? null, last_seen_at: new Date().toISOString(),
    source_confidence: candidate.confidence ?? null,
  };
  const { error } = await sb.from('places').update(patch).eq('id', placeId);
  if (error) throw new Error(`refresh place failed: ${error.message}`);
};

export const linkCategory = async (sb, placeId, categoryId) => {
  await sb.from('place_categories').upsert({ place_id: placeId, category_id: categoryId }, { onConflict: 'place_id,category_id' });
};

export const addPhoto = async (sb, placeId, photo) => {
  const { error } = await sb.from('place_photos').insert({
    place_id: placeId, url: photo.url || null, google_ref: photo.googleRef || null,
    source: photo.source, attribution: photo.attribution || null, is_hero: !!photo.isHero,
    sort_order: photo.sortOrder || 0,
  });
  if (error) throw new Error(`add photo failed: ${error.message}`);
};

export const recordSource = async (sb, { sourceId, externalId, placeId, sourceUrl, raw }) => {
  await sb.from('source_records').upsert({
    source_id: sourceId, external_id: externalId, record_type: 'place',
    place_id: placeId, source_url: sourceUrl || null, raw: raw || null,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'source_id,external_id,record_type' });
};

export const upsertSource = async (sb, source) => {
  await sb.from('ingestion_sources').upsert({
    id: source.id, name: source.name, source_type: source.type, city: source.city,
    county: source.county || null, enabled: source.enabled !== false,
    cadence_hours: source.cadenceHours || 24, parser_version: source.parserVersion || 'v1',
  }, { onConflict: 'id' });
};

export const startRun = async (sb, sourceId) => {
  const { data, error } = await sb.from('ingestion_runs')
    .insert({ source_id: sourceId, status: 'running' }).select('id').single();
  if (error) throw new Error(`start run failed: ${error.message}`);
  return data.id;
};

export const finishRun = async (sb, runId, status, counts) => {
  await sb.from('ingestion_runs').update({
    status, finished_at: new Date().toISOString(),
    fetched_count: counts.fetched || 0, normalized_count: counts.normalized || 0,
    created_count: counts.created || 0, updated_count: counts.updated || 0,
    skipped_count: counts.skipped || 0, error_count: counts.errors || 0,
    summary: counts.summary || {},
  }).eq('id', runId);
};

export const loadExistingPlaces = async (sb) => {
  const { data, error } = await sb.from('places').select('id,google_place_id,name,city,lat,lng');
  if (error) throw new Error(`load places failed: ${error.message}`);
  return data || [];
};
```

- [ ] **Step 2: Syntax check:** `node --check api/_lib/ingestion/writer.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/_lib/ingestion/writer.js && git commit -m "feat(ingestion): DB writer (create/refresh/photos/provenance)"`

### Task 20: Orchestrator

**Files:** Create `api/_lib/ingestion/runIngestion.js`

- [ ] **Step 1: Implement** `api/_lib/ingestion/runIngestion.js`:

```js
import { getSource } from './sources.js';
import { fetchRaw } from './connectors/google-places.js';
import { normalizeGooglePlace } from './normalize.js';
import { classifyCandidate } from './dedupe.js';
import { makeGradientPng, uploadGeneratedPng } from './images.js';
import {
  makeClient, createPlace, refreshPlace, linkCategory, addPhoto, recordSource,
  upsertSource, startRun, finishRun, loadExistingPlaces,
} from './writer.js';

// Run one source. dryRun => no writes, returns counts only.
export async function runIngestion({ sourceId, limit = 20, dryRun = false, logger = console, env }) {
  const source = getSource(sourceId);
  if (!source) throw new Error(`unknown source: ${sourceId}`);
  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY not set');

  const sb = dryRun ? null : makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const counts = { fetched: 0, normalized: 0, created: 0, updated: 0, skipped: 0, errors: 0, review: 0 };
  const reviewItems = [];

  let runId = null;
  if (!dryRun) { await upsertSource(sb, source); runId = await startRun(sb, source.id); }
  let existing = dryRun ? [] : await loadExistingPlaces(sb);

  for (const { q, category } of source.queries) {
    try {
      const raw = await fetchRaw({ query: q, bias: source.bias, limit, apiKey, logger });
      counts.fetched += raw.length;
      for (const gp of raw) {
        const cand = normalizeGooglePlace(gp, { category, city: source.city });
        counts.normalized++;
        const verdict = classifyCandidate(cand, existing);

        if (dryRun) {
          if (verdict.action === 'create') counts.created++;
          else if (verdict.action === 'update') counts.updated++;
          else { counts.review++; reviewItems.push(cand.name); }
          continue;
        }

        if (verdict.action === 'update') {
          await refreshPlace(sb, verdict.matchId, cand);
          await linkCategory(sb, verdict.matchId, category);
          await recordSource(sb, { sourceId: source.id, externalId: cand.externalId, placeId: verdict.matchId, sourceUrl: cand.sourceUrl, raw: gp });
          counts.updated++;
        } else if (verdict.action === 'create' || verdict.action === 'review') {
          const placeId = await createPlace(sb, cand);
          await linkCategory(sb, placeId, category);
          // Photos: Google refs first; gradient fallback when none.
          if (cand.photos.length) {
            for (let i = 0; i < cand.photos.length; i++) {
              await addPhoto(sb, placeId, { googleRef: cand.photos[i].googleRef, source: 'google', attribution: cand.photos[i].attribution, isHero: i === 0, sortOrder: i });
            }
          } else {
            const png = await makeGradientPng(cand.name);
            const url = await uploadGeneratedPng({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, slug: cand.slug, buffer: png });
            await addPhoto(sb, placeId, { url, source: 'generated', isHero: true });
          }
          await recordSource(sb, { sourceId: source.id, externalId: cand.externalId, placeId, sourceUrl: cand.sourceUrl, raw: gp });
          existing.push({ id: placeId, google_place_id: cand.googlePlaceId, name: cand.name, city: cand.city, lat: cand.lat, lng: cand.lng });
          if (verdict.action === 'review') counts.review++;
          counts.created++;
        }
      }
    } catch (e) {
      counts.errors++;
      logger.error?.(`query "${q}" failed: ${e.message}`);
    }
  }

  if (!dryRun) {
    const status = counts.errors === 0 ? 'succeeded' : (counts.created || counts.updated ? 'partial' : 'failed');
    await finishRun(sb, runId, status, { ...counts, summary: { review: counts.review } });
  }
  return { ...counts, reviewItems };
}
```

- [ ] **Step 2: Syntax check:** `node --check api/_lib/ingestion/runIngestion.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/_lib/ingestion/runIngestion.js && git commit -m "feat(ingestion): orchestrator (fetch→normalize→dedupe→images→write)"`

### Task 21: CLI runner

**Files:** Create `scripts/ingest-family-data.mjs`

- [ ] **Step 1: Implement** `scripts/ingest-family-data.mjs`:

```js
#!/usr/bin/env node
// CLI wrapper around api/_lib/ingestion/runIngestion.js.
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_PLACES_API_KEY=... \
//   node scripts/ingest-family-data.mjs --source google-places-tampa --dry-run --limit 5
import { runIngestion } from '../api/_lib/ingestion/runIngestion.js';

const flags = process.argv.slice(2);
const val = (name, fb) => { const i = flags.indexOf(name); return i >= 0 ? flags[i + 1] : fb; };
const sourceId = val('--source', 'google-places-tampa');
const limit = parseInt(val('--limit', '20'), 10);
const dryRun = flags.includes('--dry-run');

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
};
if (!env.GOOGLE_PLACES_API_KEY) { console.error('Missing GOOGLE_PLACES_API_KEY'); process.exit(1); }
if (!dryRun && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (required for live writes)');
  process.exit(1);
}

runIngestion({ sourceId, limit, dryRun, env, logger: console })
  .then(c => {
    console.log(`\n${dryRun ? 'DRY RUN' : 'INGEST'} [${sourceId}]`);
    console.log(`  fetched=${c.fetched} normalized=${c.normalized} would-create/created=${c.created} ` +
      `updated=${c.updated} needs-review=${c.review} skipped=${c.skipped} errors=${c.errors}`);
    if (dryRun && c.reviewItems?.length) console.log(`  review samples: ${c.reviewItems.slice(0, 8).join(', ')}`);
  })
  .catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Syntax check:** `node --check scripts/ingest-family-data.mjs` Expected: no output.
- [ ] **Step 3: Commit** `git add scripts/ingest-family-data.mjs && git commit -m "feat(ingestion): CLI runner"`

### Task 22: Dry-run, then live bounded ingestion

**Files:** none (run commands; requires `GOOGLE_PLACES_API_KEY` in env)

- [ ] **Step 1: Run full test suite:** `npm test` Expected: all `node:test` files PASS.
- [ ] **Step 2: Dry run (no writes):**

```bash
set -a && . ./.env && set +a
npm run ingest -- --source google-places-tampa --dry-run --limit 3
```
Expected: a counts line with `fetched>0`, `normalized>0`, `errors=0`. (If `errors>0`, inspect the logged query failures — usually Places API not enabled / billing off / bad key.)

- [ ] **Step 3: Live bounded run:**

```bash
set -a && . ./.env && set +a
npm run ingest -- --source google-places-tampa --limit 5
```
Expected: `created>0`. New rows are `visible=false`, `review_status='needs_review'`.

- [ ] **Step 4: Verify in DB** (MCP `execute_sql`):

```sql
select count(*) filter (where review_status='needs_review') as pending,
       count(*) filter (where google_place_id is not null) as ingested
from public.places;
```
Expected: `pending>0`, `ingested>0`.

- [ ] **Step 5: Confirm photos exist:** `select count(*) from public.place_photos;` Expected: `>0`.

---

# Phase 5 — Admin CRUD review tool

### Task 23: `POST /api/admin/places/update` write route

**Files:** Create `api/admin/places/update.js`

- [ ] **Step 1: Implement** (modeled on `api/admin/mom-profiles/update.js`; supports field edits, status/visibility, bulk, delete, merge):

```js
// POST /api/admin/places/update — admin-only place review/CRUD.
// SECURITY: requireAdmin bearer token.
// Body is one of:
//   { id, patch: {<editable fields>} }                 -> edit one place
//   { ids: [uuid], patch: { review_status?, visible? } } -> bulk status/visibility
//   { delete: uuid }                                    -> delete a place
//   { merge: { keepId, dropId } }                       -> repoint source_records, delete dropId
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';

const EDITABLE = new Set([
  'name','category','area','address','description','tags','website','reference_url',
  'phone','amenities','good_for','age_min','age_max','hero_photo','rating',
  'review_status','visible',
]);

const sanitize = (patch) => {
  if (!patch || typeof patch !== 'object') return { error: 'patch object required' };
  const out = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!EDITABLE.has(k)) return { error: `unknown field: ${k}` };
    out[k] = v;
  }
  if (out.review_status && !['needs_review','approved','rejected','archived'].includes(out.review_status)) {
    return { error: 'bad review_status' };
  }
  if (Object.keys(out).length === 0) return { error: 'patch must include at least one field' };
  return { patch: out };
};

const patchRows = async (creds, filter, patch) => {
  const url = `${creds.supabaseUrl}/rest/v1/places?${filter}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text || '[]');
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });
  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  try {
    // Delete
    if (body.delete) {
      if (!isUuid(body.delete)) return json(res, 400, { error: 'delete must be a uuid' });
      const r = await fetch(`${creds.supabaseUrl}/rest/v1/places?id=eq.${body.delete}`, {
        method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey),
      });
      if (!r.ok) return json(res, 502, { error: `delete failed ${r.status}` });
      return json(res, 200, { ok: true, deleted: body.delete });
    }

    // Merge: repoint source_records + place_categories from dropId to keepId, delete dropId.
    if (body.merge) {
      const { keepId, dropId } = body.merge;
      if (!isUuid(keepId) || !isUuid(dropId)) return json(res, 400, { error: 'merge needs keepId+dropId uuids' });
      for (const tbl of ['source_records', 'place_categories']) {
        await fetch(`${creds.supabaseUrl}/rest/v1/${tbl}?place_id=eq.${dropId}`, {
          method: 'PATCH', headers: sbHeaders(creds.serviceRoleKey),
          body: JSON.stringify({ place_id: keepId }),
        });
      }
      await fetch(`${creds.supabaseUrl}/rest/v1/places?id=eq.${dropId}`, {
        method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey),
      });
      return json(res, 200, { ok: true, merged: { keepId, dropId } });
    }

    // Bulk status/visibility
    if (Array.isArray(body.ids)) {
      if (!body.ids.every(isUuid)) return json(res, 400, { error: 'ids must be uuids' });
      const s = sanitize(body.patch);
      if (s.error) return json(res, 400, { error: s.error });
      const inList = body.ids.map(id => `"${id}"`).join(',');
      const rows = await patchRows(creds, `id=in.(${inList})`, s.patch);
      return json(res, 200, { ok: true, count: rows.length, rows });
    }

    // Single edit
    const id = typeof body.id === 'string' ? body.id : '';
    if (!isUuid(id)) return json(res, 400, { error: 'id must be a uuid' });
    const s = sanitize(body.patch);
    if (s.error) return json(res, 400, { error: s.error });
    const rows = await patchRows(creds, `id=eq.${id}`, s.patch);
    if (!rows.length) return json(res, 404, { error: 'No place with that id' });
    return json(res, 200, { ok: true, row: rows[0] });
  } catch (e) {
    console.error('admin/places/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
```

- [ ] **Step 2: Syntax check:** `node --check api/admin/places/update.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/admin/places/update.js && git commit -m "feat(api): admin places update (edit/bulk/delete/merge)"`

### Task 24: Extend `GET /api/admin/places` to embed categories + photos

**Files:** Modify `api/admin/places.js:16`

- [ ] **Step 1: Change the select** so the review UI gets photos + secondary categories. Replace the `select=*` query line:

```js
const url = `${creds.supabaseUrl}/rest/v1/places` +
  `?select=*,place_photos(id,url,google_ref,source,attribution,is_hero,sort_order),` +
  `place_categories(category_id)&order=created_at.desc&limit=5000`;
```

- [ ] **Step 2: Syntax check:** `node --check api/admin/places.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/admin/places.js && git commit -m "feat(api): embed photos + categories in admin places read"`

### Task 25: `PlacesManager` admin view — list + filters + row/bulk actions

**Files:** Create `src/admin/PlacesManager.jsx`; Modify `src/AdminPage.jsx`

> Built as its own file (AdminPage.jsx is already ~2000 lines). It receives `rows` + `onReload` and calls `adminFetch`. Match existing idioms (`C` tokens, lucide icons, `Albert Sans`/`Fraunces`).

- [ ] **Step 1: Create** `src/admin/PlacesManager.jsx`:

```jsx
import { useState, useMemo } from 'react';
import { C } from '../theme';
import { Check, EyeOff, X, Pencil, MapPin, Search } from 'lucide-react';
import { PlaceEditModal } from './PlaceEditModal';

const STATUSES = ['needs_review', 'approved', 'rejected', 'archived'];
const CATS = ['fun','sports','wellness','schools','childcare','extracurricular','camps','health'];

export const PlacesManager = ({ rows, adminFetch, onReload }) => {
  const [status, setStatus] = useState('needs_review');
  const [cat, setCat] = useState('all');
  const [hasPhoto, setHasPhoto] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => (rows || []).filter(r => {
    if (status !== 'all' && r.review_status !== status) return false;
    if (cat !== 'all' && r.category !== cat) return false;
    if (hasPhoto && !(r.place_photos?.length || r.hero_photo)) return false;
    if (minRating && !(r.rating >= minRating)) return false;
    if (q && !(`${r.name} ${r.area || ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [rows, status, cat, hasPhoto, minRating, q]);

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const post = async (payload) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/places/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      setSelected(new Set());
      await onReload();
    } catch (e) { alert(`Update failed: ${e.message}`); }
    finally { setBusy(false); }
  };

  const setRow = (id, patch) => post({ id, patch });
  const bulk = (patch) => post({ ids: [...selected], patch });

  const chip = (active, onClick, label) => (
    <button key={label} onClick={onClick} style={{
      background: active ? C.terracotta : 'transparent', color: active ? '#fff' : C.inkSoft,
      border: `1px solid ${active ? C.terracotta : C.divider}`, borderRadius: 999,
      padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {chip(status === 'all', () => setStatus('all'), 'All')}
        {STATUSES.map(s => chip(status === s, () => setStatus(s), s))}
        <span style={{ width: 1, height: 18, background: C.divider }} />
        <select value={cat} onChange={e => setCat(e.target.value)}
          style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '4px 8px', fontFamily: 'Albert Sans', fontSize: 12.5 }}>
          <option value="all">All categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft }}>
          <input type="checkbox" checked={hasPhoto} onChange={e => setHasPhoto(e.target.checked)} /> has photo
        </label>
        <select value={minRating} onChange={e => setMinRating(+e.target.value)}
          style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '4px 8px', fontFamily: 'Albert Sans', fontSize: 12.5 }}>
          <option value={0}>any rating</option><option value={4}>4.0+</option><option value={4.5}>4.5+</option>
        </select>
        <div className="flex items-center gap-1" style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '2px 8px' }}>
          <Search size={13} style={{ color: C.inkMuted }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search name/area"
            style={{ border: 'none', outline: 'none', fontFamily: 'Albert Sans', fontSize: 12.5, width: 150 }} />
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted }}>{filtered.length} places</span>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: `${C.sage}`, border: `1px solid ${C.sageDark}33` }}>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, color: C.ink }}>{selected.size} selected</span>
          <button disabled={busy} onClick={() => bulk({ review_status: 'approved', visible: true })}
            style={{ background: C.sageDark, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            <Check size={12} className="inline mr-1" />Approve + Publish
          </button>
          <button disabled={busy} onClick={() => bulk({ review_status: 'rejected', visible: false })}
            style={{ background: C.paper, color: C.terracotta, border: `1px solid ${C.terracotta}`, borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Reject
          </button>
        </div>
      )}

      {/* Rows */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.divider}`, background: C.paper }}>
        {filtered.map(r => {
          const hero = r.hero_photo || r.place_photos?.find(p => p.is_hero)?.url;
          return (
            <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}` }}>
              <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
              <div style={{ width: 44, height: 44, borderRadius: 8, background: hero ? `center/cover url(${hero})` : C.lilac, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: 'Fraunces', fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted }}>
                  {r.category} · {r.area || '—'} {r.rating ? `· ★${r.rating}` : ''} · <span style={{ color: r.visible ? C.sageDark : C.inkMuted }}>{r.review_status}</span>
                </div>
              </div>
              <button title="Approve" disabled={busy} onClick={() => setRow(r.id, { review_status: 'approved', visible: true })}
                style={{ color: C.sageDark, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Check size={16} /></button>
              <button title="Hide" disabled={busy} onClick={() => setRow(r.id, { visible: false })}
                style={{ color: C.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><EyeOff size={16} /></button>
              <button title="Reject" disabled={busy} onClick={() => setRow(r.id, { review_status: 'rejected', visible: false })}
                style={{ color: C.terracotta, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
              <button title="Edit" onClick={() => setEditing(r)}
                style={{ color: C.ink, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Pencil size={15} /></button>
              {r.lat != null && (
                <a title="Map" href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer"
                  style={{ color: C.inkMuted, padding: 4 }}><MapPin size={15} /></a>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkMuted }}>No places match these filters.</div>
        )}
      </div>

      {editing && (
        <PlaceEditModal place={editing} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Wire into `AdminPage.jsx`.** (a) import at top: `import { PlacesManager } from './admin/PlacesManager';` (b) add a tab to the tab array (after `feedback`): `{ id: 'places', icon: MapPin, label: 'Places' },` — ensure `MapPin` is imported from `lucide-react` in AdminPage. (c) add the render line in the tab switch block:

```jsx
{tab === 'places' && <PlacesManager rows={places} adminFetch={adminFetch} onReload={load} />}
```

- [ ] **Step 3: Build:** `npm run build` Expected: builds OK (PlaceEditModal created next; if build runs before Task 26, temporarily stub the import — but order tasks so 26 precedes the build, or create the modal file first).

> NOTE: create `PlaceEditModal.jsx` (Task 26) **before** running this build, since this file imports it.

- [ ] **Step 4: Commit** `git add src/admin/PlacesManager.jsx src/AdminPage.jsx && git commit -m "feat(admin): Places review queue + filters + bulk/row actions"`

### Task 26: `PlaceEditModal` — edit fields, photos/hero, dedupe merge

**Files:** Create `src/admin/PlaceEditModal.jsx`

- [ ] **Step 1: Create** `src/admin/PlaceEditModal.jsx`:

```jsx
import { useState } from 'react';
import { C } from '../theme';
import { X, Star } from 'lucide-react';

const FIELDS = [
  ['name', 'Name'], ['category', 'Category'], ['area', 'Area'], ['address', 'Address'],
  ['website', 'Website'], ['reference_url', 'Reference URL'], ['phone', 'Phone'],
];
const CATS = ['fun','sports','wellness','schools','childcare','extracurricular','camps','health'];

export const PlaceEditModal = ({ place, adminFetch, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: place.name || '', category: place.category || 'fun', area: place.area || '',
    address: place.address || '', website: place.website || '', reference_url: place.reference_url || '',
    phone: place.phone || '', description: place.description || '', tags: (place.tags || []).join(', '),
    visible: !!place.visible, review_status: place.review_status || 'needs_review',
  });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const photos = place.place_photos || [];

  const post = async (payload, label) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/places/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      return true;
    } catch (e) { alert(`${label} failed: ${e.message}`); return false; }
    finally { setBusy(false); }
  };

  const save = async () => {
    const patch = {
      name: form.name, category: form.category, area: form.area || null, address: form.address || null,
      website: form.website || null, reference_url: form.reference_url || null, phone: form.phone || null,
      description: form.description || null, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      visible: form.visible, review_status: form.review_status,
    };
    if (await post({ id: place.id, patch }, 'Save')) await onSaved();
  };

  const setHero = async (url) => { if (await post({ id: place.id, patch: { hero_photo: url } }, 'Set hero')) await onSaved(); };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 16, width: 560, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 20 }}>
        <div className="flex items-center mb-3">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, color: C.ink, flex: 1 }}>Edit place</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        {/* Photos + hero picker */}
        {photos.length > 0 && (
          <div className="flex gap-2 mb-3 flex-wrap">
            {photos.map(p => {
              const url = p.url || (p.google_ref ? `/api/places/photo?ref=${encodeURIComponent(p.google_ref)}&w=200` : null);
              const isHero = (place.hero_photo && place.hero_photo === p.url) || p.is_hero;
              return (
                <button key={p.id} onClick={() => url && setHero(p.url || url)} title="Set as hero"
                  style={{ position: 'relative', width: 84, height: 64, borderRadius: 8, overflow: 'hidden', border: `2px solid ${isHero ? C.saffron : C.divider}`, background: url ? `center/cover url(${url})` : C.lilac, cursor: 'pointer' }}>
                  {isHero && <Star size={13} fill={C.saffron} color={C.saffron} style={{ position: 'absolute', top: 3, right: 3 }} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Fields */}
        <div className="grid grid-cols-2 gap-2">
          {FIELDS.map(([k, label]) => k === 'category' ? (
            <label key={k} style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>{label}
              <select value={form.category} onChange={e => set('category', e.target.value)}
                style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          ) : (
            <label key={k} style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>{label}
              <input value={form[k]} onChange={e => set(k, e.target.value)}
                style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
            </label>
          ))}
        </div>
        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Description
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
        </label>
        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Tags (comma-separated)
          <input value={form.tags} onChange={e => set('tags', e.target.value)}
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
        </label>

        <div className="flex items-center gap-3 mt-3">
          <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink }}>
            <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)} /> visible in app
          </label>
          <select value={form.review_status} onChange={e => set('review_status', e.target.value)}
            style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px', fontSize: 12.5 }}>
            {['needs_review','approved','rejected','archived'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={busy} onClick={save}
            style={{ marginLeft: 'auto', background: C.terracotta, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Build:** `npm run build` Expected: builds OK (now PlacesManager's import resolves).
- [ ] **Step 3: Commit** `git add src/admin/PlaceEditModal.jsx && git commit -m "feat(admin): place edit modal + hero picker"`

> **Dedupe merge UI note:** the merge *endpoint* (Task 23) is live. A minimal merge UX: in `PlacesManager`, when exactly 2 rows are selected, show a "Merge selected" button that calls `post({ merge: { keepId, dropId } })` (keep = higher confidence/approved). Add this button next to the bulk bar as a follow-up step if desired; the spec's full side-by-side diff can be a later enhancement.

- [ ] **Step 4: Add minimal merge button** in `PlacesManager` bulk bar (only when `selected.size === 2`):

```jsx
{selected.size === 2 && (
  <button disabled={busy} onClick={() => {
    const [a, b] = [...selected];
    const ra = rows.find(r => r.id === a), rb = rows.find(r => r.id === b);
    const keep = (ra.review_status === 'approved' || (ra.source_confidence || 0) >= (rb.source_confidence || 0)) ? a : b;
    const drop = keep === a ? b : a;
    if (confirm(`Merge: keep "${rows.find(r=>r.id===keep).name}", drop the other?`)) post({ merge: { keepId: keep, dropId: drop } });
  }} style={{ background: C.saffron, color: C.ink, border: 'none', borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
    Merge duplicates
  </button>
)}
```

- [ ] **Step 5: Build + commit:** `npm run build` then `git add src/admin/PlacesManager.jsx && git commit -m "feat(admin): merge-duplicates action"`

---

# Phase 6 — Seed update + end-to-end verification

### Task 27: Update `seed.js` for the new shape

**Files:** Modify `api/_lib/seed.js`

- [ ] **Step 1: In `buildPlacesPayload`, set curated rows approved + ingestion fields.** Add to each pushed object:

```js
review_status: 'approved',
last_seen_at: new Date().toISOString(),
```

- [ ] **Step 2: After the places upsert in `runSeed`, seed `categories` + `place_categories`.** Add (after the places upsert block):

```js
// Categories metadata (idempotent).
const CATS = [
  ['fun','Fun','PartyPopper',1],['sports','Sports','Trophy',2],['wellness','Wellness','Heart',3],
  ['schools','Schools','GraduationCap',4],['childcare','Childcare','Baby',5],
  ['extracurricular','Extracurricular','Palette',6],['camps','Camps','Tent',7],['health','Health','Stethoscope',8],
];
await sb.from('categories').upsert(
  CATS.map(([id, label, icon, sort_order]) => ({ id, label, icon, kind: 'place', sort_order })),
  { onConflict: 'id' });

// Backfill primary-category memberships for seeded places.
const { data: seededPlaces } = await sb.from('places').select('id, category');
if (seededPlaces?.length) {
  await sb.from('place_categories').upsert(
    seededPlaces.map(p => ({ place_id: p.id, category_id: p.category })),
    { onConflict: 'place_id,category_id' });
}
```

- [ ] **Step 3: Syntax check:** `node --check api/_lib/seed.js` Expected: no output.
- [ ] **Step 4: Re-seed (optional, idempotent):**

```bash
set -a && . ./.env && set +a
npm run seed -- --places 50 --events 30 --moms 0
```
Expected: completes; curated places now `review_status='approved'`, categories populated.

- [ ] **Step 5: Commit** `git add api/_lib/seed.js && git commit -m "feat(seed): categories + place_categories + approved curated places"`

### Task 28: End-to-end verification

**Files:** none

- [ ] **Step 1: Full test suite:** `npm test` Expected: all PASS.
- [ ] **Step 2: Build:** `npm run build` Expected: PASS.
- [ ] **Step 3: API smoke (deployed or `vercel dev`):**

```bash
curl -s http://localhost:3000/api/categories | head -c 300
curl -s http://localhost:3000/api/places | head -c 300
```
Expected: `/api/categories` → 8 rows; `/api/places` → `count`, `places` (grouped), `topPicks`. (Routes don't run under `npm run dev` — use `vercel dev` or the deployed URL.)

- [ ] **Step 4: Approve ingested places in admin.** Open `/admin` → **Places** tab → filter `needs_review` → spot-check a few → **Approve + Publish** a batch.
- [ ] **Step 5: Confirm in app.** Open `/prototype` → Places/Activities tab → the approved ingested places appear. Toggling one back to `visible=false` in admin removes it from `/api/places` on next load.
- [ ] **Step 6: Confirm fallback.** Temporarily point `/api/places` to fail (or test offline) → app still renders hardcoded fallback, no blank screen.
- [ ] **Step 7: Final commit** (if any docs/notes changed): `git commit -am "docs: family-data-ingestion places slice complete"`

---

## Self-review (completed during authoring)

**Spec coverage:** taxonomy reconcile (T1), rich+provenance columns (T2), categories/place_categories/place_photos (T3–5), provenance tables (T6), Storage bucket (T7), public read API + photo proxy (T8–10), Approach-A screen wiring (T11–13), ingestion pipeline + Google connector + dedupe + images + CLI (T14–22), full-CRUD admin with filters/bulk/edit/photos/merge (T23–26), seed update (T27), end-to-end verify (T28). All spec sections map to tasks.

**Placeholder scan:** all code steps contain complete code; SQL/commands have expected output. The only deferred item is the *rich side-by-side dedupe diff*, explicitly scoped down to a working merge button (endpoint is complete) — noted, not silently dropped.

**Type consistency:** `groupPlaces`/`normalizePlacesPayload`/`normalizeGooglePlace`/`classifyCandidate`/`makeGradientPng`/`runIngestion` signatures are consistent across the files that import them; `adminFetch`, `rows`, `onReload`, `onSaved` props match between `PlacesManager` and `PlaceEditModal`; the `/api/admin/places/update` body variants match what the UI posts.
