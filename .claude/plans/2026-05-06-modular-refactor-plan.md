# Modular Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `src/App.jsx` (3,950 lines) into 37 focused files following the structure in `.claude/specs/2026-05-06-modular-refactor-design.md`. Pure mechanical extraction — no behavior change.

**Architecture:** Bottom-up extraction over 7 commits. Prop drilling preserved. App.jsx remains the state owner + router. Dependency direction: `data/ ← components/ ← sheets/ ← screens/ ← App.jsx`, `theme.js` imported by all.

**Tech Stack:** React 18, Vite 5, Tailwind 3, lucide-react. No automated test framework — verification is `npm run build` clean + manual smoke walkthrough at each commit.

---

## Reference: line numbers in current App.jsx (3,950 lines)

This is the master map every task refers to. Line numbers are start lines; end lines are inferred from the next definition.

| # | Block | Start–End | Destination |
|---|---|---|---|
| 1 | `import` header | 1–11 | stays in App.jsx |
| 2 | comment + `const C = {…}` | 13–31 | `src/theme.js` |
| 3 | `MOM_TYPES` | 32–41 | `data/taxonomy.js` |
| 4 | `VALUES` | 42–45 | `data/taxonomy.js` |
| 5 | `VALUE_NO_PREF` | 46 | `data/taxonomy.js` |
| 6 | `INTERESTS` | 48–57 | `data/taxonomy.js` |
| 7 | `INTEREST_NO_PREF` | 58 | `data/taxonomy.js` |
| 8 | `KID_AGES` | 60 | `data/taxonomy.js` |
| 9 | `NEIGHBORHOODS` | 62–98 | `data/taxonomy.js` |
| 10 | `DISTANCES` | 99–108 | `data/taxonomy.js` |
| 11 | `PLACES` | 109–290 | `data/places.js` |
| 12 | `PLACE_CATEGORIES` | 291–302 | `data/places.js` |
| 13 | `PLACES_NO_PREF` | 303 | `data/places.js` |
| 14 | `findPlace` (helper) | 306–315 | `data/places.js` |
| 15 | `SUGGESTED_EVENTS` | 316–343 | `data/events.js` |
| 16 | `WINDOW_TO_BUCKET` | 344–353 | `data/taxonomy.js` |
| 17 | `TOP_PICKS` | 354–362 | `data/places.js` |
| 18 | `BADGE_META` | 363–371 | `data/places.js` |
| 19 | `PLACE_CATEGORIES_ALL_DATA` (alias) | 372 | `data/places.js` |
| 20 | `DAYS` | 374 | `data/taxonomy.js` |
| 21 | `DAY_LABELS` | 375 | `data/taxonomy.js` |
| 22 | `TIME_WINDOWS` | 376–384 | `data/taxonomy.js` |
| 23 | `SAMPLE_MOMS` | 385–442 | `data/moms.js` |
| 24 | `MOM_POOL` | 443–460 | `data/moms.js` |
| 25 | `ALL_AVAILABLE_MOMS` | 461–465 | `data/moms.js` |
| 26 | `matchingMoms` (helper) | 466–470 | `data/moms.js` |
| 27 | `EVENTS` | 471–477 | `data/events.js` |
| 28 | `Sprig` | 478–487 | `components/icons/Sprig.jsx` |
| 29 | `MamaLogo` | 488–513 | `components/icons/MamaLogo.jsx` |
| 30 | `Sun3` | 514–526 | `components/icons/Sun3.jsx` |
| 31 | `PhoneFrame` | 527–548 | `components/PhoneFrame.jsx` |
| 32 | `StatusBar` | 549–560 | `components/StatusBar.jsx` |
| 33 | `Pill` | 561–575 | `components/Pill.jsx` |
| 34 | `Dot` | 576–582 | `components/Dot.jsx` |
| 35 | `StepHeader` | 583–597 | `components/StepHeader.jsx` |
| 36 | `PrimaryBtn` | 598–619 | `components/PrimaryBtn.jsx` |
| 37 | `Splash` | 620–725 | `screens/Splash.jsx` |
| 38 | `Screen1` | 726–879 | `screens/Screen1.jsx` |
| 39 | `Screen2` | 880–927 | `screens/Screen2.jsx` |
| 40 | `Screen3` | 928–1058 | `screens/Screen3.jsx` |
| 41 | `Screen4` | 1059–1309 | `screens/Screen4.jsx` |
| 42 | `Screen5` | 1310–1476 | `screens/Screen5.jsx` |
| 43 | `Screen6` | 1477–1804 | `screens/Screen6.jsx` |
| 44 | `Screen7` | 1805–2107 | `screens/Screen7.jsx` |
| 45 | `Screen8` | 2108–2263 | `screens/Screen8.jsx` |
| 46 | `MiniMatchCard` | 2264–2290 | `components/MiniMatchCard.jsx` |
| 47 | `MainApp` | 2291–2335 | `screens/MainApp/index.jsx` |
| 48 | `MONTH_NAMES` | 2336 | `data/taxonomy.js` |
| 49 | `CalendarTab` | 2338–2555 | `screens/MainApp/CalendarTab.jsx` |
| 50 | `PlacesTab` | 2556–2736 | `screens/MainApp/PlacesTab.jsx` |
| 51 | `MatchCard` | 2737–2803 | `components/MatchCard.jsx` |
| 52 | `EventsTab` | 2804–2976 | `screens/MainApp/EventsTab.jsx` |
| 53 | `DAYS_SHORT_BY_DOW` | 2977 | `data/taxonomy.js` |
| 54 | `MatchesTab` | 2979–2996 | `screens/MainApp/MatchesTab.jsx` |
| 55 | `YouTab` | 2997–3069 | `screens/MainApp/YouTab.jsx` |
| 56 | `ScheduleSheet` | 3070–3121 | `sheets/ScheduleSheet.jsx` |
| 57 | `ProfileSheet` | 3122–3304 | `sheets/ProfileSheet.jsx` |
| 58 | `MessageSheet` | 3305–3455 | `sheets/MessageSheet.jsx` |
| 59 | `CreateAccountSheet` | 3456–3693 | `sheets/CreateAccountSheet.jsx` |
| 60 | `PremiumSheet` | 3694–3736 | `sheets/PremiumSheet.jsx` |
| 61 | `Sheet` (base) | 3737–3759 | `components/Sheet.jsx` |
| 62 | `Toast` | 3760–3773 | `components/Toast.jsx` |
| 63 | `App` | 3774–3950 | stays in App.jsx |

> **Note on the side-effect `useEffect`:** inside `App` (around lines 3795–3810) there is a useEffect that injects a `<link>` for Google Fonts and a `<style>` tag with **4 keyframes**: `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`. The spec mentioned 3 — there are actually 4. All 4 must move to `index.css`.

> **Helpers note:** `findPlace(id)` and `matchingMoms(userSlots)` are non-component helpers. They live in the relevant data file (`places.js` and `moms.js`) and are exported as named functions.

---

## The Extraction Recipe (used in Tasks 3–7)

Every component/sheet/screen extraction follows the same 4-step recipe. Each task body lists the files; this is the procedure for each file:

1. **Read** the line range from the table above.
2. **Create** the destination file. Paste the body verbatim. Replace `const Foo =` with `export function Foo` (convert arrow function to a named function declaration if needed; both forms are valid as named exports — keep arrow form by writing `export const Foo = (...) => (...)`).
3. **Determine imports** the new file needs:
   - **`C`** if the body references it → `import { C } from '../theme';`
   - **lucide icons** if any `<ArrowRight />` etc. appear → `import { ArrowRight, ... } from 'lucide-react';`
   - **React hooks** if `useState`/`useEffect`/`useMemo` appear → `import { useState, ... } from 'react';`
   - **data** if any `PLACES`, `SAMPLE_MOMS`, etc. appear → `import { PLACES } from '../data/places';`
   - **child components** if any `<Pill>`, `<PrimaryBtn>`, etc. appear → `import { Pill } from './Pill';` (or `'../components/Pill'` from screens/sheets).
   - Use `grep -oE "<[A-Z][A-Za-z0-9]+" <new-file>` to enumerate child components referenced.
4. **In `src/App.jsx`**: add an import for the new component at the top, delete the original inline definition.

After extracting all files in the task, run `npm run build` once, smoke-test, commit.

---

## Task 0: Preflight verification

**Files:** none modified.

- [ ] **Step 1: Verify clean working tree**

  Run: `git status`
  Expected: `nothing to commit, working tree clean`. If dirty, stash or commit before starting.

- [ ] **Step 2: Verify current build is green**

  Run: `npm run build`
  Expected: clean exit, no errors. If the build is broken before we start, fix that first — refactoring on a broken base is doomed.

- [ ] **Step 3: Verify main.jsx imports index.css**

  Run: `grep -n "index.css" src/main.jsx`
  Expected: `4:import './index.css';`. If missing, add it before Task 1.

- [ ] **Step 4: Capture baseline visual screenshots**

  Run: `npm run dev`. In the browser:
  1. Splash screen — screenshot
  2. Walk through onboarding to MainApp — screenshot the Calendar tab
  3. Open ScheduleSheet on a mom — screenshot (shows slideUp animation timing)

  Save these somewhere outside the repo (e.g., desktop). They are the visual diff target after Task 1.

- [ ] **Step 5: Confirm the line-number map is current**

  Run: `grep -nE "^(const|function) [A-Za-z_]+" src/App.jsx | head -80`

  Expected: matches the lines in the master table above. If any line numbers have shifted by more than ±3, regenerate the table from the grep output before continuing.

---

## Task 1: Extract theme + move side-effects to index.css

**Files:**
- Create: `src/theme.js`
- Modify: `src/index.css`
- Modify: `src/App.jsx` (remove inline `C`, remove font/keyframe `useEffect`, add `import { C }`)

- [ ] **Step 1: Read the current `C` object**

  Run: `sed -n '13,31p' src/App.jsx`

  Confirm output starts with `// ---------- Design Tokens ----------` and ends with `};`. The lines between are the body.

- [ ] **Step 2: Create `src/theme.js`**

  Write `src/theme.js` with this content. Replace the placeholder body with the lines you read in Step 1 (specifically lines 14–31 of App.jsx, which is the `const C = { ... };` block) — change `const C` to `export const C`:

  ```js
  // src/theme.js
  // Design tokens — single source of truth for the Mama palette.
  // Imported by every component that styles anything.
  export const C = {
    // PASTE App.jsx lines 15-30 here verbatim — the *contents* of the C object
  };
  ```

  Verify: `grep -c "^  [a-z]" src/theme.js` should be > 10 (number of token lines).

- [ ] **Step 3: Read the current keyframes from App.jsx**

  Run: `sed -n '3795,3815p' src/App.jsx`

  Note the four `@keyframes` blocks — `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`. Copy their bodies verbatim.

- [ ] **Step 4: Update `src/index.css`**

  Open `src/index.css`. Add the Google Fonts `@import` URL **at the very top** (CSS spec requires `@import` before any rules) and the four keyframes at the bottom. Final file should look like:

  ```css
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Albert+Sans:wght@300;400;500;600;700&display=swap');

  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  html,
  body,
  #root {
    height: 100%;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    background: #f4ede0;
  }

  /* keyframes used by inline `style={{ animation: '...' }}` across the app */
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes fadeIn { from { opacity:0; transform:translate(-50%,8px);} to { opacity:1; transform:translate(-50%,0);} }
  @keyframes fadeInUp { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0);} }
  @keyframes popBadge { 0% { transform: scale(.4); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
  ```

  **Critical:** verify the keyframe bodies match what was in App.jsx. Any drift in transforms/opacities will cause visible animation differences.

- [ ] **Step 5: Add `C` import to App.jsx**

  Edit `src/App.jsx`. After the `lucide-react` import block (around line 11), add:

  ```js
  import { C } from './theme';
  ```

- [ ] **Step 6: Delete the inline `C` definition from App.jsx**

  Delete lines 13–31 of App.jsx — the comment `// ---------- Design Tokens ----------` plus the entire `const C = { ... };` block.

  Verify: `grep -n "^const C =" src/App.jsx`
  Expected: zero matches.

- [ ] **Step 7: Delete the font + keyframe `useEffect` from App.jsx**

  Find the `useEffect` that creates the `<link>` element with `fonts.googleapis.com` and the `<style>` tag with keyframes. Delete the entire effect including its arrow body and dep array. (Around App.jsx:3795–3815 in the pre-edit file.)

  Verify (run both):
  - `grep -n "fonts.googleapis" src/App.jsx` → zero matches
  - `grep -n "@keyframes" src/App.jsx` → zero matches

- [ ] **Step 8: Build check**

  Run: `npm run build`
  Expected: clean exit. If "C is not defined" → import is missing. If keyframe-related animation broken → keyframe in index.css doesn't match original.

- [ ] **Step 9: Visual smoke test**

  Run: `npm run dev`. Compare against Task 0 baseline:
  - Splash typography is Fraunces (serif), not fallback.
  - Click Begin → bottom sheet should `slideUp` (translateY 100% → 0).
  - Reach a toast event → toast should `fadeIn` from translate(-50%, 8px).
  - Open a mom card with a verified badge → it should `popBadge`.

  If any animation is missing or jumpy, the keyframe body was retyped wrong — fix index.css before committing.

- [ ] **Step 10: Commit**

  ```bash
  git add src/theme.js src/index.css src/App.jsx
  git commit -m "extract theme to src/theme.js, move font + keyframes to index.css"
  ```

---

## Task 2: Extract data constants

**Files:**
- Create: `src/data/taxonomy.js`
- Create: `src/data/places.js`
- Create: `src/data/moms.js`
- Create: `src/data/events.js`
- Modify: `src/App.jsx` (remove all inline data, add 4 imports)

- [ ] **Step 1: Create `src/data/taxonomy.js`**

  This file aggregates all taxonomy/lookup data. From App.jsx, copy these blocks **verbatim** (change `const X = ...` to `export const X = ...`):

  | Constant | App.jsx lines |
  |---|---|
  | `MOM_TYPES` | 32–41 |
  | `VALUES` | 42–45 |
  | `VALUE_NO_PREF` | 46 |
  | `INTERESTS` | 48–57 |
  | `INTEREST_NO_PREF` | 58 |
  | `KID_AGES` | 60 |
  | `NEIGHBORHOODS` | 62–98 |
  | `DISTANCES` | 99–108 |
  | `WINDOW_TO_BUCKET` | 344–353 |
  | `DAYS` | 374 |
  | `DAY_LABELS` | 375 |
  | `TIME_WINDOWS` | 376–384 |
  | `MONTH_NAMES` | 2336 |
  | `DAYS_SHORT_BY_DOW` | 2977 |

  No imports needed at the top of this file — it's pure data.

- [ ] **Step 2: Create `src/data/places.js`**

  | Constant / function | App.jsx lines |
  |---|---|
  | `PLACES` | 109–290 |
  | `PLACE_CATEGORIES` | 291–302 |
  | `PLACES_NO_PREF` | 303 |
  | `findPlace` | 306–315 |
  | `TOP_PICKS` | 354–362 |
  | `BADGE_META` | 363–371 |
  | `PLACE_CATEGORIES_ALL_DATA` | 372 |

  All as named exports (`export const ...`, `export function findPlace ...`).

  No external imports needed at the top of this file.

- [ ] **Step 3: Create `src/data/moms.js`**

  | Constant / function | App.jsx lines |
  |---|---|
  | `SAMPLE_MOMS` | 385–442 |
  | `MOM_POOL` | 443–460 |
  | `ALL_AVAILABLE_MOMS` | 461–465 |
  | `matchingMoms` | 466–470 |

  All as named exports.

- [ ] **Step 4: Create `src/data/events.js`**

  | Constant | App.jsx lines |
  |---|---|
  | `SUGGESTED_EVENTS` | 316–343 |
  | `EVENTS` | 471–477 |

  Both as named exports.

- [ ] **Step 5: Add data imports to App.jsx**

  After the `import { C } from './theme';` line in App.jsx, add:

  ```js
  import {
    MOM_TYPES, VALUES, VALUE_NO_PREF, INTERESTS, INTEREST_NO_PREF,
    KID_AGES, NEIGHBORHOODS, DISTANCES, WINDOW_TO_BUCKET,
    DAYS, DAY_LABELS, TIME_WINDOWS, MONTH_NAMES, DAYS_SHORT_BY_DOW,
  } from './data/taxonomy';
  import {
    PLACES, PLACE_CATEGORIES, PLACES_NO_PREF, findPlace,
    TOP_PICKS, BADGE_META, PLACE_CATEGORIES_ALL_DATA,
  } from './data/places';
  import {
    SAMPLE_MOMS, MOM_POOL, ALL_AVAILABLE_MOMS, matchingMoms,
  } from './data/moms';
  import { SUGGESTED_EVENTS, EVENTS } from './data/events';
  ```

- [ ] **Step 6: Delete all the inline data from App.jsx**

  Delete every block listed in Steps 1–4 from App.jsx. Use grep to verify:

  ```bash
  grep -nE "^const (MOM_TYPES|VALUES|INTERESTS|NEIGHBORHOODS|DISTANCES|PLACES|PLACE_CATEGORIES|SUGGESTED_EVENTS|TOP_PICKS|BADGE_META|DAYS|DAY_LABELS|TIME_WINDOWS|SAMPLE_MOMS|MOM_POOL|ALL_AVAILABLE_MOMS|EVENTS|MONTH_NAMES|DAYS_SHORT_BY_DOW|WINDOW_TO_BUCKET|KID_AGES|VALUE_NO_PREF|INTEREST_NO_PREF|PLACES_NO_PREF|PLACE_CATEGORIES_ALL_DATA) " src/App.jsx
  grep -nE "^const (findPlace|matchingMoms) " src/App.jsx
  ```

  Both must return zero lines.

- [ ] **Step 7: Build check**

  Run: `npm run build`
  Expected: clean exit. Most likely error: a constant not in the import list. Read the error message, add the missing name to the appropriate import.

- [ ] **Step 8: Smoke test (full walkthrough)**

  Run: `npm run dev`. Walk through:
  - Splash → Screen1 (welcome)
  - Screen2 (kids selection — uses `KID_AGES`)
  - Screen3 (location — uses `NEIGHBORHOODS`, `DISTANCES`)
  - Screen4 (profile — uses `MOM_TYPES`, `VALUES`, `INTERESTS`)
  - Screen5 (places — uses `PLACES`, `PLACE_CATEGORIES`)
  - Screen6 (when — uses `DAYS`, `TIME_WINDOWS`)
  - Screen7 (matches preview — uses `SAMPLE_MOMS`)
  - Screen8 (events preview — uses `SUGGESTED_EVENTS`)
  - MainApp → all 5 tabs → all data renders

  If any screen shows blank/missing data, the data import is wrong.

- [ ] **Step 9: Commit**

  ```bash
  git add src/data/ src/App.jsx
  git commit -m "extract data constants to src/data/{taxonomy,places,moms,events}.js"
  ```

---

## Task 3: Extract leaf components (10 components + 3 icons)

**Files:**
- Create: `src/components/icons/{MamaLogo,Sprig,Sun3}.jsx`
- Create: `src/components/{PhoneFrame,StatusBar,StepHeader,PrimaryBtn,Pill,Dot,Sheet,Toast,MatchCard,MiniMatchCard}.jsx`
- Modify: `src/App.jsx` (remove inline definitions, add 13 imports)

For each file, follow the [Extraction Recipe](#the-extraction-recipe-used-in-tasks-37). Per-file specifics:

- [ ] **Step 1: Extract `Sprig` → `src/components/icons/Sprig.jsx`**

  Source: App.jsx:478–487. Imports needed:
  ```js
  import { C } from '../../theme';
  ```
  Body: `export const Sprig = ({ className='', style={}, color=C.sage }) => (` … existing JSX … `);`

- [ ] **Step 2: Extract `MamaLogo` → `src/components/icons/MamaLogo.jsx`**

  Source: App.jsx:488–513. Imports needed:
  ```js
  import { C } from '../../theme';
  ```

- [ ] **Step 3: Extract `Sun3` → `src/components/icons/Sun3.jsx`**

  Source: App.jsx:514–526. Imports needed:
  ```js
  import { C } from '../../theme';
  ```

- [ ] **Step 4: Extract `PhoneFrame` → `src/components/PhoneFrame.jsx`**

  Source: App.jsx:527–548. Imports needed:
  ```js
  import { C } from '../theme';
  ```

- [ ] **Step 5: Extract `StatusBar` → `src/components/StatusBar.jsx`**

  Source: App.jsx:549–560. Imports needed:
  ```js
  import { C } from '../theme';
  ```

- [ ] **Step 6: Extract `Pill` → `src/components/Pill.jsx`**

  Source: App.jsx:561–575. Imports needed:
  ```js
  import { C } from '../theme';
  ```

- [ ] **Step 7: Extract `Dot` → `src/components/Dot.jsx`**

  Source: App.jsx:576–582. Imports needed:
  ```js
  import { C } from '../theme';
  ```

- [ ] **Step 8: Extract `StepHeader` → `src/components/StepHeader.jsx`**

  Source: App.jsx:583–597. Imports needed:
  ```js
  import { C } from '../theme';
  import { ArrowLeft } from 'lucide-react';
  ```
  (Verify lucide list by greping the body for `<[A-Z]` icon usages.)

- [ ] **Step 9: Extract `PrimaryBtn` → `src/components/PrimaryBtn.jsx`**

  Source: App.jsx:598–619. Imports needed:
  ```js
  import { C } from '../theme';
  ```

- [ ] **Step 10: Extract `Sheet` → `src/components/Sheet.jsx`**

  Source: App.jsx:3737–3759. Imports needed:
  ```js
  import { C } from '../theme';
  import { X } from 'lucide-react';
  ```

- [ ] **Step 11: Extract `Toast` → `src/components/Toast.jsx`**

  Source: App.jsx:3760–3773. Imports needed:
  ```js
  import { C } from '../theme';
  ```

- [ ] **Step 12: Extract `MatchCard` → `src/components/MatchCard.jsx`**

  Source: App.jsx:2737–2803. Imports needed (read body, then confirm):
  ```js
  import { C } from '../theme';
  import { Calendar as CalendarIcon, MessageCircle, ShieldCheck } from 'lucide-react';
  ```
  Verify the lucide list with: `sed -n '2737,2803p' src/App.jsx | grep -oE "<[A-Z][A-Za-z0-9]+" | sort -u`

- [ ] **Step 13: Extract `MiniMatchCard` → `src/components/MiniMatchCard.jsx`**

  Source: App.jsx:2264–2290. Imports needed:
  ```js
  import { C } from '../theme';
  ```
  Verify lucide usage with the same grep technique.

- [ ] **Step 14: Add 13 imports to App.jsx**

  Add at the top of App.jsx (after the data imports):

  ```js
  import { Sprig } from './components/icons/Sprig';
  import { MamaLogo } from './components/icons/MamaLogo';
  import { Sun3 } from './components/icons/Sun3';
  import { PhoneFrame } from './components/PhoneFrame';
  import { StatusBar } from './components/StatusBar';
  import { Pill } from './components/Pill';
  import { Dot } from './components/Dot';
  import { StepHeader } from './components/StepHeader';
  import { PrimaryBtn } from './components/PrimaryBtn';
  import { Sheet } from './components/Sheet';
  import { Toast } from './components/Toast';
  import { MatchCard } from './components/MatchCard';
  import { MiniMatchCard } from './components/MiniMatchCard';
  ```

- [ ] **Step 15: Delete the inline component definitions from App.jsx**

  Delete the original definitions for all 13 components (Sprig, MamaLogo, Sun3, PhoneFrame, StatusBar, Pill, Dot, StepHeader, PrimaryBtn, MiniMatchCard, MatchCard, Sheet, Toast).

  Verify:
  ```bash
  grep -nE "^const (Sprig|MamaLogo|Sun3|PhoneFrame|StatusBar|Pill|Dot|StepHeader|PrimaryBtn|MiniMatchCard|MatchCard|Sheet|Toast) =" src/App.jsx
  ```
  Must return zero lines.

- [ ] **Step 16: Build check**

  Run: `npm run build`
  Expected: clean exit. Likely error: a child component import missing (e.g. `MatchCard` uses an icon you didn't list). Read error, fix import in the new component file.

- [ ] **Step 17: Smoke test**

  Run: `npm run dev`. Walk through every screen. Specifically verify:
  - PhoneFrame renders the phone outline (leaf component success).
  - Onboarding StepHeader shows the back arrow and progress dots.
  - PrimaryBtn renders correctly on Splash/Screen1.
  - Toast appears on a flash event (Calendar tab → schedule a meetup).
  - MatchCard renders on MatchesTab.
  - MiniMatchCard renders on Screen8.
  - A Sheet opens (e.g. ScheduleSheet — note the Sheet base wraps it).

- [ ] **Step 18: Commit**

  ```bash
  git add src/components/ src/App.jsx
  git commit -m "extract leaf components to src/components/"
  ```

---

## Task 4: Extract sheets

**Files:**
- Create: `src/sheets/{ScheduleSheet,ProfileSheet,MessageSheet,CreateAccountSheet,PremiumSheet}.jsx`
- Modify: `src/App.jsx` (remove 5 inline definitions, add 5 imports)

- [ ] **Step 1: Extract `ScheduleSheet` → `src/sheets/ScheduleSheet.jsx`**

  Source: App.jsx:3070–3121. Determine imports by reading the body:
  ```bash
  sed -n '3070,3121p' src/App.jsx | grep -oE "<[A-Z][A-Za-z0-9]+" | sort -u
  ```
  Likely imports:
  ```js
  import { useState } from 'react';
  import { C } from '../theme';
  import { Sheet } from '../components/Sheet';
  import { PrimaryBtn } from '../components/PrimaryBtn';
  // + any lucide icons found
  // + data imports (DAYS, TIME_WINDOWS, etc.) if used
  ```

- [ ] **Step 2: Extract `ProfileSheet` → `src/sheets/ProfileSheet.jsx`**

  Source: App.jsx:3122–3304. Determine imports the same way. Likely:
  ```js
  import { C } from '../theme';
  import { Sheet } from '../components/Sheet';
  import { PrimaryBtn } from '../components/PrimaryBtn';
  // + lucide icons (ShieldCheck, Quote, Lock, Crown likely)
  // + data (KID_AGES, etc.) if used
  ```

- [ ] **Step 3: Extract `MessageSheet` → `src/sheets/MessageSheet.jsx`**

  Source: App.jsx:3305–3455.
  ```js
  import { useState } from 'react';
  import { C } from '../theme';
  import { Sheet } from '../components/Sheet';
  // + lucide
  ```

- [ ] **Step 4: Extract `CreateAccountSheet` → `src/sheets/CreateAccountSheet.jsx`**

  Source: App.jsx:3456–3693.
  ```js
  import { useState } from 'react';
  import { C } from '../theme';
  import { Sheet } from '../components/Sheet';
  import { PrimaryBtn } from '../components/PrimaryBtn';
  // + lucide (Mail, Phone, Eye, EyeOff, Lock probable)
  ```

- [ ] **Step 5: Extract `PremiumSheet` → `src/sheets/PremiumSheet.jsx`**

  Source: App.jsx:3694–3736.
  ```js
  import { C } from '../theme';
  import { Sheet } from '../components/Sheet';
  import { PrimaryBtn } from '../components/PrimaryBtn';
  // + lucide (Crown, Check probable)
  ```

- [ ] **Step 6: Add 5 sheet imports to App.jsx**

  ```js
  import { ScheduleSheet } from './sheets/ScheduleSheet';
  import { ProfileSheet } from './sheets/ProfileSheet';
  import { MessageSheet } from './sheets/MessageSheet';
  import { CreateAccountSheet } from './sheets/CreateAccountSheet';
  import { PremiumSheet } from './sheets/PremiumSheet';
  ```

- [ ] **Step 7: Delete the 5 inline sheet definitions from App.jsx**

  Verify:
  ```bash
  grep -nE "^const (ScheduleSheet|ProfileSheet|MessageSheet|CreateAccountSheet|PremiumSheet) =" src/App.jsx
  ```
  Must return zero lines.

- [ ] **Step 8: Build check**

  Run: `npm run build`. Fix any "X is not defined" by adding to the appropriate sheet's imports.

- [ ] **Step 9: Smoke test — open every sheet**

  Run: `npm run dev`. Trigger each:
  - `ScheduleSheet` — MainApp → MatchesTab → tap Schedule on a mom
  - `ProfileSheet` — MainApp → MatchesTab → tap on a mom card body
  - `MessageSheet` — from ProfileSheet → tap Message
  - `CreateAccountSheet` — sign out then try to schedule (or attempt a gated action as a free user)
  - `PremiumSheet` — MainApp → YouTab → tap Upgrade, or hit a premium gate

  Each must slideUp, render content, and close cleanly.

- [ ] **Step 10: Commit**

  ```bash
  git add src/sheets/ src/App.jsx
  git commit -m "extract sheets to src/sheets/"
  ```

---

## Task 5: Extract onboarding screens (Splash + Screen1–Screen8)

**Files:**
- Create: `src/screens/{Splash,Screen1,Screen2,Screen3,Screen4,Screen5,Screen6,Screen7,Screen8}.jsx`
- Modify: `src/App.jsx` (remove 9 inline definitions, add 9 imports)

For each screen, the recipe is the same — read body, identify imports, create file, replace `const X =` with `export const X =`.

- [ ] **Step 1: Extract `Splash` → `src/screens/Splash.jsx`**

  Source: App.jsx:620–725. Determine imports with:
  ```bash
  sed -n '620,725p' src/App.jsx | grep -oE "<[A-Z][A-Za-z0-9]+" | sort -u
  ```
  Likely imports:
  ```js
  import { C } from '../theme';
  import { MamaLogo } from '../components/icons/MamaLogo';
  import { Sprig } from '../components/icons/Sprig';
  import { Sun3 } from '../components/icons/Sun3';
  import { PrimaryBtn } from '../components/PrimaryBtn';
  // + lucide as needed
  ```

- [ ] **Step 2: Extract `Screen1` → `src/screens/Screen1.jsx`**

  Source: App.jsx:726–879. Use the recipe.

- [ ] **Step 3: Extract `Screen2` → `src/screens/Screen2.jsx`**

  Source: App.jsx:880–927. Likely imports include `KID_AGES` from `'../data/taxonomy'`.

- [ ] **Step 4: Extract `Screen3` → `src/screens/Screen3.jsx`**

  Source: App.jsx:928–1058. Likely imports `useState`, `NEIGHBORHOODS`, `DISTANCES` from taxonomy.

- [ ] **Step 5: Extract `Screen4` → `src/screens/Screen4.jsx`**

  Source: App.jsx:1059–1309. Likely imports `useState`, `MOM_TYPES`, `VALUES`, `INTERESTS` from taxonomy.

- [ ] **Step 6: Extract `Screen5` → `src/screens/Screen5.jsx`**

  Source: App.jsx:1310–1476. Likely imports `useState`, `PLACES`, `PLACE_CATEGORIES`, `BADGE_META`, `findPlace`, `TOP_PICKS` from places.

- [ ] **Step 7: Extract `Screen6` → `src/screens/Screen6.jsx`**

  Source: App.jsx:1477–1804. Likely imports `useState`, `DAYS`, `DAY_LABELS`, `TIME_WINDOWS`, `WINDOW_TO_BUCKET` from taxonomy.

- [ ] **Step 8: Extract `Screen7` → `src/screens/Screen7.jsx`**

  Source: App.jsx:1805–2107. Likely imports `useState`, `useMemo`, `SAMPLE_MOMS`, `matchingMoms` from moms; `MatchCard` from components.

- [ ] **Step 9: Extract `Screen8` → `src/screens/Screen8.jsx`**

  Source: App.jsx:2108–2263. Likely imports `useState`, `SUGGESTED_EVENTS` from events; `MiniMatchCard` from components.

- [ ] **Step 10: Add 9 screen imports to App.jsx**

  ```js
  import { Splash } from './screens/Splash';
  import { Screen1 } from './screens/Screen1';
  import { Screen2 } from './screens/Screen2';
  import { Screen3 } from './screens/Screen3';
  import { Screen4 } from './screens/Screen4';
  import { Screen5 } from './screens/Screen5';
  import { Screen6 } from './screens/Screen6';
  import { Screen7 } from './screens/Screen7';
  import { Screen8 } from './screens/Screen8';
  ```

- [ ] **Step 11: Delete the 9 inline screen definitions from App.jsx**

  Verify:
  ```bash
  grep -nE "^const (Splash|Screen[1-8]) =" src/App.jsx
  ```
  Must return zero lines.

- [ ] **Step 12: Build check**

  Run: `npm run build`. Fix import gaps as they appear.

- [ ] **Step 13: Smoke test — full onboarding walkthrough**

  Run: `npm run dev`. From Splash, advance through every screen. Pay attention to:
  - Screen3: location selector populates
  - Screen4: mom-type / values / interests pills are tappable, multi-select works
  - Screen5: places list renders with category filters
  - Screen6: 7×5 day/time grid renders, toggles work
  - Screen7: matched moms list (uses `matchingMoms()`)
  - Screen8: suggested events list

  The transition Screen8 → MainApp must work (this is the boundary between Tasks 5 and 6).

- [ ] **Step 14: Commit**

  ```bash
  git add src/screens/ src/App.jsx
  git commit -m "extract onboarding screens to src/screens/"
  ```

---

## Task 6: Extract MainApp + 5 tabs

**Files:**
- Create: `src/screens/MainApp/index.jsx`
- Create: `src/screens/MainApp/{CalendarTab,PlacesTab,EventsTab,MatchesTab,YouTab}.jsx`
- Modify: `src/App.jsx` (remove 6 inline definitions, add 1 import for MainApp)

> Tabs are imported by `MainApp/index.jsx`, not by App.jsx directly. App.jsx only needs `import { MainApp } from './screens/MainApp';` (which resolves to `index.jsx`).

- [ ] **Step 1: Extract `MainApp` → `src/screens/MainApp/index.jsx`**

  Source: App.jsx:2291–2335. This is the tab-bar container; it imports the 5 tabs. Likely imports:
  ```js
  import { useState } from 'react';
  import { C } from '../../theme';
  import { CalendarTab } from './CalendarTab';
  import { PlacesTab } from './PlacesTab';
  import { EventsTab } from './EventsTab';
  import { MatchesTab } from './MatchesTab';
  import { YouTab } from './YouTab';
  // + lucide icons for the tab bar (CalendarDays, Compass, Users, MessageCircle, User likely)
  ```

- [ ] **Step 2: Extract `CalendarTab` → `src/screens/MainApp/CalendarTab.jsx`**

  Source: App.jsx:2338–2555. Likely imports:
  ```js
  import { useState } from 'react';
  import { C } from '../../theme';
  import { MONTH_NAMES, DAYS_SHORT_BY_DOW } from '../../data/taxonomy';
  // + lucide
  ```

- [ ] **Step 3: Extract `PlacesTab` → `src/screens/MainApp/PlacesTab.jsx`**

  Source: App.jsx:2556–2736. Likely imports:
  ```js
  import { useState } from 'react';
  import { C } from '../../theme';
  import { PLACES, PLACE_CATEGORIES, findPlace, BADGE_META } from '../../data/places';
  // + lucide
  ```

- [ ] **Step 4: Extract `EventsTab` → `src/screens/MainApp/EventsTab.jsx`**

  Source: App.jsx:2804–2976. Likely imports:
  ```js
  import { useState } from 'react';
  import { C } from '../../theme';
  import { EVENTS, SUGGESTED_EVENTS } from '../../data/events';
  // + lucide
  ```

- [ ] **Step 5: Extract `MatchesTab` → `src/screens/MainApp/MatchesTab.jsx`**

  Source: App.jsx:2979–2996. Likely imports:
  ```js
  import { C } from '../../theme';
  import { MatchCard } from '../../components/MatchCard';
  import { SAMPLE_MOMS } from '../../data/moms';
  ```

- [ ] **Step 6: Extract `YouTab` → `src/screens/MainApp/YouTab.jsx`**

  Source: App.jsx:2997–3069. Likely imports:
  ```js
  import { C } from '../../theme';
  // + lucide icons for the settings rows
  ```

- [ ] **Step 7: Add MainApp import to App.jsx**

  ```js
  import { MainApp } from './screens/MainApp';
  ```

- [ ] **Step 8: Delete the 6 inline definitions from App.jsx**

  Verify:
  ```bash
  grep -nE "^const (MainApp|CalendarTab|PlacesTab|EventsTab|MatchesTab|YouTab) =" src/App.jsx
  ```
  Must return zero lines.

- [ ] **Step 9: Build check**

  Run: `npm run build`. Most likely failure: a tab missing its data import. Fix in the tab file.

- [ ] **Step 10: Smoke test — every tab + cross-tab transitions**

  Run: `npm run dev`. From a fresh splash, get to MainApp, then:
  - Tap Calendar → see scheduled meetups + month view
  - Tap Places → see filtered places list
  - Tap Events → see events list, RSVP works
  - Tap Matches → cards render, tap one → ScheduleSheet opens
  - Tap You → settings render, restart works

  Toast still appears on actions. Sheet overlays still work over MainApp.

- [ ] **Step 11: Commit**

  ```bash
  git add src/screens/MainApp/ src/App.jsx
  git commit -m "extract MainApp + tabs to src/screens/MainApp/"
  ```

---

## Task 7: Final cleanup — slim App.jsx

**Files:**
- Modify: `src/App.jsx` (final shape verification, no logic changes)

By this point App.jsx should already be only:
- The header imports (React, lucide, theme, all data, all components, all sheets, screens, MainApp)
- The `App` component itself with state + helpers + router

This task verifies that and cleans up any stragglers.

- [ ] **Step 1: Inspect App.jsx structure**

  Run: `grep -nE "^(const|function|export|import) " src/App.jsx`

  Expected output should look like (line numbers approximate):
  - 1–~50: import lines (React, lucide, theme, data, components, sheets, screens)
  - ~50: blank line
  - ~52: `export default function App() {`
  - end: `}` closing App

  No other top-level `const` or `function` should appear. If any do, they were missed in earlier tasks — extract them now.

- [ ] **Step 2: Verify no stale imports**

  Open App.jsx. Walk through the lucide-react import block. Most lucide icons are now used inside the extracted files, not App.jsx. Trim the lucide import down to **only** icons App.jsx actually uses.

  Run: `grep -oE "<[A-Z][A-Za-z0-9]+" src/App.jsx | sort -u`

  Compare with the lucide import list — remove any icon name from the import that does not appear in this output. Likely App.jsx itself uses zero or one lucide icon by this point; if zero, delete the entire lucide import.

- [ ] **Step 3: Remove unused React hook imports**

  Currently `import { useState, useEffect, useMemo } from 'react';`. After Task 1 the side-effect useEffect is gone. App.jsx now uses only `useState`. Trim:

  ```js
  import { useState } from 'react';
  ```

  (Keep `useEffect` only if any other useEffect remains in App.jsx. Run `grep -n "useEffect\|useMemo" src/App.jsx` to check.)

- [ ] **Step 4: Verify line count**

  Run: `wc -l src/App.jsx`
  Expected: ≤ 250 lines. If above 250, look for any logic that should have moved (helpers, dead code, oversized routing). The acceptance criterion is ≤ 250.

- [ ] **Step 5: Verify dependency direction (one-way imports)**

  Run:
  ```bash
  grep -rE "from '.*screens" src/components/ src/sheets/ 2>/dev/null
  grep -rE "from '.*sheets" src/components/ 2>/dev/null
  ```
  Both must return zero lines. If anything matches, a child is importing a parent — fix before commit.

- [ ] **Step 6: Verify no hex literals in component files**

  Run:
  ```bash
  grep -rEn "['\"]#[0-9A-Fa-f]{3,8}['\"]" src/components/ src/sheets/ src/screens/ 2>/dev/null
  ```
  Expected: zero lines. Any matches mean a hardcoded color slipped through — replace with `C.tokenName`.

- [ ] **Step 7: Final build check**

  Run: `npm run build`
  Expected: clean exit, no warnings about unused imports.

- [ ] **Step 8: Final smoke walkthrough**

  Run: `npm run dev`. Do the full flow:
  - Splash → all 8 onboarding screens
  - MainApp → all 5 tabs
  - Open all 5 sheets
  - Toast appears
  - Free-tier 3-message limit triggers in MessageSheet (send 3 messages → 4th blocked)
  - Partial profile in ProfileSheet for free users
  - Sign-up gated action: free user taps Schedule → CreateAccountSheet appears with the pending action summary

  Compare against Task 0 baseline screenshots — must be visually identical.

- [ ] **Step 9: Total file count check**

  Run:
  ```bash
  find src -type f \( -name "*.jsx" -o -name "*.js" -o -name "*.css" \) | sort
  ```

  Expected output:
  ```
  src/App.jsx
  src/components/Dot.jsx
  src/components/MatchCard.jsx
  src/components/MiniMatchCard.jsx
  src/components/PhoneFrame.jsx
  src/components/Pill.jsx
  src/components/PrimaryBtn.jsx
  src/components/Sheet.jsx
  src/components/StatusBar.jsx
  src/components/StepHeader.jsx
  src/components/Toast.jsx
  src/components/icons/MamaLogo.jsx
  src/components/icons/Sprig.jsx
  src/components/icons/Sun3.jsx
  src/data/events.js
  src/data/moms.js
  src/data/places.js
  src/data/taxonomy.js
  src/index.css
  src/main.jsx
  src/screens/MainApp/CalendarTab.jsx
  src/screens/MainApp/EventsTab.jsx
  src/screens/MainApp/MatchesTab.jsx
  src/screens/MainApp/PlacesTab.jsx
  src/screens/MainApp/YouTab.jsx
  src/screens/MainApp/index.jsx
  src/screens/Screen1.jsx
  src/screens/Screen2.jsx
  src/screens/Screen3.jsx
  src/screens/Screen4.jsx
  src/screens/Screen5.jsx
  src/screens/Screen6.jsx
  src/screens/Screen7.jsx
  src/screens/Screen8.jsx
  src/screens/Splash.jsx
  src/sheets/CreateAccountSheet.jsx
  src/sheets/MessageSheet.jsx
  src/sheets/PremiumSheet.jsx
  src/sheets/ProfileSheet.jsx
  src/sheets/ScheduleSheet.jsx
  src/theme.js
  ```

  That's 41 files total in `src/` (App.jsx + theme.js + main.jsx + index.css + 13 components + 5 sheets + 9 onboarding screens + 6 MainApp + 4 data = 41), matching the spec's "≈ 40".

- [ ] **Step 10: Commit**

  ```bash
  git add src/App.jsx
  git commit -m "slim App.jsx to state owner + router"
  ```

---

## Task 8: Update `.claude/` to reflect the new architecture

After the refactor lands, the context files and agent definitions describe the *old* single-file world. Update them so future Claude sessions describe what is now true.

**Files:**
- Modify: `.claude/context/file-layout.md`
- Modify: `.claude/context/architecture.md`
- Modify: `.claude/agents/screen-builder.md`
- Modify: `.claude/agents/design-reviewer.md`
- Modify: `.claude/agents/data-extender.md`
- Modify: `CLAUDE.md` (if its summary mentions "single-file")

- [ ] **Step 1: Rewrite `.claude/context/file-layout.md`**

  Replace the "currently single-file" section with the **actual current** structure (paste the `find src` output from Task 7 Step 9). Remove the "target structure (when split)" section — it's now reality.

- [ ] **Step 2: Update `.claude/context/architecture.md`**

  - Update the "State lifted to the App component" section header to "State lives in App.jsx (`src/App.jsx`)" — same content, but make it clear App.jsx is now ~200 lines, not the whole app.
  - Add a "Dependency direction" subsection: `data ← components ← sheets ← screens ← App`, `theme.js` imported by all, no upward imports.
  - Add a "Module convention" subsection: named exports only, one component per file, file name = component name.

- [ ] **Step 3: Update `.claude/agents/screen-builder.md`**

  - Change "in `src/App.jsx`" references to "in the appropriate file under `src/screens/` or `src/screens/MainApp/`".
  - Add: "New onboarding screens live at `src/screens/ScreenN.jsx` and are imported in `src/App.jsx`. Update the router (the `if (step === N)` chain) when adding a new step."
  - Add: "New tabs live at `src/screens/MainApp/<Name>Tab.jsx` and are imported in `src/screens/MainApp/index.jsx`. Update the tab-bar entry there."
  - Update the closing instruction "Do not create a separate file unless the user has asked for the file split — keep additions in `src/App.jsx`" — invert it: do create a new file per component.

- [ ] **Step 4: Update `.claude/agents/design-reviewer.md`**

  - Change the grep target from `src/App.jsx` to `src/components/ src/sheets/ src/screens/`.
  - Add a new check section: "Dependency direction" — verify components don't import from screens or sheets, and sheets don't import from screens.

- [ ] **Step 5: Update `.claude/agents/data-extender.md`**

  - Change "Find it in `src/App.jsx` (e.g. `const SAMPLE_MOMS = [...]`)" to "Find it in `src/data/moms.js` (or `src/data/places.js`, `src/data/events.js`, `src/data/taxonomy.js`)".
  - Update the import-shape note: "Add new entries to the appropriate file. Named export shape is preserved (`export const SAMPLE_MOMS = [...]`)."

- [ ] **Step 6: Update root `CLAUDE.md`**

  Open `CLAUDE.md`. Find the line: "single-file (`src/App.jsx`)" in the intro paragraph. Replace with: "modular React structure under `src/`: `data/`, `components/`, `screens/`, `sheets/`. State stays in `App.jsx` (~200 lines)."

- [ ] **Step 7: Build sanity check**

  None of these files affect the build, but run `npm run build` once more for safety.

- [ ] **Step 8: Commit**

  ```bash
  git add .claude/ CLAUDE.md
  git commit -m "update .claude/ context + agents to describe modular architecture"
  ```

---

## Acceptance criteria — final verification

A successful refactor produces all of:

- [ ] `wc -l src/App.jsx` ≤ 250
- [ ] `find src -name '*.jsx' -o -name '*.js' | wc -l` ≥ 35
- [ ] `npm run build` exits clean with no errors or warnings
- [ ] `grep -rEn "['\"]#[0-9A-Fa-f]{3,8}['\"]" src/components src/sheets src/screens` returns zero lines
- [ ] `grep -rE "from '.*screens'" src/components src/sheets` returns zero lines (no upward imports)
- [ ] `grep -rE "from '.*sheets'" src/components` returns zero lines (no upward imports)
- [ ] Manual smoke walkthrough (Task 7 Step 8) passes — every screen, every tab, every sheet, every animation, no visual differences vs Task 0 baseline
- [ ] All 8 commits are made and the working tree is clean

If any acceptance criterion fails, do not declare the refactor complete. Find the cause and fix it.
