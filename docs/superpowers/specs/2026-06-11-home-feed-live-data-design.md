# Home feed — live data wiring + admin Weekly Favorite

**Date:** 2026-06-11
**Status:** Approved design, pending spec review
**Delivery:** one spec → one commit (all five sections land together)

## Problem

A frontend-only collaborator rebuilt `HomeTab` with hardcoded arrays. Most of
the feed reads as "live" but is static, even though the backing APIs already
exist (`/api/events`, `/api/places`, `/api/mom-profiles/nearby`). Five Home
sections need to be wired to real data, one needs removal, and one needs a new
admin-curated backend (Weekly Favorite with history).

This spec covers `src/screens/MainApp/HomeTab.jsx`,
`src/screens/MainApp/index.jsx`, `src/App.jsx`, the events seed, the
`content-score` consumers, two new pure helpers, one new table, three new API
routes, and one new admin tab.

Out of scope (explicitly unchanged): the **Upcoming Meetups** and **Continue
Planning** sections stay as-is. Neighborhood-level granularity for the Weekly
Favorite is deferred (schema leaves room for it).

## Decisions (locked)

| Decision | Choice |
|---|---|
| Delivery | One spec, one commit |
| Weekly Favorite, no admin pick | API auto-picks a high-rated place **and persists** it to history |
| Repeat-avoidance window | 8 weeks |
| "Based on Child's Age" content | Places **and** events, mixed and ranked by kid-age fit |
| Week definition | Monday-start (00:00 local), one favorite per `(week_start, city)` |
| "All" child filter | Ranks by best fit across all of the user's kids |

---

## Section 1 — "3 fun things happening near you" → "Local Events Nearby"

**Goal:** rename the section and back it with real event rows instead of the
`FUN_THINGS_FALLBACK` static crutch.

The section already derives `funThings` from `activities`
(`bucketActivities(thisWeek, events, …)`) and only falls back when fewer than 3
live activities exist. The fix is to (a) rename, and (b) make the three
showcase events real so the surface is genuinely live.

### Changes

- **`HomeTab.jsx`**
  - `SectionHead title="3 fun things happening near you"` → `title="Local Events Nearby"`.
  - Keep the `MeetupCard` shape and the live-first / fallback-last logic.
  - Shrink `FUN_THINGS_FALLBACK` to an offline-only safety net (still 3 items so
    the row never collapses), and add a code comment that live event rows are the
    intended source.

- **`src/data/events.js`** — add a `LOCAL_DATED_EVENTS` export: the three
  showcase events with full metadata:
  - `Saturday Splash Pad Meetup` — tags `['Water lovers','Outdoors']`, `kid_ages: ['1–3','3–5']`, `event_type: 'meetup'`, place a real splash-pad place slug, `going: 12`.
  - `Music Together Class` — tags `['Music lovers']`, `kid_ages: ['0–1','1–3']`, `event_type: 'class'`, `going: 8`.
  - `Zoo Tampa Family Day` — tags `['Outdoors','Active weekends']`, `kid_ages: ['3–5','5–8']`, `event_type: 'attraction'`, `going: 22`.
  - Each carries a `daysAhead` hint (e.g. 2, 5, 7) used by the seed to anchor a
    fresh `starts_at`, plus the existing `photo` URLs.

- **`api/_lib/seed.js`** — in `buildEventsPayload`, after the recurring rows,
  emit each `LOCAL_DATED_EVENTS` entry as a **dated** row:
  - `kind: 'dated'`, `starts_at` = `now + daysAhead` (ISO), so re-seeding always
    produces upcoming dates and they never go stale.
  - `kid_ages`, `event_type`, `tags`, `going_count`, `hero_photo`, `place_id`
    resolved the same way recurring rows resolve their place.
  - These count toward `wantEvents`; bump the default `wantEvents` if needed so the
    dated trio is never truncated by the slice.

**Result:** `splitEvents` returns these in `thisWeek` (dated, within the
14-day horizon), so `bucketActivities` surfaces them in `funThings` from live
data. No client behavior depends on the fallback in the normal path.

---

## Section 2 — "Moms You May Want To Meet"

**Goal:** trust the recommendation engine that already powers `nearbyMoms`, and
fix a ranking bug.

`nearbyMoms` arrives pre-ranked from `/api/mom-profiles/nearby`
(`rankAndShape` → `scoreMom`), already carrying `sharedTags` and `distanceMi`.

### Changes (`HomeTab.jsx`)

- **Remove** the `FALLBACK_MOMS` static array.
- **Bug fix:** delete the `liveMoms` re-sort by `distanceMi`
  (`HomeTab.jsx:471–473`). That sort discards the match ranking. Render
  `nearbyMoms` in the order the API returned (already match-ranked), take the
  top 3.
- **Empty/loading state:** when `nearbyMoms` is empty, render a calm placeholder
  instead of fake moms — a short invitation in the brand voice
  (Fraunces headline, one italic-coral word) such as *"Your **village** is
  forming — finishing your profile helps moms find you,"* linking to the profile
  via the existing `onVerify`. (Reuses the empty-state pattern from `ux-oracle`.)
- The `MomMeetCard` already prefers `item.kids`/`kidLabel` then `sharedTags[0]`
  for its sub-line; keep that — it now reads real shared-ground signals.

---

## Section 3 — Remove "Active Group Chats"

**Goal:** delete the section from Home (only).

### Changes (`HomeTab.jsx`)

- Delete the **Active Group Chats** `SectionHead` + rail JSX.
- Delete the now-dead code: `GroupChatChip`, `GROUP_DOT`,
  `GROUP_CHAT_FALLBACK`, the `groupChats` assembly, `openGroup`, the
  `selectedDiscussion` state + the `GroupDiscussionSheet` block, and the
  `joinedDiscussions` state if no longer referenced.
- Drop the now-unused `groups`, `goToConnectGroups`, `onDiscuss`,
  `chatAuthor`, `myUserId` props **iff** nothing else in HomeTab uses them
  (verify each; `onDiscuss` is also wired to place/event sheets — keep those).
- Remove the `scoreDiscussion` / `rankByRelevance` imports if they become unused.

### Changes (`src/screens/MainApp/index.jsx`)

- Stop passing `groups={TOP_DISCUSSIONS}` to `HomeTab`. **Keep** `TOP_DISCUSSIONS`
  itself and its use by other tabs (e.g. ConnectTab) untouched.

---

## Section 4 — "Based On Your Child's Age" (per-child, places + events)

**Goal:** replace the static `AGE_PROGRAMS` with real, kid-age-ranked content
mixing places and events, filterable per child.

### New helper — `src/lib/age-rail.js` (pure, + `age-rail.test.mjs`)

```
buildAgeRail(profile, places, events, { limit = 12 }) -> Item[]
```

- `Item = { id, type: 'place'|'event', name, photo, ageLabel, reason,
   distance|when, score, forChild: number[] }` where `forChild` lists the
  indexes of the user's kids this item fits.
- Flatten the grouped `places` object (reuse the category-key flatten from
  `home-feed.js`'s `pickTrendingPlaces`) and the `events` list (`thisWeek` +
  `recurring`).
- For each child (from `childList(profile)` — see below), score every place via
  `scorePlace` and every event via `scoreEvent` from `content-score.js`, using a
  per-child single-bucket profile so fit is computed per kid.
- An item's `score` = **max** fit across all kids (drives the **All** view);
  `forChild` = indexes of kids scoring above a small threshold.
- Return de-duped items sorted by `score` desc, capped at `limit`.

```
childList(profile) -> { name?: string, bucket: string, label: string }[]
```

- Source: `profile.settings.kids` (rich `[{ age, name, gender }]`) when present;
  else reconstruct generic children from `profile.kidsAges` counts.
- `label` = `name` if non-empty, else the **stage label** from the bucket:

| Bucket | Stage label |
|---|---|
| `0–1` | Baby |
| `1–3` | Toddler |
| `3–5` | Preschooler |
| `5–8` | Big kid |
| `8–12` | Tween |
| `12–18` | Teen |

### Changes (`HomeTab.jsx`)

- Replace `AGE_PROGRAMS` + the `kidsBucketArr`/`ageSubtitle` block with a call to
  `buildAgeRail(profile, places, { thisWeek, events })`.
- Add a **filter chip row** under the section head: `All` + one chip per child
  (`childList`), styled like existing pill chips (active = coral fill, per
  `KidsSheet`/`ConnectTab` precedent). Local `useState` for the selected child
  index (`null` = All).
- `All` → items sorted by cross-kid `score`; a selected child → items whose
  `forChild` includes that index.
- Generalize `AgeProgramCard` to render both types: same card, with a small
  type chip — **`Place`** in a sage tone, **`Event`** in coral (sage =
  community surfaces, coral = the 1:1/dated flavor) — plus the `reason` line
  (e.g. "Right age for your kids") and `distance` (place) or `when` (event).
- Tapping a place opens `PlaceDetailSheet` (existing `openPlace`); tapping an
  event opens `EventDetailSheet` (existing `openMeetup`/event path).
- If the user has no kids on file, hide the section (no fabricated content).

---

## Section 5 — "Local Favorite This Week" (admin-curated + history)

**Goal:** the featured place each week is admin-chosen, recorded for history,
and auto-filled (without repeating recent picks) when the admin doesn't choose.

### New table — `supabase/_apply_phase10_weekly_favorite.sql` (idempotent, RLS-on)

```sql
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

alter table public.weekly_favorites enable row level security;
-- No policy: anon/public PostgREST denied; service-role bypasses RLS.
```

- Service-role-only, consistent with the documented security model. `city`
  column leaves room for neighborhood scoping later without a migration.

### New pure helper — `api/_lib/weekly-favorite.js` (+ `weekly-favorite.test.mjs`)

- `weekStart(date) -> 'YYYY-MM-DD'` — Monday 00:00 of the given date's week.
- `pickAuto(placeRows, recentPlaceIds, { cooldownWeeks = 8 }) -> placeRow | null`
  — choose the highest `rating × log10(review_count + 1)` place whose `id` is not
  in `recentPlaceIds`; tie-break by `review_count` then `id` for determinism.
  Returns `null` only when no eligible place exists (caller then relaxes the
  cooldown).

### New public route — `GET /api/local-favorite?city=Tampa`

- Compute `week_start = weekStart(now)`.
- Look up `weekly_favorites` for `(week_start, city)` joined to `places`.
  - **Hit:** return `{ favorite: <place + week_start + source> }`.
  - **Miss:** fetch the last 8 weeks of `place_id`s for `city`, fetch visible
    approved places, `pickAuto(...)`, **insert** the row (`source: 'auto'`,
    `on_conflict (week_start,city) do nothing` to stay race-safe), then return
    the joined place. If `pickAuto` returns `null`, retry once ignoring the
    cooldown; if still null, return `{ favorite: null }`.
- `Cache-Control: public, max-age=300`. Mirrors `api/config.js` conventions
  (`json`, `supabaseCreds`, `sbHeaders`).

### New admin route — `GET/POST /api/admin/weekly-favorite` (`requireAdmin`)

- **GET** → `{ current: <row|null>, history: <last ~12 rows joined to places> }`
  for the requested/`Tampa` city.
- **POST** `{ place_id, city = 'Tampa', week_start? }` → validate `place_id` is a
  real visible place; upsert `(week_start ?? weekStart(now), city)` with
  `source: 'admin'` (`Prefer: resolution=merge-duplicates`). Returns the saved
  row. Mirrors `api/admin/config.js` structure and CORS/`requireAdmin` gating.

### Admin UI — new tab **Featured**

- Add `{ id: 'featured', icon: Star, label: 'Featured' }` to the admin tab list
  in `AdminPage.jsx` (after `events`), and route it to a new
  `src/admin/WeeklyFavoriteManager.jsx`.
- `WeeklyFavoriteManager.jsx`:
  - Shows **this week's pick** (name, photo, rating, source badge —
    `admin`-chosen vs `auto`).
  - A place picker (search/select over admin places, reusing `PlacesManager`
    data-loading patterns) with a **Set as this week's favorite** action → POST.
  - A **history** list (last ~12 weeks) so repeats are visible at a glance.
- Tokens/fonts via `C` + Fraunces/Albert Sans, consistent with other managers.

### Client wiring

- **`src/lib/local-favorite-api.js`** — `fetchLocalFavorite(city = 'Tampa')`
  → `GET /api/local-favorite`, normalized to a place-shaped object or `null`.
- **`src/App.jsx`** — `useEffect` on mount fetches the favorite into a
  `localFavorite` state and threads it to `MainApp` → `HomeTab` as a
  `localFavorite` prop.
- **`HomeTab.jsx`** — render `LocalFavoriteCard` from the `localFavorite` prop
  when present; keep the `pickTrendingPlaces` result only as an offline fallback.
  The `tagline` stays "Most loved place by {city} moms this week".

---

## Testing

Repo runs `npm test` → `node --test` over `*.test.mjs`.

- `src/lib/age-rail.test.mjs` — `childList` name-vs-stage-label fallback;
  `buildAgeRail` ranking, cross-kid `forChild` membership, places+events mix,
  empty-kids → empty rail.
- `api/_lib/weekly-favorite.test.mjs` — `weekStart` Monday boundaries
  (incl. Sunday edge), `pickAuto` excludes `recentPlaceIds`, deterministic
  tie-break, `null` when all places are on cooldown.
- Existing `api/_lib/seed`-adjacent shape tests still pass with the dated-event
  additions; add an assertion that `LOCAL_DATED_EVENTS` seed rows carry
  `kind:'dated'` and a future `starts_at` if a seed test harness exists.

## Design discipline

- All color via `C.*`; Fraunces headlines, Albert Sans UI; coral = 1:1/intimacy,
  sage = community, saffron = premium. The new type chips follow this (Event =
  coral, Place = sage).
- Dispatch `design-reviewer` after the UI lands for mechanical token/font/deps
  compliance. `ux-oracle` Five-Questions already applied to each new surface
  (empty state, age rail, favorite card).

## File touch list

| File | Change |
|---|---|
| `src/screens/MainApp/HomeTab.jsx` | rename §1; fix §2 ranking + empty state; delete §3; per-child §4 rail + chips; §5 prop-driven favorite |
| `src/screens/MainApp/index.jsx` | stop passing `groups` to HomeTab; thread `localFavorite` prop |
| `src/App.jsx` | fetch + hold `localFavorite`, pass down |
| `src/data/events.js` | add `LOCAL_DATED_EVENTS` |
| `api/_lib/seed.js` | emit dated showcase events with fresh `starts_at` |
| `src/lib/age-rail.js` (+ test) | new pure per-child rail builder |
| `api/_lib/weekly-favorite.js` (+ test) | new pure week/pick helpers |
| `api/local-favorite.js` | new public route |
| `api/admin/weekly-favorite.js` | new admin route |
| `src/lib/local-favorite-api.js` | new client |
| `src/admin/WeeklyFavoriteManager.jsx` | new admin tab UI |
| `src/AdminPage.jsx` | register **Featured** tab |
| `supabase/_apply_phase10_weekly_favorite.sql` | new table + RLS |

## Rollout notes

- Apply `_apply_phase10_weekly_favorite.sql` via Supabase MCP / SQL editor
  before the admin tab is used.
- Re-run the seed (or `npm run seed`) so the dated showcase events and any
  ratings the auto-pick relies on are present.
- No env changes required.
