# PhoneFrame — `src/components/PhoneFrame.jsx`

- **Props / API:** `children` (ReactNode)
- **Used by:** `src/App.jsx` (1 call site — `<PhoneFrame>` wraps `PrototypeApp` on wide viewports)
- **Purpose:** Renders a decorative phone device shell (rounded corners, notch, dark bezel) that contains the entire app on wide viewports. On phone-sized viewports (`max-width: 640px`) the frame is not rendered — `App.jsx` renders the app content full-screen instead.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Styling — token usage | Medium | `PhoneFrame.jsx:10` — `background: '#1B1517'` hardcodes the premium dark surface color. The matching token `C.premium = '#1B1517'` exists in `theme.js:57`. Same hex is repeated at `PhoneFrame.jsx:18` for the notch. | Import `C` and use `C.premium` for both the outer bezel `background` and the notch `background`. Eliminates the only two hardcoded hex values in this file. |
| 2 | Styling — token usage | Low | `PhoneFrame.jsx:11` — `boxShadow` uses a raw RGBA value `rgba(42,30,34,.45)`. This warm-brown shadow tint appears in several other files but has no token equivalent. | Acceptable as a decorative shadow tint unique to the device shell; no token needed, but document it with a comment if the bezel color ever changes. |
| 3 | Accessibility | Low | The phone frame `<div>` has no ARIA role or `aria-label`. Screen readers will traverse into it without knowing it is a presentational wrapper. | Add `role="presentation"` to the outer `<div>` so assistive technology knows the bezel is decorative. |
| 4 | Responsive behavior | Low | `PhoneFrame.jsx:6` — `width: 'min(390px, calc(100vw - 16px))'` and `height: 'min(820px, calc(100vh - 24px))'` use viewport units (`100vw`, `100vh`). The architecture rule says "No `100vw`/`100vh`" in phone-app UI, but this component is intentionally the viewport-level wrapper (not a child of the frame), so the rule does not strictly apply here. However, `100vh` causes issues on mobile Safari when the address bar is shown — a `dvh` (dynamic viewport height) fallback would be more robust. | Consider `calc(100dvh - 24px)` with a `100vh` fallback for Safari ≤ 15. |
| 5 | Props / API | Low | `children` is the only prop. There is no `aria-label` prop to let callers describe what the frame contains to screen readers. | Minor; acceptable since the frame is presentational and accessibility lives inside the content. |

## Recommended improvements

1. Replace `'#1B1517'` at lines 10 and 18 with `C.premium` (import `C` from `'../theme'`).
2. Add `role="presentation"` to the outer wrapper `<div>`.
3. Optionally add a `dvh` fallback for the height calc.

## Implementation notes

- `src/components/PhoneFrame.jsx:10` → `background: C.premium`
- `src/components/PhoneFrame.jsx:18` → `background: C.premium`
- Add `import { C } from '../theme';` at line 1 (currently missing — the file already has this import, so this is just a token substitution).

## Acceptance criteria

- [ ] No literal `#1B1517` appears in `PhoneFrame.jsx`; both bezel and notch use `C.premium`.
- [ ] Outer `<div>` carries `role="presentation"`.
- [ ] `npm run build` passes.
