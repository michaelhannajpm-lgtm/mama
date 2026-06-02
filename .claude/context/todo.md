# TODO — remaining work after the GoMama port

The GoMama prototype port landed on 2026-06-01 (see
`docs/superpowers/specs/2026-06-01-*.md`). Most of the previous UX TODOs
(persona-based onboarding, day-pill availability, etc.) were superseded
by that port. What's still open:

## High value

### 1. Wire Bookmark buttons across the app
The `savedItems` state in `App.jsx` is currently only populated by
`VillagePreview`. To make `FavoritesTab` actually useful, add bookmark
toggles to:

- `MatchCardFull` — bookmark icon top-right of each mom card
- `GroupCardFull` — bookmark icon top-right of each group card
- `PlacesTab` — bookmark icon on each place row

All three need a `saved: boolean` prop and an `onToggleSave: () => void`
callback, threaded through `MainApp/index.jsx`.

### 2. Persist `savedItems` and `profile.verified` to Supabase
Today both are client-only. Either:
- Add a `saved_items text[]` and `verified jsonb` column to `onboarding_profiles`, or
- Add a separate `user_saved_items` table.

Mirror through `recordStep` so the admin dashboard can read it back.

### 3. Real social verification
The Instagram / Facebook connect rows in Profile are self-attested
toggles. Wire them to real OAuth (Supabase already supports Facebook —
Instagram needs a custom flow via Meta's Graph API).

## Medium

### 4. Live "X moms match" counter
Persistent counter on AboutYou as the user selects chips. Computed by
intersecting selected slots/types/interests against `SAMPLE_MOMS`.
Confirms matching is real + creates dopamine pull forward.

### 5. Match overlap on group cards
Show *"Sara + 2 of your matches going"* on group cards. Compute overlap
between event attendees and the user's matched moms.

### 6. Filter chips on Meetups tab
Add a row of filter chips under the toggle:
> *This week · Same kid ages · Weekends · Verified · < 1 mile*

State lives locally in `MatchesTab`.

## Polish

### 7. Save + resume onboarding
Persist `step`, `profile`, `prefs`, `location`, `distance`, `savedItems`
to `localStorage` on each change. On Landing render, detect partial
state → show:
> *"Welcome back, you're on step N"*

…and a *"Continue"* CTA alongside *"Start over"*.

### 8. Undo toast for destructive actions
When user removes a place / unjoins a group / cancels a meetup, show:
> *"Removed · Undo"*

…for 5s. The `Toast` component exists; add an `action` prop and an
inverse-action callback.

### 9. Search bar in Places tab
Filter across `PLACES` and `TOP_PICKS`. Local state in `PlacesTab`.
