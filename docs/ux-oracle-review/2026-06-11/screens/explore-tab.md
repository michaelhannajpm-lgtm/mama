# Explore Tab (LocalPicksTab) — `src/screens/MainApp/index.jsx` tab id `localpicks`

- **File:** `src/screens/MainApp/LocalPicksTab.jsx` (1437 lines)
- **Purpose:** Places, events, programs, schools, and health discovery. Main scroll shows three pinned sections (Events, Trending group chats, Top local picks) plus a Browse-by-category 2×3 grid. SeeAllSheet exposes all six categories (Events, Meetups, Top places, Kids programs, Schools & childcare, Health & wellness) with per-section quick-filter chips and a Plus-gated advanced filter drawer.
- **Entry / when shown:** Active when `tab === 'localpicks'` in `MainApp/index.jsx`.
- **Related components/sheets:** `EventCard`, `PhotoCard`, `ProgramCard`, `SchoolCard`, `CategoryCard`, `GroupChatCard`, `LpCardSkeleton`, `SectionSkeleton`, `GoingButton`, `SaveBadge`, `RateButton`, `SeeAllSheet`, `PlacesFilterSheet`, `PlaceDetailSheet`, `EventDetailSheet`, `GroupDiscussionSheet`, `ShareSheet`, `RateSheet`.
- **Data dependencies:** `places` / `placesLoading` (live, `/api/places`); `events` + `thisWeek` / `eventsLoading` (live, `/api/events`). `TRENDING_GROUPS` is derived from the static `GROUP_DISCUSSIONS` import (`src/data/discussions.js`). Category browse grid uses fully hardcoded `CATEGORIES` array with hardcoded hex colors.

## Current state (wireframe)

```
┌─────────────────────────────────┐
│  Explore                        │  ← 32px Fraunces headline
│  ┌──────────────────────────┐   │
│  │ 🔍 Search events, meetups │   │  ← full-width search bar
│  └──────────────────────────┘   │
│                                 │
│  Browse by category             │  ← Fraunces 16px
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Events│ │Meet- │ │Kids  │   │  ← 2×3 CategoryCard grid
│  │      │ │ups   │ │Act.  │   │    icons hardcoded hex
│  ├──────┤ ├──────┤ ├──────┤   │
│  │School│ │Well- │ │Fun & │   │
│  │ &    │ │ness  │ │Ent.  │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  [3 SectionSkeletons while loading]  │
│                                 │
│  Popular right now   See all >  │
│  ┌───────┐ ┌───────┐           │  ← EventCard horizontal scroll, 45% width
│  │ 96px  │ │ 96px  │  ···      │
│  │ photo │ │ photo │           │
│  │ title │ │ title │           │
│  │ when  │ │ when  │           │
│  │ going │ │ going │           │
│  └───────┘ └───────┘           │
│                                 │
│  Trending group chats See all > │
│  ┌──────────┐ ┌──────────┐     │  ← GroupChatCard horizontal scroll (static)
│  │ [icon]   │ │ [icon]   │     │
│  │ Title    │ │ Title    │     │
│  │ members  │ │ members  │     │
│  └──────────┘ └──────────┘     │
│                                 │
│  Top local picks    See all >   │
│  ┌───────┐ ┌───────┐           │  ← PhotoCard horizontal scroll, 45% width
│  │ 96px  │ │ 96px  │  ···      │
│  │ photo │ │ photo │           │
│  │ title │ │ title │           │
│  │ star  │ │ star  │           │
│  └───────┘ └───────┘           │
└─────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|-----------------------|----------------|
| 1 | Hardcoded hex | **High** | The `CATEGORIES` array (`LocalPicksTab.jsx:797–804`) contains six hardcoded hex color values for category icons: `#E96B7D` (coral — OK but should be `C.coral`), `#8E63CC` (purple — no token), `#F09142` (orange — no token), `#4A8A7A` (teal — no token), `#D6446A` (coral deep, should be `C.coralDeep`), `#D9A441` (saffron, should be `C.saffron`). All six bypass the design-token system. If the palette changes these icons will not update. | Map each category to a semantic token: Events → `C.coral`, Meetups → `C.sageDark` (community), Kids Activities → `C.saffron` (highlight), Schools → `C.sageDark`, Health → `C.coralDeep`, Fun/Entertainment → `C.saffron`. Replace raw hex in the `CATEGORIES` array. |
| 2 | Loading contract | **High** | "Trending group chats" has no loading skeleton. The section is fully conditioned on `!(placesLoading \|\| eventsLoading)` (`LocalPicksTab.jsx:1197`), so it vanishes entirely during the loading phase. Because `TRENDING_GROUPS` is derived from a static import (not an API call) it will always resolve immediately — but the section still pops in after the skeleton phase ends, causing a late layout shift below the events and places sections. | Render the GroupChatCard row unconditionally (it is static data, always available). Remove it from the `!(placesLoading \|\| eventsLoading)` guard. Optionally add a `GroupChatCardSkeleton` for future API hydration. |
| 3 | Loading contract | **High** | When both `eventsItems` and `placesItems` are empty and not loading, the entire content area below the Browse grid shows only a single centered text line (`LocalPicksTab.jsx:1236–1248`). The section headers ("Popular right now", "Top local picks") disappear, so the user sees the Browse grid jump directly to empty text with no stable frame. The spec requires headers/containers to remain visible. | Render the section heads and a warm bordered empty card for each section that has no data. "Popular right now — no local events yet · check back soon or browse a category above." |
| 4 | Semantic color | **Medium** | `GoingButton` (`LocalPicksTab.jsx:203–219`) shows an "I'm going" RSVP in coral (`linear-gradient(135deg, C.coral, C.coralDeep)`) and flips to sage once tapped. For events and group meetups (community actions) the un-tapped CTA should already be sage, not coral. Coral signals 1:1 intimacy; the community/event RSVP is a sage moment. The tapped "Going" state correctly uses sage — only the un-tapped state is mis-colored. | Change the un-tapped `GoingButton` background from `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` to `linear-gradient(135deg, ${C.sage}, ${C.sageDark})` (or a solid `C.sageDark`), and use white text on the darker sage. |
| 5 | Hardcoded hex | **Medium** | `EventCard`, `PhotoCard`, `ProgramCard`, `SchoolCard` all use `background: '#fff'` for the card surface (`LocalPicksTab.jsx:248, 294, 343, 391`). Should be `C.paper`. The `LpCardSkeleton` also uses `background: '#fff'` (`LocalPicksTab.jsx:145`). | Replace `'#fff'` card surface backgrounds with `C.paper`. |
| 6 | Three-state contract | **Medium** | The SeeAll sheet for Events and Meetups sections includes inline `GoingButton` which fires `toggleGoing` → `requireVerify`. However if `eventsItems` is empty (e.g. no live events and not loading), the SeeAllSheet is opened with zero items, producing a blank interior with only a close affordance. There is no per-section empty state inside the SeeAllSheet. (`LocalPicksTab.jsx:1252–1318`) | Pass an `emptyState` prop to `SeeAllSheet` for each section. Events: "No events near you this week — check back soon." Meetups: "No meetups yet — create one from the Connect tab." |
| 7 | Content clarity | **Medium** | The Explore tab renders a large `Explore` headline (32px Fraunces) that duplicates the tab label already shown in the MainApp shell header. On a 375-wide phone this consumes ~40px of precious above-the-fold space before any content. (`LocalPicksTab.jsx:1114–1121`) | Remove the redundant inline title. The MainApp header already labels the tab. The search bar should be the first element, which is a stronger entry point than a repeated heading. |
| 8 | Filter discoverability | **Medium** | The advanced filter for places (Plus-gated) is reachable only from inside the SeeAllSheet via a button there. There is no visible "Filters" affordance on the main Explore scroll. The Browse-by-category grid is the only discovery path for the full catalog. A mom unfamiliar with the SeeAll pattern may not discover advanced filters exist. (`LocalPicksTab.jsx:937–940`) | Add a compact filter row below the search bar on the main scroll: `[Filters ▼] [This week] [Free] [Near me]` — the first opens `PlacesFilterSheet` (gated), the rest are quick chips. |
| 9 | Accessibility | **Medium** | `EventCard` (`LocalPicksTab.jsx:246–290`), `PhotoCard` (`LocalPicksTab.jsx:292–336`), and `SchoolCard` (`LocalPicksTab.jsx:389–441`) all use `alt=""` on their hero images. For a place card or event card, the image carries contextual meaning (what the place looks like, what the event is). A blank alt leaves screen-reader users with no context. | Set `alt={item.title}` on all place/event card hero images. |
| 10 | Mobile ergonomics | **Low** | The horizontal scroll rails (events, top places) use `flex: '0 0 45%'` cards, showing 2.2 cards per view. On a 375px phone the peek is ~17px, which is barely enough to signal scrollability. On a 320px device (iPhone SE 1st gen) the peek is negative — the second card is fully hidden. (`LocalPicksTab.jsx:1185`) | Use `flex: '0 0 43%'` to widen the peek to at least 24px at 375px, and clamp with `min-width: 140px` so the card never gets too narrow on small screens. |
| 11 | Content clarity | **Low** | The `CATEGORIES` grid label for `places` is "Fun & Entertainment" (`LocalPicksTab.jsx:803`) but the `SECTIONS` heading for the same data is "Top local picks" (`LocalPicksTab.jsx:48`). The label changes between the category grid tap and the SeeAllSheet title — a mom taps "Fun & Entertainment" and the sheet heading reads "Top local picks". | Align the labels: use "Top picks & fun" in both CATEGORIES and SECTIONS, or "Fun & entertainment" in both. |

## Key issues (prose, ranked)

**1. Hardcoded hex in CATEGORIES array (High)** is the most systemic token violation in this file. Six out of six category icon colors bypass the `C` token system, including two that duplicate existing tokens (`#E96B7D` = `C.coral`, `#D6446A` = `C.coralDeep`, `#D9A441` = `C.saffron`) and three that introduce one-off colors with no semantic meaning (`#8E63CC`, `#F09142`, `#4A8A7A`). The purple for Meetups especially conflicts with the sage = community convention — meetups are community events and should read sage/green.

**2. Trending group chats pops in late (High)** because it is gated behind the same `!(placesLoading || eventsLoading)` guard as the live-data sections, even though `TRENDING_GROUPS` is static and always available. The browse grid → skeleton → pop-in-group-chats sequence creates an unexpected structural jump. Static sections should render immediately; only live-data sections should skeleton.

**3. GoingButton coral semantic error (Medium)** is a direct violation of the palette rulebook: coral = 1:1 intimacy, sage = community. RSVPing to a group event is a community action. The current coral "I'm going" button sends the signal that this is a one-on-one moment. The tapped sage state is correct — the pre-tap state needs to match.

**4. Content clarity: redundant tab-level headline (Medium)** wastes ~40px of above-the-fold space on a phone. Every pixel above the fold is conversion real estate; the "Explore" heading below the MainApp shell header is pure redundancy. Removing it lets the search bar — which has clear utility — land higher.

## Recommended redesign

```
┌─────────────────────────────────┐
│  ┌──────────────────────────┐   │  ← Search bar at top (no redundant heading)
│  │ 🔍 Search …               │   │
│  └──────────────────────────┘   │
│  [Filters ▼] [This week] [Free] │  ← quick filter row, Filters gated
│                                 │
│  Browse by category             │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │Events│ │Meet- │ │Kids  │   │  ← coral / sage / saffron tokens
│  │coral │ │sage  │ │saff. │   │
│  ├──────┤ ├──────┤ ├──────┤   │
│  │School│ │Well- │ │Fun & │   │
│  │sage  │ │coral │ │saff. │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  Trending group chats See all > │  ← always visible (static data)
│  ┌──────────┐ ┌──────────┐     │
│  │ [sage]   │ │ [sage]   │     │  ← all group icons in sage
│  └──────────┘ └──────────┘     │
│                                 │
│  Popular right now   See all >  │
│  [skeletons while loading]      │
│  [EventCards with sage RSVP btn]│
│  [empty: warm card]             │
│                                 │
│  Top local picks    See all >   │
│  [skeletons while loading]      │
│  [PhotoCards]                   │
│  [empty: warm card]             │
└─────────────────────────────────┘
```

## Before / after comparison (what changes visually)

| Area | Before | After |
|------|--------|-------|
| "Explore" heading | 32px Fraunces title below header | Removed; search bar is the first element |
| Browse category colors | 6 hardcoded hex | Semantic tokens (coral / sage / saffron) |
| Meetups category color | `#8E63CC` purple | `C.sageDark` (community) |
| GoingButton (pre-tap) | Coral gradient | Sage gradient (community signal) |
| Trending groups visibility | Hidden during loading phase | Always visible (static) |
| Events/places empty state | Single muted text line; headers vanish | Section heads stay; warm bordered empty card per section |
| Card backgrounds | `'#fff'` literal | `C.paper` token |

## Implementation notes

- **CATEGORIES colors** (`LocalPicksTab.jsx:797–804`): Replace `color` values — Events: `C.coral`, Meetups: `C.sageDark`, Kids Activities: `C.saffron`, Schools: `C.sageDark`, Health: `C.coralDeep`, Fun: `C.saffron`. Also update `CategoryCard` to pass `color` directly as `color` prop (no `fillIcon` for sage icons; use `strokeWidth={2}` for outline icons).
- **Remove "Explore" heading** (`LocalPicksTab.jsx:1113–1121`): Delete the `<div className="px-5" style={{marginBottom:10}}>` block containing the Fraunces "Explore" heading.
- **Trending groups guard** (`LocalPicksTab.jsx:1197`): Move `TRENDING_GROUPS` render block outside the `!(placesLoading || eventsLoading)` condition. Render it immediately after the Browse-by-category grid, before the loading skeletons.
- **GoingButton** (`LocalPicksTab.jsx:210`): Change `background: going ? C.sage : linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` to `background: going ? C.sage : C.sageDark` (solid), `color: going ? C.sageDark : '#fff'`.
- **Card `'#fff'` backgrounds** (`LocalPicksTab.jsx:145, 248, 294, 343, 391`): Replace `background: '#fff'` with `background: C.paper`.
- **Empty states per section**: When `!(placesLoading || eventsLoading) && eventsItems.length === 0`, wrap in a bordered card: `<div style={{ border: '1px solid C.divider', borderRadius: 14, padding: '16px 14px', background: C.creamSoft, ...}}> <div style={{fontFamily:'Fraunces', fontSize:14, color:C.navy}}>No local events yet</div> <div style={{fontFamily:'Albert Sans', fontSize:12, color:C.muted, marginTop:4}}>Check back soon or browse a category above.</div> </div>`.

## Acceptance criteria

- [ ] No raw hex values appear in `CATEGORIES` array; all colors reference `C.*` tokens.
- [ ] Meetups category icon uses `C.sageDark` (community semantic).
- [ ] Redundant "Explore" heading (lines 1113–1121) is removed.
- [ ] "Trending group chats" renders regardless of `placesLoading`/`eventsLoading`.
- [ ] `GoingButton` pre-tap state uses sage, not coral.
- [ ] When `eventsItems.length === 0` (not loading), section head stays visible above a warm empty-state card.
- [ ] When `placesItems.length === 0` (not loading), section head stays visible above a warm empty-state card.
- [ ] All card `background: '#fff'` replaced with `C.paper`.
- [ ] `EventCard`, `PhotoCard`, `SchoolCard` hero images have `alt={item.title}`.
- [ ] Category grid label and SeeAllSheet title for the places section are consistent.
