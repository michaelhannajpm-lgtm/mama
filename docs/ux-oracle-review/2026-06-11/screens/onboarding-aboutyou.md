# AboutYou — onboarding step 0 (carousel, 4 sub-steps)

- **File:** `src/screens/onboarding/AboutYou.jsx` (742 lines)
- **Purpose:** Collects the four pieces of matching data needed to personalize the app: kid stage, what the mom is looking for, how she describes herself, and her neighborhood. Records each sub-step via `recordStep` before advancing so mid-flow drop-off is captured.
- **Entry / when shown:** Shown when `step === 0`. Entry from Landing → AboutYou; also the target for signed-in-but-not-onboarded users (the `onboarding_completed` gate).
- **Related components/sheets:** `StatusBar`, `NeighborhoodPicker`, `ProgressBanner` (local), `OptionCard` (local), `QuestionHeader` (local), `Emph` (local)
- **Data dependencies:** Live `fetchNearbyMoms` via debounced `useEffect` (AboutYou.jsx:397–421) for the moms count preview — this is a real API call with a 350ms debounce. `places`, `events`, `thisWeek` passed as props from `App.jsx` (live API data). No loading flag is threaded in for any of these; the moms count initializes at `0` and updates asynchronously.

---

## Current state (wireframe)

### Sub-steps 1–3 (stage / looking-for / describes)

```
┌─────────────────────────────────┐
│ [StatusBar]                     │
│ [←]  [━━━━━━━━━━━━━] progress   │  ProgressBanner: back + 4-seg bar
│                                 │
│  What stage are you in?         │  Fraunces 26 bold, navy
│  Match with moms living…        │  Albert Sans 12.5 inkSoft
│                                 │
│  ┌──────────┐  ┌──────────┐    │  2-col OptionCard grid
│  │ 🤰        │  │ 👶        │   │  active: lilac bg + C.navySoft border
│  │ Expecting │  │ Newborn   │   │  inactive: white bg + C.line border
│  │ Pregnant  │  │ 0–12 mo   │   │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ 🧸 [−1+] │  │ 🎨        │   │  counter pill on age stages (coral)
│  │ Toddler   │  │ Preschool │   │
│  │ 1–3 yrs   │  │ 3–5 yrs   │   │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │ 🎒        │  │ 🛹        │   │
│  └──────────┘  └──────────┘    │
│  ┌────────────────────────┐     │  last card spans 2 cols
│  │ 🎧 Teen  13+ years      │    │
│  └────────────────────────┘     │
│                                 │
│ [────────── Next ──────────]    │  coral pill, disabled=cream #D8CCB6
│  Your info stays private…       │  Albert Sans 9.5 muted
└─────────────────────────────────┘
```

### Sub-step 4 (Location)

```
┌─────────────────────────────────┐
│ [StatusBar]                     │
│ [←]                             │  back only (no progress bar)
│                                 │
│   Where are you joining from?   │  Fraunces 26 bold, centered
│   We'll show moms, events…      │  Albert Sans 12.5 muted
│                                 │
│ ┌───────────────────────────────┐│  Tampa skyline photo (110px tall)
│ │   (Unsplash cityscape img)    ││  border+shadow
│ │   TAMPA, FL                   ││  white overlay text bottom-left
│ └───────────────────────────────┘│
│                                 │
│ [🎯 Use my current location]    │  coralSoft bg, coral border
│                                 │
│  NEIGHBORHOOD                   │  Albert Sans 10.5 muted eyebrow
│  [NeighborhoodPicker input]     │  searchable dropdown
│                                 │
│ [────────── Next ──────────]    │  coral pill; disabled until location set
│  🔒 Your location helps us…    │  Albert Sans 10.5 muted
└─────────────────────────────────┘
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|-----------------------|----------------|
| 1 | Loading / empty states | High | The moms count preview starts at `momsCount = 0` (AboutYou.jsx:395) and shows `0` in the preview banner during the 350ms debounce and the network round-trip. The preview items array (lines 424–429) will render "0 Moms" to a user in the first second. There is no skeleton, shimmer, or loading indicator — just a cold `0`. This is misleading because it implies no moms exist rather than "loading". | Add a `momsLoading` boolean alongside `momsCount`; show a neutral "—" or a tiny inline skeleton (`C.skeleton` background, 24×10 pill) while loading is true. |
| 2 | Hardcoded hex — disabled CTA | High | Disabled `Next` button background is `'#D8CCB6'` in two places: `AboutYou.jsx:599` (step 4) and `AboutYou.jsx:722` (steps 1–3). This hardcoded warm-gray is not in the design token set. `PrimaryBtn` uses the same literal (`PrimaryBtn.jsx:8`). | Add `C.disabled` (e.g. `#D8CCB6`) to `src/theme.js`, then reference `C.disabled` in all three files. |
| 3 | Accessibility — counter controls | High | The `−` and `+` counter controls inside `OptionCard` at `AboutYou.jsx:160–189` use `role="button"` on plain `<span>` elements rather than `<button>`. Span elements with `role="button"` are not keyboard-focusable by default and will not receive Enter/Space keydown events without explicit `onKeyDown` handlers. A keyboard or switch-access user cannot adjust the child count. | Replace the `<span role="button">` elements with actual `<button>` elements with `type="button"`, or add `tabIndex={0}` and `onKeyDown` handlers that call `onDec`/`onInc` on Enter/Space. |
| 4 | Progress bar absent on step 4 | Medium | Steps 1–3 render `<ProgressBanner step={step} total={4}/>` but step 4 renders its own top bar with only a back arrow and no progress indicator (AboutYou.jsx:498–507). The mom loses her sense of where she is in the flow at the last step — the most critical point before she commits to a location. | Render `<ProgressBanner step={4} total={4} onBack={handleBack}/>` at the top of the step-4 branch, matching the pattern of steps 1–3. |
| 5 | Hardcoded Unsplash URL | Medium | The Tampa skyline image at `AboutYou.jsx:536` uses a Unsplash production CDN URL with `?w=800&auto=format&fit=crop`. This is an external CDN dependency with no fallback. If Unsplash changes its CDN or the image is removed, the location step breaks visually (blank where the city image should be). | Host the image in Vercel Blob or `public/` (matching the pattern of `/landing/hero-*.png`). |
| 6 | No `name` on location text | Medium | `AboutYou.jsx:584` — the `NeighborhoodPicker` renders an `<input>` (inside the component) but there is no `id` or `aria-labelledby` connecting the "NEIGHBORHOOD" eyebrow label (`<div>` at line 579) to the input. Screen readers will not associate the label. | Add `id="neighborhood-label"` to the eyebrow div and `aria-labelledby="neighborhood-label"` to the `NeighborhoodPicker`, or pass an `htmlFor`-compatible `id` through the picker's props. |
| 7 | Semantic palette — OptionCard active state | Medium | `OptionCard` uses `C.lilac` for the active card background (AboutYou.jsx:122). Lilac is described in the design-token spec as "decorative chip background" used in the Landing feature grid. The active-selection semantic on onboarding cards should be `C.coralSoft` (matching the 1:1 intimacy / selection-confirmation semantic) or a neutral `C.creamSoft`. Using lilac imports the Landing decorative register into a selection state. | Change active card background from `C.lilac` to `C.coralSoft` and active border from `C.navySoft` to `C.coral` to align with the 1:1 intimacy semantic that governs this personal-preference selection. |
| 8 | Conversion — "Next" CTA copy | Medium | All four steps use "Next" as the CTA label. On the final step (location), "Next" does not signal what happens next (account creation). The step-4 `handleNext` calls `onNext()` which advances to `Account`. | On step 4, label the CTA "Find my village" or "Continue" to signal forward momentum. On steps 1–3 "Next" is fine. |
| 9 | Preview banner absent | Low | The code builds a `previewItems` array (lines 424–429) and computes a `preview` object (line 362–390), but no preview banner is rendered anywhere in the JSX. The comment on line 358 says "4 fixed buckets mirroring the Landing promise" — this appears to be a feature that was planned but never wired to a visible component. | Either render the preview (if it was intended as a real-time social proof moment: "23 moms near you match this stage") or remove the dead computation to reduce bundle weight. The `momsCount` fetch remains valuable even without the full preview — just surface the count with a warm label on step 1 or 4. |
| 10 | `canContinue` on step 4 | Low | `canContinue` for step 4 checks `hasLocation` (line 435), which is `!!(location && location.trim())`. `location` is the human-readable string label; `locationGeo` is the structured object. A user could potentially type into the `NeighborhoodPicker`'s text input and satisfy `hasLocation` with a non-selected (unresolved) value. | Gate `canContinue` on step 4 on `locationGeo != null` (the structured selection) rather than the raw string, since `handleAreaSelect` sets both together. |
| 11 | Accessibility — checkbox analogy | Low | On step 3 ("What describes you"), the `OptionCard` active state is visually a checkbox-like check badge (About You.jsx:133–146). There is no `aria-checked` or `role="checkbox"` on the cards. A screen reader user hears button labels but no selected/deselected state. | Add `aria-pressed={active}` to each `OptionCard` button element (it is already a `<button>`). This is a simpler and more accurate ARIA pattern than `role="checkbox"` for a toggle-button grid. |
| 12 | Mobile ergonomics — grid items near thumb | Low | The 2-column grid of `OptionCard` with `minHeight: 92` (line 129) stacks 7 options for Q1 (stage) into a scrollable list. The last card (Teen) spans 2 columns via `span={i === STAGE_OPTS.length - 1 ? 2 : 1}` (line 657). On a 375pt phone this produces ~4 full cards visible before scroll. The `overflowY: 'auto'` on the content div (line 626) allows scrolling but there is no scroll affordance indicator. | Consider adding a subtle fade-to-cream gradient at the bottom of the scroll area to cue scrollability. |

---

## Key issues (prose, ranked)

**1. Moms count shows "0" during API load — misleading rather than loading (High).**
`momsCount` initializes to `0` (line 395) and `previewItems` at line 427 will show "0 Moms" for the duration of the debounce + network round-trip. Even if no banner is rendered today (finding #9), the underlying state is architecturally broken for the moment the preview is surfaced. The three-state loading contract (loading / data / empty) is not implemented here: there is no `momsLoading` flag, no skeleton, and the "0" state looks like "no moms in Tampa" rather than "fetching".

**2. Counter `<span role="button">` elements are inaccessible to keyboard and switch-access users (High).**
The `−` and `+` child-count controls at lines 160–189 are `<span>` elements with `role="button"` but no `tabIndex={0}` and no keyboard event handlers. They cannot be activated without a pointer device. This is a functional accessibility failure on a core interaction in the most critical onboarding screen.

**3. Hardcoded disabled-CTA color `#D8CCB6` is untokenized and repeated in three files (High discipline).**
The same hex appears in `AboutYou.jsx:599`, `AboutYou.jsx:722`, and `PrimaryBtn.jsx:8`. If the app's disabled palette shifts, all three must be updated separately. This is the most widespread token violation in the onboarding flow.

**4. Step 4 has no progress bar — the mom loses orientation at the most commitment-heavy step (Medium).**
Steps 1–3 show a 4-segment progress bar. Step 4 drops it. A mom at the location step cannot see she's on the last step, which would reduce friction and increase completion ("almost done!").

---

## Recommended redesign

### OptionCard fix (accessibility + semantics)

```
// Before (line 117):
<button ... style={{ background: active ? C.lilac : '#fff', border: `1.5px solid ${active ? C.navySoft : C.line}` }}>

// After:
<button aria-pressed={active} ...
  style={{ background: active ? C.coralSoft : '#fff', border: `1.5px solid ${active ? C.coral : C.line}` }}>
```

### Counter controls (accessibility)

```
// Before (line 160):
<span role="button" aria-label="Remove one Toddler" onClick={...}>−</span>

// After:
<button type="button" tabIndex={0} aria-label="Remove one Toddler" onClick={...}>−</button>
```

### Step 4 progress bar

```
// Before (line 496): renders its own back-only top bar
// After: replace with:
<ProgressBanner step={4} total={4} onBack={handleBack}/>
// …then remove the custom top-bar div at lines 498–507
```

### Moms count loading state

```
// Add alongside momsCount:
const [momsLoading, setMomsLoading] = useState(false);

// In useEffect (line 397), before fetch:
setMomsLoading(true);
// In .then():
setMomsLoading(false);
// In .catch():
setMomsLoading(false);

// In previewItems render, show "—" when loading:
{ count: momsLoading ? null : momsCount, loading: momsLoading, label: 'Moms' }
```

---

## Before / after comparison

| Before | After |
|--------|-------|
| Active card: `C.lilac` bg, `C.navySoft` border | Active card: `C.coralSoft` bg, `C.coral` border |
| `−`/`+` = `<span role="button">`, no keyboard | `−`/`+` = `<button type="button" tabIndex={0}>` |
| Disabled CTA: `'#D8CCB6'` hardcoded | Disabled CTA: `C.disabled` token |
| Step 4: no progress bar | Step 4: `<ProgressBanner step={4} total={4}/>` |
| Moms count: shows `0` during load | Moms count: shows `—` skeleton during load |
| CTA on all steps: "Next" | Step 4 CTA: "Find my village" |
| No `aria-pressed` on selection cards | `aria-pressed={active}` on all `OptionCard` buttons |

---

## Implementation notes

- `src/theme.js` — add `disabled: '#D8CCB6'` to the `C` export; update `AboutYou.jsx:599`, `AboutYou.jsx:722`, and `PrimaryBtn.jsx:8` to `C.disabled`.
- `AboutYou.jsx:117–130` — change `C.lilac` → `C.coralSoft`, `C.navySoft` → `C.coral`, add `aria-pressed={active}` to the `<button>`.
- `AboutYou.jsx:160–189` — replace `<span role="button">` with `<button type="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); …handler(); } }}>`.
- `AboutYou.jsx:495–507` — remove custom back-only top bar in the step-4 branch; add `<ProgressBanner step={4} total={4} onBack={handleBack}/>` at the top of the step-4 `<div className="flex flex-col flex-1">`.
- `AboutYou.jsx:536` — replace Unsplash URL with `/location/tampa-skyline.jpg` hosted in `public/` or Vercel Blob.
- `AboutYou.jsx:395–421` — add `momsLoading` state, set it `true` before `setTimeout` fires and `false` in both `.then()` and `.catch()`.
- Verify `NeighborhoodPicker` forwards an `aria-labelledby` or `id` prop so the neighborhood label connects to the input.

---

## Acceptance criteria

- [ ] `npm run build` succeeds.
- [ ] `grep -n '#D8CCB6\|#F8D2DC\|#FAF3F0' src/screens/onboarding/AboutYou.jsx` returns no results.
- [ ] Active `OptionCard` background is `C.coralSoft` (`#F8D7DD`), not `C.lilac`.
- [ ] `−` and `+` counter elements are `<button>` elements; pressing Enter activates them in keyboard navigation.
- [ ] `aria-pressed` is present on each `OptionCard` button; screen reader announces "selected" vs "not selected".
- [ ] Step 4 renders a `ProgressBanner` with segment 4 filled.
- [ ] While `momsLoading` is true, the moms-count display shows a neutral placeholder, not `0`.
- [ ] All `canContinue` for step 4 is gated on `locationGeo != null`.
- [ ] Tampa skyline image loads from a locally-hosted asset, not an external Unsplash URL.
