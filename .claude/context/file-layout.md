# File layout

## Current state — single file

Everything lives in `src/App.jsx` (~4,000 lines):

- **Color tokens** — `C` object near top
- **Custom SVG components** — `Sprig`, `MamaLogo`, `Sun3`, `PhoneFrame`, etc.
- **Data constants** — `PLACES`, `SAMPLE_MOMS`, `SUGGESTED_EVENTS`, `NEIGHBORHOODS`, `DAYS`, `TIME_WINDOWS`, `MOM_TYPES`, `VALUES`, `INTERESTS`
- **Onboarding screens** — `Splash`, `Screen1` through `Screen8`
- **MainApp shell** with 5 tabs — `CalendarTab`, `PlacesTab`, `EventsTab`, `MatchesTab`, `YouTab`
- **Sheets/modals** — `ScheduleSheet`, `ProfileSheet`, `MessageSheet`, `CreateAccountSheet`, `PremiumSheet`, `Sheet` (base), `Toast`
- **Root `App` component** at the bottom — owns all state, routes between Splash → onboarding → MainApp

## Target structure (when split)

```
src/
  App.jsx                 # root component + routing
  data/
    places.js
    moms.js
    events.js
    taxonomy.js           # NEIGHBORHOODS, DAYS, TIME_WINDOWS, MOM_TYPES, VALUES, INTERESTS
  components/
    Sheet.jsx
    MamaLogo.jsx
    PhoneFrame.jsx
    Pill.jsx
    PrimaryBtn.jsx
    ...
  screens/
    Splash.jsx
    Screen1.jsx
    ...
    Screen8.jsx
    MainApp/
      index.jsx
      CalendarTab.jsx
      PlacesTab.jsx
      EventsTab.jsx
      MatchesTab.jsx
      YouTab.jsx
  sheets/
    ScheduleSheet.jsx
    ProfileSheet.jsx
    MessageSheet.jsx
    CreateAccountSheet.jsx
    PremiumSheet.jsx
```

## Splitting rules

- Keep the **animation `useEffect`** in `App` — it injects CSS keyframes (`slideUp`, `fadeIn`, `fadeInUp`) into `document.head`. Move to `index.css` if you must.
- Keep the **Google Fonts `<link>`** loading in `App`'s useEffect for the same reason.
- The `PhoneFrame` mockup wraps the entire app in a centered ~375×740 phone-shaped container — it must remain the outermost layout.
