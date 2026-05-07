# Admin Mom-Profile Photo Lightbox — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Click any thumbnail in the admin mom-profile detail modal to open a full-screen lightbox with prev/next chevron navigation that loops at both ends; close via X, backdrop click, or Esc.

**Architecture:** All work lands in `src/AdminPage.jsx`. The detail modal gains a single `lightboxIndex` state and conditionally renders a new sibling component `MomPhotoLightbox` (defined in the same file). The lightbox owns its own internal `index` state. The modal's existing Esc handler is gated on `lightboxIndex === null` so Esc closes the topmost overlay only.

**Tech Stack:** React 18 (function components, hooks only), Tailwind utility classes mixed with inline `style` for tokens, lucide-react icons, the existing `C` design-token export from `src/theme.js`. No new dependencies.

---

## Reference: spec & key files

- Spec: `docs/superpowers/specs/2026-05-07-admin-mom-profile-photo-lightbox-design.md`
- File to modify (only): `src/AdminPage.jsx` (~1400 lines)
- `MomProfileDetailModal` component: starts at `src/AdminPage.jsx:545` (search for `const MomProfileDetailModal = (`)
- Existing Esc useEffect inside the modal: `src/AdminPage.jsx:553-557`
- Photos section to convert: inside the modal body, around line 753 (search for `<Section title="Photos">`)
- Existing imports: `useEffect, useMemo, useState` from React (line 1); icons from lucide-react (lines 2-5) currently include `X` (no `ChevronLeft` / `ChevronRight` yet); `C` from `./theme` (line 6)
- Backdrop convention: parent modal uses `${C.ink}8C` (~55% opacity); lightbox uses `${C.ink}D9` (~85% opacity) — must fully obscure the modal underneath
- Animations available globally in `src/index.css`: `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`. Apply via inline `style={{ animation: '…' }}`.

---

## Notes on testing & local dev

The repo has **no automated test framework** (per `.claude/context/overview.md`). Each task ends with `npm run build` and a manual UI sanity check, then a commit.

For UI verification, `npm run dev` is enough — this feature involves no API calls, just local React state.

---

## Task 1: Add lucide-react chevron imports

Tiny prep task — getting the icons into the import block before any component uses them. Done as its own commit so the diff is clean.

**Files:**
- Modify: `src/AdminPage.jsx:2-5` (the lucide-react import block)

- [ ] **Step 1: Locate the current import**

The current line 2-5 of `src/AdminPage.jsx` reads:

```jsx
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff,
  Monitor, Smartphone, Zap, Trash2, ShieldAlert, Check as CheckIcon, Sprout, X,
} from 'lucide-react';
```

- [ ] **Step 2: Add `ChevronLeft` and `ChevronRight`**

Replace with:

```jsx
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff,
  Monitor, Smartphone, Zap, Trash2, ShieldAlert, Check as CheckIcon, Sprout, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
```

- [ ] **Step 3: Verify build still passes**

Run: `npm run build`
Expected: build succeeds, no errors. The icons are unused at this point — bundlers tree-shake them, no warning.

- [ ] **Step 4: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "chore(admin): import ChevronLeft/Right for upcoming photo lightbox"
```

---

## Task 2: Add `MomPhotoLightbox` component

Define the new top-level component in the same file, immediately below `MomProfileDetailModal`. The component is fully functional as soon as it's mounted with valid props — Task 3 wires it into the modal.

**Files:**
- Modify: `src/AdminPage.jsx` — append a new `const MomPhotoLightbox = …` right after `MomProfileDetailModal` ends (before the `// =====…` comment that starts the next section, currently `// Mom profiles tab`).

- [ ] **Step 1: Locate the insertion site**

Find the closing `};` of `MomProfileDetailModal` (the line after the final `</div>` of the modal's outermost return, around line 940). Just below it (and above the `// =====` divider for `MomProfilesTab`) is where the new component goes.

- [ ] **Step 2: Insert the component**

Insert this block immediately after `MomProfileDetailModal`'s closing `};`:

```jsx
// Full-screen photo lightbox over the detail modal. Click thumbnail in the
// modal's Photos section to open. Loops at both ends; close via X, backdrop, or Esc.
const MomPhotoLightbox = ({ photos, initialIndex, onClose }) => {
  // Defensive clamp in case caller passed an out-of-range initialIndex.
  const clampedInitial = Math.max(0, Math.min(initialIndex ?? 0, (photos?.length ?? 1) - 1));
  const [index, setIndex] = useState(clampedInitial);

  // Esc closes the lightbox. The parent modal's own Esc listener
  // short-circuits while lightboxIndex !== null, so this listener owns Esc.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!photos || photos.length === 0) return null;

  const total = photos.length;
  const showNav = total > 1;
  const next = (e) => {
    e?.stopPropagation();
    setIndex(i => (i + 1) % total);
  };
  const prev = (e) => {
    e?.stopPropagation();
    setIndex(i => (i - 1 + total) % total);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: `${C.ink}D9`, animation: 'fadeIn 0.15s ease-out' }}
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${total}`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        autoFocus
        aria-label="Close enlarged photo"
        className="absolute top-4 right-4 rounded-full p-2 transition-colors"
        style={{ background: C.paper, color: C.ink, border: `1px solid ${C.divider}` }}
      >
        <X size={20}/>
      </button>

      {showNav && (
        <button
          onClick={prev}
          aria-label="Previous photo"
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors"
          style={{ background: C.paper, color: C.ink, border: `1px solid ${C.divider}` }}
        >
          <ChevronLeft size={24}/>
        </button>
      )}

      <img
        onClick={(e) => e.stopPropagation()}
        src={photos[index]}
        alt=""
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          animation: 'fadeInUp 0.2s ease-out',
        }}
      />

      {showNav && (
        <button
          onClick={next}
          aria-label="Next photo"
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors"
          style={{ background: C.paper, color: C.ink, border: `1px solid ${C.divider}` }}
        >
          <ChevronRight size={24}/>
        </button>
      )}

      {showNav && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[12.5px]"
          style={{ fontFamily: 'Albert Sans', color: C.cream, fontWeight: 600 }}
        >
          {index + 1} / {total}
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: build succeeds. The component is defined but not mounted anywhere yet — no warning expected.

- [ ] **Step 4: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): MomPhotoLightbox component (not yet wired)"
```

---

## Task 3: Add `lightboxIndex` state to `MomProfileDetailModal`

Adds the parent state that controls whether the lightbox is rendered. Doesn't yet wire the photo clicks (Task 4) or the Esc gate (Task 5) — keeps each diff small.

**Files:**
- Modify: `src/AdminPage.jsx` — `MomProfileDetailModal` component body

- [ ] **Step 1: Locate the existing state hooks**

Inside `MomProfileDetailModal` (search for `const MomProfileDetailModal = (`), find the existing useState calls. Currently at lines 549-550:

```jsx
  const [pendingFlag, setPendingFlag] = useState(null); // 'verified' | 'visible' | 'blocked_global' | null
  const [actionError, setActionError] = useState(null);
```

- [ ] **Step 2: Add `lightboxIndex` state**

Add a new line just above `pendingFlag`:

```jsx
  const [lightboxIndex, setLightboxIndex] = useState(null); // null | number — index into mom.photos
  const [pendingFlag, setPendingFlag] = useState(null); // 'verified' | 'visible' | 'blocked_global' | null
  const [actionError, setActionError] = useState(null);
```

- [ ] **Step 3: Render the lightbox conditionally as a sibling to the modal panel**

Find the modal's closing tags. The structure currently looks like:

```jsx
  return (
    <div onClick={onClose} ... /* backdrop */ >
      <div onClick={(e) => e.stopPropagation()} ... /* panel */ >
        {/* header, body, footer */}
      </div>
    </div>
  );
```

The closing two `</div>` lines look like:

```jsx
      </div>
    </div>
  );
```

Replace with:

```jsx
      </div>
      {lightboxIndex !== null && (
        <MomPhotoLightbox
          photos={mom.photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
```

The lightbox renders INSIDE the parent modal's outer backdrop div but OUTSIDE the inner panel div. Since the parent backdrop has its own `onClick={onClose}`, but the lightbox has `onClick={(e) => e.stopPropagation()}` on its own elements, clicks on the lightbox's backdrop bubble up to... wait — actually the lightbox's backdrop is `onClick={onClose}` (its own onClose, which sets `lightboxIndex` to null). The lightbox's `onClose` does NOT bubble to the parent modal's `onClose` because the lightbox's outer div has its own `onClick` handler that calls `e` — let me recheck.

The lightbox's outer div has `onClick={onClose}` (its own onClose). This click event will bubble up to the parent modal's outer div, which also has `onClick={onClose}` (the modal's onClose). To prevent the modal from closing when the user clicks the lightbox backdrop, we need to stop propagation. Update the lightbox to wrap its onClose with stopPropagation:

(Actually the lightbox is INSIDE the modal's outer backdrop div, so clicks on the lightbox backdrop will bubble. We need to prevent that.)

- [ ] **Step 4: Update `MomPhotoLightbox`'s outer div to stop propagation**

Find this in `MomPhotoLightbox` (the outermost `<div>`):

```jsx
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
```

Replace with:

```jsx
    <div
      onClick={(e) => { e.stopPropagation(); onClose(); }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
```

This stops the click from bubbling up to the parent modal's backdrop. The lightbox closes; the parent modal stays open.

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): wire MomPhotoLightbox into detail modal (state + render)"
```

---

## Task 4: Make photo thumbnails clickable

Convert each `<img>` in the Photos section into a `<button>` that opens the lightbox at that index.

**Files:**
- Modify: `src/AdminPage.jsx` — the Photos `<Section>` block inside the modal body, around lines 753-769

- [ ] **Step 1: Locate the Photos section**

Search for `<Section title="Photos">` inside `MomProfileDetailModal`. The current block looks like:

```jsx
          <Section title="Photos">
            {Array.isArray(mom.photos) && mom.photos.length ? (
              <div className="flex flex-wrap gap-1.5">
                {mom.photos.map((url, i) => (
                  <img
                    key={`${url}-${i}`}
                    src={url}
                    alt=""
                    className="rounded-lg"
                    style={{ width: 44, height: 44, objectFit: 'cover', border: `1px solid ${C.divider}` }}
                  />
                ))}
              </div>
            ) : (
              <span className="text-[12.5px]" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>No photos</span>
            )}
          </Section>
```

- [ ] **Step 2: Replace each `<img>` with a `<button>`-wrapped `<img>`**

Replace the entire block above with:

```jsx
          <Section title="Photos">
            {Array.isArray(mom.photos) && mom.photos.length ? (
              <div className="flex flex-wrap gap-1.5">
                {mom.photos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    aria-label={`Enlarge photo ${i + 1}`}
                    className="rounded-lg transition-transform hover:scale-[1.04] focus:outline-none"
                    style={{ padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', display: 'block' }}
                  >
                    <img
                      src={url}
                      alt=""
                      className="rounded-lg block"
                      style={{ width: 44, height: 44, objectFit: 'cover', border: `1px solid ${C.divider}` }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <span className="text-[12.5px]" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>No photos</span>
            )}
          </Section>
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Quick UI smoke check**

Run `npm run dev` and visit `http://localhost:5173/#admin` → Mom profiles. Under `npm run dev` real Supabase data won't load (API routes don't run), so this step is purely a "does it compile and render without crashing" check. Open DevTools → Console: should be free of new errors.

If there's no real data, you can still verify by editing `src/AdminPage.jsx` temporarily to inject a test mom, but that's optional. The full UI test happens at Task 6.

- [ ] **Step 5: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): clickable photo thumbnails open lightbox"
```

---

## Task 5: Gate the parent modal's Esc handler on `lightboxIndex`

When the lightbox is open, Esc should close only the lightbox, not the parent modal. The lightbox already has its own Esc handler (Task 2); the fix is to make the parent's handler short-circuit.

**Files:**
- Modify: `src/AdminPage.jsx` — the existing `useEffect` in `MomProfileDetailModal` that listens for Esc, currently at lines 552-557.

- [ ] **Step 1: Locate the existing Esc useEffect**

Inside `MomProfileDetailModal` (search for `// Esc closes the modal.`), find:

```jsx
  // Esc closes the modal. Scoped via useEffect so we don't leak listeners.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
```

- [ ] **Step 2: Gate on `lightboxIndex`**

Replace with:

```jsx
  // Esc closes the modal — but only when no lightbox is open. The lightbox
  // registers its own Esc handler, so when both listeners fire, this one
  // short-circuits and the lightbox handles the keystroke.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && lightboxIndex === null) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, lightboxIndex]);
```

Two things changed: the body checks `lightboxIndex === null`, and the dependency array now includes `lightboxIndex` so the listener re-binds when it flips between null and a number.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "fix(admin): gate modal Esc handler when lightbox is open"
```

---

## Task 6: Final QA pass

No code changes (unless QA reveals deviations). Walk through the spec's Testing scenarios end-to-end. Best done against a deployed Vercel preview where real `mom_profiles` rows exist (some with multiple photos, some with one, some with none).

- [ ] **Step 1: Multi-photo mom — open and navigate**

Pick a mom in the seeded data with 3+ photos. Click her row → modal opens → Photos section shows thumbnails.

- ✅ Hover a thumbnail: cursor becomes pointer, thumb scales up subtly (~4%).
- ✅ Click a thumbnail: lightbox opens with that photo at large size, dark backdrop covers the page, X visible top-right, ChevronLeft/ChevronRight visible on edges, "1 / 5"-style counter visible at bottom-center.
- ✅ Click right chevron: next photo loads, counter increments.
- ✅ At the last photo, click right chevron: wraps to first, counter shows "1 / N".
- ✅ At the first photo, click left chevron: wraps to last.

- [ ] **Step 2: Dismiss behaviors**

- ✅ Click the X button: lightbox closes, parent modal still visible.
- ✅ Click somewhere outside the image (on the dark backdrop): lightbox closes, parent modal still visible. The parent modal does NOT close.
- ✅ Click directly ON the image: lightbox stays open.
- ✅ Click directly on a chevron button: navigation happens, lightbox stays open.
- ✅ Press Esc: lightbox closes, parent modal still visible.
- ✅ Press Esc again: parent modal closes.

- [ ] **Step 3: Single-photo mom**

Pick a mom with exactly 1 photo. Open her profile, click the thumbnail.

- ✅ Lightbox opens.
- ✅ No chevrons visible.
- ✅ No "1 / 1" counter visible.
- ✅ X button works. Backdrop click works. Esc works.

- [ ] **Step 4: Zero-photo mom**

Pick a mom with no photos. Open her profile.

- ✅ Photos section shows muted "No photos" text.
- ✅ Nothing is clickable in the Photos section.

- [ ] **Step 5: Broken photo URL**

If the seed data includes a mom with a known-broken photo URL (or you can DevTools-inject one via React DevTools), open her profile and click the bad thumbnail.

- ✅ Lightbox opens, shows the browser's broken-image glyph at the photo's natural size, doesn't crash.
- ✅ Navigation to the next photo (if any) works normally.

- [ ] **Step 6: Stacked overlays — flag toggles still work**

While a lightbox is open, the parent modal's flag-toggle buttons are obscured by the dark backdrop and unreachable. Close the lightbox, click a flag toggle in the parent modal — it should still work as before. (This is verifying we didn't break the prior feature.)

- [ ] **Step 7: Note any deviations**

If anything is off, fix inline before declaring done. If all 6 scenarios pass, no commit needed for this task — it's verification.

---

## File summary

After all tasks complete, the only files changed in this branch addition:

| File | Action | Purpose |
|---|---|---|
| `src/AdminPage.jsx` | Modify | Add lucide imports, add `MomPhotoLightbox`, add `lightboxIndex` state, wire photo clicks, gate parent Esc |
| `docs/superpowers/specs/2026-05-07-admin-mom-profile-photo-lightbox-design.md` | (already committed) | Spec |
| `docs/superpowers/plans/2026-05-07-admin-mom-profile-photo-lightbox.md` | (this file) | Plan |

No new component files. No new endpoints. No schema changes. No new dependencies.
