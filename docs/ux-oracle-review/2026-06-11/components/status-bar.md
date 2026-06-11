# StatusBar — `src/components/StatusBar.jsx`

- **Props / API:** `light` (boolean, default `false`) — retained for call-site compat only; has no effect.
- **Used by:** `src/screens/Landing.jsx:3,52`, `src/screens/MainApp/index.jsx:4,142`, `src/screens/DeletedScreen.jsx`, `src/screens/ReactivateScreen.jsx`, `src/screens/onboarding/AboutYou.jsx`, `src/screens/onboarding/Account.jsx`, `src/screens/onboarding/NotificationsOptIn.jsx`, `src/sheets/SeeAllSheet.jsx` (8 call sites)
- **Purpose:** Was a simulated phone time/signal/battery row. Now intentionally a no-op (`return null`) — the real iOS system bar handles itself via safe-area insets.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Dead code | Low | `StatusBar.jsx:9` — the component renders `null` unconditionally. It is imported and rendered in 8 different files. These are no-op import/render pairs — the only effect is a small bundle hit and ongoing maintenance confusion about whether this component "does something." | Remove the `StatusBar` import and JSX usage from all 8 call sites, then delete `StatusBar.jsx`. The `eslint-disable-next-line no-unused-vars` comment at line 8 is itself a code smell confirming the dead-code nature. |
| 2 | Props / API | Low | The `light` prop is documented as kept "so existing call-sites keep type-checking" but there is no TypeScript or PropTypes declaration to enforce types anyway. The comment at `StatusBar.jsx:6-8` is the only artifact. | When deleting this component, the prop disappears naturally. If the component is kept for future use, remove the prop until there is actual behavior to gate on. |
| 3 | Consistent behavior | Low | `SeeAllSheet.jsx` imports `StatusBar` (`SeeAllSheet.jsx:15`) — a sheet importing a no-op screen-level component is architecturally off. Sheets are content-sized drawers; they should not manage the status bar. | Confirmed as safe to delete from `SeeAllSheet.jsx` regardless of whether the component is removed globally. |

## Recommended improvements

1. **Delete `StatusBar.jsx`** and remove all 8 import + render call sites. This is low-risk (it already renders nothing) and reduces dead code surface.
2. If a future need arises for a light/dark status-bar tint signal, add it back as a focused hook or a prop on `PhoneFrame`, not a separate component.

## Implementation notes

Files to clean up (remove `import { StatusBar }` and `<StatusBar/>` / `<StatusBar light/>`):
- `src/screens/Landing.jsx`
- `src/screens/MainApp/index.jsx`
- `src/screens/DeletedScreen.jsx`
- `src/screens/ReactivateScreen.jsx`
- `src/screens/onboarding/AboutYou.jsx`
- `src/screens/onboarding/Account.jsx`
- `src/screens/onboarding/NotificationsOptIn.jsx`
- `src/sheets/SeeAllSheet.jsx`

## Acceptance criteria

- [ ] `StatusBar.jsx` deleted (or retained as `// TODO: remove` with a clear ticket).
- [ ] Zero `import.*StatusBar` lines remain in `src/`.
- [ ] `npm run build` passes.
