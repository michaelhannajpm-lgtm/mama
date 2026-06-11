# PresenceDot — `src/components/PresenceDot.jsx`

- **Props / API:**
  - `PresenceDot`: `status` (`'online'` | `'away'` | `'offline'` | `'hidden'` | `undefined`), `size` (number, default `11`), `ring` (string, default `'#fff'`), `style` (object)
  - `PresencePill`: `status` (`'online'` | `'away'` | `'offline'`), `color` (string, default `'#fff'`)
- **Used by:** `src/screens/MainApp/ConnectTab.jsx`, `src/screens/MainApp/HomeTab.jsx`, `src/sheets/MomDetailSheet.jsx` (import `PresenceDot`); `src/sheets/ProfileSheet.jsx` (imports `PresencePill`) — 4 call sites
- **Purpose:** Two related exports in one file: `PresenceDot` (absolute-positioned circle for avatar overlays) and `PresencePill` (inline dot + label for headers). Status colors: online → `C.sageDark` (green), away → `C.saffron` (amber), offline → `C.muted` (gray).

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Accessibility — color-only status signal | High | `PresenceDot.jsx:13-29` — `PresenceDot` conveys status (online/away/offline) through color alone. A user with deuteranopia (red-green color blindness) or protanopia cannot reliably distinguish `C.sageDark` (green) from `C.saffron` (amber). `title={LABELS[status]}` is present (line 19) which creates a tooltip on hover — helpful on desktop, but tooltips don't appear on touch. `aria-label` at line 20 is set, which helps screen readers. The color-only problem remains for sighted users with color deficiency. | Add a second visual cue: an animated `livePulse` ring on `online` status, or a subtle inner pattern difference (e.g. a small icon inside the `away` dot). |
| 2 | Accessibility — `aria-label` on a `<span>` | Medium | `PresenceDot.jsx:18` — `<span aria-label="Online">` (or similar). A bare `<span>` with `aria-label` but no `role` is not announced by screen readers in all contexts because `<span>` has no implied ARIA role. `aria-label` on a `<div>`/`<span>` requires a role to be meaningful. | Either add `role="img"` (making it an image with an accessible name), or wrap in a visually-hidden `<span className="sr-only">` with the status text alongside the visual dot. |
| 3 | Accessibility — `PresencePill` has no ARIA | Medium | `PresenceDot.jsx:33-37` — `PresencePill` renders a `<span>` with text and a colored sub-dot. It has no `aria-label` and no `role`. The text label is visible, so screen readers will read it — but the colored sub-dot has no accessible label. Since the label is adjacent, screen readers will read e.g. "Online" which is sufficient. Acceptable as-is, but the sub-dot should have `aria-hidden`. | Add `aria-hidden="true"` to the inner colored dot `<span>` (line 35) to prevent screen readers from reading the dot element separately from the text. |
| 4 | Styling — hardcoded `ring` default | Medium | `PresenceDot.jsx:13` — `ring = '#fff'` default is a hardcoded hex. The ring color is meant to separate the dot from the avatar/surface behind it (usually white or paper). | Change default to `ring = C.paper` and import `C`. This requires importing `C` for the default value, which is a function argument — either use a constant or pass `C.paper` from the call site. The cleanest fix is `PresenceDot.defaultProps` or moving the default into the component body. |
| 5 | Styling — `PresencePill` `color` default | Low | `PresenceDot.jsx:33` — `color = '#fff'` default. The pill is used in `ProfileSheet.jsx` over dark backgrounds where `'#fff'` is correct. But if used on a light surface the hardcoded `'#fff'` would be invisible. | Change default to `C.ink` or make `color` required with no default, forcing callers to be explicit. |
| 6 | Two exports in one file | Low | `PresenceDot.jsx` exports both `PresenceDot` and `PresencePill`. The architecture convention is "one component per file, file name = component name." | Either split into `PresenceDot.jsx` and `PresencePill.jsx`, or explicitly document the exception as a "presence family" file with a comment. The current approach is acceptable given the tight cohesion between the two. |
| 7 | Duplicate with Dot component | Low | `Dot.jsx` renders a simple pill-shaped indicator for carousel step state; `PresenceDot` renders a circle for presence state. Both are small colored circles — but their purposes are entirely different (carousel vs. presence). They are not duplicates; the naming proximity is mildly confusing. | Document in each file that the other exists and the use cases differ. After `Dot.jsx` is deleted (see dot.md), the confusion disappears. |

## Recommended improvements

1. Add a second visual cue for `online` status (e.g. `livePulse` ring animation or a border pulse) to not rely solely on color.
2. Add `role="img"` to the `PresenceDot` `<span>` so `aria-label` is announced.
3. Add `aria-hidden="true"` to `PresencePill`'s inner dot span.
4. Replace hardcoded `'#fff'` defaults with `C.paper` / `C.ink`.

## Implementation notes

```jsx
// PresenceDot fix — role="img":
<span
  role="img"
  aria-label={LABELS[status] || 'Offline'}
  title={LABELS[status] || 'Offline'}
  style={{
    position: 'absolute', right: 0, bottom: 0,
    width: size, height: size, borderRadius: size / 2,
    background: color,
    border: `2px solid ${ring}`,
    // Online: add pulse ring
    ...(status === 'online' ? { animation: 'livePulse 1.8s ease-in-out infinite' } : {}),
    ...style,
  }}
/>

// PresencePill inner dot:
<span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: COLORS[status] || C.muted }}/>
```

## Acceptance criteria

- [ ] `PresenceDot` `<span>` has `role="img"` and `aria-label`.
- [ ] `PresencePill`'s inner dot `<span>` has `aria-hidden="true"`.
- [ ] `online` status has a second visual cue beyond color.
- [ ] Default `ring` does not use a hardcoded `'#fff'`.
- [ ] `npm run build` passes.
