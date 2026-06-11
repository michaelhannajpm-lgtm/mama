# NeighborhoodPicker — `src/components/NeighborhoodPicker.jsx`

- **Props / API:** `value` (`{id, label, city, neighborhood, county, lat, lng}` or null), `onSelect` (function — receives the selected area object)
- **Used by:** `src/screens/onboarding/AboutYou.jsx`, `src/sheets/LocationSheet.jsx` (2 call sites)
- **Purpose:** Inline city/neighborhood search field for the Tampa Bay area. Shows results below the input only while the user is typing. Clears the dropdown once a selection is made. Integrates with `searchAreas()` from `src/lib/places.js`.

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|---|---|---|---|
| 1 | Accessibility — combobox pattern | High | `NeighborhoodPicker.jsx:29-98` — the component implements a custom autocomplete/combobox without the required ARIA combobox pattern. The input has no `role="combobox"`, `aria-expanded`, `aria-autocomplete`, or `aria-controls` pointing to the results list. The results `<div>` has no `role="listbox"`. Result `<button>` items have no `role="option"`. Without this, screen readers cannot navigate the suggestion list with arrow keys, and VoiceOver will not announce the dropdown opening/closing. | Add `role="combobox" aria-expanded={showResults} aria-autocomplete="list" aria-controls="neighborhood-results"` to the `<input>`. Add `role="listbox" id="neighborhood-results"` to the results container. Add `role="option"` and `aria-selected={active}` to each result `<button>`. |
| 2 | Accessibility — keyboard navigation | High | `NeighborhoodPicker.jsx:29-98` — the dropdown can only be navigated by Tab (to reach each result `<button>`). The standard combobox pattern requires ArrowDown/ArrowUp to move through options and Enter to select, without leaving the input field. The current Tab-based navigation forces the user to leave the search field to reach results. | Add a `keydown` handler on the `<input>` that intercepts ArrowDown/ArrowUp (to move a focused index through `results`) and Enter (to pick the focused result). |
| 3 | Styling — hardcoded hex | Medium | `NeighborhoodPicker.jsx:33` — `border: '1.5px solid ${value ? C.coral : '#EFE3D0'}'` — the inactive border is hardcoded as `'#EFE3D0'`. This is close to `C.divider = '#EFE5E0'` but is NOT the same hex. The two will diverge if the divider token changes. `NeighborhoodPicker.jsx:32` — `background: '#fff'` (not `C.paper`). `NeighborhoodPicker.jsx:54` — `background: '#fff'` (not `C.paper`). | Replace `'#EFE3D0'` with `C.divider`. Replace `'#fff'` with `C.paper`. |
| 4 | Accessibility — input label | High | `NeighborhoodPicker.jsx:38-47` — the `<input>` has a `placeholder` but no `<label>` element and no `aria-label`. Placeholder text is not a substitute for a label (disappears when typing; not read by all AT). | Add `aria-label="Search a city or neighborhood"` to the `<input>`, or render a visually-hidden `<label>`. |
| 5 | Behavior — results on empty query | Low | `NeighborhoodPicker.jsx:21` — `showResults = query.trim().length > 0 && query !== value?.label`. Results only appear after typing starts. There is intentionally no "popular areas" default list. This is a deliberate design choice (documented in the component comment), and it keeps the UI calm. Acceptable as-is. | No action needed. |
| 6 | Behavior — stale results after blur | Low | `NeighborhoodPicker.jsx:9-22` — if the user types, sees results, then clicks elsewhere (blurring the input), the results dropdown stays visible because there is no `onBlur` handler to clear them. Only completing a selection or clearing the query hides the list. | Add `onBlur` with a short delay (`setTimeout 150ms`) to hide results, preventing keyboard/mouse interaction conflicts. |
| 7 | Responsive behavior | Low | `NeighborhoodPicker.jsx:51-55` — results `maxHeight: 240` with `overflowY: 'auto'`. On small phone screens (375px height with keyboard showing) 240px of results may overflow below the visible area. This is mitigated by the `Sheet` component's own `overflow-y-auto` container, but worth testing on a real device. | Consider reducing `maxHeight` to 180 when inside a sheet context, or rely on the sheet's scroll container to handle overflow. |

## Recommended improvements

1. Implement the ARIA combobox pattern: `role="combobox"`, `aria-expanded`, `aria-controls`, `role="listbox"`, `role="option"`, `aria-selected`.
2. Add keyboard arrow navigation (ArrowUp/Down to move, Enter to select, Escape to close).
3. Fix hardcoded hex values: `'#EFE3D0'` → `C.divider`, `'#fff'` → `C.paper`.
4. Add `aria-label` to the `<input>`.
5. Add `onBlur` to hide results when the user clicks away.

## Implementation notes

```jsx
<input
  role="combobox"
  aria-expanded={showResults}
  aria-autocomplete="list"
  aria-controls="neighborhood-results"
  aria-label="Search a city or neighborhood"
  value={query}
  onKeyDown={handleKeyDown}
  ...
/>
<div
  role="listbox"
  id="neighborhood-results"
  ...
>
  {results.map((a, i) => (
    <button role="option" aria-selected={value?.id === a.id} ...>
```

Token fixes:
- `NeighborhoodPicker.jsx:32` → `background: C.paper`
- `NeighborhoodPicker.jsx:33` → `border: \`1.5px solid ${value ? C.coral : C.divider}\``
- `NeighborhoodPicker.jsx:54` → `background: C.paper`

## Acceptance criteria

- [ ] `<input>` has `role="combobox" aria-expanded aria-controls aria-label`.
- [ ] Results container has `role="listbox"`.
- [ ] Each result `<button>` has `role="option" aria-selected`.
- [ ] ArrowUp/Down moves focus through results; Enter selects; Escape closes.
- [ ] No hardcoded hex in the component (`'#EFE3D0'` → `C.divider`, `'#fff'` → `C.paper`).
- [ ] `npm run build` passes.
