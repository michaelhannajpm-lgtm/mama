# Admin Record Deep-Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every admin record (event, place, mom profile, user) a stable, copy-pasteable URL (`/admin/<section>/<id>`) that opens straight to its detail view, and a copy-link affordance to grab it.

**Architecture:** Extend the existing `adminRouter.js` (path-based, History API) to parse an optional record segment after the section. A small bridge hook reads that ref and drives the *already-existing* `gm-admin-open-<entity>` window-event + `sessionStorage` machinery each manager uses today for cross-section jumps. Managers gain (a) a one-line matcher widening (id **or** slug/username) and (b) a `useEffect` that syncs the URL when their detail modal opens/closes. A reusable `CopyLinkButton` copies the canonical `id` URL.

**Tech Stack:** React 18, Vite, History API (`pushState`/`popstate`), `node:test` for the one pure-logic unit test. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-11-admin-record-deep-links-design.md`. Canonical identifier is the immutable **`id` (uuid)**; slug/username are accepted only as inbound aliases.

**Branch base:** `feat/admin-record-deep-links` (= `master` + the spec). The admin AI-assist work is in flight on another branch and touches the same files; overlap is resolved at merge, not by building on a moving base.

---

## File structure

- **Modify** `src/screens/admin/lib/adminRouter.js` — add pure `parseAdminPath`, `currentRecordRef`, `recordPath`, `navigateRecord`; `useAdminRoute` returns a third element (recordRef). Section routing unchanged.
- **Create** `src/screens/admin/lib/adminRouter.test.mjs` — unit tests for `parseAdminPath` + `recordPath` (pure).
- **Create** `src/screens/admin/lib/adminDeepLink.js` — `useAdminDeepLink(section, recordRef)` bridge hook.
- **Modify** `src/screens/admin/index.jsx` — consume recordRef; mount the bridge.
- **Modify** `src/screens/admin/managers/EventsManager.jsx` — matcher widening + URL auto-sync + not-found banner.
- **Modify** `src/screens/admin/managers/PlacesManager.jsx` — same.
- **Modify** `src/screens/admin/sections/MomProfilesSection.jsx` — matcher widening + URL auto-sync.
- **Create** `src/screens/admin/components/CopyLinkButton.jsx` — reusable copy-link icon button (AC tokens).
- **Modify** `EventEditModal.jsx`, `PlaceEditModal.jsx`, `MomProfilesSection.jsx` (the `MomProfileDetailModal` header) — mount `CopyLinkButton`.
- **Modify** `src/screens/admin/sections/UsersSection.jsx` — listen for `gm-admin-open-user`, highlight the row.
- **Modify** `.claude/skills/create-event/SKILL.md` — report the `/admin/events/<id>` review link.

---

### Task 1: adminRouter — pure path parsing + record helpers

**Files:**
- Modify: `src/screens/admin/lib/adminRouter.js`
- Test: `src/screens/admin/lib/adminRouter.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/screens/admin/lib/adminRouter.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAdminPath, recordPath } from './adminRouter.js';

test('parseAdminPath: bare /admin → overview, no ref', () => {
  assert.deepEqual(parseAdminPath('/admin'), { section: 'overview', ref: null });
  assert.deepEqual(parseAdminPath('/admin/'), { section: 'overview', ref: null });
});

test('parseAdminPath: section only', () => {
  assert.deepEqual(parseAdminPath('/admin/events'), { section: 'events', ref: null });
  assert.deepEqual(parseAdminPath('/admin/events/'), { section: 'events', ref: null });
});

test('parseAdminPath: section + record ref (decoded)', () => {
  assert.deepEqual(parseAdminPath('/admin/events/abc-123'), { section: 'events', ref: 'abc-123' });
  assert.deepEqual(parseAdminPath('/admin/mom-profiles/%40sara'), { section: 'mom-profiles', ref: '@sara' });
});

test('parseAdminPath: non-admin path → overview', () => {
  assert.deepEqual(parseAdminPath('/'), { section: 'overview', ref: null });
});

test('recordPath: builds encoded paths, omits ref when null', () => {
  assert.equal(recordPath('events', 'abc 123'), '/admin/events/abc%20123');
  assert.equal(recordPath('events', null), '/admin/events');
  assert.equal(recordPath('overview', null), '/admin');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/screens/admin/lib/adminRouter.test.mjs`
Expected: FAIL — `parseAdminPath`/`recordPath` are not exported yet (`SyntaxError`/`undefined is not a function`).

- [ ] **Step 3: Add the helpers**

In `src/screens/admin/lib/adminRouter.js`, keep `ADMIN_BASE` and `DEFAULT_SECTION`. Add the pure parser and refactor `currentSectionId` to use it; add `currentRecordRef`, `recordPath`, `navigateRecord`. Replace the existing `currentSectionId` definition with:

```js
// Pure: parse an admin pathname into { section, ref }. ref is the decoded
// record segment after the section, or null. Used by the URL→record bridge.
export const parseAdminPath = (pathname) => {
  const p = (pathname || '').replace(/\/+$/, '');
  if (p === ADMIN_BASE || p === '') return { section: DEFAULT_SECTION, ref: null };
  if (p.startsWith(`${ADMIN_BASE}/`)) {
    const parts = p.slice(ADMIN_BASE.length + 1).split('/');
    let ref = null;
    if (parts[1]) { try { ref = decodeURIComponent(parts[1]); } catch { ref = parts[1]; } }
    return { section: parts[0] || DEFAULT_SECTION, ref };
  }
  return { section: DEFAULT_SECTION, ref: null };
};

export const currentSectionId = () => parseAdminPath(window.location.pathname).section;

export const currentRecordRef = () => parseAdminPath(window.location.pathname).ref;

// Build a deep-link path. ref is URL-encoded; omitted when null.
export const recordPath = (section, ref) => {
  const base = section === DEFAULT_SECTION ? ADMIN_BASE : `${ADMIN_BASE}/${section}`;
  return ref ? `${base}/${encodeURIComponent(ref)}` : base;
};

// Navigate to a record deep-link (pushState + broadcast), like navigateSection.
export const navigateRecord = (section, ref) => {
  const url = recordPath(section, ref);
  if (window.location.pathname.replace(/\/+$/, '') !== url.replace(/\/+$/, '')) {
    window.history.pushState({}, '', url);
  }
  window.dispatchEvent(new Event('gm-admin-navigate'));
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/screens/admin/lib/adminRouter.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/screens/admin/lib/adminRouter.js src/screens/admin/lib/adminRouter.test.mjs
git commit -m "feat(admin): record-aware path parsing + navigateRecord helper"
```

---

### Task 2: useAdminRoute exposes recordRef + shell mounts the bridge

**Files:**
- Modify: `src/screens/admin/lib/adminRouter.js` (the `useAdminRoute` hook)
- Modify: `src/screens/admin/index.jsx:45-46` (the `AdminApp` destructure) and add the bridge call

- [ ] **Step 1: Update `useAdminRoute` to return recordRef**

Replace the existing `useAdminRoute` body so it tracks both section and ref:

```js
// Returns [currentSectionId, navigateSection, currentRecordRef]. Re-renders on
// pushState navigation, browser back/forward, and external pathname changes.
export const useAdminRoute = () => {
  const [state, setState] = useState(() => parseAdminPath(window.location.pathname));
  useEffect(() => {
    const update = () => setState(parseAdminPath(window.location.pathname));
    window.addEventListener('popstate', update);
    window.addEventListener('gm-admin-navigate', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('gm-admin-navigate', update);
    };
  }, []);
  return [state.section, navigateSection, state.ref];
};
```

- [ ] **Step 2: Consume recordRef + mount the bridge in `AdminApp`**

In `src/screens/admin/index.jsx`, add the import near the other admin-lib imports:

```js
import { useAdminDeepLink } from './lib/adminDeepLink';
```

Change the route destructure (currently `const [section, navigate] = useAdminRoute();`) to:

```js
  const [section, navigate, recordRef] = useAdminRoute();
```

Immediately after the route destructure line, add:

```js
  // URL → record bridge: when /admin/<section>/<ref> carries a ref, drive the
  // existing gm-admin-open-<entity> machinery so the record's modal opens.
  useAdminDeepLink(section, recordRef);
```

- [ ] **Step 3: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds (the bridge import resolves after Task 3; if you do Task 3 first, build is green now — otherwise expect an unresolved-import error until Task 3 lands).

- [ ] **Step 4: Commit (after Task 3 so the import resolves)**

```bash
git add src/screens/admin/lib/adminRouter.js src/screens/admin/index.jsx
git commit -m "feat(admin): expose recordRef from useAdminRoute + mount deep-link bridge"
```

---

### Task 3: the URL→record bridge hook

**Files:**
- Create: `src/screens/admin/lib/adminDeepLink.js`

- [ ] **Step 1: Create the hook**

```js
// URL → record bridge. Given the current section + record ref, drives the
// existing per-section "open this record" machinery: writes the ref into the
// section's sessionStorage pending-key AND dispatches the gm-admin-open-<entity>
// window event. Managers already listen for both (EventsManager, PlacesManager,
// MomProfilesSection); UsersSection highlights its row. The ref may be an id OR
// a slug/username alias — managers match on id || slug || username.
import { useEffect, useRef } from 'react';

const SECTION_ENTITY = {
  events: 'event',
  places: 'place',
  'mom-profiles': 'mom',
  users: 'user',
};

export const useAdminDeepLink = (section, recordRef) => {
  const lastKey = useRef(null);
  useEffect(() => {
    if (!recordRef) { lastKey.current = null; return; }
    const entity = SECTION_ENTITY[section];
    if (!entity) return;
    const key = `${section}:${recordRef}`;
    if (lastKey.current === key) return; // already dispatched for this ref
    lastKey.current = key;

    const evname = `gm-admin-open-${entity}`;
    try { sessionStorage.setItem(evname, recordRef); } catch { /* ignore */ }
    // detail.id carries the ref (id or alias) — backward compatible with the
    // existing Users → Mom-profiles dispatch which uses { detail: { id } }.
    window.dispatchEvent(new CustomEvent(evname, { detail: { id: recordRef } }));
  }, [section, recordRef]);
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: PASS (Task 2's import now resolves).

- [ ] **Step 3: Commit**

```bash
git add src/screens/admin/lib/adminDeepLink.js
git commit -m "feat(admin): add useAdminDeepLink URL→record bridge"
```

---

### Task 4: EventsManager — match by id-or-alias + URL auto-sync + not-found banner

**Files:**
- Modify: `src/screens/admin/managers/EventsManager.jsx` (open-handler ~84-108; add an auto-sync effect; add a banner near the modal render ~332)

- [ ] **Step 1: Widen the matcher + record a not-found state**

Add the router import at the top (next to the existing imports):

```js
import { navigateRecord, navigateSection, currentRecordRef } from '../lib/adminRouter';
```

Add a state near the other `useState`s (e.g. after `const [editing, setEditing] = useState(null);`):

```js
  const [deepLinkMiss, setDeepLinkMiss] = useState(null); // ref we couldn't resolve
```

Replace the deep-link `useEffect` (the block starting `let pendingId = null;` … through the `removeEventListener('gm-admin-open-event', onOpen)`) with:

```js
  useEffect(() => {
    const match = (ref) => (rows || []).find(
      (r) => r.id === ref || r.slug === ref
    );
    let pendingId = null;
    try { pendingId = sessionStorage.getItem('gm-admin-open-event'); } catch { /* ignore */ }
    if (pendingId && rows?.length) {
      const target = match(pendingId);
      if (target) { setEditing(target); setDeepLinkMiss(null); }
      else setDeepLinkMiss(pendingId);
      try { sessionStorage.removeItem('gm-admin-open-event'); } catch { /* ignore */ }
    }
    const onOpen = (ev) => {
      const ref = ev?.detail?.id;
      if (!ref) return;
      const target = match(ref);
      if (target) { setEditing(target); setDeepLinkMiss(null); }
      else if (rows?.length) setDeepLinkMiss(ref);
    };
    window.addEventListener('gm-admin-open-event', onOpen);
    return () => window.removeEventListener('gm-admin-open-event', onOpen);
  }, [rows]);
```

- [ ] **Step 2: Add the URL auto-sync effect**

Add immediately after the effect from Step 1:

```js
  // Keep the address bar in sync with the open record (canonical id form).
  useEffect(() => {
    if (editing && editing.id && !editing.__new) {
      navigateRecord('events', editing.id);
    } else if (!editing && currentRecordRef()) {
      navigateSection('events');
    }
  }, [editing]);
```

- [ ] **Step 3: Render a not-found banner**

Directly above the `{editing && (` modal render (~line 332), add:

```jsx
      {deepLinkMiss && (
        <div style={{
          margin: '8px 0', padding: '8px 12px', borderRadius: 8,
          background: AC.warningSoft || '#FBF1E2', color: AC.text,
          fontFamily: AC.font, fontSize: 12.5,
        }}>
          Couldn’t find an event for “{deepLinkMiss}”. It may be deleted or renamed.
          <button onClick={() => setDeepLinkMiss(null)} style={{
            marginLeft: 8, background: 'transparent', border: 'none',
            color: AC.accent, fontWeight: 600, cursor: 'pointer',
          }}>Dismiss</button>
        </div>
      )}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/admin/managers/EventsManager.jsx
git commit -m "feat(admin): events deep-link resolves id|slug, syncs URL, warns on miss"
```

---

### Task 5: PlacesManager — match by id-or-alias + URL auto-sync + not-found banner

**Files:**
- Modify: `src/screens/admin/managers/PlacesManager.jsx` (open-handler ~89-107; modal render ~358)

- [ ] **Step 1: Imports + state**

Add at the top:

```js
import { navigateRecord, navigateSection, currentRecordRef } from '../lib/adminRouter';
```

Add after `const [editing, setEditing] = useState(null);`:

```js
  const [deepLinkMiss, setDeepLinkMiss] = useState(null);
```

- [ ] **Step 2: Replace the deep-link effect**

Replace the block starting `let pendingId = null;` … through `removeEventListener('gm-admin-open-place', onOpen)` with:

```js
  useEffect(() => {
    const match = (ref) => (rows || []).find(
      (r) => r.id === ref || r.slug === ref
    );
    let pendingId = null;
    try { pendingId = sessionStorage.getItem('gm-admin-open-place'); } catch { /* ignore */ }
    if (pendingId && rows?.length) {
      const target = match(pendingId);
      if (target) { setEditing(target); setDeepLinkMiss(null); }
      else setDeepLinkMiss(pendingId);
      try { sessionStorage.removeItem('gm-admin-open-place'); } catch { /* ignore */ }
    }
    const onOpen = (ev) => {
      const ref = ev?.detail?.id;
      if (!ref) return;
      const target = match(ref);
      if (target) { setEditing(target); setDeepLinkMiss(null); }
      else if (rows?.length) setDeepLinkMiss(ref);
    };
    window.addEventListener('gm-admin-open-place', onOpen);
    return () => window.removeEventListener('gm-admin-open-place', onOpen);
  }, [rows]);
```

- [ ] **Step 3: Add the URL auto-sync effect**

Add immediately after:

```js
  useEffect(() => {
    if (editing && editing.id && !editing.__new) {
      navigateRecord('places', editing.id);
    } else if (!editing && currentRecordRef()) {
      navigateSection('places');
    }
  }, [editing]);
```

- [ ] **Step 4: Not-found banner above the modal render (~line 358)**

```jsx
      {deepLinkMiss && (
        <div style={{
          margin: '8px 0', padding: '8px 12px', borderRadius: 8,
          background: AC.warningSoft || '#FBF1E2', color: AC.text,
          fontFamily: AC.font, fontSize: 12.5,
        }}>
          Couldn’t find a place for “{deepLinkMiss}”. It may be deleted or renamed.
          <button onClick={() => setDeepLinkMiss(null)} style={{
            marginLeft: 8, background: 'transparent', border: 'none',
            color: AC.accent, fontWeight: 600, cursor: 'pointer',
          }}>Dismiss</button>
        </div>
      )}
```

- [ ] **Step 5: Build + commit**

Run: `npm run build` → PASS

```bash
git add src/screens/admin/managers/PlacesManager.jsx
git commit -m "feat(admin): places deep-link resolves id|slug, syncs URL, warns on miss"
```

---

### Task 6: MomProfilesSection — match by id-or-username + URL auto-sync

**Files:**
- Modify: `src/screens/admin/sections/MomProfilesSection.jsx` (open-handler ~58-80; `selectedMom` modal render ~413)

- [ ] **Step 1: Imports**

Add near the top imports:

```js
import { navigateRecord, navigateSection, currentRecordRef } from '../lib/adminRouter';
```

- [ ] **Step 2: Widen the matcher in the existing open effect**

In the `useEffect` that handles `gm-admin-open-mom`, replace the two `rows.find((r) => r.id === ...)` lookups so they also match username. The pending-id block becomes:

```js
    if (pendingId && rows?.length) {
      const target = rows.find((r) => r.id === pendingId || r.username === pendingId);
      if (target) {
        setSelectedMom(target);
        try { sessionStorage.removeItem('gm-admin-open-mom'); } catch { /* ignore */ }
      }
    }
```

and the event handler becomes:

```js
    const onOpen = (ev) => {
      const ref = ev?.detail?.id;
      if (!ref) return;
      const target = (rows || []).find((r) => r.id === ref || r.username === ref);
      if (target) setSelectedMom(target);
    };
```

- [ ] **Step 3: Add the URL auto-sync effect**

Add a new `useEffect` right after the open effect:

```js
  // Sync the address bar with the open profile (canonical id form).
  useEffect(() => {
    if (selectedMom && selectedMom.id) {
      navigateRecord('mom-profiles', selectedMom.id);
    } else if (!selectedMom && currentRecordRef()) {
      navigateSection('mom-profiles');
    }
  }, [selectedMom]);
```

- [ ] **Step 4: Build + commit**

Run: `npm run build` → PASS

```bash
git add src/screens/admin/sections/MomProfilesSection.jsx
git commit -m "feat(admin): mom-profile deep-link resolves id|username, syncs URL"
```

---

### Task 7: CopyLinkButton component

**Files:**
- Create: `src/screens/admin/components/CopyLinkButton.jsx`

- [ ] **Step 1: Create the component**

```jsx
// Copies a record's canonical admin deep-link to the clipboard. Always uses
// the immutable id form via recordPath(section, id). AC tokens only (admin
// design system) — never the phone-app C tokens.
import { useState } from 'react';
import { Link2, Check } from 'lucide-react';
import { AC } from '../admin-theme';
import { recordPath } from '../lib/adminRouter';

export const CopyLinkButton = ({ section, id, size = 14, title = 'Copy link to this record' }) => {
  const [copied, setCopied] = useState(false);
  if (!id) return null;

  const url = `${window.location.origin}${recordPath(section, id)}`;

  const copy = async (e) => {
    e?.stopPropagation?.();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (non-HTTPS / permissions) — fall back to prompt so
      // the operator can still copy manually.
      try { window.prompt('Copy this link:', url); } catch { /* ignore */ }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const Icon = copied ? Check : Link2;
  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      aria-label={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, borderRadius: 7, cursor: 'pointer',
        background: 'transparent', border: `1px solid ${AC.border}`,
        color: copied ? AC.success : AC.textMuted,
      }}
    >
      <Icon size={size} />
    </button>
  );
};
```

- [ ] **Step 2: Build + commit**

Run: `npm run build` → PASS

```bash
git add src/screens/admin/components/CopyLinkButton.jsx
git commit -m "feat(admin): add CopyLinkButton (canonical id deep-link to clipboard)"
```

---

### Task 8: Mount CopyLinkButton in the three detail modals

**Files:**
- Modify: `src/screens/admin/managers/EventEditModal.jsx` (header area)
- Modify: `src/screens/admin/managers/PlaceEditModal.jsx` (header area)
- Modify: `src/screens/admin/sections/MomProfilesSection.jsx` (`MomProfileDetailModal` header, near the close button ~634)

- [ ] **Step 1: EventEditModal header**

Add the import at the top of `EventEditModal.jsx`:

```js
import { CopyLinkButton } from '../components/CopyLinkButton';
```

In the modal header row (where the `kind`/`event_type`/`StatusBadge` chips render, ~lines 189-199), add the button. Render it only for a saved event (skip the `__new` create form):

```jsx
          {!event.__new && event.id && <CopyLinkButton section="events" id={event.id} />}
```

Place it alongside the existing header chips so it sits at the top-right of the modal.

- [ ] **Step 2: PlaceEditModal header**

Add the import:

```js
import { CopyLinkButton } from '../components/CopyLinkButton';
```

In the `PlaceEditModal` header, alongside its status/info chips, add:

```jsx
          {!place.__new && place.id && <CopyLinkButton section="places" id={place.id} />}
```

- [ ] **Step 3: MomProfileDetailModal header**

In `MomProfilesSection.jsx`, the `MomProfileDetailModal` already imports nothing extra. Add the import at the top of the file (if not already present from Task 6, this is a separate symbol):

```js
import { CopyLinkButton } from '../components/CopyLinkButton';
```

In the modal header, just before the close `Button` (~line 634):

```jsx
          {mom?.id && <CopyLinkButton section="mom-profiles" id={mom.id} />}
```

- [ ] **Step 4: Build + commit**

Run: `npm run build` → PASS

```bash
git add src/screens/admin/managers/EventEditModal.jsx src/screens/admin/managers/PlaceEditModal.jsx src/screens/admin/sections/MomProfilesSection.jsx
git commit -m "feat(admin): copy-link button in event/place/mom detail modals"
```

---

### Task 9: UsersSection — highlight the deep-linked user row

**Files:**
- Modify: `src/screens/admin/sections/UsersSection.jsx`

- [ ] **Step 1: Listen for the deep-link event + track a highlight id**

Add a state with the other `useState`s (after `const [onlyLinked, setOnlyLinked] = useState(false);`):

```js
  const [highlightId, setHighlightId] = useState(null);
```

Add an effect (after the existing data-loading effect) that reads the bridge's pending key + event. The ref for users is the auth-user `id`:

```js
  // Deep-link: /admin/users/<id> highlights (and scrolls to) the row.
  useEffect(() => {
    const apply = (ref) => { if (ref) setHighlightId(ref); };
    try { apply(sessionStorage.getItem('gm-admin-open-user')); } catch { /* ignore */ }
    try { sessionStorage.removeItem('gm-admin-open-user'); } catch { /* ignore */ }
    const onOpen = (ev) => apply(ev?.detail?.id);
    window.addEventListener('gm-admin-open-user', onOpen);
    return () => window.removeEventListener('gm-admin-open-user', onOpen);
  }, []);
```

- [ ] **Step 2: Apply the highlight to the matching row**

Locate where each user row renders (the table maps `filtered` users to rows, keyed by the user id). Add a ref-callback + style so the highlighted row gets a coral ring and scrolls into view. On the row container element, add:

```jsx
        ref={(el) => { if (el && highlightId && u.id === highlightId) el.scrollIntoView({ block: 'center' }); }}
        style={{
          ...(/* existing row style, if any */ {}),
          boxShadow: highlightId && u.id === highlightId ? `0 0 0 2px ${AC.accent}` : undefined,
          borderRadius: highlightId && u.id === highlightId ? 8 : undefined,
        }}
```

If the table is rendered by a shared component that doesn't forward `ref`/`style` per row, instead wrap the highlight logic at the row-cell level: compare `u.id === highlightId` and apply the `boxShadow` to the first cell's container. (Confirm the actual row element when implementing — the file uses a column-config table.)

- [ ] **Step 3: Build + commit**

Run: `npm run build` → PASS

```bash
git add src/screens/admin/sections/UsersSection.jsx
git commit -m "feat(admin): highlight deep-linked user row (/admin/users/<id>)"
```

---

### Task 10: create-event skill — report the admin review link

**Files:**
- Modify: `.claude/skills/create-event/SKILL.md` (step 8 "Report" + the insert `returning` already yields `id`)

- [ ] **Step 1: Update step 8 wording**

Find in the Workflow section:

```
7. **Write** (see below). 8. **Report** the new `id`, the publish state, and —
   if hidden — that it's reviewable/publishable at `/admin` → Events.
```

Replace with:

```
7. **Write** (see below). 8. **Report** the new `id`, the publish state, and a
   direct admin review deep-link: `<host>/admin/events/<id>` (the id is in the
   insert's `returning` clause). The link opens the event's edit modal straight
   away — regardless of the current review-status filter. `<host>` is the dev
   server or deployed admin origin.
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/create-event/SKILL.md
git commit -m "docs(create-event): report admin review deep-link after insert"
```

---

### Task 11: Full manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the app**

Run: `npm run dev` (or the project's admin-serving dev command). Sign into `/admin`.

- [ ] **Step 2: Run the verification matrix**

For **events**, **places**, **mom-profiles**:
1. Copy a real `id` from the DB; open `<host>/admin/<section>/<id>` in a fresh tab → the record's modal opens.
2. Open `<host>/admin/<section>/<slug-or-username>` → also opens (alias path).
3. Open `<host>/admin/<section>/does-not-exist` → not-found banner (events/places) / no-op (mom); no crash.
4. Click a row → address bar becomes `/admin/<section>/<id>`; refresh → modal re-opens.
5. Close the modal → URL returns to `/admin/<section>`; browser back/forward behave.
6. Click the copy-link button in the modal header → clipboard holds the `id` URL; paste to confirm.
7. Deep-link an `approved` event while the default filter is `needs_review` → still opens.

For **users**: open `<host>/admin/users/<auth-user-id>` → the row is highlighted and scrolled into view; the "view profile" jump still works.

For the **create-event skill**: create a test event, confirm the reported `/admin/events/<id>` link opens it.

- [ ] **Step 3: Run the unit test + build once more**

Run: `node --test src/screens/admin/lib/adminRouter.test.mjs` → PASS
Run: `npm run build` → PASS

- [ ] **Step 4: Final integration commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "fix(admin): deep-link verification adjustments"
```

---

## Self-review notes

- **Spec coverage:** URL scheme (Task 1), bridge (Task 3), id-or-alias matching (Tasks 4-6), URL auto-sync (Tasks 4-6), copy-link affordance (Tasks 7-8), Users highlight (Task 9), skill tie-in (Task 10), error handling (not-found banners in Tasks 4-5; clipboard fallback in Task 7), testing (Tasks 1 + 11) — all mapped.
- **Identifier:** every generated link uses `id` (Tasks 4-9 navigate/copy with `row.id`); slug/username only widen the inbound matcher — matches the approved id-canonical decision.
- **Naming consistency:** `parseAdminPath`, `recordPath`, `navigateRecord`, `currentRecordRef`, `navigateSection`, `useAdminDeepLink`, `CopyLinkButton`, `gm-admin-open-<entity>`, `deepLinkMiss`, `highlightId` are used identically across all tasks.
- **Collision note:** the admin AI-assist branch edits these same files. Tasks 4-9 add focused, append-style changes (one new effect + one widened matcher per file) to minimize merge conflicts; resolve at merge.
- **Line numbers** (e.g. `~332`, `~634`) are approximate against the current `feat/admin-record-deep-links` (master) tree — locate by the quoted surrounding code, not the number.
