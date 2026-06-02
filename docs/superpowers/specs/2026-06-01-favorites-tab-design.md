# Favorites tab — design

**Date:** 2026-06-01
**Status:** Landed (initial)
**Surface:** `src/screens/MainApp/FavoritesTab.jsx` (new). New top-level state: `savedItems` in `App.jsx`.

## Problem

The GoMama Expo prototype has a Favorites tab — the third of four — that lists everything the user has bookmarked (meetups, places, moms). Saving an item is a tap on a bookmark icon anywhere in the app. The current Go Mama web app has no equivalent.

## Goals

1. Add Favorites as the 3rd tab.
2. Read `savedItems: string[]` from `App.jsx` and render a card per saved id, resolving each id to its underlying record.
3. Provide an unsave action per row.
4. Show an empty-state CTA when nothing is saved.

## Non-goals (deferred)

- **Bookmark buttons everywhere.** Currently only `VillagePreview` writes to `savedItems`. Wiring bookmarks into `MatchCardFull`, `GroupCardFull`, and `PlacesTab` is on the TODO list (`.claude/context/todo.md` item 1).
- **Persistence.** `savedItems` is client-state only; restarts wipe it.

## Data model

```
savedItems: string[]   // ids of saved items
```

Each id is resolved by `FavoritesTab` against three data sources, in order:

1. `SUGGESTED_EVENTS.find(e => e.id === id)` — group meetups
2. `findPlace(id)` — places (across all categories)
3. `SAMPLE_MOMS.find(m => m.id === Number(id) || …)` — moms

Items that don't resolve are silently filtered (graceful degradation for stale ids).

## Layout

```
[Top bar — Fraunces 26 navy "Favorites" + muted "N saved"]

[List of saved cards]
  [88×88 image]   Title           [bookmark filled - coralDeep]
                  Sub
                  📍 meta

(or empty state)
  [Bookmark icon 32px line color]
  Nothing saved yet
  Tap the bookmark on any card to save it here.
```

## Component shape

```jsx
<FavoritesTab
  savedItems={savedItems}
  setSavedItems={setSavedItems}
/>
```

`setSavedItems` is the standard React setter; `unsave(id)` calls `setSavedItems(prev => prev.filter(x => x !== id))`.

## Risks

- **Stale ids.** If a SAMPLE_MOMS or SUGGESTED_EVENTS entry is removed, saved references to it silently disappear. Mitigation: the filter behavior is intentional; no error UI needed for a prototype.
- **Mixed-id-format collisions.** SAMPLE_MOMS uses numeric ids (`1, 2, 3`), SUGGESTED_EVENTS uses string ids (`e-stroller-run`), PLACES uses string ids (`buddy-brew`). The resolver tries each in turn; collisions would be a problem in production but not in current seeded data.

## Testing

- VillagePreview bookmark → switch to Favorites → see empty state (preview ids deliberately don't resolve to real data yet).
- Manually add a SAMPLE_MOM id to `savedItems` via React DevTools → see the row render with a real photo.
- Unsave → row disappears, list count updates.
