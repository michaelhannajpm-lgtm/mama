# Nearby Moms — live wiring + recommendation algorithm

**Date:** 2026-06-09
**Status:** Approved design, pre-implementation
**Author:** brainstormed with product owner

## Problem

Every "mom" surface in the live app renders **hardcoded arrays**, not the real
`mom_profiles` Supabase table that seed + onboarding moms already populate:

- `ConnectTab` → `MOMS` / `MOMS_ALL` (Unsplash photos, fake distances/tags)
- `data/moms.js` → `SAMPLE_MOMS` / `MOM_POOL` / `ALL_AVAILABLE_MOMS`
- `matchingMoms(userSlots)` matches on **schedule slots only** — no kid ages,
  interests, values, or liked places.

The browser cannot read `mom_profiles` directly (data access is
service-role-only; the browser Supabase client is auth-only). The only existing
read endpoint, `GET /api/dev/mom-profiles`, is **seed-only and dev-gated** (404s
in production).

## Goal

1. Wire **every live mom surface** to real `mom_profiles` data.
2. Make "nearby" a **real geodistance** from the signed-in user.
3. Replace `matchingMoms` with a **real recommendation algorithm** scoring on
   kid ages, interests, values, liked places, schedule, and mom-type.

Non-goal: legacy/unrouted screens (`MatchesTab`, `EventsTab`, `CalendarTab`,
`ActivitiesTab`, `Summary`, `ScheduleStep`) are **out of scope**.

## Architecture decision: server-side scoring

The recommendation algorithm runs **server-side** inside the discovery
endpoint. The endpoint does the service-role Supabase read, computes geodistance
+ match score, and returns **ranked, privacy-safe** mom cards. The browser never
receives any mom's raw `home_lat`/`home_lng`.

Rejected: client-side scoring — would ship every real mom's exact coordinates
and full profile to the browser. Unacceptable for real onboarding users.

## Components

### 1. `api/_lib/match.js` — pure recommendation scorer

```
scoreMom(user, mom) -> { score: number /* 0–100 */, sharedTags: string[] }
```

Pure function, no I/O, unit-tested. Weighted signals:

| Signal | Weight | Computation |
|---|---|---|
| Kid-age compatibility | 30 | Jaccard of truthy age-bucket keys (`0–1`…`12–18`) in `kids_ages`. Any overlap → `"Same kid ages"` sharedTag. |
| Shared interests | 25 | Jaccard of `interests[]`; overlapping interest names become sharedTags. |
| Shared values | 15 | Jaccard of `values[]`. |
| Liked places overlap | 15 | Jaccard of `places[]` (place uuids). |
| Schedule overlap | 10 | Jaccard of `free_slots[]` (replaces old `matchingMoms`). |
| Mom-type affinity | 5 | Shared `mom_types`. |

- `kids_ages` is treated defensively: extract the **set of keys with a truthy
  value** on each side (works whether the jsonb stores booleans or counts).
- All inputs coerced to arrays/objects defensively (`mom_profiles` columns are
  nullable).
- `score` is the `overlap` percentage shown on cards. Empty user criteria → the
  corresponding weight contributes 0 (no divide-by-zero; a user with no profile
  yet still gets a stable, distance-driven ordering).
- `sharedTags`: the **actual** overlapping items, ordered kid-ages → interests →
  values, sliced to the top 3. Drives the coral "Shared ground" pill (today
  hardcoded to `['Coffee dates','Same kid ages']`).

### 2. `POST /api/mom-profiles/nearby` — discovery endpoint

**Why POST:** the matching criteria are arrays; a GET querystring is unwieldy.
Semantically a read; `Cache-Control: no-store`.

**Request body:**
```json
{
  "user": {
    "auth_user_id": "…|null",
    "seed_mom_id":  "…|null",
    "kids_ages":    { "1–3": true },
    "interests":    ["Coffee dates"],
    "values":       ["Slow living"],
    "places":       ["<uuid>"],
    "free_slots":   ["Tue-morning"],
    "mom_types":    ["working"],
    "lat":          27.95,
    "lng":          -82.46
  },
  "limit":        24,
  "verifiedOnly": true
}
```
App.jsx assembles `user` from `profile`, `prefs`, `locationGeo`, `account`.
Works for signed-in, dev-seed, and mid-onboarding callers (sends whatever it has).

**Behavior:**
1. Service-role read of `mom_profiles` where `visible=true AND
   blocked_global=false`. `verifiedOnly` (default **true**) adds `verified=true`.
2. Exclude self by `auth_user_id` (or `seed_mom_id` for dev-seed users).
3. For each mom: compute haversine `distanceMi` from `user.lat/lng` (null if the
   user has no coords), run `scoreMom`.
4. **Rank** by `score − min(distanceMi, 10) × 1.5` (closer + better-matched float
   up; moms with no coords use `score` alone).
5. Return the top `limit` as the **normalized card shape** below. Never include
   raw `home_lat`/`home_lng`.

**Pagination past the PostgREST 1000-row cap** follows the existing
`api/admin/places.js` pattern if the table grows; initial read uses a single
page (`limit=1000`) which is sufficient for current data volume.

### 3. Normalized mom card (privacy-safe) — the canonical shape

A superset satisfying `MomDetailSheet`, `ProfileSheet`, `ScheduleSheet`,
`MessageSheet`, `MomListCard`, and the `MomCard` grid:

```
{
  id, auth_user_id,
  name,                 // display_name
  firstName,
  age,                  // nullable
  kids,                 // "2y · 4y" rendered from kids_ages buckets
  type,                 // primary mom_type label, e.g. "Working mom"
  tag, tagBg, tagFg,    // derived from primary mom_type (palette tokens by name)
  iconKey,              // string -> lucide icon, mapped client-side
  distance,             // "0.4 mi away" | null
  distanceMi,           // number | null
  overlap,              // 0–100 match score
  tags, sharedTags,     // real overlap items (top 3)
  nextSlot, nextPlace,  // best overlapping free slot, formatted; null if none
  hue,                  // deterministic gradient (avatar fallback + ProfileSheet)
  photo,                // photos[0] || null (client renders gradient if null)
  bio,                  // bio || null (sheets supply fallback copy)
  values, interests, freeSlots, places,
  verified
}
```

Icons cannot cross the JSON boundary, so the endpoint emits `iconKey`
(e.g. `"working"`) and the client maps it via `momIconFromKey`. `tagBg`/`tagFg`
are emitted as **palette token names** (e.g. `"lilac"`, `"sageDark"`) and
resolved to `C.*` client-side — no hardcoded hex crosses the wire.

### 4. State + data flow (App.jsx remains the owner)

- App.jsx gains `nearbyMoms` (+ `nearbyLoading`, `nearbyError`).
- A `loadNearbyMoms()` effect fires when `profile`/`locationGeo`/`account` are
  ready (and re-fires when matching inputs change), POSTing to the endpoint.
- `nearbyMoms` is passed down: `App → MainApp → ConnectTab`, and used to resolve
  the selected-mom object handed to `ScheduleSheet`/`MessageSheet`/`ProfileSheet`.
- New client helpers in `src/lib/`:
  - `nearby-moms.js` — `fetchNearbyMoms(user, opts)` (fetch + error handling,
    mirrors `seeded-moms.js`).
  - `mom-card.js` — `momIconFromKey(key)` and `resolveTagColors(card)` (token
    name → `C.*`), plus the gradient-avatar fallback.

### 5. Surfaces wired

- **ConnectTab** — `MOMS`/`MOMS_ALL` deleted; grid + "See all" sheet +
  `MomListCard` render `nearbyMoms`. `MomListCard` shared-ground pill uses real
  `sharedTags`. The "See all" **quick-filters actually filter** the live list:
  Verified, Similar kids (kid-age overlap), New mom (`mom_types` includes
  `new`), Working, Stay-at-home, Near me (re-sort by `distanceMi`). Subtitle
  reflects the live count + verified-only state.
- **MomDetailSheet / ProfileSheet** — open with the normalized card.
- **ScheduleSheet / MessageSheet** — receive the same object (shape-compatible).
- **MyVillageSheet** — saved-mom ids (`mom-<id>`) resolve against `nearbyMoms`.
- **AboutYou** — live "X moms match" counter from the endpoint
  (`limit` small, criteria = in-progress selections); replaces `matchingMoms`.

### 6. `data/moms.js` cleanup

`matchingMoms`, `ALL_AVAILABLE_MOMS`, `MOM_POOL`, and `SAMPLE_MOMS` are removed
once no live screen imports them. Any **legacy unrouted** screen still importing
them is left untouched only if removing the export would break its module load;
otherwise those imports are deleted too. (Verified during implementation by
grep before deletion.)

## Verified-only default

"Moms nearby" defaults to **verified-only** (matches the existing
"verified only" subtitle and the verified-only positioning moat). The "See all"
sheet exposes a **Verified** quick-filter that, when toggled off, re-requests
with `verifiedOnly: false` to reveal all visible moms.

## Error handling & fallbacks

- Endpoint Supabase failure → `502` with truncated message; client shows a
  non-blocking inline empty state ("Couldn't load moms nearby — retry").
- Empty result set → friendly empty state, not an error.
- No user coords → `distance` hidden, ranking by `score` only.
- Empty `photos[]` → deterministic gradient avatar (`hue`).
- Empty `bio` → sheets' existing fallback copy.

## Testing

- `api/_lib/match.test.mjs` — unit tests for `scoreMom`: kid-age overlap,
  interest/value/place Jaccard, empty-criteria stability, sharedTags ordering +
  top-3 slice, score bounds `[0,100]`. (Matches the `*.test.mjs` convention of
  `api/_lib/place-photo-blob.test.mjs`.)
- Manual: dev-seed login as a mom → Connect tab shows other seeded moms ranked,
  with real distances and shared-ground tags; Verified filter toggles the set.

## Security

- Endpoint is service-role-only server-side; returns no raw coordinates.
- Only `visible=true AND blocked_global=false` moms are ever returned.
- Self is always excluded from her own discovery results.
- `mom_profiles` RLS / backend-only access is unchanged (see
  `supabase/_secure_backend_only_tables.sql`).
