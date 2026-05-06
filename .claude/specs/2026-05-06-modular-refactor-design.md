# Modular refactor of `src/App.jsx`

**Date:** 2026-05-06
**Status:** Approved — ready for implementation plan
**Scope:** Refactor `src/App.jsx` (3,950 lines, ~30 components) into a modular file structure under `src/`. No behavior change.

---

## Goal

Break the single-file React prototype into focused, independently-readable files following a conventional structure (`data/`, `components/`, `screens/`, `sheets/`). Preserve all current behavior exactly. Eliminate the cognitive cost of working in one 4,000-line file.

## Non-goals

- TypeScript migration.
- Switching state strategies (Context, useReducer, Zustand). Prop drilling stays.
- Retrofitting components to Tailwind classes.
- Splitting App.jsx into multiple coordinator components.
- Adding a test framework.
- Implementing TODO items #1–#11 from `.claude/context/todo.md`.

## Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| State management | **Keep prop drilling**, just split files | Smallest-diff refactor; no behavior risk; can layer Context in later if needed |
| Design tokens | `src/theme.js` exporting `C` as a named const | Single source of truth; minimal cognitive change — every file still references `C.tokenName` |
| Font + keyframe injection | Move to `src/index.css` (already imported by `main.jsx`) | Static assets belong in static files; faster paint; lets us delete the `useEffect` in App |
| App.jsx target | Stays as state owner + router (~150–200 lines) | Simplest mental model — one file to read for state |
| Module style | **Named exports**, one component per file | Easier renames; no import-name drift; explicit imports |
| Barrel `index.js` files | None | Imports stay explicit (`'../components/Pill'`); avoids accidental import cycles |

---

## Target file structure

```
src/
├── App.jsx                       # state owner + router (~150–200 lines)
├── main.jsx                      # entry (unchanged)
├── index.css                     # @import fonts + @keyframes slideUp/fadeIn/fadeInUp
├── theme.js                      # named export: C
│
├── data/                         # pure data, zero React
│   ├── taxonomy.js               # MOM_TYPES, VALUES, INTERESTS, KID_AGES, NEIGHBORHOODS,
│   │                             #   DISTANCES, DAYS, DAY_LABELS, TIME_WINDOWS,
│   │                             #   WINDOW_TO_BUCKET, MONTH_NAMES, DAYS_SHORT_BY_DOW,
│   │                             #   VALUE_NO_PREF, INTEREST_NO_PREF
│   ├── places.js                 # PLACES, PLACE_CATEGORIES, PLACES_NO_PREF, TOP_PICKS, BADGE_META
│   ├── moms.js                   # SAMPLE_MOMS, MOM_POOL, ALL_AVAILABLE_MOMS
│   └── events.js                 # SUGGESTED_EVENTS, EVENTS
│
├── components/                   # stateless / shared leaves
│   ├── PhoneFrame.jsx
│   ├── StatusBar.jsx
│   ├── StepHeader.jsx
│   ├── PrimaryBtn.jsx
│   ├── Pill.jsx
│   ├── Dot.jsx
│   ├── MatchCard.jsx             # used by MatchesTab + PlacesTab
│   ├── MiniMatchCard.jsx         # used by Screen8
│   ├── Sheet.jsx                 # base sheet container
│   ├── Toast.jsx
│   └── icons/
│       ├── MamaLogo.jsx
│       ├── Sprig.jsx
│       └── Sun3.jsx
│
├── screens/
│   ├── Splash.jsx
│   ├── Screen1.jsx
│   ├── Screen2.jsx
│   ├── Screen3.jsx
│   ├── Screen4.jsx
│   ├── Screen5.jsx
│   ├── Screen6.jsx
│   ├── Screen7.jsx
│   ├── Screen8.jsx
│   └── MainApp/
│       ├── index.jsx             # tab bar + tab routing
│       ├── CalendarTab.jsx
│       ├── PlacesTab.jsx
│       ├── EventsTab.jsx
│       ├── MatchesTab.jsx
│       └── YouTab.jsx
│
└── sheets/
    ├── ScheduleSheet.jsx
    ├── ProfileSheet.jsx
    ├── MessageSheet.jsx
    ├── CreateAccountSheet.jsx
    └── PremiumSheet.jsx
```

**Total: 37 new files** — 4 data modules, 13 components (10 leaves + 3 icons), 15 screens (9 onboarding + MainApp shell + 5 tabs), 5 sheets.

## Dependency direction

Strictly one-way:

```
data/  ←  components/  ←  sheets/  ←  screens/  ←  App.jsx
                         ↑                      ↑
                         └──── theme.js ────────┘
```

- `data/` imports nothing from this project.
- `components/` may import only from `theme.js` and `data/`.
- `sheets/` may import from `theme.js`, `data/`, `components/`.
- `screens/` may import from `theme.js`, `data/`, `components/`, `sheets/`.
- `App.jsx` imports from anywhere.
- **No upward imports.** Components never import screens; screens never import App; etc.

## Convention examples

```jsx
// src/components/Pill.jsx
import { C } from '../theme';

export function Pill({ active, children, onClick, size = 'md' }) {
  // unchanged body
}
```

```jsx
// src/screens/Screen6.jsx
import { useState } from 'react';
import { C } from '../theme';
import { DAYS, DAY_LABELS, TIME_WINDOWS, NEIGHBORHOODS } from '../data/taxonomy';
import { StepHeader } from '../components/StepHeader';
import { PrimaryBtn } from '../components/PrimaryBtn';
import { Pill } from '../components/Pill';

export function Screen6({ onNext, onBack, prefs, setPrefs, location }) {
  // unchanged body
}
```

## App.jsx final shape

```jsx
// src/App.jsx
import { useState, useEffect } from 'react';
import { PhoneFrame } from './components/PhoneFrame';
import { Toast } from './components/Toast';
import { Splash } from './screens/Splash';
import { Screen1 } from './screens/Screen1';
import { Screen2 } from './screens/Screen2';
import { Screen3 } from './screens/Screen3';
import { Screen4 } from './screens/Screen4';
import { Screen5 } from './screens/Screen5';
import { Screen6 } from './screens/Screen6';
import { Screen7 } from './screens/Screen7';
import { Screen8 } from './screens/Screen8';
import { MainApp } from './screens/MainApp';
import { ScheduleSheet } from './sheets/ScheduleSheet';
import { ProfileSheet } from './sheets/ProfileSheet';
import { MessageSheet } from './sheets/MessageSheet';
import { CreateAccountSheet } from './sheets/CreateAccountSheet';
import { PremiumSheet } from './sheets/PremiumSheet';

export default function App() {
  // — onboarding —
  const [splashShown, setSplashShown] = useState(false);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState({ kids: [], momTypes: [], values: [], interests: [] });
  const [prefs, setPrefs] = useState({ slots: {}, places: [] });
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);

  // — account / premium —
  const [account, setAccount] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [premiumOpen, setPremiumOpen] = useState(false);

  // — main app sheets —
  const [scheduleMom, setScheduleMom] = useState(null);
  const [profileMom, setProfileMom] = useState(null);
  const [messageMom, setMessageMom] = useState(null);

  // — activity —
  const [scheduled1to1, setScheduled1to1] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [messageHistory, setMessageHistory] = useState({});
  const [toast, setToast] = useState(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2400); };
  const requestAccount = (action) => { setPendingAction(action); /* opens CreateAccountSheet */ };
  const handleAccountComplete = (acct) => { /* sets account, replays pendingAction */ };

  // routing
  if (!splashShown) return <PhoneFrame><Splash onBegin={() => setSplashShown(true)} /></PhoneFrame>;
  if (step === 0)   return <PhoneFrame><Screen1 onNext={() => setStep(1)} /></PhoneFrame>;
  // ... Screen2..Screen8
  return (
    <PhoneFrame>
      <MainApp /* all the props it takes today */ />
      {scheduleMom && <ScheduleSheet /* ... */ />}
      {profileMom && <ProfileSheet /* ... */ />}
      {messageMom && <MessageSheet /* ... */ />}
      {pendingAction && <CreateAccountSheet pendingAction={pendingAction} onComplete={handleAccountComplete} />}
      {premiumOpen && <PremiumSheet /* ... */ />}
      {toast && <Toast msg={toast} />}
    </PhoneFrame>
  );
}
```

## Side-effect handling

Add to the **top of `src/index.css`** (already imported by `main.jsx`):

```css
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;1,400;1,600&family=Albert+Sans:wght@400;500;600&display=swap');

@keyframes slideUp  { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
@keyframes fadeIn   { from { opacity: 0 } to { opacity: 1 } }
@keyframes fadeInUp { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
```

The exact keyframe bodies must match those currently injected by App.jsx — copy verbatim from the existing `useEffect` body during step 1, do not re-author from memory. Then **delete** the font + keyframe `useEffect` from App.jsx.

---

## Migration sequence

7 commits, each independently buildable. After every commit, the app builds clean and renders identically.

| # | Commit message | What moves |
|---|---|---|
| 1 | `extract theme + index.css side-effects` | `C` → `src/theme.js`. Fonts + keyframes → `src/index.css`. Delete the side-effect `useEffect` from App. App imports `C` from `'./theme'`. |
| 2 | `extract data constants` | Create `src/data/{taxonomy,places,moms,events}.js`. App imports them. |
| 3 | `extract leaf components` | All of `src/components/` (10 files + 3 icons). |
| 4 | `extract sheets` | `src/sheets/` (5 files). |
| 5 | `extract onboarding screens` | `src/screens/{Splash,Screen1..Screen8}.jsx` (9 files). |
| 6 | `extract MainApp + tabs` | `src/screens/MainApp/` (6 files). |
| 7 | `slim App.jsx to state + router` | Final cut. App.jsx ≈ 200 lines. |

After commit 7: `wc -l src/App.jsx` ≈ 200, and total .jsx/.js files in `src/` ≈ 40 (37 new + App.jsx, main.jsx, theme.js).

## Verification at each step

The `PostToolUse` hook in `.claude/settings.json` already runs `vite build` after every JSX edit, catching syntax errors immediately. On top of that, after each commit:

1. **`npm run build`** — must exit clean. (Manual gate before pushing the commit.)
2. **`npm run dev`** + click-through smoke test:
   - Splash → all 8 onboarding screens advance to MainApp.
   - MainApp: each of 5 tabs renders.
   - Open all 5 sheets at least once.
   - Free-tier: 3-message chat limit triggers; partial profile shows.
   - Toast appears on a flashing action (e.g., schedule a meetup).
3. **Visual parity:** design tokens, fonts, and animations must be **byte-identical** to before the refactor. If anything looks different, the keyframes or font load was reproduced incorrectly — fix before moving on.

No automated tests exist in the repo. Manual smoke + clean build is the bar.

## Risk register

| Risk | Mitigation |
|---|---|
| Circular imports between components and sheets | One-way dependency direction enforced (see graph above). Sheets import components; components never import sheets. |
| A constant gets missed during step 2 | After commit 2, run `grep -nE "^(const\|function) [A-Z]" src/App.jsx`. Anything data-shaped (ALL_CAPS, no JSX) still in App.jsx is a miss. |
| `MatchCard` / `MiniMatchCard` prop shape drift | Extraction copies the inline definition verbatim; callers pass the same props. No signature change. |
| `useEffect` for fonts deleted before `index.css` is wired | Verify `main.jsx` imports `./index.css` before commit 1. (It already does — confirmed in current state.) |
| `PhoneFrame` wrapper accidentally removed mid-refactor | Lock-in: App.jsx keeps `<PhoneFrame>` as outermost wrapper from commit 1 through commit 7. Never remove and re-add. |
| Animation timing or font weight subtly differs after move | Side-by-side visual diff at the end of commit 1 — compare splash + Screen1 hero against pre-refactor screenshots. |

---

## Acceptance criteria

A successful refactor produces all of:

1. `src/App.jsx` is ≤ 250 lines and contains only state, helpers, and routing JSX.
2. Each new file has exactly one named-exported component (or one data module of named-exported constants).
3. `import { C } from` appears in every component file that styles anything; no inline hex literals appear in any component file.
4. `npm run build` exits clean.
5. Manual smoke walkthrough (per Verification §) passes with no observable visual or behavioral difference vs. before.
6. The dependency direction graph holds (verified by grep: no `components/` file imports from `screens/` or `sheets/`; no `sheets/` file imports from `screens/`).

## Post-refactor follow-ups (separate work)

- Update `.claude/context/file-layout.md` to describe the *current* layout, not the target.
- Update `.claude/context/architecture.md` to describe state ownership in App.jsx + import contract.
- Update `.claude/agents/screen-builder.md`, `design-reviewer.md`, `data-extender.md` to reference the new file paths.
- Then proceed to TODO items #1–#11 from `.claude/context/todo.md`, beginning with item #1 (persona-based onboarding).
