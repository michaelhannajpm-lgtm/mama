# Admin updates for the GoMama port — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/AdminPage.jsx` — funnel labels, new stat cards in MomProfiles tab, verification chips in the detail modal.

## Problem

The admin dashboard's funnel was labelled for the old 8-step onboarding (`Splash · Welcome · Location · Profile · When · Where · Summary · Account · Done`). The GoMama port reduced onboarding to 3 actionable steps; the labels were stale. The dashboard also had no visibility into the new `profile.verified` data.

## Goals

1. Update the onboarding funnel labels to match the new 4-step flow.
2. Add 3 verification stats to the Mom Profiles tab (Social connected, Real photo added, Fully verified).
3. Surface per-key verification chips in the Mom Profile Detail modal.
4. Inherit the new palette automatically — no admin-specific color work.

## Non-goals

- Editing the admin auth gate. `/admin` still has no authentication (see `src/AdminPage.jsx` top-of-file comment). Out of scope for this port.
- Adding a Favorites tab to admin. `savedItems` isn't persisted to Supabase yet, so admin has no data to display.

## Changes

### 1. Funnel labels

```diff
-  const stepLabels = ['Splash', 'Welcome', 'Location', 'Profile', 'When', 'Where', 'Summary', 'Account', 'Done'];
+  const stepLabels = ['Landing', 'About you', 'Village preview', 'Account', 'Done'];
```

`current_step` 0 = Landing (pre-step), 1 = AboutYou done, 2 = VillagePreview done, 3 = Account done.

### 2. MomProfilesTab — three new stats

A second 3-card stat row, just below the existing total/seeded/verified row:

| Card | Source |
|---|---|
| Social connected | `rows.filter(r => r.verified?.instagram || r.verified?.facebook).length` |
| Real photo added | `rows.filter(r => r.verified?.photo).length` |
| Fully verified | `rows.filter(r => (r.verified?.instagram || r.verified?.facebook) && r.verified?.photo).length` |

`r.verified` is read defensively — rows pre-dating the port have `undefined`, treated as off.

### 3. MomProfileDetailModal — verification chips

Inside the "Social" section, below the legacy `social_links` JSON, render three chips:

```
[Instagram · on/off]   [Facebook · on/off]   [Real photo · on/off]
```

Sage-tinted when on, cream-soft when off. Read from `mom.verified` defensively.

The existing flag toggles (Verified / Visible / Blocked) in the footer are unchanged.

## Data dependency

The admin reads from `mom_profiles` (promoted mom directory) and `onboarding_profiles` (in-progress + completed signups). `profile.verified` is currently client-only and never sent to Supabase — so the new stat cards will all read `0` until persistence lands (see `.claude/context/todo.md` item 2). Documented so it doesn't read as a bug.

## Palette inheritance

All admin styles use `C.tokenName` (terracotta / sageDark / saffron / cream / divider). The 2026-06-01 palette swap moved those tokens to coral/navy values, so the admin recolors automatically — no admin-side change needed.

## Risks

- **Zero-everywhere reads** until verification persistence ships. The stat cards will display `0 · 0%` for live data. That's a faithful representation, but reads as broken. Mitigation: ship persistence as the next admin-visible feature, or seed `verified` for the seeded `SAMPLE_MOMS` so admin shows believable numbers in dev.

## Testing

- `/admin` loads with the new palette and new funnel labels.
- Mom Profiles tab shows the 3 new stat cards (likely all `0` until persistence lands).
- Opening a mom detail shows verification chips in the Social section.
