# Neighborhood Picker + Structured Geo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AboutYou step-3 "area box grid" with a tap-to-open searchable neighborhood picker (Option B) that captures structured Tampa Bay geo (city / neighborhood / county / lat / lng / place_id) and persists it to the backend mom profile.

**Architecture:** A bundled local dataset (`data/tampa-bay-areas.js`) sits behind a single lookup module (`lib/places.js`) — the one seam where real Google Places drops in later. A new `NeighborhoodPicker` leaf component (field → `Sheet` with search) consumes it. The selected `AreaEntry` flows into a new `locationGeo` object in `App.jsx`, which extends the onboarding `recordStep` patch; new `onboarding_profiles` columns carry it, and `mom-profile-helpers` maps it into `mom_profiles` at signup.

**Tech Stack:** React 18, Vite, Tailwind utility classes + inline styles, `C` design tokens, Supabase REST (PostgREST) via Vercel serverless functions. No test framework in the repo — pure modules are verified with `node` smoke checks; UI is verified with `npm run build` + manual steps.

**Spec:** `docs/superpowers/specs/2026-06-08-neighborhood-picker-geo-design.md`

---

## File Structure

- **Create** `src/data/tampa-bay-areas.js` — `TAMPA_BAY_AREAS` array + `POPULAR_AREA_IDS`. Pure data.
- **Create** `src/lib/places.js` — `searchAreas`, `resolveArea`, `nearestArea`. Pure lookups; the Google swap seam.
- **Create** `src/components/NeighborhoodPicker.jsx` — Option B field + `Sheet` search UI.
- **Modify** `src/screens/onboarding/AboutYou.jsx` — swap the box grid for `NeighborhoodPicker`; route GPS through the same handler; accept `locationGeo` props.
- **Modify** `src/App.jsx` — `locationGeo` state, prop threading, extended `advance(0,…)` patch, hydrate restore.
- **Create** `supabase/_apply_phase2_location.sql` — additive geo columns (idempotent).
- **Modify** `api/onboarding/step.js` — whitelist + sanitize the new `location_*` patch keys.
- **Modify** `api/_lib/mom-profile-helpers.js` — map onboarding geo → mom_profiles payload.
- **Modify** `api/onboarding/promote.js` — include `locationGeo` in the hydrate shape.

---

### Task 1: Bundled Tampa Bay dataset

**Files:**
- Create: `src/data/tampa-bay-areas.js`

- [ ] **Step 1: Write the dataset module**

Create `src/data/tampa-bay-areas.js` with the full content below. Each entry is `{ id, label, city, neighborhood, county, lat, lng }`. `neighborhood` is `null` for whole-city entries. `id` is a unique slug that doubles as the stored `place_id`.

```js
// Bundled Tampa Bay area dataset — 5 counties: Hillsborough, Pinellas, Pasco,
// Hernando, Manatee. Mock source for the neighborhood picker; the response
// shape matches what a Google Place Details lookup will later return, so
// src/lib/places.js can swap to a real /api/places/* proxy with no change here.
// Coordinates are city/neighborhood centroids (approximate, sufficient for
// prototype matching + nearest-area resolution).

export const TAMPA_BAY_AREAS = [
  // --- Hillsborough ---
  { id: 'tampa',            label: 'Tampa',             city: 'Tampa',        neighborhood: null,               county: 'Hillsborough', lat: 27.95, lng: -82.46 },
  { id: 'south-tampa',      label: 'South Tampa',       city: 'Tampa',        neighborhood: 'South Tampa',      county: 'Hillsborough', lat: 27.92, lng: -82.49 },
  { id: 'hyde-park',        label: 'Hyde Park',         city: 'Tampa',        neighborhood: 'Hyde Park',        county: 'Hillsborough', lat: 27.94, lng: -82.47 },
  { id: 'seminole-heights', label: 'Seminole Heights',  city: 'Tampa',        neighborhood: 'Seminole Heights', county: 'Hillsborough', lat: 27.99, lng: -82.45 },
  { id: 'ybor-city',        label: 'Ybor City',         city: 'Tampa',        neighborhood: 'Ybor City',        county: 'Hillsborough', lat: 27.96, lng: -82.43 },
  { id: 'new-tampa',        label: 'New Tampa',         city: 'Tampa',        neighborhood: 'New Tampa',        county: 'Hillsborough', lat: 28.13, lng: -82.35 },
  { id: 'westchase',        label: 'Westchase',         city: 'Tampa',        neighborhood: 'Westchase',        county: 'Hillsborough', lat: 28.06, lng: -82.61 },
  { id: 'town-n-country',   label: "Town 'n' Country",  city: 'Tampa',        neighborhood: "Town 'n' Country", county: 'Hillsborough', lat: 28.01, lng: -82.58 },
  { id: 'carrollwood',      label: 'Carrollwood',       city: 'Tampa',        neighborhood: 'Carrollwood',      county: 'Hillsborough', lat: 28.05, lng: -82.50 },
  { id: 'brandon',          label: 'Brandon',           city: 'Brandon',      neighborhood: null,               county: 'Hillsborough', lat: 27.94, lng: -82.29 },
  { id: 'riverview',        label: 'Riverview',         city: 'Riverview',    neighborhood: null,               county: 'Hillsborough', lat: 27.86, lng: -82.33 },
  { id: 'plant-city',       label: 'Plant City',        city: 'Plant City',   neighborhood: null,               county: 'Hillsborough', lat: 28.02, lng: -82.11 },
  { id: 'valrico',          label: 'Valrico',           city: 'Valrico',      neighborhood: null,               county: 'Hillsborough', lat: 27.94, lng: -82.24 },
  { id: 'fishhawk',         label: 'FishHawk',          city: 'Lithia',       neighborhood: 'FishHawk',         county: 'Hillsborough', lat: 27.85, lng: -82.21 },
  { id: 'apollo-beach',     label: 'Apollo Beach',      city: 'Apollo Beach', neighborhood: null,               county: 'Hillsborough', lat: 27.77, lng: -82.41 },
  { id: 'ruskin',           label: 'Ruskin',            city: 'Ruskin',       neighborhood: null,               county: 'Hillsborough', lat: 27.72, lng: -82.43 },
  { id: 'wimauma',          label: 'Wimauma',           city: 'Wimauma',      neighborhood: null,               county: 'Hillsborough', lat: 27.71, lng: -82.30 },
  { id: 'sun-city-center',  label: 'Sun City Center',   city: 'Sun City Center', neighborhood: null,            county: 'Hillsborough', lat: 27.71, lng: -82.35 },
  { id: 'lutz',             label: 'Lutz',              city: 'Lutz',         neighborhood: null,               county: 'Hillsborough', lat: 28.15, lng: -82.46 },
  { id: 'citrus-park',      label: 'Citrus Park',       city: 'Tampa',        neighborhood: 'Citrus Park',      county: 'Hillsborough', lat: 28.07, lng: -82.57 },
  { id: 'temple-terrace',   label: 'Temple Terrace',    city: 'Temple Terrace', neighborhood: null,             county: 'Hillsborough', lat: 28.04, lng: -82.39 },
  { id: 'seffner',          label: 'Seffner',           city: 'Seffner',      neighborhood: null,               county: 'Hillsborough', lat: 27.99, lng: -82.28 },
  { id: 'dover',            label: 'Dover',             city: 'Dover',        neighborhood: null,               county: 'Hillsborough', lat: 27.99, lng: -82.22 },

  // --- Pinellas ---
  { id: 'st-petersburg',    label: 'St. Petersburg',    city: 'St. Petersburg', neighborhood: null,             county: 'Pinellas', lat: 27.77, lng: -82.64 },
  { id: 'clearwater',       label: 'Clearwater',        city: 'Clearwater',   neighborhood: null,               county: 'Pinellas', lat: 27.97, lng: -82.80 },
  { id: 'largo',            label: 'Largo',             city: 'Largo',        neighborhood: null,               county: 'Pinellas', lat: 27.91, lng: -82.79 },
  { id: 'pinellas-park',    label: 'Pinellas Park',     city: 'Pinellas Park', neighborhood: null,              county: 'Pinellas', lat: 27.84, lng: -82.70 },
  { id: 'dunedin',          label: 'Dunedin',           city: 'Dunedin',      neighborhood: null,               county: 'Pinellas', lat: 28.02, lng: -82.77 },
  { id: 'palm-harbor',      label: 'Palm Harbor',       city: 'Palm Harbor',  neighborhood: null,               county: 'Pinellas', lat: 28.08, lng: -82.76 },
  { id: 'tarpon-springs',   label: 'Tarpon Springs',    city: 'Tarpon Springs', neighborhood: null,             county: 'Pinellas', lat: 28.15, lng: -82.76 },
  { id: 'seminole',         label: 'Seminole',          city: 'Seminole',     neighborhood: null,               county: 'Pinellas', lat: 27.84, lng: -82.79 },
  { id: 'safety-harbor',    label: 'Safety Harbor',     city: 'Safety Harbor', neighborhood: null,              county: 'Pinellas', lat: 28.00, lng: -82.69 },
  { id: 'oldsmar',          label: 'Oldsmar',           city: 'Oldsmar',      neighborhood: null,               county: 'Pinellas', lat: 28.03, lng: -82.66 },
  { id: 'gulfport',         label: 'Gulfport',          city: 'Gulfport',     neighborhood: null,               county: 'Pinellas', lat: 27.75, lng: -82.70 },
  { id: 'st-pete-beach',    label: 'St. Pete Beach',    city: 'St. Pete Beach', neighborhood: null,             county: 'Pinellas', lat: 27.73, lng: -82.74 },
  { id: 'treasure-island',  label: 'Treasure Island',   city: 'Treasure Island', neighborhood: null,            county: 'Pinellas', lat: 27.77, lng: -82.77 },
  { id: 'madeira-beach',    label: 'Madeira Beach',     city: 'Madeira Beach', neighborhood: null,              county: 'Pinellas', lat: 27.80, lng: -82.79 },
  { id: 'indian-rocks-beach', label: 'Indian Rocks Beach', city: 'Indian Rocks Beach', neighborhood: null,      county: 'Pinellas', lat: 27.88, lng: -82.85 },

  // --- Pasco ---
  { id: 'new-port-richey',  label: 'New Port Richey',   city: 'New Port Richey', neighborhood: null,            county: 'Pasco', lat: 28.24, lng: -82.72 },
  { id: 'port-richey',      label: 'Port Richey',       city: 'Port Richey',  neighborhood: null,               county: 'Pasco', lat: 28.27, lng: -82.72 },
  { id: 'wesley-chapel',    label: 'Wesley Chapel',     city: 'Wesley Chapel', neighborhood: null,              county: 'Pasco', lat: 28.24, lng: -82.33 },
  { id: 'zephyrhills',      label: 'Zephyrhills',       city: 'Zephyrhills',  neighborhood: null,               county: 'Pasco', lat: 28.23, lng: -82.18 },
  { id: 'land-o-lakes',     label: "Land O' Lakes",     city: "Land O' Lakes", neighborhood: null,              county: 'Pasco', lat: 28.22, lng: -82.46 },
  { id: 'dade-city',        label: 'Dade City',         city: 'Dade City',    neighborhood: null,               county: 'Pasco', lat: 28.36, lng: -82.20 },
  { id: 'hudson',           label: 'Hudson',            city: 'Hudson',       neighborhood: null,               county: 'Pasco', lat: 28.36, lng: -82.69 },
  { id: 'holiday',          label: 'Holiday',           city: 'Holiday',      neighborhood: null,               county: 'Pasco', lat: 28.19, lng: -82.74 },
  { id: 'trinity',          label: 'Trinity',           city: 'Trinity',      neighborhood: null,               county: 'Pasco', lat: 28.18, lng: -82.66 },
  { id: 'odessa',           label: 'Odessa',            city: 'Odessa',       neighborhood: null,               county: 'Pasco', lat: 28.19, lng: -82.59 },

  // --- Hernando ---
  { id: 'brooksville',      label: 'Brooksville',       city: 'Brooksville',  neighborhood: null,               county: 'Hernando', lat: 28.56, lng: -82.39 },
  { id: 'spring-hill',      label: 'Spring Hill',       city: 'Spring Hill',  neighborhood: null,               county: 'Hernando', lat: 28.48, lng: -82.53 },
  { id: 'weeki-wachee',     label: 'Weeki Wachee',      city: 'Weeki Wachee', neighborhood: null,               county: 'Hernando', lat: 28.52, lng: -82.57 },
  { id: 'hernando-beach',   label: 'Hernando Beach',    city: 'Hernando Beach', neighborhood: null,             county: 'Hernando', lat: 28.47, lng: -82.66 },

  // --- Manatee ---
  { id: 'bradenton',        label: 'Bradenton',         city: 'Bradenton',    neighborhood: null,               county: 'Manatee', lat: 27.50, lng: -82.57 },
  { id: 'palmetto',         label: 'Palmetto',          city: 'Palmetto',     neighborhood: null,               county: 'Manatee', lat: 27.52, lng: -82.57 },
  { id: 'lakewood-ranch',   label: 'Lakewood Ranch',    city: 'Lakewood Ranch', neighborhood: null,             county: 'Manatee', lat: 27.41, lng: -82.40 },
  { id: 'ellenton',         label: 'Ellenton',          city: 'Ellenton',     neighborhood: null,               county: 'Manatee', lat: 27.52, lng: -82.52 },
  { id: 'parrish',          label: 'Parrish',           city: 'Parrish',      neighborhood: null,               county: 'Manatee', lat: 27.59, lng: -82.42 },
  { id: 'anna-maria',       label: 'Anna Maria',        city: 'Anna Maria',   neighborhood: null,               county: 'Manatee', lat: 27.53, lng: -82.73 },
  { id: 'holmes-beach',     label: 'Holmes Beach',      city: 'Holmes Beach', neighborhood: null,               county: 'Manatee', lat: 27.50, lng: -82.71 },
  { id: 'longboat-key',     label: 'Longboat Key',      city: 'Longboat Key', neighborhood: null,               county: 'Manatee', lat: 27.41, lng: -82.66 },
];

// One-tap "Popular areas" shown in the picker's empty state. Each must be a
// real id above so it resolves to a full AreaEntry.
export const POPULAR_AREA_IDS = [
  'south-tampa', 'westchase', 'brandon', 'st-petersburg', 'wesley-chapel', 'riverview',
];
```

- [ ] **Step 2: Smoke-check the dataset**

Run:
```bash
node --input-type=module -e "import {TAMPA_BAY_AREAS as A, POPULAR_AREA_IDS as P} from './src/data/tampa-bay-areas.js'; \
const ids=new Set(); for(const e of A){ for(const k of ['id','label','city','county','lat','lng']) if(e[k]==null) throw new Error('missing '+k+' on '+e.id); \
if(ids.has(e.id)) throw new Error('dup id '+e.id); ids.add(e.id); \
if(e.lat<24||e.lat>31||e.lng<-88||e.lng>-79) throw new Error('bad coords '+e.id); } \
for(const p of P) if(!ids.has(p)) throw new Error('popular id not in dataset: '+p); \
console.log('OK', A.length, 'entries,', P.length, 'popular');"
```
Expected: `OK 60 entries, 6 popular` (count may differ if you extend the list — must be ≥ 60).

- [ ] **Step 3: Commit**

```bash
git add src/data/tampa-bay-areas.js
git commit -m "feat(data): Tampa Bay 5-county area dataset for neighborhood picker"
```

---

### Task 2: `lib/places.js` lookup module

**Files:**
- Create: `src/lib/places.js`

- [ ] **Step 1: Write the module**

Create `src/lib/places.js`:

```js
// Lookup seam over the bundled Tampa Bay dataset. Pure + synchronous today.
// FUTURE (Google Places): change ONLY this file — searchAreas/resolveArea call
// /api/places/* and map Place Details into the same AreaEntry shape; nearestArea
// can call a reverse-geocode proxy. No consumer changes required.
import { TAMPA_BAY_AREAS, POPULAR_AREA_IDS } from '../data/tampa-bay-areas.js';

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Full AreaEntry objects for the empty-state popular list.
export const POPULAR_AREAS = POPULAR_AREA_IDS
  .map((id) => TAMPA_BAY_AREAS.find((a) => a.id === id))
  .filter(Boolean);

// Up to `limit` entries matching `query` against label + city, ranked
// prefix-match first, then alphabetical. Empty query → [].
export const searchAreas = (query, limit = 8) => {
  const q = norm(query);
  if (!q) return [];
  const scored = [];
  for (const a of TAMPA_BAY_AREAS) {
    const hay = norm(`${a.label} ${a.city}`);
    const idx = hay.indexOf(q);
    if (idx === -1) continue;
    // prefix of label = best (0), prefix elsewhere = 1, contained = 2
    const rank = norm(a.label).startsWith(q) ? 0 : idx === 0 ? 1 : 2;
    scored.push({ a, rank });
  }
  scored.sort((x, y) => x.rank - y.rank || x.a.label.localeCompare(y.a.label));
  return scored.slice(0, limit).map((s) => s.a);
};

// Resolve a stored id back to its full AreaEntry (hydration). null if unknown.
export const resolveArea = (id) =>
  TAMPA_BAY_AREAS.find((a) => a.id === id) || null;

// Nearest dataset entry to a GPS fix (squared-degree distance is fine at this
// scale). Always returns an entry (dataset is non-empty).
export const nearestArea = (lat, lng) => {
  let best = TAMPA_BAY_AREAS[0];
  let bestD = Infinity;
  for (const a of TAMPA_BAY_AREAS) {
    const d = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
};
```

- [ ] **Step 2: Smoke-check the lookups**

Run:
```bash
node --input-type=module -e "import {searchAreas,resolveArea,nearestArea,POPULAR_AREAS} from './src/lib/places.js'; \
const r=searchAreas('semin'); if(r[0].id!=='seminole-heights') throw new Error('search rank: got '+JSON.stringify(r.map(x=>x.id))); \
if(searchAreas('').length!==0) throw new Error('empty query must return []'); \
if(resolveArea('brandon').city!=='Brandon') throw new Error('resolve fail'); \
if(resolveArea('nope')!==null) throw new Error('resolve unknown must be null'); \
if(nearestArea(27.77,-82.64).id!=='st-petersburg') throw new Error('nearest fail: '+nearestArea(27.77,-82.64).id); \
if(POPULAR_AREAS.length!==6) throw new Error('popular len'); \
console.log('OK places');"
```
Expected: `OK places`

- [ ] **Step 3: Commit**

```bash
git add src/lib/places.js
git commit -m "feat(lib): places lookup module (search/resolve/nearest) over Tampa Bay dataset"
```

---

### Task 3: `NeighborhoodPicker` component

**Files:**
- Create: `src/components/NeighborhoodPicker.jsx`

- [ ] **Step 1: Write the component**

Create `src/components/NeighborhoodPicker.jsx`. Field (closed) + `Sheet` (open) with a debounced search. `value` is the current `locationGeo` object (or null); `onSelect(entry)` fires with the chosen `AreaEntry`.

```jsx
import { useEffect, useRef, useState } from 'react';
import { MapPin, ChevronDown, Search } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from './Sheet';
import { searchAreas, POPULAR_AREAS } from '../lib/places.js';

export const NeighborhoodPicker = ({ value, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  // Debounced search; empty query falls back to popular areas.
  useEffect(() => {
    const id = setTimeout(() => {
      setResults(query.trim() ? searchAreas(query) : POPULAR_AREAS);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (open) {
      setResults(POPULAR_AREAS);
      setTimeout(() => inputRef.current?.focus(), 80);
    } else {
      setQuery('');
    }
  }, [open]);

  const pick = (entry) => {
    onSelect(entry);
    setOpen(false);
  };

  const showingPopular = !query.trim();

  return (
    <>
      {/* Closed field — select-styled */}
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between active:scale-[.99] transition-transform"
        style={{
          background: '#fff',
          border: `1.5px solid ${value ? C.coral : '#EFE3D0'}`,
          borderRadius: 13, padding: '13px 14px', cursor: 'pointer',
          boxShadow: value ? '0 6px 14px -8px rgba(214,68,106,.3)' : '0 1px 2px rgba(27,42,78,.04)',
        }}
      >
        <span className="flex items-center" style={{ gap: 9, minWidth: 0 }}>
          <MapPin size={16} color={value ? C.coral : C.muted} style={{ flexShrink: 0 }} />
          <span style={{
            fontFamily: 'Albert Sans', fontSize: 13.5,
            fontWeight: value ? 700 : 500,
            color: value ? C.navy : C.muted,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {value ? value.label : 'Choose your neighborhood'}
          </span>
        </span>
        <ChevronDown size={16} color={C.muted} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <Sheet onClose={() => setOpen(false)} tall>
          <div style={{ padding: '4px 16px 16px' }}>
            <h3 style={{
              fontFamily: 'Fraunces', fontSize: 19, fontWeight: 700,
              color: C.navy, margin: '0 0 12px',
            }}>
              Find your area
            </h3>

            {/* Search input */}
            <div className="flex items-center" style={{
              gap: 9, background: '#fff', border: `1.5px solid ${C.coral}`,
              borderRadius: 13, padding: '11px 13px',
            }}>
              <Search size={15} color={C.muted} style={{ flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a city or neighborhood…"
                style={{
                  border: 'none', outline: 'none', width: '100%',
                  background: 'transparent', fontFamily: 'Albert Sans',
                  fontSize: 13.5, color: C.navy,
                }}
              />
            </div>

            {/* Section label */}
            <div style={{
              fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
              letterSpacing: '.13em', textTransform: 'uppercase',
              color: C.muted, margin: '16px 2px 6px',
            }}>
              {showingPopular ? 'Popular areas' : 'Matches'}
            </div>

            {/* Results */}
            {results.length === 0 ? (
              <div style={{
                fontFamily: 'Albert Sans', fontSize: 13, color: C.muted,
                padding: '14px 2px',
              }}>
                No matches in the Tampa Bay area. Try a nearby city.
              </div>
            ) : (
              <div>
                {results.map((a) => {
                  const active = value?.id === a.id;
                  const sub = [a.neighborhood ? a.city : null, `${a.county} County`]
                    .filter(Boolean).join(' · ');
                  return (
                    <button
                      key={a.id}
                      onClick={() => pick(a)}
                      className="w-full flex items-center active:scale-[.99] transition-transform"
                      style={{
                        gap: 11, padding: '11px 8px', cursor: 'pointer',
                        background: active ? C.coralSoft : 'transparent',
                        border: 'none', borderRadius: 10, textAlign: 'left',
                        borderBottom: `1px solid ${C.line}`,
                      }}
                    >
                      <MapPin size={15} color={active ? C.coral : C.muted} style={{ flexShrink: 0 }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{
                          display: 'block', fontFamily: 'Albert Sans', fontSize: 13.5,
                          fontWeight: 600, color: C.navy,
                        }}>{a.label}</span>
                        <span style={{
                          display: 'block', fontFamily: 'Albert Sans', fontSize: 10.5,
                          color: C.muted, marginTop: 1,
                        }}>{sub}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
};
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds, no "Could not resolve" / lint errors referencing `NeighborhoodPicker`.

- [ ] **Step 3: Commit**

```bash
git add src/components/NeighborhoodPicker.jsx
git commit -m "feat(components): NeighborhoodPicker — Option B searchable area picker"
```

---

### Task 4: Wire the picker into `AboutYou` step 3

**Files:**
- Modify: `src/screens/onboarding/AboutYou.jsx`

- [ ] **Step 1: Add imports**

At the top of `AboutYou.jsx`, after the existing `import { SAMPLE_MOMS } ...` line (currently line 7), add:

```jsx
import { NeighborhoodPicker } from '../../components/NeighborhoodPicker';
import { nearestArea } from '../../lib/places.js';
```

- [ ] **Step 2: Accept the new props**

Change the component signature (currently line 265):

```jsx
export const AboutYou = ({ onNext, onBack, profile, setProfile, location, setLocation, distance, setDistance, locationGeo, setLocationGeo }) => {
```

- [ ] **Step 3: Add the select handler + reroute GPS**

Add `handleAreaSelect` and update `detectLocation` (currently lines 270–282). Replace the whole `detectLocation` function with:

```jsx
  // Unifies manual picks and GPS into one structured selection.
  const handleAreaSelect = (entry) => {
    setLocation(entry.label);
    setLocationGeo(entry);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoStatus('unsupported'); return; }
    setGeoStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleAreaSelect(nearestArea(pos.coords.latitude, pos.coords.longitude));
        setGeoStatus('ok');
        inputRef.current?.blur();
      },
      () => setGeoStatus('denied'),
      { timeout: 6000, maximumAge: 5 * 60 * 1000 },
    );
  };
```

(`nearestBucket` at line 85 stays — it's still used by the preview filtering. We no longer call it from `detectLocation`.)

- [ ] **Step 4: Replace the box grid with the picker**

In the step-3 render, replace the entire `{/* 3 × 2 area grid — uniform chips */}` block (the `<div className="grid grid-cols-2" …> … </div>` spanning roughly lines 480–509) with:

```jsx
            {/* Searchable neighborhood picker */}
            <div style={{ marginTop: 16 }}>
              <NeighborhoodPicker value={locationGeo} onSelect={handleAreaSelect} />
            </div>
```

- [ ] **Step 5: Verify build + manual check**

Run: `npm run build`
Expected: build succeeds.

Then `npm run dev`, go to `/prototype`, advance to step 3:
- Tap "Choose your neighborhood" → sheet opens showing 6 popular areas.
- Type "semin" → "Seminole Heights" is the top match; tap it → field shows "Seminole Heights" with a coral border + pin.
- Tap "Use My Location", allow GPS → field populates with the nearest area.
- "Next" becomes enabled once an area is chosen (`hasLocation` is driven by `location`, which `handleAreaSelect` sets).

- [ ] **Step 6: Commit**

```bash
git add src/screens/onboarding/AboutYou.jsx
git commit -m "feat(onboarding): swap area-box grid for NeighborhoodPicker; route GPS through it"
```

---

### Task 5: `App.jsx` — state, prop threading, patch, hydrate

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add `locationGeo` state**

After the `location` / `distance` state (currently lines 49–50):

```jsx
  const [locationGeo, setLocationGeo] = useState(null); // { id,label,city,neighborhood,county,lat,lng }
```

- [ ] **Step 2: Import `resolveArea` for hydration**

At the top of `App.jsx`, add to the existing imports (near the other `lib` imports):

```jsx
import { resolveArea } from './lib/places.js';
```

- [ ] **Step 3: Restore `locationGeo` on hydrate**

In the `promoteSession` hydrate block, right after `if (result.location) setLocation(result.location);` (currently line 98), add:

```jsx
        if (result.locationGeo?.id) {
          setLocationGeo(resolveArea(result.locationGeo.id) || result.locationGeo);
        }
```

- [ ] **Step 4: Extend the step-0 patch + pass props to AboutYou**

Replace the `step===0 && <AboutYou … />` block (currently lines 205–217) with:

```jsx
          {step===0 && <AboutYou
            onNext={()=>advance(0, {
              location,
              distance_miles: distance,
              location_place_id:     locationGeo?.id ?? null,
              location_city:         locationGeo?.city ?? null,
              location_neighborhood: locationGeo?.neighborhood ?? null,
              location_county:       locationGeo?.county ?? null,
              location_lat:          locationGeo?.lat ?? null,
              location_lng:          locationGeo?.lng ?? null,
              kids_ages: profile.kidsAges,
              mom_types: profile.momTypes,
            })}
            onBack={()=>{ setSplashShown(false); }}
            profile={profile} setProfile={setProfile}
            location={location} setLocation={setLocation}
            distance={distance} setDistance={setDistance}
            locationGeo={locationGeo} setLocationGeo={setLocationGeo}
          />}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat(app): locationGeo state, geo patch fields, hydrate restore"
```

---

### Task 6: SQL migration — additive geo columns

**Files:**
- Create: `supabase/_apply_phase2_location.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/_apply_phase2_location.sql`:

```sql
-- Phase 2: structured geo capture from the neighborhood picker.
-- Idempotent. Apply to the live Supabase project (SQL editor or psql).

-- onboarding_profiles: keep `location` (display label) and add structured geo.
alter table public.onboarding_profiles
  add column if not exists location_place_id     text,
  add column if not exists location_city         text,
  add column if not exists location_neighborhood text,
  add column if not exists location_county       text,
  add column if not exists location_lat          numeric(9,6),
  add column if not exists location_lng          numeric(9,6);

-- mom_profiles: city / neighborhood / home_lat / home_lng already exist.
alter table public.mom_profiles
  add column if not exists place_id text,
  add column if not exists county   text;
```

- [ ] **Step 2: Verify SQL is valid (syntax check)**

Run:
```bash
grep -c "add column if not exists" supabase/_apply_phase2_location.sql
```
Expected: `8`

(If a local Postgres / `supabase db` is available, applying it should succeed with no error; otherwise it is applied in the Supabase dashboard SQL editor at deploy time.)

- [ ] **Step 3: Commit**

```bash
git add supabase/_apply_phase2_location.sql
git commit -m "feat(db): phase-2 geo columns for onboarding_profiles + mom_profiles"
```

---

### Task 7: `api/onboarding/step.js` — whitelist + sanitize geo keys

**Files:**
- Modify: `api/onboarding/step.js`

- [ ] **Step 1: Extend the allowlist**

Replace the `ALLOWED_PATCH_KEYS` set (currently lines 4–8) with:

```js
const ALLOWED_PATCH_KEYS = new Set([
  'location', 'distance_miles',
  'location_place_id', 'location_city', 'location_neighborhood', 'location_county',
  'location_lat', 'location_lng',
  'kids_ages', 'mom_types', 'values', 'interests',
  'slots', 'places',
]);
```

- [ ] **Step 2: Sanitize the new keys**

In `sanitizePatch`, find this exact transition line (the `}` closes the `location` branch, the `else if` opens the next one):

```js
    } else if (k === 'distance_miles') {
```

Replace **that single line** with the geo branches followed by the same `distance_miles` line (this keeps the brace chain balanced):

```js
    } else if (k === 'location_place_id' || k === 'location_city'
            || k === 'location_neighborhood' || k === 'location_county') {
      const t = cleanText(v, 120);
      if (t) out[k] = t;
    } else if (k === 'location_lat' || k === 'location_lng') {
      const n = Number(v);
      // Clamp to plausible Florida bounds; round to 6 dp.
      const okLat = k === 'location_lat' && n >= 24 && n <= 31;
      const okLng = k === 'location_lng' && n >= -88 && n <= -79;
      if (Number.isFinite(n) && (okLat || okLng)) out[k] = Math.round(n * 1e6) / 1e6;
    } else if (k === 'distance_miles') {
```

- [ ] **Step 3: Verify the file parses**

Run: `node --check api/onboarding/step.js`
Expected: no output (exit 0).

- [ ] **Step 4: Commit**

```bash
git add api/onboarding/step.js
git commit -m "feat(api): accept structured location_* geo fields in onboarding step patch"
```

---

### Task 8: Map geo into mom_profiles + hydrate response

**Files:**
- Modify: `api/_lib/mom-profile-helpers.js`
- Modify: `api/onboarding/promote.js`

- [ ] **Step 1: Map onboarding geo → mom_profiles payload**

In `api/_lib/mom-profile-helpers.js`, replace the geo lines in `buildMomProfilePayload` (currently lines 37–40):

```js
    city:         onboardingRow.location_city || onboardingRow.location || 'Tampa, FL',
    neighborhood: onboardingRow.location_neighborhood || null,
    county:       onboardingRow.location_county || null,
    place_id:     onboardingRow.location_place_id || null,
    home_lat:     onboardingRow.location_lat ?? null,
    home_lng:     onboardingRow.location_lng ?? null,
```

- [ ] **Step 2: Add `locationGeo` to the hydrate shape**

In `api/onboarding/promote.js`, in `hydratedShape` (currently line 123, after `location: row.location,`), add:

```js
    locationGeo: row.location_place_id ? {
      id:           row.location_place_id,
      label:        row.location || null,
      city:         row.location_city || null,
      neighborhood: row.location_neighborhood || null,
      county:       row.location_county || null,
      lat:          row.location_lat ?? null,
      lng:          row.location_lng ?? null,
    } : null,
```

- [ ] **Step 3: Verify both files parse**

Run:
```bash
node --check api/_lib/mom-profile-helpers.js && node --check api/onboarding/promote.js && echo OK
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add api/_lib/mom-profile-helpers.js api/onboarding/promote.js
git commit -m "feat(api): map structured geo into mom_profiles + hydrate locationGeo"
```

---

### Task 9: Full-flow verification

**Files:** none (verification only)

- [ ] **Step 1: Build passes**

Run: `npm run build`
Expected: success.

- [ ] **Step 2: Manual onboarding flow (dev)**

Run `npm run dev`, open `/prototype`:
1. Step 3 → open picker → empty state shows 6 popular areas.
2. Search "brad" → "Bradenton" (Manatee County) appears; select it.
3. Field shows "Bradenton"; "Next" enabled.
4. Open DevTools → Network. Tap Next. Inspect the `POST /api/onboarding/step` request body → `patch` contains `location_place_id:"bradenton"`, `location_city:"Bradenton"`, `location_county:"Manatee"`, `location_lat:27.5`, `location_lng:-82.57`. (In pure `npm run dev` without `vercel dev`, the request 404s and is swallowed — that's expected; the body is still correct. Run `vercel dev` to exercise the serverless path against a DB that has the Task 6 columns applied.)

- [ ] **Step 3: Confirm legacy preview still renders**

On step 3, the curation preview banner (Things to do / Meetups / Moms / Spots) still populates after selecting an area — the preview keys off `location`/`nearestBucket`, which remain intact.

- [ ] **Step 4: Final commit (if any stray changes)**

```bash
git status   # should be clean after Tasks 1–8 commits
```

---

## Notes for the implementer

- **No test framework** exists; the `node --input-type=module -e` smoke checks (Tasks 1–2) and `node --check` parse checks (Tasks 7–8) are the automated safety net. Don't add Jest/Vitest for this work.
- **`recordStep` is fire-and-forget** and swallows failures, so the frontend never breaks if the DB columns aren't applied yet — but the geo won't persist until Task 6's migration is run against the live project.
- **Design tokens:** every color routes through `C.*` (coral for the mom's own-area selection = 1:1 intimacy per the palette rules; sage stays reserved for community). Fraunces for the sheet headline, Albert Sans for UI.
- **The Google swap** (future) touches only `src/lib/places.js` + two new `api/places/*` functions — no schema, UI, or `App.jsx` change. `place_id` already stores the dataset slug today and a Google place id later.
