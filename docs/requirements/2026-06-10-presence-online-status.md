# Requirement — Mom presence (online / away / offline)

**Date:** 2026-06-10 · **Status:** Approved, implementing

## Goal
Show a small status dot on **every mom-profile avatar** across the app indicating
whether that mom is **online** (green), **away** (amber), or **offline** (gray).
The signal is **persisted in the database** and the online/away thresholds are
**editable from the Admin panel** (not hardcoded).

## Decisions (locked)
- **Mechanism:** DB `last_seen_at` heartbeat. The browser updates the current
  user's `mom_profiles.last_seen_at` on a ~60s heartbeat while the app is open.
  Status is **derived by recency** — no separate status column to keep in sync.
- **Thresholds:** stored in `app_config`, editable in Admin → Config.
  - `presence_online_max_seconds` (default **300** = 5 min)
  - `presence_away_max_seconds` (default **1800** = 30 min)
  - Derivation: `online` if `age ≤ online_max`; `away` if `age ≤ away_max`;
    else `offline`. A null/absent `last_seen_at` ⇒ `offline`.
- **"Away" is time-based only** (aged into the away window). No idle/tab-hidden
  detection in v1.
- **Colors:** online = `C.sageDark` (green), away = `C.saffron` (amber),
  offline = `C.muted` (gray). Rendered as a bordered dot at the avatar's
  bottom-right.

## Scope — where the dot appears
Every mom avatar: `MomChip` (Home "Moms near you"), `MomCard` (Connect "Your
best matches"), `MomListCard` (Connect See-all), `MomDetailSheet`,
`ProfileSheet`, and the current user's own avatar in `YouTab` (always online).
Chat message-author avatars are out of scope (authors aren't necessarily moms
with profiles).

## Data model
- `mom_profiles.last_seen_at timestamptz` (nullable). Indexed is unnecessary at
  current scale.
- `app_config` rows: `presence_online_max_seconds`, `presence_away_max_seconds`.

## Backend
- **Heartbeat:** `POST /api/mom-profiles/heartbeat` (service-role) sets
  `last_seen_at = now()` for the caller's row, identified by `auth_user_id` or
  `seed_mom_id` (same identity pattern as `updateMomProfile`).
- **Nearby cards:** `api/mom-profiles/nearby` SELECT + `momCardFromRow` include
  `last_seen_at` so the client can derive status.
- **Config exposure:** the two threshold keys are returned by `GET /api/config`
  (camelCased) and validated/editable via `GET·POST /api/admin/config`.

## Client
- A pure helper `derivePresence(lastSeenAt, onlineMaxS, awayMaxS, nowMs)` →
  `'online' | 'away' | 'offline'` (unit-tested).
- `App.jsx` decorates each nearby mom with a `presence` field, recomputed on a
  60s tick (so a mom ages from online→away→offline without a refetch) using the
  admin thresholds from `appConfig`. Other moms coming **back** online refresh
  when the nearby list reloads (on app focus + existing load triggers).
- `App.jsx` runs the heartbeat (~60s + on focus) so the current user is visible
  as online to others.
- A shared `<PresenceDot status size />` component renders the colored dot;
  every avatar site reads `mom.presence`.

## Admin
- Admin → Config gains two numeric fields ("Online within … seconds",
  "Away within … seconds") with validation (online < away; sane bounds).

## Freshness / limitations (v1)
- A mom's dot reflects her last persisted heartbeat as seen at the last nearby
  fetch, aged client-side. Perfect realtime presence (instant flip when someone
  opens the app) is **not** in v1 — that was the explicit trade for the simpler
  DB-heartbeat mechanism over Realtime Presence. Refresh-on-focus keeps it
  reasonably current.
- Abuse/scale: heartbeat is a cheap single-row update; fine at current scale.

## Tests
- `derivePresence` unit tests (node:test): online/away/offline boundaries,
  null last_seen ⇒ offline, threshold edges.
