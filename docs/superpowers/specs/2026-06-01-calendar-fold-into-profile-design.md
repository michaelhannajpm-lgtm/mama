# Calendar fold into Profile — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/screens/MainApp/YouTab.jsx` — new "Upcoming" section. `CalendarTab.jsx` retained on disk, no longer routed.

## Problem

The old MainApp had a dedicated Calendar tab showing the month grid + 1:1 dots + group dots. The GoMama Expo prototype's 4-tab design has no Calendar — users still need to see their upcoming meetups somewhere. Burying it inside Profile gives Profile a "your stuff" feel and removes a tab without losing information.

## Goals

1. Show all upcoming meetups (1:1 + group) at the top of the Profile tab.
2. Empty state with a coral CTA jumping back to Meetups.
3. Pull cleanly from existing `scheduled1to1` and `joinedEvents` state — no schema change.

## Non-goals

- **Month-grid calendar view.** The old grid is gone. Per-day RSVP browsing is no longer surfaced. Acceptable trade: scheduled meetups are visible at a glance; rare per-day browsing isn't.
- **Editing availability from Profile.** The old Calendar let users edit per-day time windows. Moved out of scope — availability now lives on AboutYou (re-edit via EditProfileSheet).

## Data sources

Reads:
- `scheduled1to1: { [momId]: { day, time, place } }` — from `App.jsx`
- `joinedEvents: string[]` — array of `SUGGESTED_EVENTS` ids
- `SAMPLE_MOMS` (to resolve momId → mom object)
- `SUGGESTED_EVENTS` (to resolve event id → event object)

## Layout (inside YouTab)

```
[Section label "UPCOMING"]                          [N meetups  or  Nothing on the calendar]

If empty:
  [Coral-dashed box]
    Schedule your first meetup
    Browse Meetups for moms + groups near you             [chevron →]
  (tap → goToMeetups callback)

If populated:
  [Box, paper bg, divider border, divided rows]

  [coral avatar/img]   1:1 with Sarah                    [📅 coralDeep]
                       Mon · 9:30 AM · Buddy Brew

  [sage avatar/img]    Toddler & Coffee Club              [👥 sageDark]
                       Sat · 10:00 AM · Bayshore
```

Rows are non-interactive (read-only). 1:1 rows get coral icon accents, group rows get sage.

## Empty-state CTA

Calls `goToMeetups` — a callback passed in from `MainApp/index.jsx` that does `setTab('meetups')`. Resolves the "I just made an account but the Profile tab is empty" deadlock.

## Risks

- **No per-day availability editing.** Power users who liked the old grid lose something. Mitigation: most users never used it; availability lives on AboutYou.
- **Truncation at scale.** With many scheduled meetups, the list extends Profile indefinitely. For the prototype that's fine; future polish would paginate or fold older items into a collapsed "Past meetups" section.

## Testing

- Schedule a 1:1 in Meetups → switch to Profile → row appears.
- Join a group → switch to Profile → row appears with sage icon.
- Empty state → tap CTA → land back on Meetups tab.
