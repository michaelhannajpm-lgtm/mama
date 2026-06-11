# Skeleton — `src/components/Skeleton.jsx`

- **Props / API:** `w` (number or CSS string, default `'100%'`), `h` (number or CSS string, default `12`), `radius` (number, default `8`), `style` (object, default `{}`)
- **Used by:** `src/screens/MainApp/ConnectTab.jsx`, `src/screens/MainApp/HomeTab.jsx`, `src/screens/MainApp/LocalPicksTab.jsx` (3 call sites — the three live-data tabs)
- **Purpose:** Single shimmer-placeholder block. Compose multiple to mirror a real card's footprint. Uses `C.skeleton` / `C.skeletonSheen` tokens and the `shimmer` keyframe. Marked `aria-hidden` so screen readers skip it.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Three-state contract — partial enforcement | High | `Skeleton` is only used in the 3 MainApp live-data tabs. `src/components/ConversationFeed.jsx` (API-backed via `listThread`) renders nothing while loading — no skeleton, no spinner, just an empty `tree` array. `src/components/NeighborhoodPicker.jsx` and `src/components/CodeVerify.jsx` show synchronous data (no loading needed), but `ConversationFeed` makes async calls and has no loading state at all. | Add a `loading` state to `ConversationFeed`; render `<Skeleton>` rows matching the post card footprint while `rows.length === 0 && loading`. |
| 2 | API — height/width default units | Low | `Skeleton.jsx:11` — `w` and `h` default to numbers but are used in a CSS `width`/`height` property. A bare number in CSS is invalid for `width`/`height` (unlike `animation-duration`). React's inline styles interpret a number as `px` for dimensional properties, so it works, but the API is ambiguous — a caller passing `h="100%"` works; passing `h={12}` also works via React's px coercion. This is not a bug but is worth documenting. | Add a JSDoc comment clarifying "numbers are interpreted as px". |
| 3 | Accessibility | Low | `Skeleton.jsx:13` — `aria-hidden` is correctly set. However, when the component is inside a `role="status"` or `role="region"` live region, `aria-hidden` may not fully suppress the skeleton from being announced in some AT implementations. Confirm live regions have `aria-busy="true"` during loading. | Wrap skeleton sections in containers with `aria-busy={loading}` at the tab level. |
| 4 | Styling — token compliance | Low | `Skeleton.jsx:19-21` — uses `C.skeleton` and `C.skeletonSheen` tokens correctly. `shimmer` keyframe is defined in `src/index.css`. Full compliance. | No action needed. |
| 5 | Props / API — no `count` shorthand | Low | No `count` prop to render N repetitions. Callers must explicitly render `[...Array(3)].map(...)` or similar. | Optional: add `count` prop for convenience (`count={3}` renders 3 stacked skeletons with a small gap). |

## Recommended improvements

1. Thread `aria-busy={loading}` at the section/region level in the three tabs to properly signal loading state to AT.
2. Add a loading state + skeleton rows to `ConversationFeed`.
3. Add JSDoc for the `w`/`h` number-as-px convention.

## Implementation notes

In the three tabs (HomeTab, ConnectTab, LocalPicksTab), find the wrapper element for each skeleton section and add:
```jsx
<section aria-busy={loading} aria-label="Loading moms...">
  {loading ? <SkeletonRow /> : <RealContent />}
</section>
```

In `ConversationFeed.jsx`, add:
```js
const [loading, setLoading] = useState(true);
// Set loading=false after first loadInto resolves
```

## Acceptance criteria

- [ ] `ConversationFeed` renders `<Skeleton>` rows (or a `<Spinner>`) while first-load data is pending.
- [ ] Each skeleton section in the three tabs uses `aria-busy={loading}` on the container.
- [ ] `npm run build` passes.
