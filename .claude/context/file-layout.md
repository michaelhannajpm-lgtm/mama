# File layout

A modular React structure under `src/`, with Vercel serverless functions under `api/`. App-level state stays in `src/App.jsx`; everything else is split into focused, single-responsibility files. (Listings below are representative, not exhaustive — trust the tree on disk over this doc when they disagree.)

## `src/` — the client

```
src/
├── App.jsx          # state owner + router. `/admin*` → AdminApp, else PrototypeApp.
│                    #   PhoneFrame on wide viewports, full-screen on phones. Owns ALL app state.
├── main.jsx         # entry
├── index.css        # Google Fonts @import (Fraunces, Albert Sans, Caveat) + keyframes
│                    #   (slideUp, fadeIn, fadeInUp, popBadge, livePulse, radarPulse, shimmer)
│                    #   + the coral range-slider and admin-rail-scroll styles
├── theme.js         # named export `C` — phone-app design tokens (coral/navy palette)
│
├── data/            # pure data + light helpers (some files render lucide icons inline)
│   ├── taxonomy.js          # MOM_TYPES, VALUES, INTERESTS, KID_AGES, DAYS, TIME_WINDOWS, MONTH_NAMES, …
│   ├── tampa-bay-areas.js   # TAMPA_BAY_AREAS — neighborhood/city/county options
│   ├── matching-vocab.js    # FAMILY_VALUES and related matching vocabulary
│   ├── places.js            # PLACES, PLACE_CATEGORIES, findPlace, BADGE_META (taxonomy/fallback — live data comes from /api/places)
│   ├── events.js            # SUGGESTED_EVENTS (taxonomy/fallback — live data comes from /api/events)
│   ├── discussions.js       # GROUP_DISCUSSIONS, TOP_DISCUSSIONS, GROUP_CATEGORIES_VISIBLE (Mama Hub topics)
│   ├── resources.js         # RESOURCE_CATEGORIES
│   └── oauth-providers.js   # ENABLED_PROVIDERS — Apple / Google / Facebook
│
├── lib/             # client-side logic + API clients (framework-free; many have *.test.mjs)
│   ├── supabase.js          # browser Supabase client (auth-only) + ensureSession + onAuthChange
│   ├── onboarding.js        # recordStep / promoteSession / completeOnboarding / updateMomProfile / heartbeat / signOut
│   ├── places-api.js, events-api.js, nearby-moms.js, local-favorite-api.js, seeded-moms.js  # api/* fetch clients
│   ├── home-feed.js, content-score.js, event-cards.js, mom-card.js, age-rail.js  # recommendation/ranking engine (pure)
│   ├── chat.js, chat-helpers.js, presence.js, push.js, referral.js  # chat, presence dots, web-push, invite codes
│   ├── account.js, social-verify.js, profile-completion.js, profile-photo.js, family-tags.js, places.js
│   └── *.test.mjs           # node --test unit tests co-located with the above
│
├── components/      # leaf components (import nothing upward)
│   ├── PhoneFrame.jsx, StatusBar.jsx, Dot.jsx, PrimaryBtn.jsx
│   ├── Sheet.jsx, Toast.jsx, Skeleton.jsx, AuthLoading.jsx
│   ├── HeroCarousel.jsx, ConversationFeed.jsx
│   ├── PresenceDot.jsx, NeighborhoodPicker.jsx, CodeVerify.jsx, InviteFriendButton.jsx
│
├── screens/
│   ├── Landing.jsx              # hero image + feature grid + coral CTA (entry to onboarding)
│   ├── ReactivateScreen.jsx, DeletedScreen.jsx   # account-lifecycle gates
│   ├── onboarding/
│   │   ├── AboutYou.jsx         # multi-step carousel: Tampa area + kids + types + days + interests (records each sub-step)
│   │   ├── Account.jsx          # Supabase Auth — phone OTP / OAuth / email
│   │   ├── Login.jsx            # returning-user sign-in
│   │   └── NotificationsOptIn.jsx   # one-time push opt-in (last onboarding beat)
│   ├── MainApp/
│   │   ├── index.jsx            # 5-tab shell — Home · Connect · Explore · My Hub · Profile
│   │   ├── HomeTab.jsx          # place-anchored home feed (events / meetups / moms rails)
│   │   ├── ConnectTab.jsx       # moms + groups discovery
│   │   ├── LocalPicksTab.jsx    # "Explore" — places/events/programs (tab id stays `localpicks`)
│   │   └── YouTab.jsx           # "Profile" — verification + upcoming + photos + settings
│   └── admin/                   # the /admin console (own `AC` design system — see admin-design skill)
│       ├── index.jsx           # AdminApp shell — login gate + section router
│       ├── admin-theme.js      # AC console tokens
│       ├── nav.js              # NAV_GROUPS — single source of truth for sidebar + routing
│       ├── lib/                # adminFetch (token auth), adminRouter (deep links), useAdminTheme
│       ├── components/         # Sidebar, AdminLogin, ConfirmDialog, primitives (PageHeader/Card/DataTable/…)
│       ├── sections/           # Overview/QuickActions (legacy.jsx), MomProfiles, Users, Deployments
│       └── managers/           # Places, Events, Sources, Ingestion, Config, WeeklyFavorite + edit modals & maps
│
└── sheets/          # bottom-drawer modals (content-sized; small content → half-height, not full-screen)
    ├── ScheduleSheet, ProfileSheet, MessageSheet, CreateAccountSheet, PremiumSheet  # core flows
    ├── MomDetailSheet, PlaceDetailSheet, EventDetailSheet, MyVillageSheet, MamaHubSheet
    ├── GroupDiscussionSheet, SubjectThreadSheet, NotificationsSheet, ShareSheet
    ├── LocationSheet, KidsSheet, EditIdentitySheet, ProfilePhotosSheet, AvailabilitySheet
    ├── MeetupsFilterSheet, PlacesFilterSheet + Moms/Groups advanced variants
    └── VerifyPromptSheet, ContactVerifySheet, RateSheet, DeleteAccountSheet, SeededMomLoginSheet, …
```

## `api/` — Vercel serverless functions (service-role)

```
api/
├── _lib/            # shared server code — supabase, account, admin-auth, match (mom matcher),
│   │                #   nearby, mom-card, places-shape, events-shape, weekly-favorite, push-send
│   ├── ai/          # OpenAI describe/review prompts + generate
│   └── ingestion/   # connectors (google-places, eventbrite, facebook-graph, ics, json-ld,
│                    #   place-website), normalize/dedupe/enrich/resolve-place, jobs, writer
├── config.js, categories.js, places.js, places/photo.js, events.js, local-favorite.js, referrals.js
├── onboarding/      # step, get, signup, promote, complete
├── mom-profiles/    # nearby, update, heartbeat, sync-contact
├── account/         # deactivate, reactivate, delete, restore
├── profile-photo.js, profile-photo/delete.js
├── push/            # subscribe, send, test
├── auth/instagram/  # start, callback (social verify OAuth)
├── admin/           # login, places(+update, ingest-events), events(+update), mom-profiles(+update),
│                    #   users, onboarding(+delete), sources(+update), ingestion(enqueue, jobs),
│                    #   config, deployments, weekly-favorite, upload-image, ai(describe/image/review), seed, reset
├── internal/        # process-ingestion, purge-deleted (cron)
└── dev/             # mom-profiles(+update) — dev-only helpers
```

## Conventions

- **Named exports only.** One component per file. File name = component name.
- **No barrel `index.js` files** — except `src/screens/MainApp/index.jsx` (the MainApp shell) and `src/screens/admin/index.jsx` (the admin shell).
- **State stays in `App.jsx`.** Prop drilling preserved — no Context, no useReducer, no store.
- **Data is live.** Phone-app screens render places/events/moms from `api/*` (via `lib/*-api.js` + the ranking engine), never from the static `data/*` catalogs. `data/` holds taxonomy, vocabulary, and discussion topics; `PLACES`/`SUGGESTED_EVENTS` survive only as taxonomy/shape references.
- **Side effects:** Google Fonts and CSS keyframes live in `src/index.css`.

## Dependency direction

One-way only. Nothing imports upward.

```
data ← lib ← components ← sheets ← screens ← App.jsx
```

`theme.js` is a leaf — imported by everyone, imports nothing. The admin console (`src/screens/admin/**`) is a self-contained subtree on its own `AC` tokens.

## Layout invariants

- The phone app targets ~375×740. On wide viewports it sits inside `PhoneFrame`; on phone-sized viewports (`max-width: 640px`) it fills the screen with safe-area insets.
- Vertical scroll happens inside the phone frame, not at the page level. Don't use `100vw`/`100vh` or fixed widths > 375 in phone-app UI.
