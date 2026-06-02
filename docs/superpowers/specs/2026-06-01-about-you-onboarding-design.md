# AboutYou onboarding — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/screens/onboarding/AboutYou.jsx` (new). Replaces `LocationStep` + `ProfileStep` + `ScheduleStep` + `PlacesStep` + `Summary` in the live routing.

## Problem

The old onboarding was an 8-step ladder: Splash → Welcome → LocationStep → ProfileStep → ScheduleStep → PlacesStep → Summary → Account → MainApp. Drop-off was high; the user couldn't see the value of completing it. The GoMama Expo prototype collapses everything pre-account into a single chip-picker screen called **AboutYou**.

## Goals

1. Capture, in one screen, the minimum we need to start matching:
   - Tampa-Bay area (chip row)
   - Kid ages (chip grid)
   - Mom type (chip grid)
   - Available days (day-letter circles)
   - Interests (chip wrap)
2. Show step dots (2 of 4) at the top to set expectation.
3. Persist into the existing `onboarding_profiles` table via `recordStep` — no schema migration.

## Non-goals

- Granular time windows (the old `TIME_WINDOWS` taxonomy stays in `taxonomy.js` for the matching algorithm, but onboarding now only captures *days*, not day×window pairs). The screen projects each selected day → one `${day}-morning` slot so existing matching logic keeps working.
- Place picking. The old `PlacesStep` is dropped from onboarding entirely; users pick places later in the `Places` tab.
- Distance picking. Defaults to `null` in onboarding; user can tighten later.

## Layout

```
[Back button]   • • ── •      [empty]
                   step 2/4

H1 — "Tell us about you" (Fraunces 26 navy; italic-coral "you")
Subtitle — "So we can match you with the right moms nearby."

SectionLabel "WHERE ARE YOU?"
[horizontal scroll chip row]
  South Tampa 🌴   North Tampa 🌳   St. Petersburg 🏖️   Clearwater 🌊   SouthShore ☀️

SectionLabel "KIDS' AGES"
[chip grid]   0–1   1–3   3–5   5–8   8–12   13+

SectionLabel "WHAT BEST DESCRIBES YOU?"
[chip grid, lilac variant]
  💼 Working mom   🏡 Stay-at-home   💛 Solo mom   📍 New to area   🌍 Multicultural

SectionLabel "USUALLY AVAILABLE"
[7 day circles, coral active]
  M  T  W  T  F  S  S

SectionLabel "MY INTERESTS"
[chip wrap, sage variant]
  🌳 Outdoors   ☕ Coffee   🧘‍♀️ Wellness   🎨 Crafts   📚 Books

[Coral gradient CTA, disabled until area + ages + types are set]
♥ Find my village
```

## State

Pulls from + writes to the same `App.jsx` state as the old onboarding:

- `location` (string) — set when user taps a Tampa area
- `profile.kidsAges` (object) — set as `{ '1–3': 1, '3–5': 1 }` etc.
- `profile.momTypes` (array of strings)
- `profile.interests` (array of strings)
- `prefs.slots` (array of `${day}-morning` strings — one per selected day)

`distance` is left `null`; `profile.values` is left empty.

## CTA gate

CTA is disabled until **all three** of: area, ≥1 kid age, ≥1 mom type. Days and interests are optional. Saves are recorded via `recordStep(0, patch)` on Continue.

## Chip variants

Three variants exist in the component:
- `coral` — default. Coral pill (`coralSoft` bg, `coralDeep` text) when active.
- `lilac` — `lilac` bg, `navy` text. Used for mom types.
- `sage` — `sage` bg, `#3D5E20` text. Used for interests.

## Risks

- **Data loss vs old onboarding.** The old flow captured `distance`, `values`, and explicit `places`; the new flow doesn't. Matching algorithm still runs but with less signal. Mitigation: those preferences can be edited later in the YouTab / EditProfileSheet.
- **Tampa-only chips.** This is the Tampa launch cohort. If we expand, the chip row needs to be conditional on detected region.

## Testing

- Filling in chips lights up the CTA after the third required field.
- Continue advances to VillagePreview (step=1) and writes the patch to `/api/onboarding/step`.
