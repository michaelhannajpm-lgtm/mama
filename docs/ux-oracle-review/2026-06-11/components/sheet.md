# Sheet — `src/components/Sheet.jsx`

- **Props / API:** `children`, `onClose` (function), `tall` (boolean — raises maxHeight cap to 92%), `dark` (boolean — dark/premium surface), `bleedTop` (boolean — hero image flush to top), `hideClose` (boolean — caller renders its own close), `fullScreen` (boolean — fills phone, back-arrow close)
- **Used by:** 26 sheets in `src/sheets/` + `src/screens/MainApp/YouTab.jsx` (27 call sites total — the universal sheet/drawer primitive)
- **Purpose:** Bottom drawer that shrink-wraps its content. Provides: scrim/backdrop, rounded top corners, `slideUp` animation, drag handle, close button (X or back arrow), and a scrollable inner region with safe-area bottom padding.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Accessibility — focus trap | Critical | `Sheet.jsx:28-103` — the sheet does not trap keyboard focus inside the drawer. When a user opens any sheet, Tab can escape the drawer into the content behind the scrim (which is visually hidden under the overlay). Screen readers can also navigate outside the sheet. This is a WCAG 2.1 AA failure (2.1.2 No Keyboard Trap requires the reverse: focus must be able to leave a component, but for modal dialogs WCAG 4.1.3 and ARIA modal pattern require focus to be trapped). | Add `role="dialog"`, `aria-modal="true"`, an `aria-labelledby` prop, and a `useFocusTrap` hook that returns focus to the trigger element on close. At minimum, move focus to the first focusable element inside the drawer on open. |
| 2 | Accessibility — ARIA role | High | `Sheet.jsx:36-38` — the drawer panel `<div>` has no `role` or `aria-label`. Without `role="dialog"` and `aria-modal="true"`, screen readers will not announce it as a modal context, and VoiceOver/TalkBack will not know to confine navigation. | Add `role="dialog" aria-modal="true"` to the inner panel div (`Sheet.jsx:38`). Pass an `aria-labelledby` or `aria-label` prop so the sheet's purpose is announced. |
| 3 | Accessibility — close button hit target | High | `Sheet.jsx:79` — the drawer-mode close button is `w-8 h-8` (32×32px Tailwind = 32px). iOS HIG minimum is 44pt; WCAG 2.5.5 recommends 44×44px. The full-screen back button is `w-9 h-9` (36px) — still below minimum. | Change close to `w-11 h-11` (44px) and back-arrow to `w-11 h-11`. Adjust the icon size from 14→16 for X and 18→18 stays fine. |
| 4 | Styling — hardcoded hex | Medium | `Sheet.jsx:59` — `background: ... '#3a2f33'` (dark drag handle). `Sheet.jsx:71` — `background: dark ? '#2f2528'` (dark close button bg). `Sheet.jsx:73` — `border: ... '#3a2f33'`. `Sheet.jsx:82,84` — same dark hex values repeated for the non-full-screen close button. These are premium dark surface variants with no token. `C.premium = '#1B1517'` is the near-black, but these are slightly lighter tints of the same family. | Add `C.premiumSurface` (e.g. `'#2f2528'`) and `C.premiumBorder` (e.g. `'#3a2f33'`) tokens to `theme.js` and reference them. |
| 5 | Behavior — scrim click propagation | Medium | `Sheet.jsx:36` — the scrim `<div>` fires `onClose` on click. If a child element's click bubbles all the way up without being stopped, it can accidentally close the sheet. `Sheet.jsx:37` — `e.stopPropagation()` on the panel prevents this for most cases, but the handle area (lines 50-63) does not stop propagation, so a tap on the handle (which is inside the panel) correctly propagates to the panel stopper. This is fine. However, the scrim passes through all touch events to the drag-handle's `pointerEvents: 'none'` region — acceptable. Low-risk overall but worth noting. | No change required; document the expected propagation chain in a comment. |
| 6 | Behavior — no keyboard escape | High | `Sheet.jsx:28-103` — pressing Escape does not close the sheet. This is the universal expected behavior for modal dialogs (ARIA Authoring Practices Guide, Dialog pattern). | Add a `useEffect` that listens for `keydown` with `e.key === 'Escape'` and calls `onClose`. Guard it with the sheet's visibility (since `Sheet` renders only when shown, this is already gated). |
| 7 | Responsive behavior | Low | `Sheet.jsx:34` — `maxVh` uses `vh` units (`82vh`, `92vh`). On mobile Safari with the address bar visible, `vh` is the full viewport height including the bar — content can be cut off. | Use `dvh` with `vh` fallback: `tall ? '92dvh' : '82dvh'`. |
| 8 | Props / API | Low | No `title` or `aria-label` prop surfaced at the `Sheet` level — callers must place their own headings. This is acceptable for flexibility but makes it hard to enforce consistent labelling. | Add an optional `title` prop that renders an `<h2>` inside the handle area and provides `aria-labelledby`. |
| 9 | Consistent behavior — 8 sheets bypass Sheet | Medium | `src/sheets/SeeAllSheet.jsx`, `ProfileSheet.jsx`, `EventDetailSheet.jsx`, `PlaceDetailSheet.jsx`, `KidsSheet.jsx`, `AvailabilitySheet.jsx`, `ContactVerifySheet.jsx`, `InterestsPreferencesSheet.jsx` implement their own `absolute inset-0` modal layer instead of using the `Sheet` primitive. This creates inconsistent animation, dismiss behavior, and accessibility posture. | Audit each of those 8 to determine if they can be converted to `Sheet` (possibly with `fullScreen` prop), consolidating all overlay behavior into one component. |

## Recommended improvements

1. Add `role="dialog"`, `aria-modal="true"`, focus trap, and Escape-to-close.
2. Increase close button to `w-11 h-11` (44px).
3. Tokenize the dark-surface hex values (`#2f2528`, `#3a2f33`).
4. Use `dvh` for `maxVh`.
5. Convert the 8 custom-modal sheets to use this primitive.

## Implementation notes

- `Sheet.jsx:38` — add `role="dialog" aria-modal="true"` and an optional `aria-label` prop.
- `Sheet.jsx:79` — `className="... w-11 h-11 ..."`.
- `Sheet.jsx:68` — `className="... w-11 h-11 ..."`.
- `theme.js` — add `premiumSurface: '#2f2528'` and `premiumBorder: '#3a2f33'`.
- New `useEffect` in `Sheet`:
  ```js
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  ```

## Acceptance criteria

- [ ] `role="dialog" aria-modal="true"` on the panel div.
- [ ] Escape key closes the sheet.
- [ ] Focus moves to first focusable element on open; returns to trigger on close.
- [ ] Close and Back buttons are at least 44×44px.
- [ ] No hardcoded `#2f2528` or `#3a2f33`; tokens used instead.
- [ ] `npm run build` passes.
