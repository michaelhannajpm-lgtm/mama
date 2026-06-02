# Tampa-Bay area chips — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/screens/onboarding/AboutYou.jsx` — `TAMPA_AREAS` constant + horizontal chip row.

## Problem

The old `LocationStep` used a search-typeahead against a ~80-entry `NEIGHBORHOODS` list spanning multiple cities. The Go Mama Tampa launch is hyper-local — every active user is in the Tampa Bay area — so a multi-city typeahead is over-engineered. The GoMama Expo prototype uses a 5-chip Tampa-Bay region row instead.

## Goals

1. Surface 5 Tampa-Bay regions as horizontal-scroll chips on AboutYou.
2. Selection is single-pick (not multi-select).
3. Tapping a chip sets `location` to the chip label.

## Non-goals

- Removing `NEIGHBORHOODS` from `taxonomy.js`. Kept so a future non-Tampa rollout can pull from it.
- Geocoding. The chip label *is* the location value — no lat/lng pinning.
- Distance picking — defaults to null and is set later if needed.

## Chip list

```js
const TAMPA_AREAS = [
  'South Tampa 🌴',
  'North Tampa 🌳',
  'St. Petersburg 🏖️',
  'Clearwater 🌊',
  'SouthShore ☀️',
];
```

Emoji-suffixed labels — matches the GoMama Expo prototype.

## UI

```
SectionLabel "WHERE ARE YOU?"

[horizontal-scroll row, no scrollbar]
[South Tampa 🌴]  [North Tampa 🌳]  [St. Petersburg 🏖️]  [Clearwater 🌊]  [SouthShore ☀️]
```

Active chip: `coralSoft` background + `coralDeep` text + 1.3px `coral` border.
Inactive chip: white background + 1.3px `line` border + `navy` text.

## State

Tapping a chip:
1. Sets local `area` state (used by the AboutYou CTA-gate check).
2. Calls `setLocation(label)` — propagates to `App.jsx`'s `location` state.

## Risks

- **Geographic mismatch.** Users outside Tampa will see only Tampa options and either pick wrong or bounce. Mitigation: this is the Tampa launch cohort by design; expand later.
- **Emoji rendering.** Emoji fall back inconsistently on Windows / older Android. Verified at port time that the 5 chosen emoji render across Chrome / Safari / Firefox on macOS + iOS — acceptable for Tampa launch.

## Testing

- Tap a chip → coral state visible.
- Tap a different chip → only the new one is active.
- CTA at the bottom remains disabled if no chip is selected.
