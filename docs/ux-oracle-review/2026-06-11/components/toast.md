# Toast — `src/components/Toast.jsx`

- **Props / API:** `msg` (string) — the message to display
- **Used by:** `src/App.jsx:7,711` (1 call site — `{toast && <Toast msg={toast}/>}`)
- **Purpose:** Temporary floating notification pill rendered at the bottom of the app. Auto-dismissed after 1900ms by `App.jsx`'s `flash()` helper. Used globally across tabs (any call to `flash(msg)` passed via props triggers it).

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Accessibility — ARIA live region | High | `Toast.jsx:3-11` — no `role="status"` or `aria-live` attribute. Screen readers will not announce the toast message when it appears, because it is injected into the DOM dynamically without a live region. A mom who is blind will miss all `flash()` feedback (e.g. "Invite link copied", "Saved!"). | Add `role="status"` and `aria-live="polite"` to the toast `<div>`. For urgent messages (errors) use `aria-live="assertive"`. Since all current toasts are confirmations, `polite` is correct. |
| 2 | Behavior — no exit animation | Medium | `Toast.jsx:8` — `animation: 'fadeIn .3s ease'` handles the appear transition, but disappearance is abrupt (the element is removed from the DOM instantly when `toast` state clears in `App.jsx:175`). This is jarring. | Add a fade-out phase: either use a CSS animation with both keyframes (e.g. `fadeInOut`), or manage the dismiss with a local timer + opacity transition before unmounting. |
| 3 | Behavior — no dismiss on tap | Low | `Toast.jsx:3-11` — the toast is not tappable to dismiss early. On a slow network the 1900ms window can feel long if the user wants to proceed. | Add `onClick` to the toast div that clears it immediately (requires passing `onDismiss` from `App.jsx`). |
| 4 | Styling — z-index layering | Medium | `Toast.jsx:4` — `z-50` is the same z-index as the notch in `PhoneFrame.jsx:17`. If a sheet is open (which uses `z-40`), the toast on `z-50` sits above the sheet, which is correct. However, the toast is positioned `absolute` at `bottom: 100` — this is relative to `PrototypeApp`'s container, not the viewport, which works only if all ancestors are `position: relative`. If the `PhoneFrame`'s inner div is the scroll container and has `overflow: hidden`, a toast rendered inside a deeply nested component would be clipped. Current structure positions `Toast` directly inside `PrototypeApp` in `App.jsx:711` — this is fine. Flag as a maintenance risk if the Toast call site ever moves. | Add a comment in `Toast.jsx` clarifying the assumed stacking context. |
| 5 | Props / API | Low | Only `msg` is accepted — no `type` prop (`'success'`, `'error'`, `'info'`) to vary color or icon. All toasts render with the same dark ink pill. An error message (e.g. "Could not post") looks identical to a success message ("Saved!"). | Add an optional `type` prop (`'success'` → current ink, `'error'` → coral background with light text) and a leading icon. |
| 6 | Styling — hardcoded radius | Low | `Toast.jsx:5` — `borderRadius: 999` is a common pattern (pill shape) but is not a token. Minor; acceptable for a utility component. | No change required. |

## Recommended improvements

1. Add `role="status"` and `aria-live="polite"` (Critical accessibility fix).
2. Add a fade-out animation before unmount.
3. Add an optional `type` prop for success/error variants.
4. Make the toast tappable to dismiss early.

## Implementation notes

```jsx
// Minimal fix:
export const Toast = ({ msg, onDismiss }) => (
  <div
    role="status"
    aria-live="polite"
    onClick={onDismiss}
    className="absolute left-1/2 -translate-x-1/2 z-50"
    style={{ bottom: 100, padding: '12px 18px', borderRadius: 999,
      background: C.ink, color: C.cream, fontFamily:'Albert Sans', fontSize: 13, fontWeight:500,
      boxShadow:'0 16px 36px -10px rgba(0,0,0,.45)',
      animation: 'fadeIn .3s ease',
    }}>
    {msg}
  </div>
);
```
Then thread `onDismiss={() => setToast(null)}` from `App.jsx:711`.

## Acceptance criteria

- [ ] Toast `<div>` has `role="status"` and `aria-live="polite"`.
- [ ] Screen reader announces the toast text when it appears.
- [ ] Tapping the toast dismisses it early.
- [ ] `npm run build` passes.
