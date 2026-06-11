# AuthLoading — `src/components/AuthLoading.jsx`

- **Props / API:** None
- **Used by:** `src/App.jsx:7` (imported), rendered conditionally during `authResolving` state (the launch gate while a persisted Supabase session is being promoted)
- **Purpose:** Interstitial screen shown to returning moms while session hydration completes. Shows just the Go Mama logo on a cream background. Prevents the Landing screen from flashing for users who are already signed in.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Accessibility — image alt text | Medium | `AuthLoading.jsx:15` — `alt="Go Mama"` is present and correct. However, `mixBlendMode: 'multiply'` at line 19 means the logo blends against the cream background. If the logo PNG has a white background, `multiply` blending makes it transparent/natural. If the logo is transparent already, `multiply` has no visible effect. In either case, alt text is fine. No issue. | No action needed. |
| 2 | Accessibility — role and announcement | Medium | `AuthLoading.jsx:9-23` — the loading state is not announced to screen readers. A user with VoiceOver would see a screen with just an image ("Go Mama") and no context that the app is loading. | Add `role="status"` and `aria-label="Loading, please wait"` to the outer `<div>`. This informs AT that this is a transient state. |
| 3 | Performance — image not preloaded | Low | `/gomama-logo.png` is loaded on demand when `AuthLoading` renders. If the returning user's device is slow, the logo itself may not appear before session hydration completes, resulting in a cream blank flash. | Add `<link rel="preload" as="image" href="/gomama-logo.png">` to `index.html`, or use a CSS background-image approach so the logo is bundled/cached. |
| 4 | Animation — fade-in only | Low | `AuthLoading.jsx:20` — `animation: 'fadeIn 0.4s ease-out'` fades the logo in. There is no fade-out when transitioning to the main app. The transition is abrupt: the logo snaps away the moment `authResolving` becomes false. | Add a local `fading` state with a 250ms exit animation before unmounting. Or manage the unmount animation at the `App.jsx` level using CSS transitions on the `authResolving` wrapper. |
| 5 | Styling — `w-full h-full` | Low | `AuthLoading.jsx:11` — the `className="w-full h-full"` requires the parent container to have explicit dimensions. This works inside `PhoneFrame`'s inner div (which has `w-full h-full overflow-hidden`). No issue as long as the parent sizing stays consistent. | No change needed; document the dependency in a comment. |
| 6 | Consistent behavior | Low | `AuthLoading.jsx` is the only component in `src/components/` that renders a full-screen view (covers the entire phone). It is not a sheet, card, or leaf component — it is closer to a screen. Architecturally it could live in `src/screens/` as `AuthLoadingScreen.jsx`. The dependency direction (`components ← screens`) is not violated here because `App.jsx` (the root) imports it directly, but the file category is misleading. | Move to `src/screens/AuthLoadingScreen.jsx` for clarity. Low priority. |

## Recommended improvements

1. Add `role="status" aria-label="Loading, please wait"` to the outer div.
2. Add fade-out transition before the component unmounts.
3. Optionally preload the logo in `index.html`.

## Implementation notes

```jsx
// Minimal accessibility fix:
<div
  role="status"
  aria-label="Loading, please wait"
  className="w-full h-full flex items-center justify-center"
  style={{ background: C.cream }}
>
```

## Acceptance criteria

- [ ] `role="status"` and `aria-label="Loading, please wait"` on the outer div.
- [ ] Screen reader announces the loading state.
- [ ] Logo still renders and fades in on a cream background.
- [ ] `npm run build` passes.
