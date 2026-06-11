# Architecture conventions

## Routing

`src/App.jsx` is the root. The top-level `App()` reads `window.location.pathname`:

- `/admin` or `/admin/*` → `<AdminApp/>` (the admin console, own `AC` design system).
- everything else → `<PrototypeApp/>` (the phone app).

`PrototypeApp` wraps its content in `PhoneFrame` on wide viewports and renders full-screen on phone-sized ones (`max-width: 640px`). The `bare` prop forces frame-less rendering but no route sets it today. Static `/policy`, `/terms`, `/data-deletion` are served by `vercel.json` rewrites, outside React.

## State lives in `src/App.jsx`

`PrototypeApp` owns all phone-app state and passes it down. Key pieces:

- `step` (0/2/3), `splashShown` — onboarding progress + whether Landing is dismissed
- `authResolving` — launch gate while a persisted session is being promoted (avoids a Landing flash)
- `loginOpen`, `seededLoginOpen` — Login / dev seeded-mom login visibility
- `profile` — `{ kidsAges, momTypes, values, interests, photos, bio, socialLinks, settings, verified:{instagram,facebook,photo} }`
- `prefs` — `{ slots, places }` matching preferences
- `location`, `locationGeo` (`{id,label,city,neighborhood,county,lat,lng}`), `distance`
- `account` — `{ firstName, username, auth_user_id, method, phone, email, isPremium?, trialEndsAt?, seedMomId? }`
- `accountStatus` (`active`/`deactivated`/`deleted`) + `deletedAt` — lifecycle gate
- `savedItems`, `goingItems`, `ratings`, `scheduled1to1`, `joinedEvents` — bookmarks / "going" / star ratings / confirmed 1:1s / joined events
- `scheduleMom`, `profileMom`, `messageMom`, `premiumOpen` — active sheet selections
- `pendingAction` — queued account-gated action `{ type, mom?, slot?, event? }`
- `myUserId` — current chat identity (from `ensureSession()`)
- **Live data:** `livePlaces`/`placesLoading`, `liveEvents`/`eventsLoading`, `nearbyMoms`/`nearbyLoading`, `localFavorite`, `appConfig`
- `toast`

Helpers in `PrototypeApp`: `flash(msg)`, `requestAccount(action)` + `handleAccountComplete(acct)`, `loadNearbyMoms(verifiedOnly)`, `restart()` (reset + sign out), and the notification opt-in handlers.

## Live data (no static rendering)

Phone-app surfaces render from `api/*`, never from the static `data/*` catalogs:

- `fetchPlaces()` → `/api/places`, `fetchEvents()` → `/api/events`, `fetchNearbyMoms()` → `/api/mom-profiles/nearby`, `fetchLocalFavorite()` → `/api/local-favorite`, `fetchConfig()` → `/api/config`.
- Each fetch owns an explicit `*Loading` flag, threaded down so every data-backed section renders the **three-state contract**: loading skeleton → data → warm empty state (header/container always visible). See `components/Skeleton.jsx`.
- Ranking/relevance is computed client-side by the pure engine in `src/lib/` (`home-feed.js`, `content-score.js`, `event-cards.js`, `mom-card.js`), mirroring the server mom matcher (`api/_lib/match.js`).

## App configuration

`/api/config` returns admin-editable knobs from the `app_config` table (with safe fallbacks in `App.jsx`): `defaultPlacesRadiusMiles` (50), `presenceOnlineMaxSeconds` (300), `presenceAwayMaxSeconds` (1800), `verifiedRequiresSocial` (true), `dmFreeMessageLimit` (3), `plusPriceMonthly` (7.99), `plusTrialDays` (7), `defaultVerifiedOnlyDiscovery`. These drive the monetization/verification/presence behavior without a deploy.

## Module convention

- **Named exports only.** `export const Foo = (...) => ...` or `export function Foo(...)`.
- **One component per file.** File name = component name.
- **No barrel `index.js`** except the two app shells (`MainApp/index.jsx`, `admin/index.jsx`).

## Dependency direction

One-way. Nothing imports upward.

```
data ← lib ← components ← sheets ← screens ← App.jsx
```

`theme.js` is a leaf — imported by everyone, imports nothing.

## Onboarding flow

```
Landing → AboutYou (multi-step carousel) → Account → [NotificationsOptIn] → MainApp
(splashShown=false)        step=0              step=2       step=3, one-time      step=3
```

- `AboutYou` is a single screen that records each carousel sub-step itself via `recordStep(n, patch)` (writes to `/api/onboarding/step`) so mid-flow drop-off is captured. On finish it sets `step=2` (new user → `Account`) or, if already signed in, calls `completeOnboarding()` and jumps to `step=3`.
- On mount, `promoteSession()` hydrates a persisted/OAuth session and routes by the `onboarding_completed` flag: complete → MainApp (`step=3`), incomplete → AboutYou (`step=0`). The launch gate (`authResolving`) stays up across the whole round-trip so returning moms never flash Landing.
- `NotificationsOptIn` shows once (last beat) to any account that hasn't answered the push prompt.

## Account-gated actions

Actions that create persistent data (schedule, RSVP, invite, message) check for an account first:

```js
if (!account) { requestAccount({ type: 'invite', mom, slot }); return; }
```

`CreateAccountSheet` opens; on completion `handleAccountComplete()` replays the queued action and marks the user onboarded.

## Verification gate

A mom is verified when **(Instagram OR Facebook) AND a real photo** are present (`computeVerified` / `lib/social-verify.js`; toggle in `YouTab`). MainApp's `requireVerify(action, name)` blocks connect / RSVP / join-group for unverified users and opens `VerifyPromptSheet`. Verified-only DMs additionally require the *sender* to be verified (`senderVerified`). Instagram OAuth is wired (`api/auth/instagram/*`); Facebook remains self-attested.

## Account lifecycle

`promoteSession` returns `account_status`. A `deactivated` or `deleted` user is still hydrated but the root render routes her to `ReactivateScreen` / `DeletedScreen` instead of MainApp. Restore is bounded by a 30-day window (`deletedAt`); the nightly `api/internal/purge-deleted` cron hard-deletes expired accounts.

## Premium gating

`account.isPremium` drives partial-vs-full views. See `premium-model.md` for the full matrix. `PremiumSheet.onActivate` flips `isPremium: true` and starts a visual `plusTrialDays`-day trial (`trialEndsAt`) — no real billing.

## Presence

While in MainApp, a 60s heartbeat (`sendHeartbeat`) marks the user online; a 60s tick re-derives every nearby mom's presence dot (`derivePresence` over `last_seen_at`) without a refetch. Tab focus re-beats and reloads nearby moms. Online/away thresholds come from `appConfig`.

## Animation injection

CSS keyframes and the Google Fonts `@import` live in `src/index.css` — nothing injects them at runtime. Available keyframes: `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`, `livePulse`, `radarPulse`, `shimmer` (skeletons). Apply via inline style:

```jsx
<div style={{ animation: 'fadeInUp 0.4s ease-out' }} />
```
