# VillagePreview onboarding — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/screens/onboarding/VillagePreview.jsx` (new). Step 3 of 4 — sits between `AboutYou` and `Account`.

## Problem

The old onboarding ended with a `Summary` screen counting how many moms / events matched. It showed numbers, not value. The GoMama Expo prototype shows the *actual product* — three sections of curated photo cards (Mom Matches, Group Meetups, Activities for kids) — before the account paywall. Seeing real cards drives signup.

## Goals

1. Show three sections of bookmarkable preview cards just before the account-creation screen.
2. Let the user save items pre-account; saved ids land in `App.jsx`'s `savedItems` state and surface in the Favorites tab post-signup.
3. Coral CTA at the bottom: "Unlock my village" — sets the expectation that the account is what unlocks the rest.

## Non-goals

- Real matching against the user's AboutYou inputs. The preview cards are hand-curated mocks (3 + 3 + 3 = 9 items) to keep the visual consistent. Real personalization happens post-signup.
- Pagination / horizontal scroll. All 9 cards fit on the screen with vertical scroll.

## Layout

```
[Back button]   • ── • • •      [empty]
                step 3/4

H1 — "Here's your village" (Fraunces 26 navy; italic-coral "your village")
Subtitle — "Top picks curated for you."

Section "YOUR PEOPLE" → "Mom Matches"
  [photo card]  Sarah M.   Working mom · toddler (2)     0.4 mi · 92% match    [bookmark]
  [photo card]  Maya R.    New to Tampa · 1yo            0.7 mi · 89% match    [bookmark]
  [photo card]  Jess T.    Stay-at-home · twins (3)      1.1 mi · 87% match    [bookmark]

Section "MEET NEARBY" → "Group Meetups"
  [photo card]  Toddler & Coffee Club   6 moms · kids 1–3   Sat 10am · 0.8 mi
  [photo card]  Park Picnic Sundays     Open to all          Sun 11am · 0.5 mi
  [photo card]  Stroller Walk Crew      Riverwalk · 5 moms   Sat 8am · 0.3 mi

Section "THIS WEEK" → "Activities for your kids"
  [photo card]  Little Sprouts Music   Drop-in · sliding scale   Tue/Thu · 0.6 mi
  [photo card]  Splash & Story Hour    Free at library            Sat 11am · 0.9 mi
  [photo card]  Bay Area Swim Club     Parent + me classes        Wed 10am · 0.8 mi

[Coral gradient CTA]
♥ Unlock my village
```

## PhotoCard

```
[88×88 image]   Title (Albert Sans 13 navy 700)
                Sub   (Albert Sans 10.5 muted)
                📍 meta (Albert Sans 9.5 navySoft 600)
                                                    [bookmark icon top-right]
```

Bookmark icon flips fill state and writes to `savedItems` via the `setSavedItems` prop from `App.jsx`.

## Data

Items are inline-defined in the file (`PREVIEW_DATA` constant). Ids are `m1…m3`, `g1…g3`, `a1…a3`. The FavoritesTab tries to resolve ids back to real `SUGGESTED_EVENTS`, `PLACES`, or `SAMPLE_MOMS` entries; the preview ids deliberately don't match, so saving from the preview is currently visual-only. Resolving preview saves to first-class items is a follow-up (see `.claude/context/todo.md`).

## CTA

"Unlock my village" → `advance(1, {})` → `Account` screen. No additional patch — the data was already captured in AboutYou.

## Risks

- **Preview-vs-reality gap.** The preview cards are intentionally aspirational. If the user signs up and finds nothing like them in their actual Meetups feed, that's a bait-and-switch. Mitigation: keep the seeded `SAMPLE_MOMS` and `SUGGESTED_EVENTS` data similarly warm; expand `MOM_POOL` as the user base grows so real Tampa moms appear close to preview density.
- **Hotlinked Unsplash images.** Same caveat as Landing — move to hosted assets before launch.

## Testing

- Bookmark toggle on each card flips icon fill and updates `savedItems`.
- Unlock CTA advances to Account screen.
- Coming back from Account preserves the bookmark state.
