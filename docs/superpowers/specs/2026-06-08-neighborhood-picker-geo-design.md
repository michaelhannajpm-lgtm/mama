# Neighborhood picker + structured geo — design

**Date:** 2026-06-08
**Surface:** `AboutYou.jsx` step 3 (onboarding "Where are you joining from?")
**Status:** Approved, ready for implementation plan

## Problem

Onboarding step 3 currently offers "Use My Location" plus a fixed 3×2 grid of
six hardcoded Tampa "area boxes" (`AREA_BUCKETS` in `AboutYou.jsx`, each with a
baked-in `lat`/`lng`). Two problems:

1. The box-grid layout is disliked and only covers six coarse areas — a mom
   whose neighborhood isn't one of the six has nowhere to go.
2. The manual picker stores `location` as a **plain string** (the area label).
   No coordinates are captured from a manual selection, so the backend never
   gets real geo for the mom profile — even though `mom_profiles` already has
   `city`, `neighborhood`, `home_lat`, `home_lng` columns waiting.

## Goal

Replace the box grid with a **tap-to-open searchable picker** (Option B) that:

- Lets a mom find her area from a list **or** type one that isn't pre-listed.
- Covers the **5-county Tampa Bay area**: Hillsborough, Pinellas, Pasco,
  Hernando, Manatee.
- Captures a **structured geo object** on every selection (manual pick *and*
  GPS) and persists it to the backend mom profile.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Layout | **Option B** — tap-to-open picker (field → bottom sheet with search + list) |
| Data source | **Mock local dataset now**, same response shape, swappable to Google Places later |
| Region | Hillsborough, Pinellas, Pasco, Hernando, Manatee |
| GPS button | **Upgraded** — reverse-resolve to the same structured object |

The mock dataset is deliberate: no Google API key, no billing, works in
`npm run dev` without `vercel dev`. The lookup module is the single seam where
real Google Places drops in later (see "Future: Google Places swap").

## Architecture

### Data flow

```
NeighborhoodPicker  ──▶  lib/places.js  ──▶  data/tampa-bay-areas.js
        │                     │                  (bundled dataset)
        │                     │
        ▼                     ▼
   locationGeo object   { searchAreas, resolveArea, nearestArea }
        │
        ▼
   App.jsx state (location string + locationGeo object)
        │
        ▼
   recordStep ──▶ /api/onboarding/step ──▶ onboarding_profiles (geo cols)
        │
        ▼ (at signup)
   mom-profile-helpers ──▶ mom_profiles (city / neighborhood / place_id /
                                          county / home_lat / home_lng)
```

### New files

**`src/data/tampa-bay-areas.js`** — the bundled dataset. ~120+ entries spanning
all five counties: every incorporated city/town plus the well-known Tampa and
St. Pete neighborhoods. Each entry:

```js
{
  id:           'hills-seminole-heights',   // stable slug, acts as place_id
  label:        'Seminole Heights',          // shown in the field + result row
  city:         'Tampa',                     // parent city
  neighborhood: 'Seminole Heights',          // null for whole-city entries
  county:       'Hillsborough',              // one of the 5
  lat:          27.9925,
  lng:          -82.4570,
}
```

Coverage target (not exhaustive, representative):

- **Hillsborough** — Tampa + neighborhoods (South Tampa, Hyde Park, Seminole
  Heights, Ybor City, New Tampa, Westchase, Town 'n' Country, Carrollwood),
  Brandon, Riverview, Plant City, Valrico, FishHawk, Apollo Beach, Ruskin,
  Wimauma, Sun City Center, Lutz, Citrus Park, Temple Terrace, Seffner, Dover.
- **Pinellas** — St. Petersburg, Clearwater, Largo, Pinellas Park, Dunedin,
  Palm Harbor, Tarpon Springs, Seminole, Safety Harbor, Oldsmar, Gulfport,
  St. Pete Beach, Treasure Island, Madeira Beach, Indian Rocks Beach.
- **Pasco** — New Port Richey, Port Richey, Wesley Chapel, Zephyrhills,
  Land O' Lakes, Dade City, Hudson, Holiday, Trinity, Odessa.
- **Hernando** — Brooksville, Spring Hill, Weeki Wachee, Hernando Beach.
- **Manatee** — Bradenton, Palmetto, Lakewood Ranch, Ellenton, Parrish,
  Anna Maria, Holmes Beach, Longboat Key.

**`src/lib/places.js`** — the lookup seam. Pure synchronous local lookups today;
async-shaped so the Google swap is internal-only.

```js
// Returns up to `limit` dataset entries matching `query` (case/space-insensitive,
// label + city match), ranked by prefix-match then alpha. Empty query → [].
searchAreas(query, limit = 8)        // → AreaEntry[]

// Resolve a previously-selected id back to its full entry (hydration).
resolveArea(id)                      // → AreaEntry | null

// Nearest dataset entry to a GPS fix (haversine). Used by "Use My Location".
nearestArea(lat, lng)                // → AreaEntry
```

`AreaEntry` is the dataset shape above. This module is the **only** file that
changes when Google Places is wired (its internals call `/api/places/*` and map
the response into the same `AreaEntry` shape).

**`src/components/NeighborhoodPicker.jsx`** — the Option B UI (leaf component).

- **Closed field:** a select-styled row — `📍 <selected label>` or placeholder
  "Choose your neighborhood" + a `⌄` chevron. Tapping opens the sheet.
- **Open sheet:** uses the existing `Sheet` component. Header "Find your area",
  a coral-bordered search input (debounced ~250 ms), and a results list.
  - **Empty query (default):** a short "Popular areas" list of ~6 **real
    dataset entries** (a `POPULAR_AREA_IDS` array of slugs in
    `tampa-bay-areas.js`, e.g. South Tampa, Westchase, Brandon, St. Petersburg,
    Wesley Chapel, Riverview) for one-tap selection. Not the old compound
    `AREA_BUCKETS` labels — each popular row must resolve to a full `AreaEntry`.
  - **Typed query:** live `searchAreas(query)` results, each row showing
    `label` + `<city · county>` subline.
  - Selecting a row resolves to its `AreaEntry`, calls `onSelect(entry)`, and
    closes the sheet.
- Footer caption "powered by Google" is **omitted** in mock mode (added with the
  real integration).

### Changed files

**`src/screens/onboarding/AboutYou.jsx`**

- Remove the `AREA_BUCKETS` 3×2 grid block (step 3 render).
- Keep `AREA_BUCKETS` constant + `nearestBucket` — still used to derive a coarse
  bucket for the mock preview/match filtering (see State, below). The picker's
  empty-state popular list comes from `POPULAR_AREA_IDS` in `tampa-bay-areas.js`,
  not from `AREA_BUCKETS`.
- Render `<NeighborhoodPicker location={location} onSelect={handleAreaSelect} />`
  in the divider's place.
- `detectLocation` (GPS): on success, call `nearestArea(lat, lng)` and route the
  result through the same `handleAreaSelect`, so GPS and manual picks converge.
- `handleAreaSelect(entry)` sets both `location` (label) and `locationGeo`
  (full object) via props.

**`src/App.jsx`**

- Add state `const [locationGeo, setLocationGeo] = useState(null)`.
- Keep `location` (string) for display + backward compat.
- Thread `locationGeo` / `setLocationGeo` into `AboutYou` (and `MainApp` if the
  Profile/edit surfaces need it — out of scope for this round unless trivial).
- In `advance(0, …)`, extend the patch with the geo fields (below).
- In the `promoteSession` hydrate block, restore `locationGeo` from the returned
  row if present (via `resolveArea` or the stored fields).

For the existing **mock preview/match filtering** in `AboutYou` (which keys off
area-label equality and `dist`/`mi` fields on the static `SAMPLE_MOMS` /
`PLACES`), derive a coarse bucket from `locationGeo.lat/lng` via the existing
`nearestBucket(lat,lng)` so mock results still populate. The *real* geo
(`locationGeo`) is what we persist; the bucket is presentation-only.

## Persistence

### `onboarding_profiles` (new columns)

```sql
alter table public.onboarding_profiles
  add column if not exists location_place_id    text,
  add column if not exists location_city        text,
  add column if not exists location_neighborhood text,
  add column if not exists location_county      text,
  add column if not exists location_lat         numeric(9,6),
  add column if not exists location_lng         numeric(9,6);
```

`location` (existing text col) keeps storing the display label for backward
compatibility.

### `mom_profiles` (new columns)

```sql
alter table public.mom_profiles
  add column if not exists place_id text,
  add column if not exists county   text;
```

`city`, `neighborhood`, `home_lat`, `home_lng` already exist.

### Migration file

`supabase/_apply_phase2_location.sql` — both `alter table` blocks above,
idempotent (`add column if not exists`).

### API wiring

**`api/onboarding/step.js`** — extend `ALLOWED_PATCH_KEYS` and `sanitizePatch`:

- `location_place_id`, `location_city`, `location_neighborhood`,
  `location_county` → `cleanText(v, 200)`.
- `location_lat`, `location_lng` → finite-number guard, clamp to plausible
  Florida bounds (lat 24–31, lng −88 to −79), round to 6 dp.

**`api/_lib/mom-profile-helpers.js`** — `toMomProfile` maps the onboarding geo
into the mom profile:

```js
city:         onboardingRow.location_city || onboardingRow.location || 'Tampa, FL',
neighborhood: onboardingRow.location_neighborhood || null,
county:       onboardingRow.location_county || null,
place_id:     onboardingRow.location_place_id || null,
home_lat:     onboardingRow.location_lat ?? null,
home_lng:     onboardingRow.location_lng ?? null,
```

### Patch shape sent from `App.jsx`

```js
advance(0, {
  location,                                   // label (existing)
  distance_miles: distance,
  location_place_id:    locationGeo?.id ?? null,
  location_city:        locationGeo?.city ?? null,
  location_neighborhood:locationGeo?.neighborhood ?? null,
  location_county:      locationGeo?.county ?? null,
  location_lat:         locationGeo?.lat ?? null,
  location_lng:         locationGeo?.lng ?? null,
  kids_ages: profile.kidsAges,
  mom_types: profile.momTypes,
});
```

## Design-token / convention compliance

- All colors via `C.*` — coral (`C.coral`/`C.coralSoft`) for the active/search
  state (1:1 intimacy → the mom's own area is a personal pick), navy text,
  `C.line` hairlines, `C.muted` sublines. Sage stays reserved for community.
- Fraunces for the sheet headline, Albert Sans for everything else.
- Reuse the existing `Sheet` component — no new sheet primitive.
- 375×740 phone layout; the sheet scrolls internally.
- Named exports, one component per file, no upward imports
  (`data ← lib ← components ← screens ← App`).

## Out of scope (YAGNI)

- Real Google Places integration (documented swap path only).
- Persisting `savedItems` / `profile.verified` (separate TODO items).
- Distance-radius UI changes.
- Editing location post-onboarding from the Profile tab (unless the
  `locationGeo` thread reaches it trivially).

## Future: Google Places swap

When a `GOOGLE_PLACES_API_KEY` is available, the only changes are:

1. Add `api/places/autocomplete.js` + `api/places/details.js` (server-only key,
   `locationRestriction` rectangle over the 5 counties, `includedPrimaryTypes`
   of locality/sublocality/neighborhood, session tokens, county allowlist
   filter on the result).
2. Flip `src/lib/places.js` internals to `fetch('/api/places/*')`, mapping
   Place Details fields into the same `AreaEntry` shape.

No schema change, no UI change, no `App.jsx` change — `place_id` already stores
the dataset slug today and a real Google place id later.

## Testing

No test framework in the repo yet. Manual verification:

1. `npm run dev` → onboarding step 3: tap "Choose your neighborhood", search
   "semin" → "Seminole Heights" appears; select it → field shows the label.
2. Confirm empty-state popular list shows the six legacy areas.
3. "Use My Location" (allow GPS) → field populates with nearest area.
4. Continue → network tab shows `/api/onboarding/step` patch carrying the
   `location_*` geo fields.
5. `npm run build` passes.
