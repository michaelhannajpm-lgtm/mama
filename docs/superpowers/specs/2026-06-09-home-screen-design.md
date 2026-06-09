# Home screen — design

**Date:** 2026-06-09
**Status:** Approved design, pending implementation plan
**Supersedes (in routing):** `src/screens/MainApp/ThisWeekTab.jsx`

## Summary

Replace the **This Week** tab with a **Home** landing tab — the first screen a
user lands on inside MainApp. Home is an editorial discovery feed driven by the
live event API, with a time filter scoping the activities row, plus promo
sections that surface the rest of the app (places, moms, groups, saved items)
and a conditional "get verified" banner.

This is the chosen direction (**option A — editorial feed**) from brainstorming:
the time filter changes *only* the activities row; every other surface keeps its
own identity as a standalone row.

## Goals

- A warm, magazine-cover landing tab that answers "what can my family do?"
- Activities sourced from the **real event API** (`/api/events`), not hardcoded.
- A time filter — `Today · This Week · This Month · Others` — that scopes the
  activities row.
- Promote the rest of the app: trending places, moms near you, groups, saved.
- Nudge unverified users toward the verified badge.
- Leave a clean seam for a future event-matching/relevance algorithm.

## Non-goals

- The matching/relevance algorithm itself (location + interest + promoted
  weighting). Home ships with a simple sort and a pluggable seam; the algo is a
  follow-up.
- Real social-verification OAuth (the verify banner routes to the existing
  self-attested Profile flow).
- Changing the premium model, message limits, or verification gate.

## Tab reorder

Bottom tab bar changes from:

```
This Week · Connect · Local Picks · My Hub
```

to:

```
Home · Local Picks · Connect · My Hub
```

- Default `tab` becomes `'home'`.
- `Home` icon: lucide `Home` (or `Sparkles` if `Home` reads too literal —
  implementer's call, default `Home`).
- `HEADER_LABELS` / `HEADER_SUBTITLES` updated: Home uses a **time-aware
  greeting** as its title instead of a static label (see below).

## Layout (top → bottom)

1. **Greeting header** — time-aware: "Good morning / afternoon / evening,
   {firstName}". Subtitle = "{n} ideas picked for your family" where `n` is the
   count of activities currently in view. Rendered inside the shared MainApp
   header (special-cased for the `home` tab). If the greeting + the existing
   top-right name pill feel redundant in practice, drop the name from the
   greeting — keep it a one-line change.
2. **Verify banner** — conditional. Shows only when the user is **not** verified,
   i.e. `!(profile.verified.photo && (profile.verified.instagram ||
   profile.verified.facebook))`. Coral/peach gradient card, shield icon,
   "Get your verified badge" + "Verify →". Tap → switch to the Profile tab
   (`setTab('profile')`). Disappears once verified.
3. **Time filter + Activities row.** Four **count pills**: `Today`, `This Week`,
   `This Month`, `Others`, each carrying a count badge (see *Filter look & feel*).
   The active pill determines which activities render in the row directly below.
   This is the ONLY section the filter affects.
4. **Trending places near you** — horizontal row of top-rated places. "See all"
   → Local Picks tab.
5. **Moms near you** — horizontal row of suggested moms (avatars + shared-ground
   line). "See all" → Connect tab.
6. **Groups for you** — list of mom groups / discussions to join. "See all" →
   My Hub.
7. **Your saved spots** — conditional, shows only when `savedItems` is non-empty.
   Up to 3 saved thumbnails (or a count chip if not resolvable). "My Village" →
   opens `MyVillageSheet`.
8. **"See all activities"** coral CTA — opens the combined `SeeAllSheet` feed.

## Time filter semantics

Computed client-side from each event's `startsAt` (ISO) and `kind`:

| Chip | Source | Rule |
|---|---|---|
| Today | dated events (`kind === 'dated'`) | `startsAt` falls on the current calendar day; sorted by time |
| This Week | dated events | `startsAt` within the next 7 days (today inclusive) |
| This Month | dated events | `startsAt` from now through the end of the current calendar month |
| Others | recurring events (`kind !== 'dated'`) | the API's `recurring` list — weekly/repeating series with no single date |

Section header text swaps with the filter: **Happening today / This week /
Later this month / Ongoing & weekly**.

### Filter look & feel (count pills)

The filter renders as a row of rounded **count pills** — each pill shows its
label plus a small count badge of how many activities fall in that bucket
(`Today: dated-today`, `This Week: next-7-days`, `This Month: through-month-end`,
`Others: recurring-count`). The count is information scent — it pulls the user
toward where the activity is.

- **Active pill:** coral gradient fill (`linear-gradient(135deg, C.coral,
  C.coralDeep)`), white label, count badge on a translucent-white inset
  (`rgba(255,255,255,.25)`).
- **Inactive pill:** `C.paper` background, `C.divider` border, `C.navySoft`
  label, count badge on a warm muted inset (e.g. a faint cream chip) with
  `C.muted` text.
- Counts are derived from the same `bucketActivities` split used to render the
  row, so the badge and the row never disagree. A bucket with zero items still
  shows its pill (count `0`); tapping it surfaces the empty-state nudge below.
- `Albert Sans`, ~10.5px label / ~8px badge; pills sit in a single
  non-wrapping row, horizontally scrollable if cramped at 375px.

### Data window

`api/events.js` currently calls `splitEvents(rows, { windowDays: 14 })`, capping
dated events at 14 days. Bump to **45 days** so "This Month" reliably has data.
This only lengthens the `thisWeek` array; `recurring` is already returned in full
and nothing else depends on the 14-day cap.

## Data sources

All already flow into `MainApp` today — Home reuses the existing props:

| Section | Prop / source |
|---|---|
| Activities (dated) | `thisWeek` (from `/api/events`) |
| Activities (Others) | `events` (recurring, from `/api/events`) |
| Trending places | `places` prop — top-rated subset |
| Moms near you | `nearbyMoms` prop |
| Groups | `GROUP_DISCUSSIONS` (already imported in `MainApp/index.jsx`) |
| Saved spots | `savedItems` prop |

New callbacks threaded from `MainApp/index.jsx` into `HomeTab`:

- `goToPlaces` → `setTab('localpicks')`
- `goToConnect` → `setTab('connect')`
- `goToHub` → `setTab('hub')`
- `onVerify` → `setTab('profile')`
- `openVillage` → `setVillageOpen(true)`

## Matching seam (future-proofing)

Introduce `src/lib/home-feed.js` exporting `rankActivities(list, user)`:

- **Today:** sorts by `startsAt` time, then ascending distance.
- **Default:** sorts by date, then distance.
- Honors an optional `promoted` flag on events (promoted float to the top).
- Today it's a simple sort; later the relevance algo (location + interests +
  promoted weighting) drops in here without touching `HomeTab`'s render code.

The same module can host `pickTrendingPlaces(places)` (top-rated subset) and
`bucketActivities(thisWeek, recurring, now)` (the four-bucket split above), so
all feed logic is testable in isolation and `HomeTab` stays presentational.

## Empty states

Live data is sparse, so every section must degrade gracefully:

- **Activities, per filter:** if the selected bucket is empty, render a gentle
  inline nudge instead of a blank row, e.g.:
  - Today empty → "Nothing scheduled today — peek at This Week ›" (tapping the
    nudge switches the filter to `This Week`).
  - This Week / This Month empty → "No dated events yet — browse ongoing ›"
    (switches to `Others`).
  - Others empty → "No recurring groups yet."
- **Trending places / Moms / Groups:** if the underlying list is empty, hide the
  whole section (header included) rather than showing an empty row.
- **Saved spots:** hidden entirely when `savedItems` is empty (already
  conditional).

## Components & files

- **New:** `src/screens/MainApp/HomeTab.jsx` — the Home screen. Presentational;
  delegates feed logic to `src/lib/home-feed.js`.
- **New:** `src/lib/home-feed.js` — `rankActivities`, `bucketActivities`,
  `pickTrendingPlaces`.
- **Reuse (no change):** `EventDetailSheet`, `PlaceDetailSheet`, `ShareSheet`,
  `SeeAllSheet`, `ActivitiesFilterSheet`, `MyVillageSheet`. The activity/place
  card components currently local to `ThisWeekTab` (`TodayCard`, `PopularCard`,
  `SectionHead`, `FilterIconBtn`) are moved into `HomeTab.jsx` (or a small shared
  module) since `ThisWeekTab` is being retired from routing.
- **Edit:** `src/screens/MainApp/index.jsx` — import `HomeTab`, reorder `TABS`,
  set default tab, update `HEADER_LABELS` / `HEADER_SUBTITLES`, thread the new
  callbacks, render `HomeTab` for `tab === 'home'`.
- **Edit:** `api/events.js` — `windowDays: 14 → 45`.
- **Retire from routing:** `ThisWeekTab.jsx` — left on disk (consistent with the
  repo's legacy-files convention: `Splash.jsx`, `Welcome.jsx`, etc.), no longer
  imported. Optional later cleanup.

## Design tokens / discipline

- Activities & verify banner: coral family (`C.coral`, `C.coralDeep`,
  `C.coralSoft`, `C.peach`) — 1:1 / primary intimacy + CTAs.
- Groups & moms shared-ground: sage (`C.sage`, `C.sageDark`) — community.
- Premium/highlight accents: saffron (`C.saffron`) — used sparingly.
- Headlines `Fraunces`, UI `Albert Sans`. No hardcoded hex — `C.tokenName` only.
- Layout for 375×740 inside `PhoneFrame`.

## Out of scope / follow-ups

- The relevance/matching algorithm (fills in `rankActivities`).
- Promoted-event sponsorship surface (the `promoted` flag is reserved now).
- Persisting filter selection across sessions.
- Deleting the retired `ThisWeekTab.jsx` file.
