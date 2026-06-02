# 4-tab MainApp — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/screens/MainApp/index.jsx` (rewritten). `CalendarTab.jsx` and `EventsTab.jsx` retained on disk but no longer routed.

## Problem

The old MainApp had 5 tabs: Matches · Calendar · Places · Events · Profile. The GoMama Expo prototype has 4: Meetups · Places · Favorites · Profile. The user wants to collapse to GoMama's structure.

## Goals

1. Reduce to 4 tabs. Each tab earns its slot.
2. Fold Events into Meetups (Moms/Groups toggle).
3. Fold Calendar into Profile (Upcoming section).
4. Add Favorites as the 3rd tab.
5. Keep the existing `MatchesTab` component — it already has the Moms/Groups toggle the new Meetups needs.

## Non-goals

- Renaming the file `MatchesTab.jsx` → `MeetupsTab.jsx`. Cosmetic; risks broken imports. The component is referred to as Meetups in the UI, MatchesTab in the filesystem.
- Removing `CalendarTab.jsx` / `EventsTab.jsx` from disk. Kept as historical reference; can be deleted in a later cleanup pass.

## Tab inventory

| Tab | Component | Icon | Notes |
|---|---|---|---|
| Meetups (default) | `MatchesTab` | `Users` | Moms/Groups toggle inside |
| Places | `PlacesTab` | `MapPin` | Unchanged |
| Favorites | `FavoritesTab` | `Heart` (fills when active) | New |
| Profile | `YouTab` | `User` | Folds verification + upcoming |

## Tab bar

```
[Users 20px]    [MapPin 20px]    [Heart 20px]    [User 20px]
Meetups          Places            Favorites        Profile
```

Active state:
- 2.5px coral accent bar above the icon
- Icon in `coralDeep` with thicker stroke
- Heart icon *fills* with coralDeep on the Favorites tab
- Label in `coralDeep` 700-weight

Inactive: `navySoft` icon, `navySoft` 600-weight label.

## State threading

The tab bar lives in `index.jsx`; tab state is a local `useState`. All other state comes from `App.jsx` via props:

```jsx
<MainApp
  profile setProfile prefs setPrefs location distance
  scheduled1to1 joinedEvents setJoinedEvents
  savedItems setSavedItems          // ← new
  openSchedule openProfile openMessage openPremium
  account requestAccount restart flash
/>
```

Each tab gets a subset relevant to it. Tabs can navigate to each other via injected callbacks (e.g. YouTab's empty-state CTA calls `goToMeetups`).

## Risks

- **Discoverability of Calendar.** Users used to a separate Calendar tab won't immediately find their scheduled meetups under Profile. Mitigation: the YouTab "Upcoming" section is the second card from the top — high prominence.
- **Meetups label collision.** Internally the component is `MatchesTab`. Future maintainers may search for `MeetupsTab.jsx` and get confused. The file-layout doc + this spec call out the mapping.

## Testing

- Each tab renders without errors.
- Active-tab visual state matches the GoMama prototype (heart fills only on Favorites).
- Tab switching is instant — all tabs are simultaneously mounted? No — they're conditionally rendered. State is preserved at App level.
