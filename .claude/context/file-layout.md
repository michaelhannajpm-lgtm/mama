# File layout

The Go Mama app is a modular React structure under `src/`. State stays in `App.jsx` — everything else is split into focused, single-responsibility files.

## Directory tree

```
src/
├── App.jsx                       # state owner + router (waitlist/admin/prototype switch)
├── main.jsx                      # entry
├── index.css                     # Google Fonts @import + 4 keyframes (slideUp, fadeIn, fadeInUp, popBadge)
├── theme.js                      # named export `C` — design tokens (coral/navy palette)
├── AdminPage.jsx                 # /admin dashboard (Overview, Waitlist, Moms, Mom profiles, Feedback)
├── WaitlistPage.jsx              # public / waitlist marketing page
├── waitlist.css                  # marketing-page-specific styles
│
├── data/                         # pure data + a few helpers (some files contain JSX referencing lucide icons)
│   ├── taxonomy.js               # MOM_TYPES, VALUES, INTERESTS, KID_AGES, NEIGHBORHOODS, DISTANCES,
│   │                             #   DAYS, DAY_LABELS, TIME_WINDOWS, WINDOW_TO_BUCKET, MONTH_NAMES,
│   │                             #   DAYS_SHORT_BY_DOW, VALUE_NO_PREF, INTEREST_NO_PREF
│   ├── places.js                 # PLACES, PLACE_CATEGORIES, PLACES_NO_PREF, findPlace, TOP_PICKS, BADGE_META
│   ├── moms.js                   # SAMPLE_MOMS, MOM_POOL, ALL_AVAILABLE_MOMS, matchingMoms
│   ├── events.js                 # SUGGESTED_EVENTS, EVENTS
│   └── oauth-providers.js        # ENABLED_PROVIDERS — Apple / Google / Facebook configs
│
├── lib/
│   ├── onboarding.js             # client API for recordStep / completeSignup / promoteSession
│   └── supabase.js               # browser Supabase client + onAuthChange
│
├── components/                   # leaf components
│   ├── PhoneFrame.jsx, StatusBar.jsx, Pill.jsx, Dot.jsx, StepHeader.jsx,
│   ├── PrimaryBtn.jsx, Sheet.jsx, Toast.jsx, MatchCard.jsx, MatchCardFull.jsx,
│   ├── GroupCardFull.jsx
│   └── icons/
│       ├── GoMamaLogo.jsx, Sprig.jsx, Sun3.jsx
│
├── screens/
│   ├── Landing.jsx               # hero image + 4-feature grid + coral CTA (replaces old Splash)
│   ├── Splash.jsx                # legacy — no longer routed, kept on disk
│   ├── onboarding/
│   │   ├── AboutYou.jsx          # single-screen chip picker — Tampa areas + kids + types + days + interests
│   │   ├── VillagePreview.jsx    # 3 sections of bookmarkable preview cards
│   │   ├── Account.jsx           # Supabase Auth + Apple/Google/email-magic-link
│   │   ├── Login.jsx             # returning-user sign-in
│   │   └── Welcome.jsx, LocationStep.jsx, ProfileStep.jsx, ScheduleStep.jsx,
│   │       PlacesStep.jsx, Summary.jsx   # legacy 8-step flow, no longer routed
│   └── MainApp/
│       ├── index.jsx             # 4-tab shell — Meetups · Places · Favorites · Profile
│       ├── MatchesTab.jsx        # serves as Meetups (Moms/Groups toggle)
│       ├── PlacesTab.jsx
│       ├── FavoritesTab.jsx      # new — saved-items list with empty state
│       ├── YouTab.jsx            # Profile — verification + upcoming + photos + hero card
│       └── CalendarTab.jsx, EventsTab.jsx   # legacy, no longer routed
│
└── sheets/
    ├── ScheduleSheet.jsx, ProfileSheet.jsx, MessageSheet.jsx,
    ├── CreateAccountSheet.jsx, PremiumSheet.jsx, EditProfileSheet.jsx
```

## Conventions

- **Named exports only.** One component per file. File name = component name.
- **No barrel `index.js` files** — except `src/screens/MainApp/index.jsx`, which IS the MainApp shell (tab bar + tab routing).
- **State stays in `App.jsx`.** Prop drilling preserved — no Context, no useReducer, no store.
- **Side effects:** Google Fonts and CSS keyframes live in `src/index.css`.

## Dependency direction

One-way only. Nothing imports upward.

```
data ← components ← sheets ← screens ← App.jsx
```

`theme.js` is a leaf — imported by everyone, imports nothing.

## Layout invariants

- The `PhoneFrame` mockup wraps the prototype at `/prototype` in a centered ~375×740 phone-shaped container. `/live` skips the frame.
- Vertical scroll happens inside the phone frame, not at the page level.
