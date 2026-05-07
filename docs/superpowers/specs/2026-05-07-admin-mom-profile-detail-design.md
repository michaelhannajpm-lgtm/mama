# Admin · Mom-profile detail modal

**Status:** Spec · 2026-05-07
**Surface:** `/admin` → "Mom profiles" tab
**Files in scope:** `src/AdminPage.jsx`, new `api/admin/mom-profiles/update.js`

## Problem

The Mom-profiles tab on the admin dashboard shows a wide, dense table of every promoted mom in the discoverable directory. Each row already exposes nine columns (name, username, city, kids, mom types, values, interests, source, joined), but the underlying `mom_profiles` row carries roughly twice as many fields the admin can't currently see — bio, photos, age, free_slots, places, geo coordinates, distance preference, visibility/verification/block flags, social links, last-active timestamp, and the auth_user_id.

The admin needs a way to inspect a single mom in full, and to change three operationally-important flags (`verified`, `visible`, `blocked_global`) without leaving the dashboard.

## Goals

1. Click any row in the Mom-profiles grid → see every field for that mom.
2. Toggle `verified`, `visible`, `blocked_global` from the detail view, with the change reflected immediately in the table behind it.
3. No typed confirmation for the three flag toggles — they're reversible. Typed-confirm stays reserved for destructive operations (the database reset).

## Non-goals

- Editing identity fields, bio, photos, kids, or preference axes.
- Bulk actions across multiple moms.
- An audit log of who toggled what (no admin auth yet, so attribution is meaningless).
- Adding authentication to admin endpoints. The dashboard's existing "No authentication" warning still applies; this spec does not change that posture.

## User flow

1. Admin opens `/admin` → "Mom profiles" tab.
2. Each table row gets a hover/cursor affordance and an `aria-label`. Clicking a row opens the detail modal.
3. The modal displays the mom's full record. Admin can:
   - Read every field.
   - Toggle `verified`, `visible`, or `blocked_global` via three buttons in a sticky footer.
   - Close via the X button, the Esc key, or clicking the backdrop.
4. After a successful toggle, both the modal's view and the table row reflect the new value without a full page reload.

## Architecture

### State flow

`MomProfilesTab` already owns local search state (`query`). It gains:

- `selectedMom: object | null` — the row whose modal is open.

`AdminPage` (the root) gains:

- `places: Place[] | null` — fetched in `load()` alongside the existing three endpoints. Passed down to `MomProfilesTab` so place UUIDs in `mom.places[]` can be resolved to human-readable names.
- A new `onPatch(updatedRow)` callback passed to `MomProfilesTab` that mutates the local `momProfiles` state in place, replacing the row by `id`.

`MomProfilesTab` passes `selectedMom`, `placesById`, `onClose`, and `onPatched` into a new `MomProfileDetailModal` component.

`MomProfileDetailModal` is internally stateful only for in-flight admin-action requests (per-flag `pending` boolean + per-flag `error` string).

### Component placement

`MomProfileDetailModal` is defined inside `src/AdminPage.jsx`, alongside the existing admin components (`MomProfilesTab`, `MomsTable`, `WaitlistTable`, etc.). The admin file is already a single co-located module by convention; introducing a separate file for one new modal would break that pattern.

### Modal structure

```
┌─ backdrop (rgba(42,30,34,0.55), click → onClose) ────┐
│   ┌─ panel (max-w 560, max-h 90vh, paper bg) ───┐   │
│   │ ── sticky header ─────────────────────       │   │
│   │  Avatar · Display Name · ✓ verified  [×]    │   │
│   │  @username · City · Neighborhood · source    │   │
│   │ ── scrollable body ───────────────────       │   │
│   │  Photos                                       │   │
│   │  Bio                                          │   │
│   │  Identity (age, ids)                          │   │
│   │  Family (kids breakdown, mom types)           │   │
│   │  Preferences (values, interests, slots,       │   │
│   │               places, preferred events)       │   │
│   │  Geo (city, neighborhood, lat/lng, distance)  │   │
│   │  Flags (visible / verified / blocked badges)  │   │
│   │  Social (social_links jsonb)                  │   │
│   │  Audit (source, created_at, updated_at,       │   │
│   │         last_active_at)                       │   │
│   │ ── sticky footer ─────────────────────        │   │
│   │  [Verified ✓] [Visible ✓] [Block ✗]          │   │
│   └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

Sections that have no value render as a muted "—" rather than being hidden, so admins can tell the field exists.

### Section content

| Section | Fields | Render |
|---|---|---|
| Header | `display_name`, `verified`, `username`, `city`, `neighborhood`, `source`, `photos[0]` | Avatar circle (40×40): first photo URL if `photos[0]` is set, else the first letter of `display_name` over an ink/saffron tile. Display name in Fraunces, verified `✓` next to name, username + city · neighborhood + source pill below |
| Photos | `photos[]` | Thumbnail row (40×40, rounded) of each URL; "No photos" muted text if empty |
| Bio | `bio` | Body text (Albert Sans, 13.5pt, ink color). Muted "—" if null |
| Identity | `age`, `display_name`, `username`, `id`, `auth_user_id` | Two-column key-value grid. UUIDs in monospace |
| Family | `kids_ages`, `mom_types` | Kids: "1× 0–1, 2× 3–5" string. Mom types: chips |
| Preferences | `values`, `interests`, `free_slots`, `places`, `preferred_event_ids` | Each as a chip cluster. Places resolved via `placesById`. Events shown as count + first 3 UUID prefixes |
| Geo | `city`, `neighborhood`, `home_lat`, `home_lng`, `distance_miles` | Two-column grid; lat/lng to 6 decimal places |
| Flags | `visible`, `verified`, `blocked_global` | Three status pills (sage if true for visible/verified, terracotta if true for blocked) |
| Social | `social_links` | JSON pretty-print in a paper-bg block; muted "—" if `{}` |
| Audit | `source`, `created_at`, `updated_at`, `last_active_at` | Absolute date + relative time. Muted if null |

### Footer actions

Three buttons, left-to-right:

1. **Verified** — toggle `verified`. Background terracotta when on, paper outline when off.
2. **Visible** — toggle `visible`. Background sage-dark when on, paper outline when off.
3. **Block** — toggle `blocked_global`. Background terracotta when on (block is "danger" coded), paper outline when off.

Optimistic update: clicking immediately flips the local state; on success the server-returned row is merged in; on failure the flip rolls back and an inline error appears beneath the footer.

While a request is in flight, that one button shows a spinner, but the other two remain clickable.

### Backdrop & dismiss

- Click on the dimmed backdrop closes the modal.
- Esc key closes the modal (handled via a `useEffect` keydown listener that mounts only while the modal is open).
- The X icon in the header closes the modal.
- Clicks inside the panel do **not** propagate to the backdrop.

## API

### New endpoint: `POST /api/admin/mom-profiles/update`

Lives at `api/admin/mom-profiles/update.js`. Mirrors the structure of the existing `api/admin/*` endpoints (service-role key, `json` helper from `_lib/supabase.js`).

**Request body:**

```jsonc
{
  "id": "uuid",                  // mom_profiles.id
  "patch": {                     // any subset; unknown keys 400
    "verified": true,
    "visible": false,
    "blocked_global": true
  }
}
```

**Response 200:**

```jsonc
{ "ok": true, "row": { /* updated mom_profiles row */ } }
```

**Errors:**

- `400` — missing `id`, `patch` empty, or unknown patch key
- `404` — no row with that `id`
- `500` — Supabase env not configured
- `502` — Supabase request failed

**Whitelist:** Only `verified`, `visible`, `blocked_global` are accepted in `patch`. All other keys cause a 400. This prevents the admin endpoint from doubling as a generic profile-edit gateway.

**Auth:** None, matching every other endpoint under `api/admin/*`. The dashboard's saffron "No authentication" banner already covers this caveat for the user.

### Existing endpoints

`/api/admin/mom-profiles` (GET) and `/api/admin/places` (GET) are unchanged. The dashboard's existing `Promise.all` in `AdminPage.load()` adds `places` as a fourth fetch.

## Data shapes

`mom_profiles` row (relevant fields, from `supabase/mom_profiles_schema.sql`):

```ts
{
  id: uuid,
  auth_user_id: uuid | null,
  display_name: string,
  username: string | null,
  age: number | null,
  bio: string | null,
  photos: string[],
  kids_ages: Record<string, number>,
  mom_types: string[],
  values: string[],
  interests: string[],
  free_slots: string[],
  places: uuid[],
  preferred_event_ids: uuid[],
  city: string,
  neighborhood: string | null,
  home_lat: number | null,
  home_lng: number | null,
  distance_miles: number | null,
  visible: boolean,
  verified: boolean,
  blocked_global: boolean,
  social_links: Record<string, unknown>,
  source: 'onboarding' | 'seed' | 'admin-import',
  created_at: timestamptz,
  updated_at: timestamptz,
  last_active_at: timestamptz | null,
}
```

`places` row (only the fields the modal renders):

```ts
{ id: uuid, name: string, /* … other fields ignored */ }
```

`placesById` is built once in `MomProfilesTab` from the `places` array passed down: `useMemo(() => new Map(places.map(p => [p.id, p])), [places])`.

## Design tokens

Strict token discipline per `CLAUDE.md` and `design-tokens.md`:

| Element | Token |
|---|---|
| Backdrop | `rgba(42,30,34,0.55)` (literal — there's no token for "ink-at-55%-opacity"; this is the one allowed exception) |
| Panel surface | `C.paper` |
| Panel border | `C.divider` |
| Headline | Fraunces, `C.ink` |
| Body | Albert Sans, `C.ink` / `C.inkSoft` / `C.inkMuted` for tiers |
| Verified-on, Visible-on chip | `C.sageDark` |
| Block-on, Verified action button when on | `C.terracotta` |
| Source-seed pill bg | `${C.saffron}25` (pre-existing pattern from row) |
| Action button — off state | paper bg, divider border |

Animation: panel uses the existing `slideUp` keyframe (`src/index.css`); backdrop uses `fadeIn`. No new keyframes.

## Error handling

- Modal-open with `selectedMom` falsy: don't render. (Guard at the top of the modal component.)
- Patch request network/server error: roll back the optimistic flip, show an inline error message under the footer (`text-[11.5px]`, `C.terracotta`). Error clears on the next successful action.
- `placesById` lookup miss: show the UUID prefix (first 8 chars) as the chip label so admins can still trace the value.
- `kids_ages` jsonb being malformed: same `fmtKids` helper already used by `MomsTable` and `MomProfilesTab` — returns "—" on bad shape.

## Testing

No automated test framework yet (per `overview.md`). Manual verification:

1. Click a row → modal opens with all sections populated.
2. Toggle each of the three flags → table behind the modal updates immediately, refresh confirms persistence.
3. Toggle a flag with the dev server offline → optimistic flip rolls back, error appears.
4. Click backdrop, X, and Esc → all close the modal.
5. Open a mom with empty `photos`, `bio`, `social_links`, `last_active_at` → muted "—" placeholders, no crash.
6. Open a mom with a `places[]` UUID that isn't in the loaded `places` table → chip renders the prefix without crashing.

## Open questions

None. The user picked modal + read-only-plus-three-flags during brainstorming; everything else here is mechanical.

## Out of scope (future work)

- Admin auth on `/api/admin/*` endpoints. Tracked separately as a security gap.
- Edit non-flag fields (display_name, bio, photos, etc.) from the modal.
- Audit log of admin actions.
- Bulk-toggle UI in the table itself (multi-select rows + footer actions).
