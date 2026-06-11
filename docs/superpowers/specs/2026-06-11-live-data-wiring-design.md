# Live data wiring — no static places/events/moms ever rendered

**Date:** 2026-06-11
**Status:** Approved design, pre-implementation

## Goal

Every user-facing surface must render **places, events, and moms from the API**,
ranked through the existing recommendation engine. No hardcoded catalog data is
ever rendered. When the API is empty or fails, surfaces show loading skeletons →
empty/error states — never a static fallback.

Discussions/groups stay static (`GROUP_DISCUSSIONS`, `TOP_DISCUSSIONS`, topic
chips, `RESOURCES`) because the discussion APIs are not built yet. Vocab/config
modules (`taxonomy.js`, `matching-vocab.js`, `tampa-bay-areas.js`) stay — they
are not rendered content.

## Current state (audit)

**Already live, no change needed:**
- **Moms** — `nearbyMoms` from `POST /api/mom-profiles/nearby`, ranked server-side
  by `api/_lib/match.js` (`scoreMom`) + `api/_lib/nearby.js` (`rankAndShape`).
  Consumed by HomeTab, ConnectTab, MamaHubSheet, MyVillageSheet.
- **HomeTab** — events + places live, ranked profile-aware via `src/lib/home-feed.js`
  (`bucketActivities`, `pickTrendingPlaces`, `rankActivitiesForUser`) and
  `src/lib/content-score.js` (`scoreEvent`, `scorePlace`).
- **Explore places** (LocalPicksTab places/kids/schools/health) — live via the
  in-file adapter (`buildLiveSections`, `livePhotoCard`, …), **but** with a
  hardcoded fallback when live data is absent.

**Static rendered today (the work):**
1. **App.jsx** — `eventsData` falls back to `SUGGESTED_EVENTS` (imported as
   `FALLBACK_EVENTS`) when `/api/events` returns no recurring rows.
2. **LocalPicksTab** — Events + Meetups sections are 100% hardcoded
   (`EVENTS_EXPLORE`, `EVENTS_EXPLORE_ALL`, `MEETUPS_EXPLORE`, `MEETUPS_EXPLORE_ALL`);
   the tab is never passed live events. Places fall back to hardcoded `SECTIONS`
   arrays (`TOP_PLACES_NEARBY`, `FUN_ENTERTAINMENT`, `SCHOOLS_CHILDCARE`,
   `EXTRACURRICULAR_CAMPS`, `HEALTH_WELLNESS`, + `_ALL`/tagged variants) when live
   data is missing.
3. **ConnectTab** — "Upcoming meetups" renders a hardcoded `MEETUPS` array.

**Static data files (usage confirmed by grep):**
- `src/data/moms.js` (`SAMPLE_MOMS`) — imported nowhere. Dead.
- `src/data/places.js` (`PLACES`) — imported only by `api/_lib/seed.js`. Other
  exports (`findPlace`, `TOP_PICKS`, `BADGE_META`, `PLACE_CATEGORIES`,
  `PLACES_NO_PREF`) imported nowhere.
- `src/data/events.js` (`SUGGESTED_EVENTS`, `LOCAL_DATED_EVENTS`) — imported by
  `App.jsx` (render fallback, to be removed) and `api/_lib/seed.js`.

## Design

### 1. New module: `src/lib/event-cards.js` (pure, unit-tested)

Single source for event → card adapters. No React/theme imports (mirrors
`home-feed.js`), so it is node-testable. Reuses `rankActivitiesForUser` from
`home-feed.js` so ranking goes through the existing engine.

API event UI shape (from `api/_lib/events-shape.js#toUi`):
`{ id, slug, day, bucket, time, name, place, going, recurring, tags, indoor, mi,
   kidAges, hue, photo, kind, startsAt, eventType }`.

Exports:
- `EVENT_FALLBACK_PHOTO` — neutral stock used only when `photo` is null.
- `sourceOf(ev)` → `'meetup'` when `eventType === 'meetup'`, else `'event'`.
- `whenLabel(ev, now)` — dated → "Sat · 9:30 AM" from `startsAt`; recurring →
  "Tue · 9:00 AM" from `day` + `time`.
- `distanceLabel(ev)` — `mi` → "1.2 mi away" (or "Nearby" < 0.1).
- `eventToExploreCard(ev, now)` → `{ id, title:name, when, going, distance, photo,
   place, _source, _live: ev }` — the shape LocalPicksTab's `EventCard` renders.
- `nextOccurrence(dayOfWeek, now)` — next calendar date matching a recurring
  event's `day` ("Tue"); returns `{ dow:'TUE', day:17, dateLabel:'Tue, Jun 17' }`.
- `eventToMeetupCard(ev, now)` → `{ id, dow, day, title, place, meta, going, photo,
   _live }` — the shape ConnectTab's `MeetupCard` renders. Date badge from
   `startsAt` when dated, else `nextOccurrence(day)`.
- `rankEvents(events, profile)` — thin wrapper over `rankActivitiesForUser`.

`src/lib/event-cards.test.mjs` covers: source split, when/distance formatting,
dated vs recurring date-badge derivation, null-photo fallback, empty input.

### 2. `src/App.jsx`

- Remove `import { SUGGESTED_EVENTS as FALLBACK_EVENTS } from './data/events'`.
- `const eventsData = liveEvents?.recurring || [];` (was: `?.length ? … : FALLBACK_EVENTS`).
- `placesData` already `livePlaces?.places || null` — unchanged.
- Fix the two stale comments (≈ lines 113–116, 171) that claim "screens fall back
  to their own hardcoded data."

### 3. `src/screens/MainApp/index.jsx`

Thread live events + profile into both tabs:
- `LocalPicksTab`: add `events={events} thisWeek={thisWeek} profile={profile}`.
  (`eventsLoading`, `placesLoading` already passed.)
- `ConnectTab`: add `events={events} thisWeek={thisWeek} eventsLoading={eventsLoading}`.
  (`profile` already passed.)

### 4. `src/screens/MainApp/LocalPicksTab.jsx`

- **Delete** all hardcoded catalog arrays and their `_ALL`/tagged/combined
  variants: `EVENTS_EXPLORE(_ALL)`, `MEETUPS_EXPLORE(_ALL)`, `TOP_PLACES_NEARBY(_ALL)`,
  `FUN_ENTERTAINMENT(_ALL)`, `SCHOOLS_CHILDCARE(_ALL)`, `EXTRACURRICULAR_CAMPS(_ALL)`,
  `HEALTH_WELLNESS(_ALL)`, `EVENTS_TAGGED`, `MEETUPS_TAGGED`,
  `EVENTS_PLUS_MEETUPS_ALL`, `HEALTH_WELLNESS_TAGGED`, `tagSource`, `tagHealth`.
- **`SECTIONS`** becomes metadata only: `{ key, title, kind, seeAllSubtitle }` —
  no `items`/`allItems`.
- Accept new props: `events = []`, `thisWeek = []`, `profile = null`.
- **Events/Meetups**: `const liveEventCards = useMemo(() => rankEvents([...thisWeek, ...events], profile).map(ev => eventToExploreCard(ev, now)), …)`.
  `meetupCards = liveEventCards.filter(c => c._source === 'meetup')`;
  `eventCards = liveEventCards` (events section shows all; combined SeeAll already
  surfaced both — preserve via `allItems`).
- **`effectiveSections`**: build entirely from live data. Places/kids/schools/health
  from `buildLiveSections` (unchanged). Events/meetups from the live card lists.
  Remove the `if (!anyLive(places)) return SECTIONS` branch and the
  hardcoded-fallback `return s`. Empty section ⇒ empty items (render hides it; the
  existing empty-state copy shows when all three pinned sections are empty).
- **Places ranking** becomes profile-aware to match HomeTab: pass `profile` into
  the non-featured sort (`scorePlace`) within `topPlacesFrom`/`buildLiveSections`
  (featured/`top_rank` still pinned first).
- **`quickFilterMatch`** event branch: match on real fields — `_source` for the
  Meetups chip, `startsAt`/`mi`/`going` for thisweek/weekend/small/near5 — instead
  of parsing hardcoded `when`/`distance` strings.
- `openEvent` passes `_live` through to the detail sheet.

### 5. `src/screens/MainApp/ConnectTab.jsx`

- Accept `events = []`, `thisWeek = []`, `eventsLoading = false`.
- Remove the hardcoded `MEETUPS` array.
- `const meetupCards = useMemo(() => rankEvents([...thisWeek, ...events], profile)
   .filter(ev => sourceOf(ev) === 'meetup').slice(0, 3).map(ev => eventToMeetupCard(ev, now)), …)`.
- "Upcoming meetups" section renders `meetupCards`; show `MomCardSkeleton`-style
  loading row when `eventsLoading`, and a "No meetups nearby yet" empty state when
  the live list is empty.
- `openMeetupDetail` sources tags from `item._live?.tags` instead of the hardcoded
  `['Stroller-friendly','Free']`.

### 6. Data files

- **Delete** `src/data/moms.js` (dead).
- **Keep** `src/data/places.js` and `src/data/events.js` as seed-only origin data
  (per decision — they feed `api/_lib/seed.js`; not rendered after this change).
  Only `App.jsx`'s render import of `SUGGESTED_EVENTS` is removed.

## Data flow after change

```
/api/places  → App.livePlaces → placesData ─┬─ HomeTab (live, ranked)
                                            ├─ LocalPicksTab (live, ranked)
                                            └─ MamaHub / MyVillage (live)
/api/events  → App.liveEvents → events/thisWeek ─┬─ HomeTab (bucketActivities)
                                                 ├─ LocalPicksTab (eventToExploreCard)
                                                 └─ ConnectTab (eventToMeetupCard)
/api/mom-profiles/nearby → App.nearbyMoms ─┬─ HomeTab / ConnectTab / MamaHub / MyVillage
                                           (server-ranked scoreMom)
```

Recommendation criteria preserved end-to-end:
- Moms: server `scoreMom` (kids 30 / interests 20 / places 15 / values 10 /
  slots 10 / familyTags 10 / momTypes 5) − distance penalty + locality bonus.
- Events: `scoreEvent` (kid-age fit + family-tag overlap) via `rankActivitiesForUser`.
- Places: `scorePlace` (kid-age fit + tag overlap), featured pinned first.

## Testing

- `npm test` (node --test over `*.test.mjs`) must stay green.
- New `src/lib/event-cards.test.mjs`.
- `npm run build` clean.
- Manual: Explore + Connect render live events/meetups; with the API stubbed
  empty, both show empty states, no hardcoded cards.

## Out of scope

- Discussion/group APIs (intentionally static).
- Persisting `savedItems` / `profile.verified` to Supabase.
- Any new endpoints — all data flows through existing `/api/*`.
```
