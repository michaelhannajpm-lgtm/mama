# Admin record deep-links — design

**Date:** 2026-06-11
**Status:** Approved (brainstorming) — pending spec review → implementation plan
**Scope:** Spec 1 of 2. This spec covers **admin** deep-links only. Public
shareable detail pages (frontend) are deferred to Spec 2 (see "Deferred").

## Goal

Every admin record — event, place, mom profile, user — gets a stable,
copy-pasteable URL that opens straight to that record's detail view. Opening
the URL (fresh load, refresh, back/forward, or pasted into the address bar)
lands on the right section and auto-opens the record's existing detail/edit
modal.

## Decisions (from brainstorming)

- **Sequencing:** admin deep-links first; public sharing is a separate later spec.
- **Identifier:** pretty `slug` / `username`, with `id` (uuid) fallback.
- **URL auto-sync:** opening a detail modal updates the address bar to the
  record's deep link; closing returns to the bare section URL. (Approved.)
- **Users:** no dedicated user-detail modal is built. `/admin/users/<id>`
  lands on the Users section with the row searched + highlighted, and offers
  the existing "open linked mom profile" jump when the user has one. A real
  user-detail modal is explicitly out of scope for this spec.

## Existing machinery to reuse (do NOT rebuild)

The "open one specific record" behavior already exists and is the foundation:

- `src/screens/admin/lib/adminRouter.js` — `currentSectionId()` /
  `navigateSection()` / `useAdminRoute()`. Routes `/admin/<section>`; it reads
  only path segment `[0]`, so trailing segments are currently ignored (adding
  a record segment is additive and cannot break section routing).
- `EventsManager.jsx` — `const [editing, setEditing]`; listens for the
  `gm-admin-open-event` window event and an initial `sessionStorage`
  pending-open key; opens `EventEditModal`. Matches rows in the full,
  pre-filter `rows` array.
- `PlacesManager.jsx` — same pattern with `gm-admin-open-place` →
  `PlaceEditModal`.
- `MomProfilesSection.jsx` — same pattern with `gm-admin-open-mom` +
  `sessionStorage['gm-admin-open-mom']` → `setSelectedMom`.
- `UsersSection.jsx` — `openMomProfile(momId)` already drives the
  cross-section jump (sets sessionStorage + dispatches `gm-admin-open-mom`).

The gap is only: (1) URL ↔ record binding, (2) resolving pretty refs, (3) a
copy-link affordance, (4) URL auto-sync on open/close.

## URL scheme

| Entity | Canonical link | Ref → row resolution order |
|---|---|---|
| Event | `/admin/events/<slug>` | `slug` → `id` |
| Place | `/admin/places/<slug>` | `slug` → `id` |
| Mom profile | `/admin/mom-profiles/<username>` | `username` → `id` |
| User | `/admin/users/<id>` | `id` |

`<ref>` is URL-encoded. When a record lacks a slug/username, the link uses its
uuid; resolution always falls back to `id`.

## Components & changes

### 1. `adminRouter.js` — record-aware routing (additive)
- Add `currentRecordRef()` → decoded path segment `[1]` or `null`.
- Add `recordPath(section, ref)` → `/admin/<section>/<encodeURIComponent(ref)>`
  (bare `/admin/<section>` when `ref` is null; `/admin` for the default
  overview section).
- Add `navigateRecord(section, ref)` → `pushState` to `recordPath(...)` +
  dispatch the existing `gm-admin-navigate` event.
- `currentSectionId()` is unchanged (still segment `[0]`). `useAdminRoute()`
  may additionally expose the current record ref so the shell can react.

### 2. `lib/adminDeepLink.js` — the URL→open bridge (new, small)
A single hook/effect mounted in the admin shell:
- On mount and on every route change, read `currentSectionId()` +
  `currentRecordRef()`.
- If a record ref exists: ensure the section is active, then write the ref to
  the section's `sessionStorage['gm-admin-open-<entity>']` key and dispatch
  the existing `gm-admin-open-<entity>` event with `{ ref }`.
- Maps section id → entity event name: `events`→`event`, `places`→`place`,
  `mom-profiles`→`mom`, `users`→(search/highlight, no modal).
- Keeps a module-level "pending ref" so async row arrival still resolves
  (mirrors the existing pending-key behavior).

### 3. Section open-handlers — match by pretty ref (one-line change each)
In `EventsManager`, `PlacesManager`, `MomProfilesSection`, change the row
lookup from `r.id === id` to:
`r.id === ref || r.slug === ref || r.username === ref` (only the fields that
exist on that entity). They already search the full pre-filter `rows`, so the
default "Needs review" status filter does not hide a deep-linked record.

### 4. URL auto-sync on open/close
- When a detail/edit modal opens (`setEditing(row)` / `setSelectedMom(row)`),
  call `navigateRecord(section, row.slug || row.username || row.id)`.
- When it closes, call `navigateSection(section)` to return to the bare URL.
- Guard against loops: the bridge must no-op when the modal for the current
  ref is already open (compare against the open record).

### 5. Copy-link affordance
- A small reusable `CopyLinkButton` (link icon) in
  `src/screens/admin/components/`, styled with the `AC` admin tokens
  (per the admin-design skill — NOT the phone-app `C` tokens).
- Placed on each row and in each edit-modal header. Copies
  `${window.location.origin}${recordPath(section, ref)}` to the clipboard via
  `navigator.clipboard.writeText`, then shows the section's existing
  toast/`actionMsg`. Falls back to selecting the text if clipboard is blocked.

### 6. `create-event` skill tie-in
After a successful insert, the skill reports the admin review deep-link
`/admin/events/<slug>` (prepend host) so the operator can jump straight to the
new event. Update `.claude/skills/create-event/SKILL.md` step 8 ("Report")
accordingly.

## Data flow

```
paste /admin/events/evt-fb-coffee-gathering
  → admin shell mounts
  → useAdminRoute(): section=events, recordRef=evt-fb-coffee-gathering
  → adminDeepLink bridge: navigate to events + set sessionStorage + dispatch gm-admin-open-event
  → EventsManager open-handler: find rows where slug===ref (||id) → setEditing(row)
  → EventEditModal opens; URL already canonical (no re-push needed)
```

```
click a place row
  → setEditing(place) → navigateRecord('places', place.slug || place.id)
  → address bar becomes /admin/places/<slug>  (copy-ready)
  → close modal → navigateSection('places') → /admin/places
```

## Error handling

- **Unknown / deleted / mistyped ref:** bridge dispatches; no row matches;
  section shows a toast "Couldn't find that record" and stays on the section
  list. No crash, no spinner hang.
- **Clipboard blocked (non-HTTPS / permissions):** `CopyLinkButton` falls back
  to a visible, pre-selected URL the operator can copy manually.
- **Ambiguous ref (slug collides with a uuid-shaped string):** resolution
  tries `slug`/`username` first, then `id`; first match wins. Slugs are
  namespaced and never uuid-shaped, so collisions are not expected.

## Testing

No automated UI test harness exists for admin; verify manually (and via the
existing `node --test` only if pure helpers are added):

- **Pure helpers (unit-testable):** `recordPath`, `currentRecordRef` parsing,
  and the ref→row matcher — add `*.test.mjs` if extracted as pure functions.
- **Manual matrix:** for each of events / places / mom-profiles:
  1. Paste a slug/username deep link in a fresh tab → correct modal opens.
  2. Paste a uuid deep link → opens.
  3. Paste a bad ref → toast, no crash.
  4. Click a row → URL updates to the deep link; refresh re-opens it.
  5. Close modal → URL returns to `/admin/<section>`; back/forward behave.
  6. Copy-link button copies the canonical URL.
  7. Deep-link a record whose status is filtered out (e.g. an `approved`
     event under the default `needs_review` filter) → still opens.
- **Users:** `/admin/users/<id>` highlights the row; linked-mom jump works.

## Deferred — Spec 2 (public sharing)

Not in this spec. Captured decisions for later: public `/e/<slug>`,
`/p/<slug>`, `/m/<username>` routes; **rich OG-meta link previews** (needs a
server/edge function returning per-entity meta tags to crawlers); **gated
mom-profile teaser** (logged-out sees a minimal verified-mom card + sign-in
CTA, full profile after auth); events/places fully public. Reuse the existing
`EventDetailSheet` / `PlaceDetailSheet` / `MomDetailSheet` and `ShareSheet`
(whose "Copy link" channel is currently a prototype no-op).
