# PlaceDetailSheet — place / program / school detail

- **File:** `src/sheets/PlaceDetailSheet.jsx` (370 lines)
- **Purpose:** Immersive detail view for a place, program, or school. Photo carousel hero, meta rows (rating, address, hours, ages), amenities, description, Get Directions primary CTA, secondary actions (Interested, Save, Share), and a social-proof "12 moms visited" footer.
- **Entry / when shown:** From `HomeTab`, `LocalPicksTab`, `ConnectTab`. When `fullScreen=true` (Home tab treatment), rendered as a full-phone view with back arrow. When `fullScreen=false` (Local Picks filter flow), used as a narrower treatment.
- **Related components/sheets:** Does NOT wrap `Sheet` primitive. Renders a raw `div.absolute.inset-0.z-40` at line 77 — a full-phone-height overlay regardless of the `fullScreen` prop value.
- **Data dependencies:** Static from `place` prop. No internal API calls. All data must be in the prop.

## Current state (wireframe)

```
┌─────────────────────────────────────────┐
│  [hero photo 240px, swipeable]          │
│  [gradient overlay]                     │
│  [←] or [X]  (top left vs right)       │  ← close/back, white circle
│                                         │
│  [photo page dots if multi-photo]       │
│  PLACE / PROGRAM                        │  ← eyebrow, white text
│  Name of this place                     │  ← Fraunces 24px, white
│                                         │
├─────────────────────────────────────────┤
│  ★ 4.8 · 234 reviews                   │  ← saffron
│  📍 123 Bayshore Blvd · 1.2 mi         │
│  ✨ Ages 0–5                            │  ← coralDeep
│  🕐 Mon–Fri 9am–5pm                    │  ← sageDark
│                                         │
│  [place tag chip, sage]                 │
│                                         │
│  ABOUT THIS PLACE                       │
│  (description, 3-line clamp, Read more) │
│                                         │
│  GOOD TO KNOW                           │
│  [Stroller-friendly] [Changing table]   │
│  [Highchairs] [Quiet area]              │
│                                         │
│  ┌─ Phone ─┬─ Website ─────────────┐   │
│  │ [call]  │ [website]             │   │  ← coral bg icon tiles
│  └─────────┴────────────────────────┘   │
│                                         │
│  [ 🧭 Get directions ]                  │  ← coral gradient, primary CTA
│                                         │
│  [Interested] [Save] [Share]            │
│                                         │
│  [Discuss this place]                   │  ← sage bg, only if onDiscuss
│                                         │
│  ┌─ social proof ─────────────────────┐ │
│  │ ✓  12 moms in your area visited    │ │  ← HARDCODED "12 moms"
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Does not use `Sheet` primitive | **High** | `PlaceDetailSheet` at line 77 renders `<div className="absolute inset-0 z-40 flex flex-col">` — it bypasses the `Sheet` component entirely. It implements its own z-index, animation, scroll container, and close button. The `Sheet` primitive (and its `fullScreen` mode) was specifically designed for this pattern (`Sheet.jsx` comment: "full-screen is now an explicit per-sheet OPT-IN via `fullScreen`, used only for the Home-tab detail 'screens'"). | Refactor to use `<Sheet fullScreen bleedTop onClose={onClose}>` and remove the manually-managed overlay div, animation, and scroll container. This aligns with `EventDetailSheet` (which uses `Sheet` correctly at line 145) and reduces maintenance divergence. |
| 2 | Hardcoded "12 moms" social proof | **High** | Line 305: `<strong style={{ color: C.sageDark }}>12 moms</strong> in your area visited this week` is static. This number never changes, making it immediately look seeded. | Drive from `place.visitCount` or a live API value; if unavailable, hide the row entirely rather than show a fake count. |
| 3 | Hardcoded FALLBACK_AMENITIES | **Medium** | Lines 28–31: `FALLBACK_AMENITIES = ['Stroller-friendly', 'Changing table', 'Highchairs', 'Quiet area']` — these default amenities appear on every place that lacks real amenity data. They are not accurate for all place types (a park doesn't have highchairs). | Return `null` / hide the "Good to know" section when `place.amenities` is empty, instead of fabricating plausible-sounding amenities. Or limit fallback to `place.kind === 'Place'` vs `'Program'` vs `'School'`. |
| 4 | FALLBACK_DESCRIPTION_BY_KIND | **Medium** | Lines 23–27: three fallback descriptions are plausible but fabricated. "Verified by other moms in your area" (for places) and "Mom-vetted school" (for schools) at lines 24, 26 are trust signals that may be false for specific locations. | Show no description section rather than fabricating. Or label fallback descriptions clearly as "No description yet" with an invitation to leave a review. |
| 5 | `onShare` called for "Call" action | **Medium** | Line 241: `onClick={() => onShare?.(place, 'call')}` for the Phone tile. The "Call" action should use `window.open(\`tel:${place.phone}\`)` — calling `onShare` for a phone call is a semantic mismatch that may silently fail if `onShare` only handles share-sheet cases. | Use `onClick={() => place.phone && window.open(\`tel:${place.phone}\`)}` for the Call tile. Same for Website: `window.open(place.website, '_blank', 'noopener')`. |
| 6 | Hardcoded rgba values | **Low** | Multiple hardcoded rgba: `rgba(0,0,0,.28)` (gradient overlay line 108), `rgba(0,0,0,.35)` (close button shadow line 123), `rgba(0,0,0,.45)` (page dot shadow line 136), `rgba(255,255,255,.92)` (close bg line 121), `rgba(255,255,255,.55)` (inactive dot line 135). These are one-off dark-overlay / light-on-image values with no token equivalent. | Extract as local constants at the top of the file: `const PHOTO_SCRIM = 'rgba(0,0,0,.28)'`, etc. Not a visual issue but improves maintainability. |
| 7 | `activePhoto` scroll-to-index skips snap | **Low** | Line 88: `setActivePhoto(Math.round(el.scrollLeft / el.clientWidth))` — `scrollLeft/clientWidth` rounding can skip index when mid-scroll. Proper snap-to-index requires a `ResizeObserver` or `IntersectionObserver` per slide. | Use `IntersectionObserver` with `threshold: 0.5` on each photo div for reliable active-index detection. Low priority for prototype. |
| 8 | `Interested` accent uses `C.saffron` | **Medium** | Line 263: `accent={C.saffron}` for the Interested tile's active state. Saffron is the premium token. "Interested" is not a premium action — it's available to all verified moms. | Use `C.coralSoft` / `C.coral` as the Interested active accent, consistent with the overall "save/signal intent" color language used elsewhere. |

## Key issues (prose, ranked)

1. **Bypasses `Sheet` primitive (High).** `EventDetailSheet` uses `<Sheet fullScreen ...>` correctly; `PlaceDetailSheet` implements its own full-screen overlay. This creates two code paths for the same pattern, making future changes to the Sheet primitive (e.g., safe-area insets, focus trapping) apply to EventDetail but not PlaceDetail.

2. **Hardcoded "12 moms" (High).** Static social proof is immediately obvious to returning users and erodes trust in the entire reviews system.

3. **Fabricated amenities and descriptions (Medium).** Showing "Changing table" for a park or "Verified by other moms" for a place that was not mom-verified is a trust signal false alarm.

4. **`onShare` called for phone Call action (Medium).** Semantic mismatch; phone calls may silently fail.

## Recommended redesign (structural)

```
── refactored to Sheet primitive ────────

<Sheet fullScreen={fullScreen} bleedTop onClose={onClose}>
  <div className="pb-8">
    {/* hero, same content */}
    {/* meta, description, amenities */}
    {/* social proof: only if place.visitCount > 0 */}
  </div>
</Sheet>

── social proof: data-driven ─────────────
{place.visitCount > 0 && (
  <div ...>
    <strong>{ place.visitCount } moms</strong> in your area visited this week
  </div>
)}

── "Good to know": no fabrication ───────
{place.amenities?.length > 0 && (
  <Section>...real amenities...</Section>
)}
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| Overlay pattern | Manual div, custom animation | `Sheet fullScreen bleedTop` |
| Social proof count | Always "12 moms" | `place.visitCount` or hidden |
| Amenities | Fallback 4 always shown | Hidden if no real data |
| Description | Fallback "Verified by moms" | Hidden or honest fallback |
| Call tile onClick | `onShare(place, 'call')` | `window.open('tel:...')` |
| Interested active color | `C.saffron` (premium) | `C.coral` |

## Implementation notes

- `PlaceDetailSheet.jsx:77-312` — wrap in `<Sheet fullScreen={fullScreen} bleedTop onClose={onClose}>` and remove the `absolute inset-0` wrapper div
- `PlaceDetailSheet.jsx:299-310` — add `place.visitCount > 0 &&` guard before social-proof block
- `PlaceDetailSheet.jsx:28-31` — change to show amenities section only when `place.amenities?.length > 0`
- `PlaceDetailSheet.jsx:64` — change description fallback: `const description = place.description || null;` and conditionally render the About section
- `PlaceDetailSheet.jsx:241` — `onClick={() => place.phone && window.open(\`tel:${place.phone}\`)}`; Website: `onClick={() => place.website && window.open(place.website, '_blank', 'noopener')}`
- `PlaceDetailSheet.jsx:263` — change `accent={C.saffron}` to `accent={C.coral}`

## Acceptance criteria

- [ ] `PlaceDetailSheet` uses `Sheet` primitive (fullScreen + bleedTop); custom overlay div removed
- [ ] "12 moms" social proof hidden unless `place.visitCount > 0`
- [ ] Amenities section hidden when `place.amenities` is empty
- [ ] "About this place" section hidden when description is null
- [ ] Call tile calls `tel:` directly; Website tile opens `_blank`
- [ ] Interested active color is `C.coral`, not `C.saffron`
- [ ] `npm run build` passes with no new errors
