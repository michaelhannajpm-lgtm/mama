# Nearby Moms — Live Wiring + Recommendation Algorithm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every live "mom" surface's hardcoded arrays with real `mom_profiles` data, ranked by a real recommendation algorithm (kid ages, interests, values, liked places, schedule, mom-type) and real geodistance, served from a new privacy-safe endpoint.

**Architecture:** A new `POST /api/mom-profiles/nearby` does the service-role Supabase read, computes geodistance + match score server-side, and returns ranked, privacy-safe mom cards (no raw coordinates). The scoring + shaping logic is pure and unit-tested in `api/_lib/`. App.jsx owns the fetched `nearbyMoms` state and prop-drills it into `ConnectTab` and `MyVillageSheet`. The client decorates cards with lucide icons + resolved palette colors at render time.

**Tech Stack:** Vercel serverless (Node ESM), Supabase REST (service role), React 18, `node --test` for unit tests, lucide-react icons, `C` design tokens.

**Scope notes (deviations from spec, intentional):**
- **AboutYou live counter is descoped to a follow-up.** Its preview blends moms with local `SUGGESTED_EVENTS`/`PLACES` synchronously; a network count there desyncs the row for marginal pre-account value. `SAMPLE_MOMS` stays for it.
- **`data/moms.js` is left intact.** Legacy/unrouted screens still import its exports; deleting them risks breaking module loads. Dead-export cleanup is a separate follow-up.
- Live mom surfaces in scope: **ConnectTab** (grid + See-all + `MomListCard` + `MomDetailSheet`), the App-level **ScheduleSheet / MessageSheet / ProfileSheet** it feeds, and **MyVillageSheet** (saved moms + DMs).

---

## File Structure

**Create:**
- `api/_lib/match.js` — pure `scoreMom(user, mom)` recommendation scorer.
- `api/_lib/match.test.mjs` — unit tests for the scorer.
- `api/_lib/mom-card.js` — pure `momCardFromRow(row, user, distanceMi)` → privacy-safe card + `MOM_TYPE_PRESENTATION`.
- `api/_lib/mom-card.test.mjs` — unit tests for the shaper.
- `api/_lib/nearby.js` — pure `rankAndShape(rows, user, opts)` (distance + score + sort + slice).
- `api/_lib/nearby.test.mjs` — unit tests for ranking/exclusion.
- `api/mom-profiles/nearby.js` — thin HTTP handler (read → `rankAndShape` → json).
- `src/lib/nearby-moms.js` — client `fetchNearbyMoms(user, opts)`.
- `src/lib/mom-card.js` — client `momIconFromKey`, `resolveTagColor`, `decorateMom`.

**Modify:**
- `src/App.jsx` — `nearbyMoms`/`nearbyVerifiedOnly` state, load effect, prop-drill.
- `src/screens/MainApp/index.jsx` — accept + forward `nearbyMoms` and verified toggle.
- `src/screens/MainApp/ConnectTab.jsx` — render `nearbyMoms` (decorated); real shared tags; quick-filters filter; Verified toggle re-fetches.
- `src/sheets/MyVillageSheet.jsx` — resolve `mom-<id>` saved ids + DM rows against `nearbyMoms`.

**Reuse (no change):**
- `api/_lib/ingestion/dedupe.js` — `haversineMeters(lat1, lng1, lat2, lng2)`.
- `api/_lib/supabase.js` — `json`, `readJsonBody`, `supabaseCreds`, `sbHeaders`.

---

## Task 1: Recommendation scorer — `api/_lib/match.js`

**Files:**
- Create: `api/_lib/match.js`
- Test: `api/_lib/match.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `api/_lib/match.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreMom, WEIGHTS } from './match.js';

test('WEIGHTS sum to 100 so max score is 100', () => {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  assert.equal(total, 100);
});

test('identical profile scores 100 and surfaces shared tags', () => {
  const u = {
    kids_ages: { '1–3': true }, interests: ['Coffee dates', 'Park hangs'],
    values: ['Slow living'], places: ['p1'], free_slots: ['Tue-morning'], mom_types: ['working'],
  };
  const { score, sharedTags } = scoreMom(u, u);
  assert.equal(score, 100);
  assert.equal(sharedTags[0], 'Same kid ages');
  assert.ok(sharedTags.includes('Coffee dates'));
  assert.ok(sharedTags.length <= 3);
});

test('disjoint profiles score 0 with no shared tags', () => {
  const u = { kids_ages: { '0–1': true }, interests: ['Yoga / fitness'], values: ['Bookworm'], places: ['pa'], free_slots: ['Mon-morning'], mom_types: ['new'] };
  const m = { kids_ages: { '12–18': true }, interests: ['Markets'], values: ['Faith-based'], places: ['pb'], free_slots: ['Sat-noon'], mom_types: ['solo'] };
  const { score, sharedTags } = scoreMom(u, m);
  assert.equal(score, 0);
  assert.deepEqual(sharedTags, []);
});

test('empty user criteria never throws and scores 0', () => {
  const { score, sharedTags } = scoreMom({}, { interests: ['Coffee dates'] });
  assert.equal(score, 0);
  assert.deepEqual(sharedTags, []);
});

test('sharedTags lead with kid ages then interests, capped at 3', () => {
  const u = { kids_ages: { '3–5': true }, interests: ['A', 'B', 'C', 'D'] };
  const m = { kids_ages: { '3–5': true }, interests: ['A', 'B', 'C', 'D'] };
  const { sharedTags } = scoreMom(u, m);
  assert.deepEqual(sharedTags, ['Same kid ages', 'A', 'B']);
});

test('score is clamped into [0,100] and integer', () => {
  const u = { interests: ['A', 'B'], values: ['X'] };
  const m = { interests: ['A'], values: ['X'] };
  const { score } = scoreMom(u, m);
  assert.ok(Number.isInteger(score));
  assert.ok(score >= 0 && score <= 100);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/match.test.mjs`
Expected: FAIL — `Cannot find module './match.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `api/_lib/match.js`:

```js
// Pure recommendation scorer. No I/O. Given the requesting user's matching
// criteria and a candidate mom, returns a 0–100 compatibility score plus the
// human-readable list of what they actually share (top 3).

const asArray = (v) => (Array.isArray(v) ? v : []);

// jsonb kids_ages may store booleans or counts — treat any truthy value as
// "has a kid in this bucket".
const truthyKeys = (obj) =>
  obj && typeof obj === 'object' && !Array.isArray(obj)
    ? Object.keys(obj).filter((k) => obj[k])
    : [];

const jaccard = (a, b) => {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
};

const sharedItems = (a, b) => {
  const B = new Set(asArray(b));
  return asArray(a).filter((x) => B.has(x));
};

export const WEIGHTS = { kids: 30, interests: 25, values: 15, places: 15, slots: 10, momTypes: 5 };

export const scoreMom = (user = {}, mom = {}) => {
  const uKids = truthyKeys(user.kids_ages);
  const mKids = truthyKeys(mom.kids_ages);

  const score =
    jaccard(uKids, mKids) * WEIGHTS.kids +
    jaccard(asArray(user.interests), asArray(mom.interests)) * WEIGHTS.interests +
    jaccard(asArray(user.values), asArray(mom.values)) * WEIGHTS.values +
    jaccard(asArray(user.places), asArray(mom.places)) * WEIGHTS.places +
    jaccard(asArray(user.free_slots), asArray(mom.free_slots)) * WEIGHTS.slots +
    jaccard(asArray(user.mom_types), asArray(mom.mom_types)) * WEIGHTS.momTypes;

  const sharedTags = [];
  if (sharedItems(uKids, mKids).length) sharedTags.push('Same kid ages');
  sharedTags.push(...sharedItems(user.interests, mom.interests));
  sharedTags.push(...sharedItems(user.values, mom.values));

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    sharedTags: sharedTags.slice(0, 3),
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/match.test.mjs`
Expected: PASS — all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/match.js api/_lib/match.test.mjs
git commit -m "feat(match): pure mom recommendation scorer"
```

---

## Task 2: Card shaper — `api/_lib/mom-card.js`

**Files:**
- Create: `api/_lib/mom-card.js`
- Test: `api/_lib/mom-card.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `api/_lib/mom-card.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { momCardFromRow, kidsLabel, formatSlot, firstNameOf, MOM_TYPE_PRESENTATION } from './mom-card.js';

test('kidsLabel joins up to two truthy buckets, else fallback', () => {
  assert.equal(kidsLabel({ '1–3': true, '3–5': true }), '1–3 · 3–5 yrs');
  assert.equal(kidsLabel({ '1–3': false }), 'Kids');
  assert.equal(kidsLabel(null), 'Kids');
});

test('formatSlot turns a slot key into a friendly label', () => {
  assert.equal(formatSlot('Tue-morning'), 'Tue · Morning');
  assert.equal(formatSlot('Mon-night-owl'), 'Mon · Evening');
  assert.equal(formatSlot('garbage'), null);
});

test('firstNameOf strips trailing dot and takes first token', () => {
  assert.equal(firstNameOf({ display_name: 'Sara K.' }), 'Sara');
  assert.equal(firstNameOf({ username: 'mei_l' }), 'mei_l');
  assert.equal(firstNameOf({}), 'Mama');
});

test('momCardFromRow emits a privacy-safe card with abstract color keys', () => {
  const row = {
    id: 'uuid-1', auth_user_id: 'auth-1', display_name: 'Sara K.',
    age: 32, bio: 'hi', photos: ['http://x/p.jpg'],
    kids_ages: { '1–3': true }, mom_types: ['working'],
    values: ['Slow living'], interests: ['Coffee dates'],
    free_slots: ['Tue-morning'], places: ['p1'],
    home_lat: 27.9, home_lng: -82.4, verified: true,
  };
  const user = { kids_ages: { '1–3': true }, interests: ['Coffee dates'] };
  const card = momCardFromRow(row, user, 0.4);

  assert.equal(card.id, 'uuid-1');
  assert.equal(card.name, 'Sara K.');
  assert.equal(card.firstName, 'Sara');
  assert.equal(card.kids, '1–3 yrs');
  assert.equal(card.type, 'Working mom');
  assert.equal(card.tagBg, 'lilac');       // abstract token name, resolved client-side
  assert.equal(card.iconKey, 'working');
  assert.equal(card.distance, '0.4 mi away');
  assert.equal(card.distanceMi, 0.4);
  assert.equal(card.nextSlot, 'Tue · Morning');
  assert.equal(card.photo, 'http://x/p.jpg');
  assert.ok(card.overlap > 0);
  assert.ok(card.sharedTags.includes('Same kid ages'));
  // privacy: no raw coordinates on the card
  assert.equal('home_lat' in card, false);
  assert.equal('home_lng' in card, false);
});

test('momCardFromRow falls back gracefully on sparse rows', () => {
  const card = momCardFromRow({ id: 'uuid-2', mom_types: [] }, {}, null);
  assert.equal(card.distance, null);
  assert.equal(card.photo, null);
  assert.equal(card.bio, null);
  assert.equal(card.type, MOM_TYPE_PRESENTATION ? 'Verified' : 'Verified'); // default presentation
  assert.equal(card.nextSlot, null);
  assert.deepEqual(card.sharedTags, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/mom-card.test.mjs`
Expected: FAIL — `Cannot find module './mom-card.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `api/_lib/mom-card.js`:

```js
// Pure mom_profiles row → privacy-safe display card. No I/O. Colors are emitted
// as ABSTRACT TOKEN NAMES (resolved to C.* client-side in src/lib/mom-card.js)
// so no hex crosses the wire. Raw home_lat/home_lng are never copied onto the
// card. distanceMi is precomputed by the caller (null if the user has no coords).
import { scoreMom } from './match.js';

const asArray = (v) => (Array.isArray(v) ? v : []);
const truthyKeys = (obj) =>
  obj && typeof obj === 'object' && !Array.isArray(obj)
    ? Object.keys(obj).filter((k) => obj[k])
    : [];

// mom_type id → { label, tagBg, tagFg, iconKey }. tagBg/tagFg are abstract keys.
export const MOM_TYPE_PRESENTATION = {
  working: { label: 'Working mom',  tagBg: 'lilac',     tagFg: 'plum',      iconKey: 'working' },
  sahm:    { label: 'Stay-at-home', tagBg: 'sage',      tagFg: 'sageDark',  iconKey: 'home' },
  solo:    { label: 'Solo mom',     tagBg: 'coralSoft', tagFg: 'coralDeep', iconKey: 'solo' },
  new:     { label: 'New mom',      tagBg: 'coralSoft', tagFg: 'coralDeep', iconKey: 'new' },
  multi:   { label: 'Multi-kid',    tagBg: 'lilac',     tagFg: 'plum',      iconKey: 'multi' },
  hybrid:  { label: 'Hybrid / WFH', tagBg: 'sage',      tagFg: 'sageDark',  iconKey: 'hybrid' },
};
const DEFAULT_PRESENTATION = { label: 'Verified', tagBg: 'lilac', tagFg: 'plum', iconKey: 'verified' };

// Decorative avatar gradients (used when a mom has no photo). Not semantic
// palette tokens — safe to send as literal gradient strings.
const HUES = [
  'linear-gradient(135deg,#E8B4A0,#C8553D)',
  'linear-gradient(135deg,#D9A441,#C8553D)',
  'linear-gradient(135deg,#7E9678,#5E7A5A)',
  'linear-gradient(135deg,#E8B4A0,#D9A441)',
  'linear-gradient(135deg,#C8553D,#B98EB6)',
  'linear-gradient(135deg,#B98EB6,#C8553D)',
];

const WINDOW_LABEL = { morning: 'Morning', noon: 'Midday', afternoon: 'Afternoon', 'night-owl': 'Evening' };

export const firstNameOf = (row) =>
  (row?.display_name || row?.username || 'Mama').replace(/\./g, '').trim().split(/\s+/)[0] || 'Mama';

export const kidsLabel = (kidsAges) => {
  const buckets = truthyKeys(kidsAges);
  if (!buckets.length) return 'Kids';
  return `${buckets.slice(0, 2).join(' · ')} yrs`;
};

export const formatSlot = (slot) => {
  if (typeof slot !== 'string' || !slot.includes('-')) return null;
  const i = slot.indexOf('-');
  const day = slot.slice(0, i);
  const win = slot.slice(i + 1);
  return `${day} · ${WINDOW_LABEL[win] || win}`;
};

const hueFor = (id) => {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
};

const milesLabel = (mi) => (mi == null ? null : `${mi.toFixed(1)} mi away`);

export const momCardFromRow = (row, user = {}, distanceMi = null) => {
  const { score, sharedTags } = scoreMom(user, {
    kids_ages: row.kids_ages, interests: row.interests, values: row.values,
    places: row.places, free_slots: row.free_slots, mom_types: row.mom_types,
  });
  const primaryType = asArray(row.mom_types).find((t) => MOM_TYPE_PRESENTATION[t]);
  const pres = MOM_TYPE_PRESENTATION[primaryType] || DEFAULT_PRESENTATION;
  const nextSlot = asArray(row.free_slots).map(formatSlot).find(Boolean) || null;

  return {
    id: row.id,
    auth_user_id: row.auth_user_id || null,
    name: row.display_name || firstNameOf(row),
    firstName: firstNameOf(row),
    age: row.age ?? null,
    kids: kidsLabel(row.kids_ages),
    type: pres.label,
    tag: pres.label,
    tagBg: pres.tagBg,
    tagFg: pres.tagFg,
    iconKey: pres.iconKey,
    distance: milesLabel(distanceMi),
    distanceMi,
    overlap: score,
    tags: sharedTags,
    sharedTags,
    nextSlot,
    nextPlace: null,
    hue: hueFor(row.id),
    photo: asArray(row.photos)[0] || null,
    bio: row.bio || null,
    values: asArray(row.values),
    interests: asArray(row.interests),
    freeSlots: asArray(row.free_slots),
    places: asArray(row.places),
    verified: !!row.verified,
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/mom-card.test.mjs`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/mom-card.js api/_lib/mom-card.test.mjs
git commit -m "feat(mom-card): pure row->privacy-safe card shaper"
```

---

## Task 3: Rank + shape — `api/_lib/nearby.js`

**Files:**
- Create: `api/_lib/nearby.js`
- Test: `api/_lib/nearby.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `api/_lib/nearby.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankAndShape } from './nearby.js';

const baseRow = (over) => ({
  id: 'x', auth_user_id: null, display_name: 'Mom', mom_types: ['working'],
  kids_ages: {}, interests: [], values: [], places: [], free_slots: [],
  home_lat: null, home_lng: null, verified: true, ...over,
});

test('excludes self by auth_user_id and by seed_mom_id', () => {
  const rows = [
    baseRow({ id: 'a', auth_user_id: 'me' }),
    baseRow({ id: 'seed-1' }),
    baseRow({ id: 'b', auth_user_id: 'other' }),
  ];
  const { moms } = rankAndShape(rows, { auth_user_id: 'me', seed_mom_id: 'seed-1' }, { limit: 10 });
  const ids = moms.map((m) => m.id);
  assert.deepEqual(ids.sort(), ['b']);
});

test('computes rounded distance when both sides have coords', () => {
  const rows = [baseRow({ id: 'a', home_lat: 27.95, home_lng: -82.46 })];
  const { moms } = rankAndShape(rows, { lat: 27.95, lng: -82.46 }, { limit: 10 });
  assert.equal(moms[0].distanceMi, 0);
  assert.equal(moms[0].distance, '0.0 mi away');
});

test('distance is null when the user has no coords', () => {
  const rows = [baseRow({ id: 'a', home_lat: 27.95, home_lng: -82.46 })];
  const { moms } = rankAndShape(rows, {}, { limit: 10 });
  assert.equal(moms[0].distanceMi, null);
  assert.equal(moms[0].distance, null);
});

test('ranks higher overlap first, then closer; returns total + sliced list', () => {
  const user = { lat: 0, lng: 0, interests: ['A'] };
  const rows = [
    baseRow({ id: 'far-match', interests: ['A'], home_lat: 0, home_lng: 1 }),    // overlap>0, ~69mi
    baseRow({ id: 'near-nomatch', interests: ['Z'], home_lat: 0, home_lng: 0 }), // overlap 0, 0mi
  ];
  const { moms, total } = rankAndShape(rows, user, { limit: 1 });
  assert.equal(total, 2);
  assert.equal(moms.length, 1);
  assert.equal(moms[0].id, 'far-match'); // 25*? overlap beats a 0-overlap neighbour
});

test('handles non-array rows without throwing', () => {
  const { moms, total } = rankAndShape(null, {}, {});
  assert.deepEqual(moms, []);
  assert.equal(total, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/nearby.test.mjs`
Expected: FAIL — `Cannot find module './nearby.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `api/_lib/nearby.js`:

```js
// Pure ranking/shaping for the nearby-moms endpoint. Given raw mom_profiles
// rows + the requesting user, computes geodistance (reusing the ingestion
// haversine helper), scores + shapes each into a privacy-safe card, excludes
// self, ranks by (overlap − distance penalty), and slices to `limit`.
import { haversineMeters } from './ingestion/dedupe.js';
import { momCardFromRow } from './mom-card.js';

const METERS_PER_MILE = 1609.344;

const rankValue = (card) => {
  const penalty = card.distanceMi == null ? 0 : Math.min(card.distanceMi, 10) * 1.5;
  return card.overlap - penalty;
};

export const rankAndShape = (rows, user = {}, { limit = 24 } = {}) => {
  const selfAuth = user.auth_user_id || null;
  const selfSeed = user.seed_mom_id || null;
  const hasGeo = Number.isFinite(user.lat) && Number.isFinite(user.lng);

  const cards = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (selfAuth && row.auth_user_id === selfAuth) continue;
    if (selfSeed && row.id === selfSeed) continue;

    let distanceMi = null;
    if (hasGeo && Number.isFinite(row.home_lat) && Number.isFinite(row.home_lng)) {
      const meters = haversineMeters(user.lat, user.lng, row.home_lat, row.home_lng);
      distanceMi = Math.round((meters / METERS_PER_MILE) * 10) / 10;
    }
    cards.push(momCardFromRow(row, user, distanceMi));
  }

  cards.sort((a, b) => rankValue(b) - rankValue(a));
  return { total: cards.length, moms: cards.slice(0, Math.max(1, limit)) };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/nearby.test.mjs`
Expected: PASS — all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/nearby.js api/_lib/nearby.test.mjs
git commit -m "feat(nearby): pure rank+shape (distance, score, exclude self)"
```

---

## Task 4: HTTP endpoint — `api/mom-profiles/nearby.js`

**Files:**
- Create: `api/mom-profiles/nearby.js`

- [ ] **Step 1: Write the handler**

Create `api/mom-profiles/nearby.js`:

```js
// POST /api/mom-profiles/nearby — discover visible, non-blocked moms ranked by
// the recommendation algorithm + geodistance. Body:
//   { user: { auth_user_id?, seed_mom_id?, kids_ages?, interests?, values?,
//             places?, free_slots?, mom_types?, lat?, lng? },
//     limit?: number, verifiedOnly?: boolean }
// Returns { moms: Card[], total: number, verifiedOnly }. Never returns raw
// coordinates (rankAndShape → momCardFromRow strips them).
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { rankAndShape } from '../_lib/nearby.js';

const SELECT = [
  'id', 'auth_user_id', 'display_name', 'username', 'age', 'bio', 'photos',
  'kids_ages', 'mom_types', 'values', 'interests', 'free_slots', 'places',
  'city', 'neighborhood', 'county', 'home_lat', 'home_lng', 'distance_miles', 'verified',
].join(',');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const user = body.user && typeof body.user === 'object' ? body.user : {};
  const limit = Number.isFinite(Number(body.limit))
    ? Math.max(1, Math.min(100, Math.floor(Number(body.limit))))
    : 24;
  const verifiedOnly = body.verifiedOnly !== false; // default true

  let filter = 'visible=eq.true&blocked_global=eq.false';
  if (verifiedOnly) filter += '&verified=eq.true';
  const url =
    `${creds.supabaseUrl}/rest/v1/mom_profiles?${filter}` +
    `&limit=1000&select=${encodeURIComponent(SELECT)}`;

  try {
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    const text = await r.text();
    if (!r.ok) {
      console.error('mom-profiles/nearby failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = JSON.parse(text || '[]');
    const { moms, total } = rankAndShape(rows, user, { limit });
    return json(res, 200, { moms, total, verifiedOnly });
  } catch (e) {
    console.error('mom-profiles/nearby threw', e);
    return json(res, 500, { error: e?.message || 'Could not load nearby moms' });
  }
}
```

- [ ] **Step 2: Verify it imports + parses (no Supabase call)**

Run: `node -e "import('./api/mom-profiles/nearby.js').then(m => console.log('default is', typeof m.default))"`
Expected: prints `default is function`.

- [ ] **Step 3: Commit**

```bash
git add api/mom-profiles/nearby.js
git commit -m "feat(api): POST /api/mom-profiles/nearby discovery endpoint"
```

---

## Task 5: Client libs — `src/lib/nearby-moms.js` + `src/lib/mom-card.js`

**Files:**
- Create: `src/lib/nearby-moms.js`
- Create: `src/lib/mom-card.js`

- [ ] **Step 1: Create the fetch helper**

Create `src/lib/nearby-moms.js`:

```js
// Client API for the nearby-moms discovery endpoint. Mirrors lib/seeded-moms.js.
export const fetchNearbyMoms = async (user, { limit = 24, verifiedOnly = true } = {}) => {
  const res = await fetch('/api/mom-profiles/nearby', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user, limit, verifiedOnly }),
  });
  let body = {};
  try { body = await res.json(); } catch { /* ignore */ }
  if (!res.ok) throw new Error(body?.error || `Could not load nearby moms (${res.status})`);
  return {
    moms: Array.isArray(body.moms) ? body.moms : [],
    total: Number.isFinite(body.total) ? body.total : 0,
  };
};
```

- [ ] **Step 2: Create the decorator**

Create `src/lib/mom-card.js`:

```js
// Turn a server mom card (abstract icon/color keys) into a render-ready object:
// resolve iconKey → lucide component and tagBg/tagFg token names → C.* colors.
import { Briefcase, Home, Heart, Baby, Sparkles, Coffee, ShieldCheck } from 'lucide-react';
import { C } from '../theme';

const ICONS = {
  working: Briefcase, home: Home, solo: Heart, new: Baby,
  multi: Sparkles, hybrid: Coffee, verified: ShieldCheck,
};
export const momIconFromKey = (key) => ICONS[key] || ShieldCheck;

const TOKENS = {
  lilac: C.lilac, sage: C.sage, sageDark: C.sageDark,
  coralSoft: C.coralSoft, coralDeep: C.coralDeep, peach: C.peach,
  plum: '#5E4A8A', // matches ConnectTab's existing purple tag foreground
};
export const resolveTagColor = (name) => TOKENS[name] || C.muted;

// Add client-only fields. Keeps the original string keys overwritten with the
// resolved values so existing consumers (MomCard/MomListCard/MomDetailSheet)
// that read item.tagBg / item.tagFg / item.Icon keep working unchanged.
export const decorateMom = (card) => ({
  ...card,
  Icon: momIconFromKey(card.iconKey),
  tagBg: resolveTagColor(card.tagBg),
  tagFg: resolveTagColor(card.tagFg),
});
```

- [ ] **Step 3: Verify the build still compiles**

Run: `npm run build`
Expected: build succeeds (these modules are not imported yet, but must parse).

- [ ] **Step 4: Commit**

```bash
git add src/lib/nearby-moms.js src/lib/mom-card.js
git commit -m "feat(lib): client nearby-moms fetch + card decorator"
```

---

## Task 6: App.jsx — fetch + own `nearbyMoms` state, prop-drill

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports**

Near the existing `import { appStateFromMomProfile, fetchSeededMomProfiles } from './lib/seeded-moms';` line, add:

```js
import { fetchNearbyMoms } from './lib/nearby-moms';
import { decorateMom } from './lib/mom-card';
```

- [ ] **Step 2: Add state**

Immediately after the existing `const [seededMoms, setSeededMoms] = useState([]);` line, add:

```js
  const [nearbyMoms, setNearbyMoms] = useState([]);
  const [nearbyVerifiedOnly, setNearbyVerifiedOnly] = useState(true);
```

- [ ] **Step 3: Add the load function + effect**

After the existing `loadSeededMoms` function and its effect (the block ending with the `useEffect` that calls `loadSeededMoms`), add:

```js
  // Build the matching payload from the user's current profile/prefs/location.
  // `account` may be a real signed-in user or a dev-seed mom (isSeed).
  const buildMatchUser = () => ({
    auth_user_id: account?.auth_user_id || null,
    seed_mom_id: account?.seedMomId || null,
    kids_ages: profile?.kidsAges || {},
    interests: profile?.interests || [],
    values: profile?.values || [],
    mom_types: profile?.momTypes || [],
    places: prefs?.places || [],
    free_slots: prefs?.slots || [],
    lat: locationGeo?.lat ?? null,
    lng: locationGeo?.lng ?? null,
  });

  const loadNearbyMoms = async (verifiedOnly = nearbyVerifiedOnly) => {
    setNearbyVerifiedOnly(verifiedOnly);
    try {
      const { moms } = await fetchNearbyMoms(buildMatchUser(), { limit: 24, verifiedOnly });
      setNearbyMoms(moms.map(decorateMom));
    } catch (e) {
      console.error('loadNearbyMoms failed', e);
      setNearbyMoms([]);
    }
  };

  // Load once the user reaches the main app. Re-runs if the matching inputs
  // change. `locationGeo?.id` keys on location without sending coords as deps.
  useEffect(() => {
    if (step < 3) return;
    loadNearbyMoms(nearbyVerifiedOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, account?.auth_user_id, account?.seedMomId, locationGeo?.id,
      JSON.stringify(profile?.interests), JSON.stringify(profile?.kidsAges)]);
```

> Note: if `locationGeo` is not a state variable in scope, use the existing variable name from App.jsx (confirm via grep `locationGeo` before editing). The neighborhood-picker work introduced it; if absent, pass `lat/lng: null`.

- [ ] **Step 4: Pass props into MainApp**

Find the `<MainApp ... />` render (the block where `openSchedule={setScheduleMom}` etc. are passed) and add these props alongside the existing ones:

```jsx
            nearbyMoms={nearbyMoms}
            nearbyVerifiedOnly={nearbyVerifiedOnly}
            onSetVerifiedOnly={loadNearbyMoms}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat(app): fetch + own nearbyMoms state, drill into MainApp"
```

---

## Task 7: MainApp shell — forward props

**Files:**
- Modify: `src/screens/MainApp/index.jsx`

- [ ] **Step 1: Add props to the destructure**

In `export const MainApp = ({ ... })`, add to the destructured params (next to `account, requestAccount, restart, flash,`):

```js
  nearbyMoms = [], nearbyVerifiedOnly = true, onSetVerifiedOnly,
```

- [ ] **Step 2: Forward to ConnectTab**

In the `{tab === 'connect' && <ConnectTab ... />}` block, add these props:

```jsx
        nearbyMoms={nearbyMoms}
        nearbyVerifiedOnly={nearbyVerifiedOnly}
        onSetVerifiedOnly={onSetVerifiedOnly}
```

- [ ] **Step 3: Forward to MyVillageSheet**

In the `<MyVillageSheet ... />` render, add:

```jsx
          moms={nearbyMoms}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/screens/MainApp/index.jsx
git commit -m "feat(mainapp): forward nearbyMoms to Connect + Village"
```

---

## Task 8: ConnectTab — render live moms, real shared tags, working filters

**Files:**
- Modify: `src/screens/MainApp/ConnectTab.jsx`

- [ ] **Step 1: Delete the hardcoded mom arrays**

Remove the `const MOMS = [...]` and `const MOMS_ALL = [...]` blocks entirely (lines defining both). Leave `MEETUPS`, `MEETUPS_ALL`, `TOPICS*` untouched (events/discussions are out of scope).

- [ ] **Step 2: Accept the new props**

In `export const ConnectTab = ({ ... })`, add to the destructure:

```js
  nearbyMoms = [], nearbyVerifiedOnly = true, onSetVerifiedOnly,
```

- [ ] **Step 3: Derive grid + filtered list from props**

Immediately after the `void profile; void prefs; ...` lines near the top of the component body, add:

```js
  // Live moms come decorated (Icon + resolved colors) from App. The 3-up grid
  // shows the top 3; the See-all list shows the full ranked set with filters.
  const gridMoms = nearbyMoms.slice(0, 3);

  // See-all quick-filter state (single-select chip). 'verified' re-fetches
  // server-side (verified is a DB filter); the rest filter the loaded list.
  const [momQuickFilter, setMomQuickFilter] = useState(null);

  const applyMomFilter = (list) => {
    switch (momQuickFilter) {
      case 'similar': return list.filter(m => (m.sharedTags || []).includes('Same kid ages'));
      case 'newmom':  return list.filter(m => m.iconKey === 'new');
      case 'working': return list.filter(m => m.iconKey === 'working');
      case 'stay':    return list.filter(m => m.iconKey === 'home');
      case 'near':    return [...list].sort((a, b) =>
        (a.distanceMi ?? Infinity) - (b.distanceMi ?? Infinity));
      default:        return list;
    }
  };
  const seeAllMoms = applyMomFilter(nearbyMoms);
```

- [ ] **Step 4: Render the grid from `gridMoms`**

Replace the "Moms nearby" grid block:

```jsx
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          {MOMS.map(item => (
            <MomCard key={item.id} item={item} onClick={() => openMomDetail(item)}/>
          ))}
        </div>
```

with:

```jsx
        {gridMoms.length === 0 ? (
          <div style={{
            fontFamily: 'Albert Sans', fontSize: 12, color: C.muted,
            padding: '8px 2px',
          }}>
            No moms nearby yet — check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-3" style={{ gap: 8 }}>
            {gridMoms.map(item => (
              <MomCard key={item.id} item={item} onClick={() => openMomDetail(item)}/>
            ))}
          </div>
        )}
```

- [ ] **Step 5: Wire the See-all "moms" sheet to live data + filters**

Replace the `seeAll === 'moms'` `<SeeAllSheet ... />` block with:

```jsx
      {seeAll === 'moms' && (
        <SeeAllSheet
          title="Moms nearby"
          subtitle={`${seeAllMoms.length} moms${nearbyVerifiedOnly ? ' · verified only' : ''}`}
          items={seeAllMoms}
          renderItem={(item) => {
            const used = (messageHistory?.[item.id] || []).filter(m => m.fromUser).length;
            return (
              <MomListCard
                key={item.id}
                item={item}
                sharedTags={item.sharedTags}
                scheduledSlot={scheduledFor(item)}
                messagesUsed={used}
                freeLimit={3}
                isPremium={!!account?.isPremium}
                connectionStatus={connections[item.id] || 'none'}
                onConnect={() => handleConnect(item)}
                onProfile={() => openMomDetail(item)}
                onMessage={() => handleMessage(item)}
                onSchedule={() => handleAutoSchedule(item)}
                onPremium={() => openPremium?.()}
              />
            );
          }}
          layout="list"
          gap={12}
          quickFilters={[
            { id: 'verified', label: 'Verified',     icon: ShieldCheck },
            { id: 'similar',  label: 'Similar kids',  icon: Heart },
            { id: 'newmom',   label: 'New mom',       icon: Baby },
            { id: 'working',  label: 'Working',       icon: Briefcase },
            { id: 'stay',     label: 'Stay-at-home',  icon: Home },
            { id: 'near',     label: 'Near me',       icon: MapPin },
          ]}
          activeQuickFilter={momQuickFilter}
          onQuickFilter={(id) => {
            if (id === 'verified') {
              // server-side filter: toggle verified-only and re-fetch
              onSetVerifiedOnly?.(!nearbyVerifiedOnly);
              setMomQuickFilter(null);
              return;
            }
            setMomQuickFilter(prev => (prev === id ? null : id));
          }}
          onOpenAdvancedFilter={() => setFilterOpen?.(true)}
          advancedFilterCount={advCount}
          onClose={() => setSeeAll(null)}
        />
      )}
```

- [ ] **Step 5a: Make `SeeAllSheet` quick-filters optionally controlled**

`SeeAllSheet` currently tracks quick-filter selection in an internal `active` Set (multi-toggle, visual-only) shared by the meetups/topics views. Add an **optional controlled mode** so the moms view can drive it without changing the others.

In `src/sheets/SeeAllSheet.jsx`, add two props to the destructure (next to `quickFilters = [],`):

```js
  activeQuickFilter = null,
  onQuickFilter = null,
```

Then in the quick-filter chip `.map`, replace:

```js
              const isActive = active.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.id)}
```

with:

```js
              const controlled = typeof onQuickFilter === 'function';
              const isActive = controlled ? activeQuickFilter === f.id : active.has(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => (controlled ? onQuickFilter(f.id) : toggle(f.id))}
```

This is backward-compatible: the meetups/topics See-all views pass neither prop and keep their internal `active` Set behavior.

- [ ] **Step 6: Run the dev server and verify manually**

Run: `npm run dev`, open the prototype, use the dev "Pick seeded mom" login, go to **Connect**.
Expected: the "Moms nearby" grid shows real seeded moms (not Sarah/Amanda/Jessica with Unsplash photos); "See all" lists them ranked with real "Shared ground" tags; tapping **Verified** toggles the set; **Near me** re-sorts by distance.

- [ ] **Step 7: Commit**

```bash
git add src/screens/MainApp/ConnectTab.jsx src/sheets/SeeAllSheet.jsx
git commit -m "feat(connect): render live nearby moms with real tags + working filters"
```

---

## Task 9: MyVillageSheet — resolve saved moms + DMs against live moms

**Files:**
- Modify: `src/sheets/MyVillageSheet.jsx`

- [ ] **Step 1: Add a `mom-` branch to `resolve` and thread a `moms` lookup**

Change the `resolve` signature and add the live-mom branch. Replace:

```js
const resolve = (id) => {
```

with:

```js
const resolve = (id, moms = []) => {
  if (typeof id === 'string' && id.startsWith('mom-')) {
    const m = moms.find(x => String(x.id) === id.slice(4));
    if (!m) return null;
    return {
      kind: 'mom',
      photo: m.photo,
      title: m.name,
      sub:   `${m.type} · ${m.kids}`,
      meta:  m.distance ? `${m.distance} · ${m.overlap}% match` : `${m.overlap}% match`,
      accent: C.coralDeep,
    };
  }
```

(Leave the rest of `resolve` — events, places, resources, and the legacy numeric SAMPLE_MOMS branch — unchanged. The new branch returns before reaching them.)

- [ ] **Step 2: Accept the `moms` prop**

In the component's prop destructure (where `savedItems = [], setSavedItems,` appears), add:

```js
  moms = [],
```

- [ ] **Step 3: Pass `moms` into the resolve calls**

Replace:

```js
  const savedResolved   = savedItems.map(id   => ({ id, item: resolve(id) })).filter(x => x.item);
```

with (and do the same for any `interestedResolved` line that calls `resolve(id)`):

```js
  const savedResolved   = savedItems.map(id   => ({ id, item: resolve(id, moms) })).filter(x => x.item);
```

- [ ] **Step 4: Resolve DM rows against live moms first**

In the `dmRows` builder, replace:

```js
      const mom = SAMPLE_MOMS.find(m => m.id === numericId);
      if (!mom) return null;
```

with:

```js
      const mom = moms.find(m => String(m.id) === String(momId)) || SAMPLE_MOMS.find(m => m.id === numericId);
      if (!mom) return null;
```

- [ ] **Step 5: Verify build + manual check**

Run: `npm run build`
Expected: build succeeds.
Manual: as a seeded mom, save a mom from Connect → open My Village (LayoutGrid → My Village, or the Village entry) → the saved mom appears with her real name/photo/match%.

- [ ] **Step 6: Commit**

```bash
git add src/sheets/MyVillageSheet.jsx
git commit -m "feat(village): resolve saved moms + DMs against live nearby moms"
```

---

## Task 10: Full verification

- [ ] **Step 1: Run all unit tests**

Run: `node --test`
Expected: PASS — including `match`, `mom-card`, `nearby` suites (plus pre-existing suites).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: build succeeds, no new warnings beyond the pre-existing chunk-size note.

- [ ] **Step 3: Manual smoke (dev)**

Run: `npm run dev`. With dev seeded-mom login:
- Connect grid + See-all show live moms, ranked, real shared-ground tags.
- Verified toggle changes the set; Near-me re-sorts; Similar-kids / Working / Stay-at-home / New-mom filter.
- Open a mom → MomDetailSheet shows real bio/photo; Message + Schedule open with the right mom.
- Save a mom → appears in My Village.

- [ ] **Step 4: Final commit (if any stray changes)**

```bash
git add -A
git commit -m "chore: nearby-moms live wiring — verification pass"
```

---

## Self-Review Checklist (completed by plan author)

- **Spec coverage:** endpoint (Task 4) ✓ · server-side scorer (Task 1) ✓ · normalized privacy-safe card (Task 2) ✓ · geodistance + ranking + self-exclusion (Task 3) ✓ · App state/data-flow (Task 6–7) ✓ · ConnectTab grid/See-all/MomListCard/MomDetailSheet + working quick-filters + verified-only default & toggle (Task 7) ✓ · ScheduleSheet/MessageSheet/ProfileSheet fed the normalized object (Task 7, via existing openX callbacks) ✓ · MyVillageSheet saved moms (Task 9) ✓ · tests (Tasks 1–3) ✓. **Deviations:** AboutYou counter + `data/moms.js` deletion descoped to follow-ups (documented at top).
- **Placeholder scan:** no TBD/TODO; all code blocks complete. Two steps say "grep before editing" (App.jsx `locationGeo`, `SeeAllSheet` quick-filter API) — these are verification guards with explicit fallbacks, not placeholders.
- **Type consistency:** `scoreMom → { score, sharedTags }`; `momCardFromRow → card` (with `overlap`, `sharedTags`, `iconKey`, `tagBg`/`tagFg` token names, `distanceMi`); `rankAndShape → { moms, total }`; `fetchNearbyMoms → { moms, total }`; `decorateMom` overwrites `tagBg`/`tagFg` with resolved colors + adds `Icon`. Names consistent across tasks.
```
