# File layout

The Mama app is a modular React structure under `src/`. State stays in `App.jsx` (~181 lines) — everything else is split into focused, single-responsibility files.

## Directory tree

```
src/
├── App.jsx                       # ~181 lines — state owner + router
├── main.jsx                      # entry
├── index.css                     # Google Fonts @import + 4 keyframes (slideUp, fadeIn, fadeInUp, popBadge)
├── theme.js                      # named export `C` — design tokens
│
├── data/                         # pure data (some files contain JSX referencing lucide icons, so .js with JSX)
│   ├── taxonomy.js               # MOM_TYPES, VALUES, INTERESTS, KID_AGES, NEIGHBORHOODS, DISTANCES,
│   │                             #   DAYS, DAY_LABELS, TIME_WINDOWS, WINDOW_TO_BUCKET, MONTH_NAMES,
│   │                             #   DAYS_SHORT_BY_DOW, VALUE_NO_PREF, INTEREST_NO_PREF
│   ├── places.js                 # PLACES, PLACE_CATEGORIES, PLACES_NO_PREF, findPlace, TOP_PICKS, BADGE_META
│   ├── moms.js                   # SAMPLE_MOMS, MOM_POOL, ALL_AVAILABLE_MOMS, matchingMoms
│   └── events.js                 # SUGGESTED_EVENTS, EVENTS
│
├── components/                   # 13 leaves
│   ├── PhoneFrame.jsx, StatusBar.jsx, Pill.jsx, Dot.jsx, StepHeader.jsx,
│   ├── PrimaryBtn.jsx, Sheet.jsx, Toast.jsx, MatchCard.jsx, MiniMatchCard.jsx
│   └── icons/
│       ├── MamaLogo.jsx, Sprig.jsx, Sun3.jsx
│
├── screens/
│   ├── Splash.jsx
│   ├── Screen1.jsx ... Screen8.jsx
│   └── MainApp/
│       ├── index.jsx             # tab bar + tab routing, imports the 5 tabs as siblings
│       ├── CalendarTab.jsx
│       ├── PlacesTab.jsx
│       ├── EventsTab.jsx
│       ├── MatchesTab.jsx
│       └── YouTab.jsx
│
└── sheets/
    ├── ScheduleSheet.jsx, ProfileSheet.jsx, MessageSheet.jsx,
    └── CreateAccountSheet.jsx, PremiumSheet.jsx
```

## Conventions

- **Named exports only.** One component per file. File name = component name.
- **No barrel `index.js` files** — except `src/screens/MainApp/index.jsx`, which IS the MainApp shell (tab bar + tab routing).
- **State stays in `App.jsx`** (~14 useStates + 3 helpers). Prop drilling preserved — no Context, no useReducer, no store.
- **Side effects:** Google Fonts and CSS keyframes live in `src/index.css` (not a `useEffect`). The 4 keyframes are `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`.

## Dependency direction

One-way only. Nothing imports upward.

```
data ← components ← sheets ← screens ← App.jsx
```

`theme.js` is a leaf — imported by everyone, imports nothing.

## Layout invariants

- The `PhoneFrame` mockup wraps the entire app in a centered ~375×740 phone-shaped container — it must remain the outermost layout.
- Vertical scroll happens inside the phone frame, not at the page level.
