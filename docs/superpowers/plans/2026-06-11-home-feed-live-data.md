# Home Feed Live-Data Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the five static Home-tab sections to live data (events, match-ranked moms, per-child age rail) and add an admin-curated "Local Favorite This Week" backed by a `weekly_favorites` history table.

**Architecture:** Pure logic (`age-rail.js`, `weekly-favorite.js`) is built test-first and stays React/IO-free. Two new serverless routes (public `local-favorite`, admin `weekly-favorite`) follow the existing `api/_lib/supabase.js` helper conventions. `HomeTab.jsx` is edited section-by-section; `App.jsx` fetches the favorite and threads it down. One new admin tab (`WeeklyFavoriteManager`) curates the weekly pick.

**Tech Stack:** Vite + React 18, Vercel serverless functions, Supabase Postgres (service-role REST via `fetch`), `node --test` for `*.test.mjs`, `lucide-react`, design tokens via `C` (`src/theme.js`).

**Spec:** `docs/superpowers/specs/2026-06-11-home-feed-live-data-design.md`

**Branch:** `feat/home-feed-live-data` (already created; spec already committed).

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/_apply_phase10_weekly_favorite.sql` | New `weekly_favorites` table + RLS (service-role only) |
| `api/_lib/weekly-favorite.js` | Pure: `weekStart(date)`, `placeScore(row)`, `pickAuto(rows, recentIds)` |
| `api/_lib/weekly-favorite.test.mjs` | Tests for the above |
| `api/local-favorite.js` | Public GET: this week's favorite, auto-pick+persist on miss |
| `api/admin/weekly-favorite.js` | Admin GET (current+history) / POST (set pick) |
| `src/lib/local-favorite-api.js` | Client `fetchLocalFavorite(city)` |
| `src/admin/WeeklyFavoriteManager.jsx` | Admin "Featured" tab UI |
| `src/lib/age-rail.js` | Pure: `childList(profile)`, `buildAgeRail(profile, places, events)` |
| `src/lib/age-rail.test.mjs` | Tests for the above |
| `src/data/events.js` | Add `LOCAL_DATED_EVENTS` |
| `api/_lib/seed.js` | Emit dated showcase events with fresh `starts_at` |
| `src/screens/MainApp/HomeTab.jsx` | §1 rename, §2 moms fix, §3 remove chats, §4 age rail, §5 favorite prop |
| `src/screens/MainApp/index.jsx` | Stop passing `groups` to HomeTab; thread `localFavorite` |
| `src/App.jsx` | Fetch + hold `localFavorite`, pass down |
| `src/AdminPage.jsx` | Register **Featured** tab |

**Task order rationale:** pure helpers + DB first (testable, no UI deps), then routes, then client wiring, then UI sections last (they depend on the helpers/props). Each task ends in a commit.

**Pre-flight (run once before Task 1):**

```bash
git branch --show-current   # expect: feat/home-feed-live-data
npm test                    # expect: existing suite green (baseline)
```

---

## Task 1: Create the `weekly_favorites` table

**Files:**
- Create: `supabase/_apply_phase10_weekly_favorite.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/_apply_phase10_weekly_favorite.sql`:

```sql
-- Phase 10: Weekly Favorite ("Local Favorite This Week") with history.
-- Apply via Supabase MCP / SQL editor. Idempotent. Service-role only.

create table if not exists public.weekly_favorites (
  id          uuid primary key default gen_random_uuid(),
  week_start  date not null,
  city        text not null default 'Tampa',
  place_id    bigint not null references public.places(id) on delete cascade,
  source      text not null default 'auto' check (source in ('admin','auto')),
  created_at  timestamptz not null default now(),
  unique (week_start, city)
);

create index if not exists weekly_favorites_week_idx
  on public.weekly_favorites (city, week_start desc);

-- Lock down: only service-role server routes touch this table. RLS on with no
-- policy denies anon/public PostgREST access; service role bypasses RLS.
alter table public.weekly_favorites enable row level security;
```

- [ ] **Step 2: Apply the migration**

Apply via the Supabase MCP tool `mcp__supabase__apply_migration` with name `phase10_weekly_favorite` and the SQL above. (If MCP is unavailable, paste into the Supabase SQL editor.)

- [ ] **Step 3: Verify the table exists**

Run `mcp__supabase__list_tables` (or `mcp__supabase__execute_sql` with
`select count(*) from public.weekly_favorites;`).
Expected: table present, count `0`, no error.

- [ ] **Step 4: Commit**

```bash
git add supabase/_apply_phase10_weekly_favorite.sql
git commit -m "feat(db): add weekly_favorites table for Local Favorite history"
```

---

## Task 2: Pure weekly-favorite helpers (TDD)

`place_id` in the DB is `bigint`; in JS it arrives as a number. `placeScore`
mirrors `home-feed.js`'s scorer so auto-picks match the rest of the app.

**Files:**
- Create: `api/_lib/weekly-favorite.js`
- Test: `api/_lib/weekly-favorite.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `api/_lib/weekly-favorite.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, placeScore, pickAuto } from './weekly-favorite.js';

test('weekStart returns the Monday of the week as YYYY-MM-DD', () => {
  // 2026-06-11 is a Thursday → Monday is 2026-06-08
  assert.equal(weekStart(new Date('2026-06-11T15:00:00')), '2026-06-08');
  // Monday maps to itself
  assert.equal(weekStart(new Date('2026-06-08T00:00:00')), '2026-06-08');
  // Sunday belongs to the week that started the previous Monday
  assert.equal(weekStart(new Date('2026-06-14T23:59:00')), '2026-06-08');
});

test('placeScore weights rating by review volume', () => {
  const hi = placeScore({ rating: 4.8, review_count: 999 });
  const lo = placeScore({ rating: 4.8, review_count: 0 });
  assert.ok(hi > lo);
  assert.equal(placeScore({ rating: null, review_count: null }), 0);
});

test('pickAuto picks the top-scoring place not on cooldown', () => {
  const rows = [
    { id: 1, rating: 4.9, review_count: 500 },
    { id: 2, rating: 4.7, review_count: 800 },
    { id: 3, rating: 4.5, review_count: 100 },
  ];
  // id 1 would win, but it's on cooldown → id 2 (higher reviews than 3).
  assert.equal(pickAuto(rows, [1]).id, 2);
  // Nothing on cooldown → highest score (id 1).
  assert.equal(pickAuto(rows, []).id, 1);
});

test('pickAuto is deterministic on score ties (review_count then id)', () => {
  const rows = [
    { id: 5, rating: 4.0, review_count: 10 },
    { id: 2, rating: 4.0, review_count: 10 },
  ];
  assert.equal(pickAuto(rows, []).id, 2); // equal score+reviews → lowest id
});

test('pickAuto returns null when every place is on cooldown', () => {
  const rows = [{ id: 1, rating: 4.9, review_count: 500 }];
  assert.equal(pickAuto(rows, [1]), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/weekly-favorite.test.mjs`
Expected: FAIL — `Cannot find module './weekly-favorite.js'`.

- [ ] **Step 3: Write the implementation**

Create `api/_lib/weekly-favorite.js`:

```js
// Pure helpers for the Weekly Favorite ("Local Favorite This Week"). No I/O.
// The 8-week cooldown is applied by the caller (it decides which place_ids are
// "recent" and passes them as recentIds); this module just scores and picks.

// Monday-start week key. Returns 'YYYY-MM-DD' for the Monday 00:00 of the
// week containing `date`, in the date's local time.
export const weekStart = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();                 // 0=Sun..6=Sat
  const backToMonday = (dow + 6) % 7;      // Sun→6, Mon→0, Tue→1, ...
  d.setDate(d.getDate() - backToMonday);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Quality weighted by review volume — mirrors src/lib/home-feed.js placeScore.
export const placeScore = (r) =>
  (r.rating || 0) * Math.log10((r.review_count || 0) + 1);

// Highest-scoring place whose id is not in recentIds. Deterministic tie-break:
// higher review_count, then lower id. Returns null when none are eligible.
export const pickAuto = (rows = [], recentIds = []) => {
  const block = new Set(recentIds);
  const eligible = (rows || []).filter((r) => r && r.id != null && !block.has(r.id));
  if (!eligible.length) return null;
  return eligible.sort((a, b) =>
    (placeScore(b) - placeScore(a)) ||
    ((b.review_count || 0) - (a.review_count || 0)) ||
    (a.id - b.id),
  )[0];
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/weekly-favorite.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/weekly-favorite.js api/_lib/weekly-favorite.test.mjs
git commit -m "feat(api): pure weekly-favorite helpers (weekStart, pickAuto)"
```

---

## Task 3: Public `GET /api/local-favorite`

Returns this week's favorite; on a miss, auto-picks (excluding the last 8 weeks)
and persists, race-safe via the `(week_start, city)` unique constraint.

**Files:**
- Create: `api/local-favorite.js`

- [ ] **Step 1: Write the route**

Create `api/local-favorite.js`:

```js
// GET /api/local-favorite?city=Tampa — public. Returns the current week's
// featured place. On a miss, auto-selects a high-rated place not featured in the
// last 8 weeks, persists it (source:'auto'), and returns it. Shape:
//   { ok: true, favorite: { place_id, week_start, source, name, hero_photo,
//                           rating, review_count, area, city } | null }
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';
import { weekStart, pickAuto } from './_lib/weekly-favorite.js';

const COOLDOWN_WEEKS = 8;
const PLACE_COLS = 'id,name,hero_photo,rating,review_count,area,city';

const toFavorite = (row) => {
  if (!row || !row.places) return null;
  const p = row.places;
  return {
    place_id: p.id, week_start: row.week_start, source: row.source,
    name: p.name, hero_photo: p.hero_photo, rating: p.rating,
    review_count: p.review_count, area: p.area, city: p.city,
  };
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const city = (new URL(req.url, 'http://x').searchParams.get('city') || 'Tampa').slice(0, 80);
  const ws = weekStart(new Date());
  const base = creds.supabaseUrl;
  const H = sbHeaders(creds.serviceRoleKey);
  const sel = `select=week_start,source,places(${PLACE_COLS})`;
  const weekFilter = `week_start=eq.${ws}&city=eq.${encodeURIComponent(city)}`;

  try {
    // 1. Already chosen for this week?
    const hit = await fetch(`${base}/rest/v1/weekly_favorites?${weekFilter}&${sel}`, { headers: H });
    if (hit.ok) {
      const rows = await hit.json();
      if (rows[0]) return json(res, 200, { ok: true, favorite: toFavorite(rows[0]) });
    }

    // 2. Last 8 weeks' place_ids → cooldown set.
    const recentR = await fetch(
      `${base}/rest/v1/weekly_favorites?city=eq.${encodeURIComponent(city)}` +
      `&order=week_start.desc&limit=${COOLDOWN_WEEKS}&select=place_id`, { headers: H });
    const recentIds = recentR.ok ? (await recentR.json()).map((r) => r.place_id) : [];

    // 3. Candidate places (visible + approved).
    const placesR = await fetch(
      `${base}/rest/v1/places?visible=eq.true&review_status=eq.approved` +
      `&select=${PLACE_COLS}&limit=1000`, { headers: H });
    const places = placesR.ok ? await placesR.json() : [];

    let pick = pickAuto(places, recentIds);
    if (!pick) pick = pickAuto(places, []); // relax cooldown if everything's blocked
    if (!pick) return json(res, 200, { ok: true, favorite: null });

    // 4. Persist (ignore-duplicates → race-safe), then re-read the canonical row.
    await fetch(`${base}/rest/v1/weekly_favorites?on_conflict=week_start,city`, {
      method: 'POST',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'resolution=ignore-duplicates' }),
      body: JSON.stringify({ week_start: ws, city, place_id: pick.id, source: 'auto' }),
    });
    const finalR = await fetch(`${base}/rest/v1/weekly_favorites?${weekFilter}&${sel}`, { headers: H });
    const finalRows = finalR.ok ? await finalR.json() : [];
    return json(res, 200, { ok: true, favorite: toFavorite(finalRows[0]) });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not load local favorite' });
  }
}
```

- [ ] **Step 2: Verify it loads (smoke test)**

Run the dev server (`npm run dev`, Vercel functions on :3000) and:
Run: `curl -s 'http://localhost:3000/api/local-favorite?city=Tampa' | head -c 400`
Expected: JSON `{"ok":true,"favorite":{...}}` (a place if any approved+rated places exist, else `favorite:null`). Re-running returns the **same** place (now persisted). No 500.

> If the local stack isn't running, defer this smoke test to Task 13's verification pass; the route has no unit test (pure logic is covered in Task 2).

- [ ] **Step 3: Commit**

```bash
git add api/local-favorite.js
git commit -m "feat(api): public /api/local-favorite with auto-pick + persist"
```

---

## Task 4: Admin `GET/POST /api/admin/weekly-favorite`

**Files:**
- Create: `api/admin/weekly-favorite.js`

- [ ] **Step 1: Write the route**

Create `api/admin/weekly-favorite.js`:

```js
// Admin Weekly Favorite editor. SECURITY: requireAdmin bearer token.
//   GET  /api/admin/weekly-favorite?city=Tampa -> { current, history }
//   POST { place_id, city?, week_start? }       -> upsert this week's pick (admin)
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';
import { weekStart } from '../_lib/weekly-favorite.js';

const PLACE_COLS = 'id,name,hero_photo,rating,review_count,area,city';
const SEL = `select=id,week_start,city,source,place_id,places(${PLACE_COLS})`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const base = creds.supabaseUrl;
  const url = new URL(req.url, 'http://x');
  const city = (url.searchParams.get('city') || 'Tampa').slice(0, 80);
  const ws = weekStart(new Date());

  try {
    if (req.method === 'GET') {
      const cityF = `city=eq.${encodeURIComponent(city)}`;
      const curR = await fetch(
        `${base}/rest/v1/weekly_favorites?${cityF}&week_start=eq.${ws}&${SEL}`,
        { headers: sbHeaders(creds.serviceRoleKey) });
      const histR = await fetch(
        `${base}/rest/v1/weekly_favorites?${cityF}&order=week_start.desc&limit=12&${SEL}`,
        { headers: sbHeaders(creds.serviceRoleKey) });
      if (!curR.ok || !histR.ok) return json(res, 502, { error: 'Supabase read failed' });
      const current = (await curR.json())[0] || null;
      const history = await histR.json();
      return json(res, 200, { current, history });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const placeId = Number(body?.place_id);
      if (!Number.isFinite(placeId)) return json(res, 400, { error: 'place_id required' });
      const postCity = (body?.city || 'Tampa').slice(0, 80);
      const week = body?.week_start || ws;

      // Validate the place is real + visible.
      const pR = await fetch(
        `${base}/rest/v1/places?id=eq.${placeId}&visible=eq.true&select=id`,
        { headers: sbHeaders(creds.serviceRoleKey) });
      if (!pR.ok || !(await pR.json()).length) {
        return json(res, 400, { error: 'unknown or hidden place_id' });
      }

      const r = await fetch(`${base}/rest/v1/weekly_favorites?on_conflict=week_start,city`, {
        method: 'POST',
        headers: sbHeaders(creds.serviceRoleKey, {
          Prefer: 'resolution=merge-duplicates,return=representation',
        }),
        body: JSON.stringify({ week_start: week, city: postCity, place_id: placeId, source: 'admin' }),
      });
      const text = await r.text();
      if (!r.ok) return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
      return json(res, 200, { ok: true, row: JSON.parse(text || '[]')[0] || null });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
```

- [ ] **Step 2: Sanity-check imports against an existing admin route**

Run: `grep -n "requireAdmin\|readJsonBody\|sbHeaders" api/admin/config.js`
Expected: confirms the same import names/signatures used above exist.

- [ ] **Step 3: Commit**

```bash
git add api/admin/weekly-favorite.js
git commit -m "feat(api): admin weekly-favorite GET (current+history) / POST (set pick)"
```

---

## Task 5: Client fetch + thread `localFavorite` into HomeTab

**Files:**
- Create: `src/lib/local-favorite-api.js`
- Modify: `src/App.jsx`
- Modify: `src/screens/MainApp/index.jsx`
- Modify: `src/screens/MainApp/HomeTab.jsx`

- [ ] **Step 1: Write the client**

Create `src/lib/local-favorite-api.js`:

```js
// Client for the public Local Favorite API.
export const fetchLocalFavorite = async (city = 'Tampa') => {
  const res = await fetch(`/api/local-favorite?city=${encodeURIComponent(city)}`,
    { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`local-favorite ${res.status}`);
  const data = await res.json();
  return data?.favorite || null;
};
```

- [ ] **Step 2: Fetch in App.jsx**

In `src/App.jsx`, near the other API imports (around line 39-42), add:

```js
import { fetchLocalFavorite } from './lib/local-favorite-api';
```

Near the other feed state (around line 59, with `nearbyMoms`), add:

```js
const [localFavorite, setLocalFavorite] = useState(null);
```

Near the other mount `useEffect`s that call `fetchEvents()`/`fetchPlaces()`
(around line 127), add:

```js
useEffect(() => {
  let alive = true;
  fetchLocalFavorite('Tampa')
    .then((fav) => { if (alive) setLocalFavorite(fav); })
    .catch(() => {});
  return () => { alive = false; };
}, []);
```

Then pass it to the MainApp render where `nearbyMoms={nearbyMomsShown}` is passed
(around line 460), add:

```jsx
localFavorite={localFavorite}
```

- [ ] **Step 3: Thread through MainApp/index.jsx**

In `src/screens/MainApp/index.jsx`, add `localFavorite = null` to the component
prop destructure (near `nearbyMoms = []`, around line 65), and pass it to
`<HomeTab>` (around line 191):

```jsx
localFavorite={localFavorite}
```

- [ ] **Step 4: Consume in HomeTab.jsx**

In `src/screens/MainApp/HomeTab.jsx`, add `localFavorite = null` to the props
destructure (near `location,` around line 408). Then replace the
`localFavorite` derivation block (currently `const liveTrending = ...` through
`const localFavorite = liveTrending[0] ? {...} : LOCAL_FAVORITE_FALLBACK;`,
~lines 587-600) with:

```jsx
  // Local Favorite — admin-curated for the week (via /api/local-favorite),
  // falling back to the top trending place only when the API has nothing yet.
  const liveTrending = pickTrendingPlaces(places, 8, profile);
  const LOCAL_FAVORITE_FALLBACK = {
    id: 'lf-1', name: "Glazer Children's Museum",
    rating: 4.8, review_count: 450, distance: '1.4 miles',
    hero_photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=600&auto=format&fit=crop',
    tagline: `Most loved place by ${city || 'Tampa'} moms this week`,
  };
  const favoriteCard = localFavorite
    ? {
        id: `wf-${localFavorite.place_id}`,
        name: localFavorite.name,
        rating: localFavorite.rating,
        review_count: localFavorite.review_count,
        hero_photo: localFavorite.hero_photo,
        distance: localFavorite.area || '',
        tagline: `Most loved place by ${localFavorite.city || city || 'Tampa'} moms this week`,
      }
    : liveTrending[0]
      ? { ...liveTrending[0], distance: liveTrending[0].distance || '1.4 miles',
          tagline: `Most loved place by ${city || 'Tampa'} moms this week` }
      : LOCAL_FAVORITE_FALLBACK;
```

Then update the render (~line 767) to use the renamed variable:

```jsx
        <SectionHead title="Local Favorite This Week"/>
        <LocalFavoriteCard item={favoriteCard} onClick={() => openPlace(favoriteCard)}/>
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: build succeeds, no unresolved imports.

- [ ] **Step 6: Commit**

```bash
git add src/lib/local-favorite-api.js src/App.jsx src/screens/MainApp/index.jsx src/screens/MainApp/HomeTab.jsx
git commit -m "feat(home): drive Local Favorite from /api/local-favorite"
```

---

## Task 6: Admin "Featured" tab

**Files:**
- Create: `src/admin/WeeklyFavoriteManager.jsx`
- Modify: `src/AdminPage.jsx`

The admin token is read the same way other managers do it. Confirm the pattern
first.

- [ ] **Step 1: Confirm the admin-fetch pattern**

Run: `grep -n "Authorization\|Bearer\|adminToken\|localStorage" src/admin/ConfigManager.jsx`
Expected: shows how `ConfigManager` attaches the admin bearer token to fetches.
Use the identical mechanism in the new manager (read the token the same way;
do not invent a new storage key).

- [ ] **Step 2: Write the manager component**

Create `src/admin/WeeklyFavoriteManager.jsx`. Use the **same token retrieval**
found in Step 1 (shown here as `getAdminToken()` — replace with the real call):

```jsx
import { useEffect, useState } from 'react';
import { Star, Search, Check } from 'lucide-react';
import { C } from '../theme';

// Reuse the exact admin-token mechanism from ConfigManager (see Step 1).
const authHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const WeeklyFavoriteManager = ({ adminToken, places = [] }) => {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    fetch('/api/admin/weekly-favorite?city=Tampa', { headers: authHeaders(adminToken) })
      .then((r) => r.json())
      .then((d) => { setCurrent(d.current || null); setHistory(d.history || []); })
      .catch(() => setMsg('Could not load weekly favorite'));
  };
  useEffect(load, [adminToken]);

  const setFavorite = async (placeId) => {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/weekly-favorite', {
        method: 'POST', headers: authHeaders(adminToken),
        body: JSON.stringify({ place_id: placeId, city: 'Tampa' }),
      });
      if (!r.ok) throw new Error((await r.json())?.error || `HTTP ${r.status}`);
      setMsg('Saved this week’s favorite ✓');
      load();
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  };

  const flat = Array.isArray(places) ? places
    : Object.values(places || {}).flat();
  const matches = query.trim()
    ? flat.filter((p) => (p.name || '').toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  const title = { fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: C.navy };
  const card = { background: C.paper, border: `1px solid ${C.divider}`, borderRadius: 14, padding: 16 };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Star size={16} color={C.saffron}/>
          <span style={title}>Local Favorite This Week</span>
        </div>
        {current ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {current.places?.hero_photo &&
              <img src={current.places.hero_photo} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover' }}/>}
            <div>
              <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: C.navy }}>
                {current.places?.name || `Place #${current.place_id}`}
              </div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkSoft }}>
                Week of {current.week_start} ·{' '}
                <span style={{ color: current.source === 'admin' ? C.sageDark : C.muted, fontWeight: 700 }}>
                  {current.source === 'admin' ? 'Admin pick' : 'Auto'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.muted }}>
            No favorite set for this week yet.
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: C.navy, marginBottom: 10 }}>
          Set this week’s favorite
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${C.divider}`, borderRadius: 10, padding: '8px 10px' }}>
          <Search size={15} color={C.muted}/>
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Tampa places…"
            style={{ border: 'none', outline: 'none', flex: 1, fontFamily: 'Albert Sans', fontSize: 14, background: 'transparent', color: C.navy }}
          />
        </div>
        <div style={{ marginTop: 10, display: 'grid', gap: 6 }}>
          {matches.map((p) => (
            <button key={p.id} disabled={busy} onClick={() => setFavorite(p.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: C.cream, border: `1px solid ${C.divider}`, borderRadius: 10,
                padding: '9px 12px', cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, color: C.navy }}>
                {p.name} {p.area ? <span style={{ color: C.muted, fontWeight: 500 }}>· {p.area}</span> : null}
              </span>
              <Check size={15} color={C.sageDark}/>
            </button>
          ))}
        </div>
        {msg && <div style={{ marginTop: 10, fontFamily: 'Albert Sans', fontSize: 12, color: C.coralDeep }}>{msg}</div>}
      </div>

      <div style={card}>
        <div style={{ fontFamily: 'Albert Sans', fontWeight: 800, color: C.navy, marginBottom: 10 }}>
          History
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          {history.map((h) => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between',
              fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft,
              borderBottom: `1px solid ${C.divider}`, paddingBottom: 6 }}>
              <span>{h.week_start}</span>
              <span style={{ color: C.navy, fontWeight: 700 }}>{h.places?.name || `#${h.place_id}`}</span>
              <span style={{ color: h.source === 'admin' ? C.sageDark : C.muted }}>{h.source}</span>
            </div>
          ))}
          {!history.length && <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted }}>No history yet.</div>}
        </div>
      </div>
    </div>
  );
};
```

> If Step 1 shows ConfigManager reads the token from a prop, pass `adminToken`
> from `AdminPage` (Step 3). If it reads from `localStorage`/a context, mirror
> that instead and drop the `adminToken` prop.

- [ ] **Step 3: Register the tab in AdminPage.jsx**

In `src/AdminPage.jsx`:
- Add `Star` to the `lucide-react` import (line 5 group).
- Add the import: `import { WeeklyFavoriteManager } from './admin/WeeklyFavoriteManager';`
- Add the tab entry to the tab list (after the `events` entry, ~line 1731):
  `{ id: 'featured', icon: Star, label: 'Featured' },`
- Render it where the other `tab === '<id>'` blocks render their managers (match
  the existing pattern, e.g. how `tab === 'config'` renders `<ConfigManager .../>`),
  passing the **same props** those managers receive for token + places:
  `{tab === 'featured' && <WeeklyFavoriteManager adminToken={/* same as ConfigManager */} places={places} />}`

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/admin/WeeklyFavoriteManager.jsx src/AdminPage.jsx
git commit -m "feat(admin): Featured tab to curate the weekly Local Favorite"
```

---

## Task 7: Pure age-rail helpers (TDD)

**Files:**
- Create: `src/lib/age-rail.js`
- Test: `src/lib/age-rail.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/lib/age-rail.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { childList, buildAgeRail } from './age-rail.js';

test('childList uses names when present, else stage labels', () => {
  const withNames = childList({ settings: { kids: [
    { age: '1–3', name: 'Mia' }, { age: '12–18', name: '' },
  ] } });
  assert.deepEqual(withNames.map((c) => c.label), ['Mia', 'Teen']);
  assert.deepEqual(withNames.map((c) => c.bucket), ['1–3', '12–18']);
});

test('childList reconstructs from kidsAges counts when no rich list', () => {
  const list = childList({ kidsAges: { '1–3': 2 } });
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((c) => c.label), ['Toddler', 'Toddler']);
});

test('buildAgeRail mixes places + events and tags forChild', () => {
  const profile = { settings: { kids: [{ age: '1–3', name: 'Mia' }, { age: '12–18', name: 'Sam' }] } };
  const places = { fun: [
    { id: 'p1', name: 'Toddler Gym', kid_ages: ['1–3'], hero_photo: 'x' },
    { id: 'p2', name: 'Teen Lounge', kid_ages: ['12–18'] },
  ] };
  const events = { thisWeek: [
    { id: 'e1', name: 'Baby Music', kidAges: ['0–1','1–3'], photo: 'y', startsAt: '2026-06-12T10:00:00Z' },
  ], events: [] };

  const rail = buildAgeRail(profile, places, events, { limit: 10 });
  const ids = rail.map((i) => i.id);
  assert.ok(ids.includes('p1') && ids.includes('p2') && ids.includes('e1'));
  assert.deepEqual(rail.find((i) => i.id === 'p1').type, 'place');
  assert.deepEqual(rail.find((i) => i.id === 'e1').type, 'event');
  // Toddler Gym fits child 0 (Mia, 1–3), not child 1 (Sam, teen).
  assert.deepEqual(rail.find((i) => i.id === 'p1').forChild, [0]);
  assert.deepEqual(rail.find((i) => i.id === 'p2').forChild, [1]);
});

test('buildAgeRail returns [] when the profile has no kids', () => {
  assert.deepEqual(buildAgeRail({}, { fun: [{ id: 'p1', name: 'X' }] }, { thisWeek: [] }), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/age-rail.test.mjs`
Expected: FAIL — `Cannot find module './age-rail.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/age-rail.js`:

```js
// Pure builder for the "Based On Your Child's Age" rail. No React/theme imports.
// Scores places + events against EACH of the user's kids (single-bucket profile)
// using the shared content-score scorers, then ranks by best cross-kid fit.

import { scorePlace, scoreEvent } from './content-score.js';

const PLACE_CATEGORY_KEYS =
  ['fun', 'sports', 'wellness', 'schools', 'childcare', 'extracurricular', 'camps', 'health'];

const STAGE_LABEL = {
  '0–1': 'Baby', '1–3': 'Toddler', '3–5': 'Preschooler',
  '5–8': 'Big kid', '8–12': 'Tween', '12–18': 'Teen',
};

const FIT_THRESHOLD = 35; // a child must score at least this for an item to count "for" them.

// Normalize the user's children into { name?, bucket, label }.
export const childList = (profile = {}) => {
  const rich = profile?.settings?.kids;
  if (Array.isArray(rich) && rich.length) {
    return rich.map((c) => {
      const bucket = c.age || '1–3';
      const name = (c.name || '').trim();
      return { name: name || undefined, bucket, label: name || STAGE_LABEL[bucket] || 'Kid' };
    });
  }
  const out = [];
  Object.entries(profile?.kidsAges || {}).forEach(([bucket, n]) => {
    for (let i = 0; i < (Number(n) || 0); i++) {
      out.push({ bucket, label: STAGE_LABEL[bucket] || 'Kid' });
    }
  });
  return out;
};

const flattenPlaces = (places) => {
  if (!places || typeof places !== 'object') return [];
  const seen = new Set();
  const out = [];
  for (const k of PLACE_CATEGORY_KEYS) {
    for (const r of (Array.isArray(places[k]) ? places[k] : [])) {
      if (r?.id != null && seen.has(r.id)) continue;
      if (r?.id != null) seen.add(r.id);
      out.push(r);
    }
  }
  return out;
};

const placePhoto = (p) => p.hero_photo || p.blob_url || p.url || null;
const ageLabelForBuckets = (buckets) =>
  buckets && buckets.length ? `${buckets[0]}${buckets.length > 1 ? '+' : ''} yrs` : '';

// Build a one-bucket profile so a scorer judges fit for a single child.
const childProfile = (profile, bucket) => ({ ...profile, kidsAges: { [bucket]: 1 } });

export const buildAgeRail = (profile = {}, places = {}, events = {}, { limit = 12 } = {}) => {
  const kids = childList(profile);
  if (!kids.length) return [];

  const eventList = [
    ...(Array.isArray(events?.thisWeek) ? events.thisWeek : []),
    ...(Array.isArray(events?.events) ? events.events : []),
    ...(Array.isArray(events?.recurring) ? events.recurring : []),
  ];

  const scoreFor = (item, scorer) => {
    let best = 0; const forChild = [];
    kids.forEach((kid, idx) => {
      const s = scorer(childProfile(profile, kid.bucket), item).score;
      if (s > best) best = s;
      if (s >= FIT_THRESHOLD) forChild.push(idx);
    });
    return { best, forChild };
  };

  const items = [];
  const seen = new Set();

  for (const p of flattenPlaces(places)) {
    const key = `place:${p.id}`;
    if (seen.has(key)) continue; seen.add(key);
    const { best, forChild } = scoreFor(p, scorePlace);
    if (best <= 0) continue;
    items.push({
      id: p.id, type: 'place', name: p.name, photo: placePhoto(p),
      ageLabel: ageLabelForBuckets(p.kid_ages || p.kidAges),
      reason: scorePlace(childProfile(profile, kids[forChild[0] ?? 0].bucket), p).reasons[0] || '',
      distance: p.distance || (p.area ? p.area : 'Near you'),
      score: best, forChild,
    });
  }

  for (const e of eventList) {
    const key = `event:${e.id}`;
    if (seen.has(key)) continue; seen.add(key);
    const { best, forChild } = scoreFor(e, scoreEvent);
    if (best <= 0) continue;
    items.push({
      id: e.id, type: 'event', name: e.name, photo: e.photo || null,
      ageLabel: ageLabelForBuckets(e.kidAges || e.kid_ages),
      reason: scoreEvent(childProfile(profile, kids[forChild[0] ?? 0].bucket), e).reasons[0] || '',
      when: e.recurring || e.time || 'Upcoming',
      score: best, forChild,
    });
  }

  return items.sort((a, b) => b.score - a.score).slice(0, limit);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/age-rail.test.mjs`
Expected: PASS (4 tests).

> Note: thresholds may need a nudge if a real-data check in Task 8 shows an item
> mis-attributed. The test fixtures are tuned so `scorePlace`/`scoreEvent` clear
> `FIT_THRESHOLD=35` only for the matching bucket; if you change the threshold,
> re-run this test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/age-rail.js src/lib/age-rail.test.mjs
git commit -m "feat(home): pure per-child age-rail builder (places + events)"
```

---

## Task 8: "Based On Your Child's Age" rail UI

**Files:**
- Modify: `src/screens/MainApp/HomeTab.jsx`

- [ ] **Step 1: Import the builder + add child-filter state**

In `src/screens/MainApp/HomeTab.jsx`, add to the imports:

```js
import { buildAgeRail, childList } from '../../lib/age-rail';
```

Add a state hook with the other `useState`s (~line 421):

```js
const [ageChild, setAgeChild] = useState(null); // null = All
```

- [ ] **Step 2: Replace the static AGE_PROGRAMS data block**

Remove the `kidsBucketArr` / `AGE_RANGE_LABEL` / `youngest` / `ageSubtitle` /
`AGE_PROGRAMS` block (~lines 546-575) and replace with:

```jsx
  // Based On Your Child's Age — real, kid-age-ranked places + events.
  const ageKids = childList(profile);
  const ageRailAll = buildAgeRail(profile, places, { thisWeek, events }, { limit: 12 });
  const ageRail = ageChild == null
    ? ageRailAll
    : ageRailAll.filter((it) => it.forChild.includes(ageChild));
```

- [ ] **Step 3: Generalize AgeProgramCard for place + event**

Replace the `AgeProgramCard` component (~lines 269-299) with a version that
shows a type chip and the fit reason:

```jsx
const AgeProgramCard = ({ item, onClick }) => {
  const isEvent = item.type === 'event';
  return (
    <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
      flexShrink: 0, width: 142, background: '#fff', borderRadius: 14,
      border: `1px solid ${C.line}`, boxShadow: '0 4px 12px -8px rgba(27,42,78,.25)',
      overflow: 'hidden', padding: 0, cursor: 'pointer',
    }}>
      {item.photo
        ? <img src={item.photo} alt="" style={{ width: '100%', height: 88, objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: '100%', height: 88, background: C.lilac }}/>}
      <div style={{ padding: '8px 10px 10px' }}>
        <span style={{
          display: 'inline-block', fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800,
          letterSpacing: '.04em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 6,
          background: isEvent ? C.coralSoft : C.sage,
          color: isEvent ? C.coralDeep : C.sageDark, marginBottom: 5,
        }}>
          {isEvent ? 'Event' : 'Place'}
        </span>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 800,
          color: C.navy, lineHeight: 1.15,
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {item.name}
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 3 }}>
          {item.reason || (isEvent ? item.when : item.ageLabel)}
        </div>
        {(isEvent ? item.when : item.distance) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 2, marginTop: 4,
            fontFamily: 'Albert Sans', fontSize: 9, color: C.inkSoft,
          }}>
            <MapPin size={9} color={C.muted}/> {isEvent ? item.when : item.distance}
          </div>
        )}
      </div>
    </button>
  );
};
```

- [ ] **Step 4: Replace the section render (head + chips + rail)**

Replace the existing "Based On Your Child's Age" `SectionHead` + rail
(~lines 745-755) with a guarded block that includes the filter chips:

```jsx
        {/* Based On Your Child's Age — per-child filterable, places + events */}
        {ageKids.length > 0 && ageRailAll.length > 0 && (
          <>
            <SectionHead
              title="Based On Your Child's Age"
              onLink={goToKidsPrograms || goToPlaces}
            />
            {ageKids.length > 1 && (
              <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 8 }}>
                {[{ label: 'All', idx: null }, ...ageKids.map((k, i) => ({ label: k.label, idx: i }))].map((chip) => {
                  const active = ageChild === chip.idx;
                  return (
                    <button key={chip.label + chip.idx} onClick={() => setAgeChild(chip.idx)}
                      className="active:scale-[.97] transition-transform"
                      style={{
                        flexShrink: 0, padding: '6px 13px', borderRadius: 999,
                        background: active ? C.coral : C.paper,
                        color: active ? '#fff' : C.navy,
                        border: `1px solid ${active ? C.coral : C.divider}`,
                        fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700,
                        whiteSpace: 'nowrap', cursor: 'pointer',
                      }}>
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
              {ageRail.map((p) => (
                <AgeProgramCard key={`${p.type}-${p.id}`} item={p}
                  onClick={() => (p.type === 'event' ? openMeetup({ id: p.id, title: p.name, photo: p.photo, when: p.when, mi: null }) : openPlace(p))}/>
              ))}
            </div>
          </>
        )}
```

- [ ] **Step 5: Verify build + run the age-rail test**

Run: `npm run build && node --test src/lib/age-rail.test.mjs`
Expected: build succeeds; age-rail tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/screens/MainApp/HomeTab.jsx
git commit -m "feat(home): per-child age rail with name/stage filter chips"
```

---

## Task 9: Make the showcase events real (data + seed)

**Files:**
- Modify: `src/data/events.js`
- Modify: `api/_lib/seed.js`

- [ ] **Step 1: Inspect the existing event shape**

Run: `grep -n "SUGGESTED_EVENTS" src/data/events.js | head; sed -n '1,40p' src/data/events.js`
Expected: shows the existing object shape (id, name, place, day, bucket, time,
tags, going, photo, recurring) so the new constant matches it.

- [ ] **Step 2: Add `LOCAL_DATED_EVENTS` to events.js**

Append to `src/data/events.js`:

```js
// Curated dated showcase events for the Home "Local Events Nearby" rail.
// Seeded as real `kind:'dated'` rows with a fresh starts_at = now + daysAhead
// (see api/_lib/seed.js) so they never go stale. kid_ages/tags power the
// age-rail + relevance scoring.
export const LOCAL_DATED_EVENTS = [
  {
    id: 'home-splash-pad', name: 'Saturday Splash Pad Meetup',
    place: 'Curtis Hixon Park', time: '9:30 AM', daysAhead: 5,
    tags: ['Water lovers', 'Outdoors'], kid_ages: ['1–3', '3–5'],
    event_type: 'meetup', going: 12,
    photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=400&auto=format&fit=crop',
  },
  {
    id: 'home-music-together', name: 'Music Together Class',
    place: 'Hyde Park', time: '10:00 AM', daysAhead: 2,
    tags: ['Music lovers'], kid_ages: ['0–1', '1–3'],
    event_type: 'class', going: 8,
    photo: 'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&auto=format&fit=crop',
  },
  {
    id: 'home-zoo-family-day', name: 'ZooTampa Family Day',
    place: 'ZooTampa', time: '11:00 AM', daysAhead: 7,
    tags: ['Outdoors', 'Active weekends'], kid_ages: ['3–5', '5–8'],
    event_type: 'attraction', going: 22,
    photo: 'https://images.unsplash.com/photo-1566737236500-c8ac43014a8e?w=400&auto=format&fit=crop',
  },
];
```

- [ ] **Step 3: Emit them as dated rows in seed.js**

In `api/_lib/seed.js`, add to the data imports (line 11 group):

```js
import { SUGGESTED_EVENTS as LOCAL_EVENTS, LOCAL_DATED_EVENTS } from '../../src/data/events.js';
```

(Replace the existing `SUGGESTED_EVENTS` import line — do not add a duplicate.)

In `buildEventsPayload`, just before `return out.slice(0, wantEvents);`, insert:

```js
  // Curated dated showcase events for the Home rail — fresh starts_at each seed.
  const now = Date.now();
  for (const e of LOCAL_DATED_EVENTS) {
    const match = places.find(p => e.place && p.area && e.place.includes(p.area)) || places[0];
    out.push({
      slug: e.id,
      name: e.name,
      place_id: match?.id || null,
      city: 'Tampa, FL',
      day_of_week: null,
      bucket: null,
      time_label: e.time,
      recurring: null,
      kind: 'dated',
      starts_at: new Date(now + (e.daysAhead || 3) * 86400000).toISOString(),
      tags: e.tags || [],
      kid_ages: e.kid_ages || [],
      event_type: e.event_type || null,
      hero_photo: e.photo || null,
      going_count: e.going || 0,
      visible: true,
    });
  }
```

Then bump the default so the trio is never sliced off — change the `runSeed`
signature default `wantEvents = 30` to `wantEvents = 33` (line ~234), AND change
the final `return out.slice(0, wantEvents);` to keep the dated rows by slicing
only the recurring portion. Concretely, replace that return with:

```js
  // Keep all curated dated rows; cap only the recurring fill.
  const datedSlugs = new Set(LOCAL_DATED_EVENTS.map(e => e.id));
  const dated = out.filter(r => datedSlugs.has(r.slug));
  const recurringRows = out.filter(r => !datedSlugs.has(r.slug)).slice(0, Math.max(0, wantEvents - dated.length));
  return [...recurringRows, ...dated];
```

- [ ] **Step 4: Confirm the events table accepts these columns**

Run: `grep -n "kind\|starts_at\|kid_ages\|event_type" supabase/_apply_phase4_events.sql`
Expected: all four columns exist. (If `event_type` is absent, drop it from the
seed payload — it's optional in `events-shape.js`.)

- [ ] **Step 5: Re-seed and verify dated rows land**

Run: `npm run seed` (or the project's seed script).
Then verify via MCP `mcp__supabase__execute_sql`:
`select slug, kind, starts_at from public.events where slug like 'home-%';`
Expected: 3 rows, `kind='dated'`, `starts_at` in the future.

- [ ] **Step 6: Commit**

```bash
git add src/data/events.js api/_lib/seed.js
git commit -m "feat(events): seed curated Home events as fresh dated rows"
```

---

## Task 10: Rename §1 to "Local Events Nearby"

**Files:**
- Modify: `src/screens/MainApp/HomeTab.jsx`

- [ ] **Step 1: Rename the section head**

In `src/screens/MainApp/HomeTab.jsx` (~line 714), change:

```jsx
        <SectionHead title="3 fun things happening near you" onLink={goToActivities}/>
```

to:

```jsx
        <SectionHead title="Local Events Nearby" onLink={goToActivities}/>
```

Update the block comment above it (~line 712) from "3 fun things happening near
you" to "Local Events Nearby — live dated events, fallback only when empty."

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/screens/MainApp/HomeTab.jsx
git commit -m "feat(home): rename section to 'Local Events Nearby'"
```

---

## Task 11: Moms section — drop static, fix rank, empty state

**Files:**
- Modify: `src/screens/MainApp/HomeTab.jsx`

- [ ] **Step 1: Replace the moms data block**

In `src/screens/MainApp/HomeTab.jsx`, replace the `liveMoms` / `FALLBACK_MOMS` /
`moms` block (~lines 471-501) with:

```jsx
  // Moms You May Want To Meet — already match-ranked by the API
  // (/api/mom-profiles/nearby → scoreMom). Render in that order; do NOT re-sort
  // by distance (that discarded the match ranking).
  const moms = [...nearbyMoms];
```

- [ ] **Step 2: Replace the render with a real empty state**

Replace the moms `SectionHead` + grid (~lines 721-727) with:

```jsx
        {/* Moms You May Want To Meet — 3-up grid, match-ranked */}
        <SectionHead title="Moms You May Want To Meet" onLink={goToConnectMoms}/>
        {moms.length > 0 ? (
          <div className="grid grid-cols-3" style={{ gap: 8 }}>
            {moms.slice(0, 3).map(m => (
              <MomMeetCard key={m.id} item={m} onClick={() => setSelectedMom(m)}/>
            ))}
          </div>
        ) : (
          <div style={{
            background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14,
            padding: '18px 16px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: C.navy }}>
              Your <span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>village</span> is forming
            </div>
            <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted, marginTop: 4, lineHeight: 1.35 }}>
              Finishing your profile helps nearby moms find you.
            </div>
            <button onClick={onVerify} className="active:scale-[.98] transition-transform" style={{
              marginTop: 10, background: C.coralDeep, color: '#fff', border: 'none',
              borderRadius: 999, padding: '7px 16px', fontFamily: 'Albert Sans',
              fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
            }}>
              Complete profile
            </button>
          </div>
        )}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: success; no reference to `FALLBACK_MOMS` remains
(`grep -n FALLBACK_MOMS src/screens/MainApp/HomeTab.jsx` → no results).

- [ ] **Step 4: Commit**

```bash
git add src/screens/MainApp/HomeTab.jsx
git commit -m "feat(home): trust match-ranked moms + real empty state"
```

---

## Task 12: Remove "Active Group Chats"

**Files:**
- Modify: `src/screens/MainApp/HomeTab.jsx`
- Modify: `src/screens/MainApp/index.jsx`

- [ ] **Step 1: Delete the section render**

In `src/screens/MainApp/HomeTab.jsx`, delete the "Active Group Chats"
`SectionHead` + rail block (~lines 737-743).

- [ ] **Step 2: Delete the now-dead support code**

In the same file, delete:
- the `groupChats` assembly + `GROUP_CHAT_FALLBACK` (~lines 529-544);
- the `GroupChatChip` component + `GROUP_DOT` const (~lines 240-265);
- the `selectedDiscussion` + `joinedDiscussions` state (~lines 417-418);
- the `openGroup` helper (~lines 624-627);
- the entire `{selectedDiscussion && (<GroupDiscussionSheet .../> )}` block
  (~lines 885-909);
- the `GroupDiscussionSheet` import (line 15).

- [ ] **Step 3: Remove the now-unused props**

From the `HomeTab` props destructure, remove `groups = []`,
`goToConnectGroups`, `chatAuthor`, `myUserId`. **Keep `onDiscuss`** — it is still
used by the place and event detail sheets. Also remove the
`scoreDiscussion, rankByRelevance` import from `content-score` **only if** no
other reference remains (`grep -n "rankByRelevance\|scoreDiscussion" src/screens/MainApp/HomeTab.jsx`).

- [ ] **Step 4: Stop passing `groups` from index.jsx**

In `src/screens/MainApp/index.jsx`, remove `groups={TOP_DISCUSSIONS}` from the
`<HomeTab .../>` props (~line 192). Leave `TOP_DISCUSSIONS` defined and any other
tab's usage of it untouched. Remove `goToConnectGroups`, `chatAuthor`,
`myUserId` from the HomeTab JSX **only if** they were passed solely to HomeTab
(grep to confirm they aren't shared).

- [ ] **Step 5: Verify build + no dangling references**

Run: `npm run build && grep -n "GroupChatChip\|GROUP_DOT\|GROUP_CHAT_FALLBACK\|groupChats\|openGroup\|selectedDiscussion" src/screens/MainApp/HomeTab.jsx`
Expected: build succeeds; grep returns **no** results.

- [ ] **Step 6: Commit**

```bash
git add src/screens/MainApp/HomeTab.jsx src/screens/MainApp/index.jsx
git commit -m "feat(home): remove Active Group Chats section"
```

---

## Task 13: Final verification + design review

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all `*.test.mjs` pass, including the two new suites.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: clean build, no warnings about unresolved imports or undefined vars.

- [ ] **Step 3: Manual smoke (if dev stack available)**

Run `npm run dev`, open `/prototype`, and confirm on the Home tab:
- Header reads **Go Mama** (Mama italic-coral).
- §1 titled **Local Events Nearby**, shows event cards.
- **Moms You May Want To Meet** shows real moms (or the village empty state).
- **No** "Active Group Chats" section.
- **Based On Your Child's Age** shows mixed place/event cards; with 2+ kids, the
  filter chips appear and switch the rail.
- **Local Favorite This Week** shows a place; in `/admin` → **Featured**, setting
  a different place and reloading Home updates the card.

- [ ] **Step 4: Dispatch design-reviewer**

Dispatch the `design-reviewer` agent over the changed files
(`HomeTab.jsx`, `index.jsx`, `WeeklyFavoriteManager.jsx`) for mechanical
compliance (no hardcoded hex outside the documented Unsplash URLs, correct `C`
tokens, Fraunces/Albert Sans, dependency direction). Fix any findings.

- [ ] **Step 5: Final commit (if review produced fixes)**

```bash
git add -A
git commit -m "chore(home): design-review fixes"
```

---

## Self-Review

**Spec coverage:**
- §1 Local Events Nearby → Tasks 9 (data/seed) + 10 (rename). ✓
- §2 Moms (drop static, fix rank, empty state) → Task 11. ✓
- §3 Remove Active Group Chats → Task 12. ✓
- §4 Per-child age rail (places+events, name/stage chips) → Tasks 7 (helper) + 8 (UI). ✓
- §5 Local Favorite (table, helpers, public + admin routes, admin UI, client) → Tasks 1–6. ✓
- Testing (`age-rail.test.mjs`, `weekly-favorite.test.mjs`) → Tasks 7 + 2. ✓
- Design discipline / design-reviewer → Task 13. ✓

**Placeholder scan:** Two intentional "match the existing pattern" hand-offs
(admin token retrieval in Task 6, manager render slot in `AdminPage`) are gated
by an explicit grep step (Task 6 Step 1/Step 3) rather than left vague, because
the exact token mechanism must be read from `ConfigManager` rather than guessed.
No `TBD`/`TODO`/"add error handling" placeholders remain.

**Type consistency:** `favorite` shape (`place_id, name, hero_photo, rating,
review_count, area, city, week_start, source`) is identical across
`api/local-favorite.js`, `local-favorite-api.js`, and HomeTab's `favoriteCard`
mapping. `buildAgeRail` item shape (`id, type, name, photo, ageLabel, reason,
distance|when, score, forChild`) matches what `AgeProgramCard` and the rail
render consume. `weekStart`/`pickAuto`/`placeScore` signatures match between the
helper, its test, and both routes.

**Note on `pickAuto` signature:** the spec listed a `{cooldownWeeks}` option on
`pickAuto`; the plan moves the 8-week window to the route (which selects the
recent place_ids) and keeps `pickAuto(rows, recentIds)` pure and window-agnostic.
This is a deliberate simplification — same behavior, cleaner boundary.
