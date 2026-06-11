# Components overview — 2026-06-11 audit

All 14 components in `src/components/` audited against the Go Mama design system rubric.

---

## Summary table

| Component | File | Used-by count | Top issue | Severity |
|---|---|---|---|---|
| PhoneFrame | `PhoneFrame.jsx` | 1 (App.jsx) | `#1B1517` hardcoded twice; should be `C.premium` | Medium |
| StatusBar | `StatusBar.jsx` | 8 call sites | Returns `null`; entire component + 8 imports are dead code | Low |
| Dot | `Dot.jsx` | 0 call sites | Completely orphaned; HeroCarousel reimplements the pattern inline with different sizes | High |
| PrimaryBtn | `PrimaryBtn.jsx` | 5 (onboarding only) | 26+ sheets each roll their own inline CTA button — fragmented, inconsistent heights/radii | High |
| Sheet | `Sheet.jsx` | 27 (universal) | No focus trap, no Escape-to-close, no `role="dialog"`, close button below 44px hit target | Critical |
| Toast | `Toast.jsx` | 1 (App.jsx) | No `role="status"` / `aria-live`; screen readers never hear toast messages | High |
| Skeleton | `Skeleton.jsx` | 3 (live-data tabs) | `ConversationFeed` (API-backed) has no loading state; `aria-busy` missing on section containers | High |
| AuthLoading | `AuthLoading.jsx` | 1 (App.jsx) | No `role="status"` announcement; abrupt exit (no fade-out) | Medium |
| HeroCarousel | `HeroCarousel.jsx` | 1 (Landing) | No ARIA carousel pattern; auto-play violates WCAG 2.2.2; dot tap targets 6×6px | High |
| ConversationFeed | `ConversationFeed.jsx` | 2 (group sheets) | Missing loading skeleton AND empty state; no `role="feed"`; like button no `aria-pressed` | High |
| PresenceDot | `PresenceDot.jsx` | 4 | Status conveyed by color alone; `aria-label` on `<span>` without `role` is ignored by AT | High |
| NeighborhoodPicker | `NeighborhoodPicker.jsx` | 2 | No ARIA combobox pattern; no keyboard arrow navigation; hardcoded `'#EFE3D0'` ≠ `C.divider` | High |
| CodeVerify | `CodeVerify.jsx` | 4 | Error block has no `role="alert"` — auth failures not announced to screen readers | High |
| InviteFriendButton | `InviteFriendButton.jsx` | 1 (ConnectTab only) | Comment says Home + Connect + Explore; only wired in Connect — 2 tabs missing a growth-loop CTA | High |

---

## Cross-cutting findings

### 1. No focus management in modal dialogs

`Sheet.jsx` (27 call sites) has no focus trap, no Escape-to-close, and no `role="dialog"`. This is the highest-priority fix in the component library because it affects every sheet in the app simultaneously. The 8 sheets that bypass `Sheet.jsx` and roll their own overlay (`SeeAllSheet`, `ProfileSheet`, `EventDetailSheet`, `PlaceDetailSheet`, `KidsSheet`, `AvailabilitySheet`, `ContactVerifySheet`, `InterestsPreferencesSheet`) inherit the same gap. **Every sheet in the app is currently inaccessible to keyboard and screen-reader users.**

### 2. `PrimaryBtn` is not used where it should be (fragmented CTAs)

`PrimaryBtn` exists in `src/components/` and is the declared CTA primitive, but 26+ sheets inline their own full-width button implementations with varying heights (48/52/56px), border-radii (14px/16px/`rounded-2xl`), and disabled states. This fragmentation means:
- A design change to the coral CTA style requires touching 26+ files.
- Disabled states use different background colors across sheets.
- No component has a `loading` spinner state.
- Hit targets vary silently.
The fix is to extend `PrimaryBtn` with a `size='md'` option (52px for sheets, 56px for onboarding) and systematically migrate all sheets.

### 3. Dead code: `Dot` is orphaned, `StatusBar` is a no-op with 8 importers

`Dot.jsx` has zero external importers — it is unreferenced dead code. Meanwhile, `HeroCarousel.jsx` reimplements the same "pill-expands-on-active" carousel dot pattern inline with different sizes (16px vs. 22px). There is no shared primitive for this pattern. `StatusBar.jsx` renders `null` unconditionally but is imported and rendered in 8 files, adding import confusion and bundle cost.

### 4. Hardcoded hex values throughout

The rule "never hardcode hex — always `C.tokenName`" is violated in 9 of 14 components:

| File | Violation(s) |
|---|---|
| `PhoneFrame.jsx:10,18` | `'#1B1517'` (= `C.premium`) |
| `PrimaryBtn.jsx:8` | `'#D8CCB6'` (disabled bg — no token) |
| `PrimaryBtn.jsx:9` | `'#fff'` (= `C.paper`) |
| `Sheet.jsx:59,71,73,82,84` | `'#2f2528'`, `'#3a2f33'` (dark surface/border — no tokens) |
| `HeroCarousel.jsx:58-63,163,170` | `'#fff'` (on-photo context; `C.onPhoto` token missing) |
| `ConversationFeed.jsx:69,85` | `'#fff'` (= `C.paper`) |
| `NeighborhoodPicker.jsx:32,33,54` | `'#EFE3D0'` (≠ `C.divider`), `'#fff'` (= `C.paper`) |
| `CodeVerify.jsx:88,101` | `${token}15` alpha pattern, `'#fff'` (= `C.paper`) |
| `InviteFriendButton.jsx:45` | `'#fff'` (= `C.paper`) |
| `PresenceDot.jsx:13,33` | `'#fff'` defaults for `ring` and `color` |

The `theme.js` token set is missing: `C.premiumSurface`, `C.premiumBorder`, `C.white`/`C.onPhoto`, `C.btnDisabled`.

### 5. Accessibility gaps common across components

Ordered by frequency:

| Gap | Affected components |
|---|---|
| Missing `role="dialog"` + focus trap | Sheet (all 27 call sites), 8 bypass-Sheet sheets |
| Missing `role="alert"` on error states | CodeVerify |
| Missing `role="status"` on loading/status | AuthLoading, Toast |
| Missing `role="img"` on icon-only elements | PresenceDot |
| Missing ARIA live regions | ConversationFeed (loading), Toast |
| Color-only status signals | PresenceDot |
| Sub-44px touch targets | Sheet close button (32px), HeroCarousel dots (6px) |
| Missing ARIA combobox pattern | NeighborhoodPicker |
| Missing ARIA carousel pattern | HeroCarousel |
| `type="button"` missing on interactive buttons | PrimaryBtn, CodeVerify (3 buttons), InviteFriendButton |

### 6. Three-state loading contract gaps

The contract (loading skeleton → data → warm empty state) is implemented correctly in the 3 live-data tabs (`HomeTab`, `ConnectTab`, `LocalPicksTab`). It is violated in:
- `ConversationFeed.jsx` — no loading state, no empty state (both are silently empty).
- No component wraps its section in `aria-busy={loading}` — the `aria-hidden` on `Skeleton` is correct but the section-level `aria-busy` signal is missing everywhere.

---

## Prioritized improvements

### Priority 1 — Critical / ship-blocking

1. **`Sheet.jsx`** — Add `role="dialog"`, `aria-modal="true"`, focus trap, Escape-to-close, and increase close button to 44px. Affects every sheet in the app. (`Sheet.jsx:28-103`)

### Priority 2 — High / pre-release

2. **`PrimaryBtn.jsx`** — Extend with `size` prop; migrate all 26+ sheet inline CTAs to use it. Eliminates CTA fragmentation across the entire app. (`PrimaryBtn.jsx:3-17`, plus 26 sheet files)

3. **`Toast.jsx`** — Add `role="status"` and `aria-live="polite"`. Every confirmation toast is currently silent to screen readers. (`Toast.jsx:3-11`)

4. **`HeroCarousel.jsx`** — Add ARIA carousel pattern + `prefers-reduced-motion` guard + pause control. Landing screen auto-play violates WCAG 2.2.2. (`HeroCarousel.jsx:110-205`)

5. **`ConversationFeed.jsx`** — Add loading skeleton + warm empty state + `role="feed"` list + `aria-pressed` on like button. (`ConversationFeed.jsx:16-125`)

6. **`NeighborhoodPicker.jsx`** — Add full ARIA combobox pattern + keyboard arrow navigation + `aria-label` on input. (`NeighborhoodPicker.jsx:29-98`)

7. **`CodeVerify.jsx`** — Add `role="alert"` to error block. Auth failures are silent to AT. (`CodeVerify.jsx:88`)

8. **`PresenceDot.jsx`** — Add `role="img"` to dot span; add second visual cue for online status beyond color. (`PresenceDot.jsx:13-29`)

### Priority 3 — Medium / next sprint

9. **`Dot.jsx`** — Delete dead code. Extract a shared `CarouselDots` primitive for `HeroCarousel` and any onboarding indicators. (`Dot.jsx`, `HeroCarousel.jsx:183-199`)

10. **`StatusBar.jsx`** — Delete dead component + 8 import/render pairs. (`StatusBar.jsx`, 8 call sites)

11. **`InviteFriendButton.jsx`** — Wire into `HomeTab` and `LocalPicksTab` (growth loop was incomplete). Remove self-contained margins. (`InviteFriendButton.jsx`, `HomeTab.jsx`, `LocalPicksTab.jsx`)

12. **Hardcoded hex cleanup** — Add `C.premiumSurface`, `C.premiumBorder`, `C.onPhoto`, `C.btnDisabled` tokens to `theme.js`; replace all 9 offending component files. (`theme.js` + 9 component files listed above)

13. **`AuthLoading.jsx`** — Add `role="status"` + fade-out exit animation. (`AuthLoading.jsx:9-23`)

### Priority 4 — Low / polish

14. **`Skeleton.jsx`** — Thread `aria-busy={loading}` at section level in all three live-data tabs.

15. **`PhoneFrame.jsx`** — Replace `'#1B1517'` with `C.premium`; add `role="presentation"`.

16. **`PresenceDot.jsx`** — Add `aria-hidden` to `PresencePill` inner dot; fix `'#fff'` defaults to tokens.
