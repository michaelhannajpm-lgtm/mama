# HomeTab — place-anchored home feed

- **File:** `src/screens/MainApp/HomeTab.jsx` (886 lines)
- **Purpose:** Editorial landing feed for signed-in moms. Renders a location selector, optional profile-completion banner, and up to seven content rails: Local Events Nearby, Moms You May Want To Meet, Upcoming Meetups, Based On Your Child's Age, Continue Planning, Feature This Week, and Your Saved Spots.
- **Entry / when shown:** Active when `tab === 'home'` inside `MainApp`. The first thing a mom sees after onboarding.
- **Related components/sheets:** `Skeleton`, `PresenceDot`, `EventDetailSheet`, `PlaceDetailSheet`, `MomDetailSheet`, `ShareSheet`. Internal card components: `MeetupCard`, `MomMeetCard`, `AgeProgramCard`, `ContinuePlanTile`, `LocalFavoriteCard`.
- **Data dependencies:** `events`/`thisWeek`/`eventsLoading` (live from `/api/events`), `places`/`placesLoading` (live from `/api/places` — `placesLoading` prop NOT received), `nearbyMoms`/`nearbyLoading` (live from `/api/mom-profiles/nearby`), `localFavorite` (live from `/api/local-favorite`). Ranking via `bucketActivities`, `rankEvents`, `buildAgeRail`, `pickTrendingPlaces`.

---

## Current state (wireframe)

```
┌─────────────────────────────────────┐
│  [📍 Tampa, FL               ⌄]     │  ← location pill-button, tappable
│                                     │
│  [Complete your profile   72% >]    │  ← only when pct < 100; coral progress bar
│  [░░░░░░░░░░░░░░░░░░░░░░░░░]        │
│                                     │
│  Local Events Nearby         See all│
│  ┌──────┐ ┌──────┐ ┌──────┐        │  ← horiz scroll; 3 MeetupCards (w:168)
│  │ img  │ │ img  │ │ img  │        │    or 3 MeetupCardSkeletons while loading
│  │      │ │      │ │      │        │    or RailEmpty if none
│  │Title │ │Title │ │Title │        │
│  │date  │ │date  │ │date  │        │
│  │N going│ │…    │ │…     │        │
│  └──────┘ └──────┘ └──────┘        │
│                                     │
│  Moms You May Want To Meet   See all│
│  ┌────┐ ┌────┐ ┌────┐              │  ← 3-col grid; MomMeetCards or skeletons
│  │ 🟤 │ │ 🟤 │ │ 🟤 │              │    or "Your village is forming" empty card
│  │Name│ │Name│ │Name│              │
│  │sub │ │sub │ │sub │              │
│  │dist│ │dist│ │dist│              │
│  └────┘ └────┘ └────┘              │
│                                     │
│  Upcoming Meetups            See all│
│  ┌──────┐ ┌──────┐ ┌──────┐        │  ← horiz scroll; same MeetupCard shape
│  │ img  │ │ …    │ │ …    │        │    uses eventsLoading (shares flag with
│  └──────┘ └──────┘ └──────┘        │    Local Events)
│                                     │
│  Based On Your Child's Age  See all │  ← only when ageKids.length > 0 AND
│  [All][Child A][Child B]            │    ageRailAll.length > 0
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ img  │ │ img  │ │ img  │        │  ← AgeProgramCard (w:142)
│  └──────┘ └──────┘ └──────┘        │
│                                     │
│  Continue Planning                  │  ← only when CONTINUE.length > 0
│  ┌──────────┐ ┌──────────┐         │
│  │[icon] name│ │[icon] name│        │  ← 2-col grid ContinuePlanTile
│  └──────────┘ └──────────┘         │
│                                     │
│  Feature this week                  │  ← only when favoriteCard !== null
│  ┌──────────────────────────┐       │
│  │ [img 108px] Name         │       │  ← LocalFavoriteCard, full-width
│  │            ★ 4.5 (N)     │       │
│  │            [Learn More >]│       │
│  └──────────────────────────┘       │
│                                     │
│  Your saved spots    My Village     │  ← only when savedItems.length > 0
│  ┌──────────────────────────┐       │
│  │[🔖] N saved items         >│      │
│  └──────────────────────────┘       │
└─────────────────────────────────────┘
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Three-state loading contract — `placesLoading` missing | High | `HomeTab` receives no `placesLoading` prop (line 391–404, prop list). The `places` prop feeds `buildAgeRail` (line 464), `pickTrendingPlaces` (line 497), and the `resolveContinue` pool (line 477). When `places` is `null` (initial load), `ageRailAll` is empty so the age rail hides; `favoriteCard` falls back to `liveTrending[0]` which is also empty — but with no skeleton. Both sections silently disappear during loading instead of showing a skeleton. The three-state contract (skeleton → data → empty) is broken for the Age Rail and Feature This Week sections. | Add `placesLoading = false` to `HomeTab`'s props (line 391). Pass a skeleton for the Age Rail and a `LocalFavoriteSkeleton` when `placesLoading` is true. Wire `placesLoading` from `MainApp/index.jsx:236`. |
| 2 | Three-state loading contract — Age Rail vanishes during load | High | The "Based On Your Child's Age" section is wrapped in `{ageKids.length > 0 && ageRailAll.length > 0 && (…)}` (line 693). While `places` is loading, `ageRailAll` is empty, so the entire section — including its `SectionHead` header — disappears. The header must be visible across all three states (spec rule). | Show the `SectionHead` unconditionally when the user has kids, and show an age-rail skeleton row (`[0,1,2].map(i => <AgeProgramCardSkeleton key={i}/>)`) while `placesLoading`. |
| 3 | Three-state loading contract — Feature This Week has no skeleton | High | `favoriteCard` is `null` when `localFavorite` hasn't loaded and no `liveTrending` exists. The section — including its `SectionHead` — is hidden during load (line 745: `{favoriteCard && (…)}`). There is no `localFavoriteLoading` prop or skeleton for this section. | Add a `localFavoriteLoading` prop (also missing from the prop list), show a skeleton card matching `LocalFavoriteCard`'s 108px-tall footprint while loading. Keep the `SectionHead` visible. |
| 4 | Color — hardcoded hex in `MomMeetCard` avatar fallback | Medium | `MomMeetCard` fallback gradient: `background: \`linear-gradient(135deg, ${C.coral}, ${C.coralDeep})\`` — these use tokens, so this is actually fine. However `MeetupCard` fallback gradient at line 201 uses `C.saffron` alongside `C.coral`: `linear-gradient(135deg, ${C.coral}, ${C.saffron})`. Using coral (1:1 intimacy) and saffron (premium) together on a meetup card crosses the semantic palette — a meetup is a community event, not an intimate 1:1 or a premium feature. The fallback should use sage tones. | Change `MeetupCard` fallback (line 201) to `background: \`linear-gradient(135deg, ${C.sage}, ${C.sageDark})\`` or a neutral `C.divider`/`C.skeleton` for a placeholder. |
| 5 | Color — hardcoded hex in `ContinuePlanTile` | High | `CONTINUE_TYPE_META` at lines 291–294 uses literal hex for `place` and `program` types: `bg: '#D6E6F4', fg: '#2F6DA8'` (place) and `bg: '#FBE2C7', fg: '#B36A1D'` (program). These are not in the `C` token set and violate the "never hardcode hex" rule. | Either add `C.placeChip`/`C.placeChipText` and `C.programChip`/`C.programChipText` tokens to `theme.js`, or remap to existing tokens: place → `C.sage`/`C.sageDark`, program → `C.peach`/`C.saffron`. |
| 6 | Color — hardcoded hex in `MomMeetCard` and skeletons | Medium | `MomMeetCardSkeleton` (line 68), `MeetupCardSkeleton` (line 55), and card containers use `background: '#fff'` rather than `C.paper`. Four occurrences at lines 55, 68, 82, 139, 192 — all literal `'#fff'`. Also `RailEmpty` at line 83 uses `background: '#fff'`. | Replace all `'#fff'` with `C.paper`. |
| 7 | Visual hierarchy — single "one message" per screen | Medium | HomeTab shows up to 7 section headers in a single scroll. The page does not have a single unifying message — it is a feed of equally-weighted sections with identical `SectionHead` treatment (Fraunces 17px bold, all navy). A tired mom scanning quickly cannot identify the one thing Go Mama wants her to do. The top of the fold (below the location row and profile banner) should have a clear primary signal. | Give the first content section ("Moms You May Want To Meet") a distinct visual promotion: bring it above the Events rail, or give it a greeting text/headline so the first thing she sees is a mom connection, not a generic events list. This aligns with the brand positioning (friend-finding, not event-discovery). |
| 8 | Perceived performance — two rails share one loading flag | Medium | Both "Local Events Nearby" (line 637) and "Upcoming Meetups" (line 683) drive their skeleton vs. data state from the same `eventsLoading` flag. When events load, both rails snap in simultaneously. This is correct, but if events arrive partially (e.g., `thisWeek` resolves before `events`), a more granular flag would allow the first rail to show data while the second still skeletons. Minor but worth noting. | Low-priority improvement: split `eventsLoading` into `thisWeekLoading` + `eventsLoading` when the fetch architecture supports it. Not critical now. |
| 9 | Perceived performance — age child filter jumps content | Medium | Switching the age-child chip filter (line 704) re-filters `ageRail` in-place, which can shrink the horizontal rail. If the user has scrolled the rail and then taps a filter, the remaining cards jump. No transition or min-height guards against this. | Add `style={{ minHeight: 100 }}` to the rail container at line 720, or animate the transition. |
| 10 | Accessibility — images have empty `alt` | High | Every `<img>` in `MomMeetCard` (line 151), `MeetupCard` (line 200), `AgeProgramCard` (lines 253), `LocalFavoriteCard` (no img — uses `background-image` via inline style, which is correct), all use `alt=""`. While empty `alt` on decorative images is technically valid (it removes the image from the accessibility tree), these images are the primary content identifier for a mom's face, an event photo, and a program thumbnail. They carry meaning and should have descriptive `alt` text derived from the item's `name`/`title`. | Change `alt=""` to `alt={item.name}` / `alt={item.title}` / `alt={item.firstName || item.name}` in all card image tags. |
| 11 | Accessibility — interactive cards are `<button>` inside a scroll | Low | `MomMeetCard`, `MeetupCard`, and `AgeProgramCard` are `<button>` elements. This is correct. However none have `aria-label` to distinguish cards with identical "Name" patterns at small sizes. A screen reader would announce raw text content which may be truncated (line 218 uses `-webkit-line-clamp: 1`). | Add `aria-label` to each card button combining type + name, e.g., `aria-label={\`${item.firstName}, ${distance}\`}` for `MomMeetCard`. |
| 12 | Content clarity — "Feature this week" section title | Low | The section title "Feature this week" (line 747) is lowercase-f with no personalization. Compare with "Moms You May Want To Meet" (title-case, personal) and "Local Events Nearby" (title-case). Inconsistent casing. Also "Feature this week" is vague — "This Week's Pick" or "Go Mama Pick" is more editorial and mirrors the `local-favorite` concept. | Rename to "This Week's Pick" and ensure consistent title-case across all `SectionHead` calls. |
| 13 | Content clarity — "Continue Planning" empty-guard | Low | The "Continue Planning" section is hidden when `CONTINUE.length === 0` (line 732). This is correct. However the "Your saved spots" section (line 766) overlaps in intent — it also surfaces saved items. A user with saved items sees both sections. "Your saved spots" at line 767 links to `openVillage`, and "Continue Planning" routes to the relevant tab. This duplication is minor but adds scroll length. | Consider merging: "Continue Planning" tiles can include the "My Village" link as the last tile. Remove "Your saved spots" section or demote it to a footer link. |
| 14 | Interaction states — location button lacks visual affordance on load | Low | The location button at line 570 defaults to the `locationLabel` prop or `"${city}, FL"`. On first load before `locationGeo` resolves, it may show "Your current location, FL" (the fallback concatenation). The `locationLabel` prop from `MainApp` already guards this with `|| 'Your current location'` — but the trailing `|| \`${city || 'Tampa'}, FL\`` at line 591 inside `HomeTab` would fire before `locationLabel` is evaluated if `locationLabel` is falsy. | The location label expression at line 591 in `HomeTab` is safe because `locationLabel` is the primary expression; the internal fallback only fires when `locationLabel` is `undefined`. No code change needed, but add a comment clarifying precedence. |
| 15 | Mobile ergonomics — profile-complete card always on top | Medium | The profile-completion card (lines 598–629) appears immediately below the location row, before any content. If a user is 99% complete (one tiny step left) it still dominates the top of the feed and delays the first content impression by ~80px. A mom who sees this every session will tune it out (banner blindness). | Show the card only when `completion.pct < 80` (below a meaningful threshold), or collapse it to a slim 36px banner after the first dismissal. |

---

## Key issues (prose, ranked)

**1. `placesLoading` prop is missing — three-state contract broken for Age Rail and Feature This Week (High, #1, #2, #3).** `HomeTab` has no `placesLoading` prop, yet two sections depend entirely on `places` data: the Age Rail and the Featured Card. Both silently vanish during the load window — their headers disappear, their skeletons are absent, and they reappear only after `places` resolves. This violates the project's mandatory three-state contract (spec: "header/container always visible"). Fix: add `placesLoading` to props, show skeletons and a visible header during load.

**2. Hardcoded hex values in `ContinuePlanTile` and across card components (High, #5, #6).** `CONTINUE_TYPE_META` at line 291 uses `'#D6E6F4'`, `'#2F6DA8'`, `'#FBE2C7'`, `'#B36A1D'` — none of which are in `C`. Multiple card containers also use `'#fff'` instead of `C.paper`. This is a design-system contract violation flagged as Critical by the audit spec ("Flag any literal hex in JSX as a finding"). The `ContinuePlanTile` finding is High severity because those hardcoded values can't be updated from `theme.js` and are invisible to the design token audit.

**3. All card images have `alt=""` — meaningful images stripped from the accessibility tree (High, #10).** A mom's photo, an event photo, and a program thumbnail all use empty `alt`. For decorative chrome this is correct; for content-identifying images it silences the accessibility tree entirely. A VoiceOver user navigating the "Moms You May Want To Meet" rail hears nothing about who she's looking at. Add `alt={item.firstName}`, `alt={item.title}`, etc. to all card images.

---

## Recommended redesign (annotated wireframe)

```
┌─────────────────────────────────────┐
│  [📍 Tampa, FL               ⌄]     │
│                                     │
│  [──Complete profile 72%──────── >] │  ← only when pct < 80
│                                     │
│  Moms You May Want To Meet   See all│  ← PROMOTED to first content position
│  ┌────┐ ┌────┐ ┌────┐              │  ← 3 MomMeetCards (alt={item.firstName})
│  │ 🟤 │ │ 🟤 │ │ 🟤 │              │
│  └────┘ └────┘ └────┘              │
│                                     │
│  Local Events Nearby         See all│
│  ┌──────┐ ┌──────┐ ┌──────┐        │  ← eventsLoading: 3 skeletons
│  │ img  │ │ img  │ │ img  │        │    (alt={item.title} on real imgs)
│  └──────┘ └──────┘ └──────┘        │    fallback: sage gradient, not coral+saffron
│                                     │
│  Upcoming Meetups            See all│
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │      │ │      │ │      │        │
│  └──────┘ └──────┘ └──────┘        │
│                                     │
│  Based On Your Child's Age  See all │  ← SectionHead always shown if user has kids
│  [All][Child A][Child B]            │    placesLoading: 3 AgeProgramCardSkeletons
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │      │ │      │ │      │        │
│  └──────┘ └──────┘ └──────┘        │
│                                     │
│  This Week's Pick                   │  ← renamed; SectionHead always visible
│  ┌──────────────────────────┐       │    placesLoading / localFavoriteLoading:
│  │ [skeleton 108px × full ] │       │    LocalFavoriteSkeleton
│  └──────────────────────────┘       │
│                                     │
│  Continue Planning                  │  ← merged "Your saved spots" into this
│  ┌──────────┐ ┌──────────┐         │    or link to Village as last tile
│  │[icon] …  │ │[icon] …  │         │
│  └──────────┘ └──────────┘         │
└─────────────────────────────────────┘

Token fixes:
  - All '#fff' → C.paper
  - ContinuePlanTile place: C.sage / C.sageDark
  - ContinuePlanTile program: C.peach / C.saffron
  - MeetupCard fallback: C.sage / C.sageDark gradient
  - All card img alt="" → descriptive alt text
```

---

## Before / after comparison (what changes visually)

| Element | Before | After |
|---------|--------|-------|
| First content section | Local Events Nearby | Moms You May Want To Meet |
| Profile-complete banner | Always shown when pct < 100 | Only shown when pct < 80 |
| Age Rail during places load | Section disappears | `SectionHead` visible + skeleton row |
| Feature This Week during load | Section disappears | `SectionHead` visible + `LocalFavoriteSkeleton` |
| MeetupCard fallback gradient | `coral → saffron` | `sage → sageDark` (community semantic) |
| ContinuePlanTile place color | `#D6E6F4` / `#2F6DA8` | `C.sage` / `C.sageDark` |
| ContinuePlanTile program color | `#FBE2C7` / `#B36A1D` | `C.peach` / `C.saffron` |
| Card container backgrounds | `'#fff'` literal | `C.paper` token |
| Card `<img>` alt | `alt=""` | `alt={item.firstName}` / `alt={item.title}` |
| Feature This Week section title | "Feature this week" | "This Week's Pick" |
| "Your saved spots" section | Separate section | Merged into Continue Planning or removed |

---

## Implementation notes

- `HomeTab.jsx:391` — add `placesLoading = false, localFavoriteLoading = false` to destructured props.
- `HomeTab.jsx:693` — change guard to `{ageKids.length > 0 && (<>…</>)}` and add `{placesLoading ? [0,1,2].map(i => <AgeProgramCardSkeleton key={i}/>) : ageRailAll.length > 0 ? (…) : <RailEmpty text="…"/>}` inside.
- `HomeTab.jsx:745` — change guard to always render `SectionHead` when `!localFavoriteLoading || favoriteCard`; show `<LocalFavoriteSkeleton/>` while `localFavoriteLoading && !favoriteCard`.
- `HomeTab.jsx:201` — change `C.saffron` to `C.sageDark` in `MeetupCard` fallback.
- `HomeTab.jsx:291–294` — replace hardcoded hex with `C` tokens (see above).
- `HomeTab.jsx:55, 68, 82, 83, 139, 192` — replace `'#fff'` with `C.paper`.
- `HomeTab.jsx:151, 200, 253` — add descriptive `alt` to all card `<img>` elements.
- `HomeTab.jsx:598` — change threshold from `pct < 100` to `pct < 80`.
- `MainApp/index.jsx:236` — add `placesLoading={placesLoading}` and `localFavoriteLoading={localFavoriteLoading}` to `<LocalPicksTab>` and `<HomeTab>` prop spreads (check `App.jsx` already threads `placesLoading`).

---

## Acceptance criteria

- [ ] `HomeTab` accepts `placesLoading` and `localFavoriteLoading` props.
- [ ] "Based On Your Child's Age" `SectionHead` is visible while `places` is loading (for users with kids); skeleton cards fill the rail.
- [ ] "This Week's Pick" (formerly "Feature this week") `SectionHead` is visible while loading; a skeleton matching `LocalFavoriteCard`'s footprint (≥108px tall, full width) fills the slot.
- [ ] `MeetupCard` fallback uses only `C` tokens (no coral+saffron combination).
- [ ] `ContinuePlanTile` `place` and `program` types use `C` tokens only.
- [ ] No `'#fff'` literal strings remain in the file; all replaced with `C.paper`.
- [ ] All card `<img>` elements have descriptive `alt` text (not empty string).
- [ ] Profile-completion card only shows when `completion.pct < 80`.
- [ ] "Moms You May Want To Meet" appears as the first content section below the location row.
