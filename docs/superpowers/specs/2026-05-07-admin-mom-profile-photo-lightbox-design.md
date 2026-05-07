# Admin · Mom-profile photo lightbox

**Status:** Spec · 2026-05-07
**Surface:** `/admin` → "Mom profiles" → row click → detail modal → click any photo
**Files in scope:** `src/AdminPage.jsx` (only)
**Branch:** `feat/admin-mom-profile-detail` (extends the in-flight feature; ships as one)

## Problem

The detail modal (Task 5 of the prior spec) shows a row of 44×44 photo thumbnails inside the Photos section. Admins viewing a mom's profile have no way to see the photo at full size, no way to inspect each photo individually, and no way to compare across photos. For verification work — confirming a verified mom's actual face matches what's in seed data, or judging photo quality before approving a profile — thumbnails aren't enough.

## Goals

1. Click any thumbnail in the modal's Photos section → enlarged image overlay opens.
2. While enlarged, navigate prev/next through the mom's `photos[]` via on-screen arrow buttons. Wrap around at both ends.
3. Three ways to dismiss: X button, click on the backdrop outside the image, or Esc.
4. The parent profile modal stays visible (and unchanged) underneath; closing the lightbox returns to it.

## Non-goals

- Keyboard arrow-key navigation, touch swipe gestures, thumbnail strip — explicitly cut during brainstorming.
- Pinch-to-zoom or pan-while-zoomed within the enlarged view.
- Lazy-loading or pre-loading neighbor photos.
- Downloading or copying a photo URL.
- Edit/delete photos from the lightbox (the modal as a whole stays read-only beyond the three flag toggles).

## User flow

1. Admin opens a mom's profile (existing behavior).
2. Photos section is now visually a row of clickable thumbnails — cursor pointer on hover, subtle scale-up.
3. Admin clicks a thumb at index `i`. The lightbox opens, displaying that photo at large size.
4. Admin clicks the right chevron → photo at index `(i + 1) % length` shows. Continues looping forward, or clicks left chevron to step backward.
5. Admin clicks the X, the dim backdrop, or presses Esc → lightbox closes. The detail modal underneath is unchanged and still focused.
6. Pressing Esc again closes the parent modal as before.

## Architecture

### State

`MomProfileDetailModal` gains one piece of state:

```js
const [lightboxIndex, setLightboxIndex] = useState(null); // null | number
```

When non-null, the modal renders `<MomPhotoLightbox photos={mom.photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />` as a sibling to its panel `<div>`. This means the lightbox is portaled-by-position above the modal in the DOM tree (no React Portal needed — it just lives inside the same fixed-position root and uses a higher z-index).

`MomPhotoLightbox` owns its own internal state:

```js
const [index, setIndex] = useState(initialIndex);
```

Loop math: `setIndex(i => (i + 1) % photos.length)` for next, `setIndex(i => (i - 1 + photos.length) % photos.length)` for prev.

### Component placement

`MomPhotoLightbox` is defined as a top-level `const` in `src/AdminPage.jsx`, immediately below `MomProfileDetailModal`. Same single-file convention the rest of the admin uses. No separate file.

### Esc handling — interaction between modal and lightbox

The parent modal already registers a document-level `keydown` listener that closes the modal on Esc. With the lightbox present, that single listener would close both stacked overlays in one keystroke.

Fix: gate the parent's Esc on `lightboxIndex === null`. Modify the existing `useEffect` in `MomProfileDetailModal` from:

```js
useEffect(() => {
  const onKey = (e) => { if (e.key === 'Escape') onClose(); };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [onClose]);
```

to:

```js
useEffect(() => {
  const onKey = (e) => {
    if (e.key === 'Escape' && lightboxIndex === null) onClose();
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}, [onClose, lightboxIndex]);
```

`MomPhotoLightbox` registers its own keydown listener that calls `onClose()` on Esc. Both listeners fire on Esc when the lightbox is open, but the parent's listener short-circuits on the `lightboxIndex !== null` check.

### Lightbox layout

```
┌────────────────────────────────────────────┐  fixed inset-0 z-[60]
│                                       [×]  │  top-right close (44×44)
│                                            │
│              ┌──────────────┐              │
│  [<]         │  enlarged    │         [>]  │  prev/next on edges
│              │   photo      │              │  (hidden if photos.length <= 1)
│              └──────────────┘              │
│                                            │
│                  3 / 5                     │  photo counter (only if length > 1)
└────────────────────────────────────────────┘
```

- **Backdrop:** `fixed inset-0 z-[60] flex items-center justify-center p-4`, background `${C.ink}D9` (≈85% opacity), animation `fadeIn 0.15s ease-out`. `onClick={onClose}`.
- **Image:** `<img>` with `style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }}`, `animation: 'fadeInUp 0.2s ease-out'`. Wrapped in a div with `onClick={(e) => e.stopPropagation()}` so clicks don't dismiss.
- **Close X:** absolutely positioned top-right (`absolute top-4 right-4`), 44×44 rounded button, `<X size={20}/>`, paper bg, divider border, on hover slight bg shift.
- **Prev/Next:** `<ChevronLeft />` / `<ChevronRight />` (lucide-react, size 24), 44×44 rounded buttons, `absolute left-4` / `right-4`, vertically centered (`top-1/2 -translate-y-1/2`). Both hidden when `photos.length <= 1`. Each has `onClick={(e) => { e.stopPropagation(); /* setIndex */ }}`.
- **Counter:** `absolute bottom-4 left-1/2 -translate-x-1/2`, Albert Sans 12.5px, color `C.cream` (light text on dark backdrop). Only renders when `photos.length > 1`. Format: `${index + 1} / ${photos.length}`.

### Photos section — making thumbs clickable

Current Photos section renders each photo as a plain `<img>`. Replace each `<img>` with a `<button>` wrapping the same `<img>` plus interactivity:

```jsx
<button
  key={`${url}-${i}`}
  type="button"
  onClick={() => setLightboxIndex(i)}
  aria-label={`Enlarge photo ${i + 1}`}
  className="transition-transform hover:scale-[1.04] focus:outline-none focus:ring-2 rounded-lg"
  style={{ ['--tw-ring-color']: C.ink }}
>
  <img
    src={url}
    alt=""
    className="rounded-lg block"
    style={{ width: 44, height: 44, objectFit: 'cover', border: `1px solid ${C.divider}` }}
  />
</button>
```

`setLightboxIndex` is plumbed in as a prop on the existing Photos rendering — but since the entire body is inlined inside `MomProfileDetailModal`, just close over the local state.

### Lucide-react import additions

The current import already brings in `X` (Task 3). Add `ChevronLeft` and `ChevronRight`:

```js
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff,
  Monitor, Smartphone, Zap, Trash2, ShieldAlert, Check as CheckIcon, Sprout, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
```

## Edge cases

- **Single-photo mom:** `photos.length === 1`. Lightbox opens with the one photo, no chevrons, no counter. X / backdrop / Esc still close.
- **Zero photos:** Photos section already shows "No photos" muted text; nothing is clickable, so the lightbox can't open. Fine.
- **Photo URL fails to load:** browser shows the broken-image icon at the photo's natural size. Acceptable for an admin tool — surfaces the issue rather than hiding it.
- **`mom.photos` mutates while lightbox is open:** the parent modal's `mom` prop changes only via `onPatched` (the flag toggles), and those don't touch `photos`. No race to worry about.
- **Lightbox open while user toggles a flag:** the flag toggles target the parent modal, not the lightbox. The lightbox's `photos` prop is captured at mount; the parent modal's content updates underneath but is hidden by the lightbox backdrop. Fine.

## Design tokens

Strict token discipline per `CLAUDE.md`:

| Element | Token / value |
|---|---|
| Backdrop bg | `${C.ink}D9` (≈85% opacity ink — slightly darker than the parent modal's `${C.ink}8C` since this layer needs to fully obscure it) |
| Close button bg | `C.paper` |
| Close button border | `C.divider` |
| Close button icon | `C.ink` |
| Chevron buttons | same as close — `C.paper` bg, `C.divider` border, `C.ink` icon |
| Counter text | `C.cream` (legible on the dark backdrop) |
| Image border | none (the photo itself fills its container; admin doesn't need a frame) |

Animations reuse existing keyframes from `src/index.css`: `fadeIn` for the backdrop, `fadeInUp` for the image. The chevrons and close X appear with their parent (no individual entrance animation — three separate motions on a small overlay would feel busy). No new keyframes.

## Accessibility

- Backdrop has `role="dialog" aria-modal="true" aria-label={`Photo ${index + 1} of ${photos.length}`}`.
- Close button: `aria-label="Close enlarged photo"`.
- Prev: `aria-label="Previous photo"`. Next: `aria-label="Next photo"`.
- The first focusable element on mount is the close button (`autoFocus` on it).
- Photo `<img>` keeps `alt=""` (decorative — the dialog's `aria-label` provides the count, the modal's parent provides the mom identity).
- Esc closes the lightbox (matches the parent modal's pattern).

Keyboard arrow-key navigation was explicitly cut. Tab order inside the lightbox cycles X → Prev → Next (when present); the focus trap is implicit since these are the only interactive elements.

## Error handling

- Image load failure: render the native broken-image icon. No retry button, no toast. (Admin tool, low risk.)
- `lightboxIndex` somehow out of range: clamp at mount time with `Math.max(0, Math.min(initialIndex, photos.length - 1))`. Defensive, low cost.
- `photos` prop is `undefined`: the lightbox short-circuits early — `if (!photos || !photos.length) return null` at the top of the component. The modal's `setLightboxIndex` call already guards against the empty case (the photos section only renders the click target when there are photos).

## Testing

No automated test framework yet. Manual verification:

1. Open a mom with multiple photos → click a thumb → lightbox opens, enlarged photo visible, X/chevrons/counter present.
2. Click right chevron → next photo. From the last, right chevron loops to the first.
3. Click left chevron → previous photo. From the first, left chevron loops to the last.
4. Press Esc → lightbox closes, parent modal still visible. Press Esc again → parent modal closes.
5. Click the dim backdrop area outside the image → lightbox closes.
6. Click ON the image → does not close.
7. Click the X → lightbox closes.
8. Open a mom with exactly 1 photo → lightbox shows photo, no chevrons, no counter.
9. Open a mom with 0 photos → "No photos" muted text, nothing clickable.
10. Open a mom with a broken photo URL → broken-image glyph, lightbox doesn't crash.

## Out of scope (future work)

- Keyboard arrow navigation
- Touch swipe
- Thumbnail strip at bottom
- Pinch-to-zoom
- Photo deletion / reorder
- Image preloading for next/prev
