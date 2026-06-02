# Architecture conventions

## State lives in `src/App.jsx`

`App.jsx` is the slim coordinator: it owns all app-level state, wires routing across `/`, `/prototype`, `/live`, and `/admin`, and passes props down to screens / sheets. Core state:

- `step` (0–3) — onboarding progress
- `splashShown` — whether the Landing screen has been dismissed
- `loginOpen` — Login sheet visibility (returning users)
- `profile` — `{ kidsAges, momTypes, values, interests, photos, bio, verified: { instagram, facebook, photo } }`
- `prefs` — `{ slots, places }` matching preferences
- `location`, `distance` — geographic preferences
- `account` — auth/account info, including `isPremium`
- `pendingAction` — queued action awaiting account creation
- `savedItems` — array of bookmarked-item ids (Favorites tab)
- `scheduleMom`, `profileMom`, `messageMom` — currently-selected mom for each sheet
- `premiumOpen` — premium sheet visibility
- `scheduled1to1` — map of `{ momId: { day, time, place } }` for confirmed 1:1s
- `joinedEvents` — array of joined event ids
- `messageHistory` — `{ momId: [...messages] }` for the per-mom free-tier limit
- `toast` — current toast message

Helper functions also live in `App`:
- `flash(message)` — shows a toast
- `requestAccount({ type, mom?, slot?, event? })` — gates an action behind account creation
- `handleAccountComplete()` — replays the pending action after sign-up
- `advance(currentStepIndex, patch)` — `recordStep` + `setStep(n+1)`
- `restart()` — resets all state and signs out

## Dependency direction

One-way. Nothing imports upward.

```
data ← components ← sheets ← screens ← App.jsx
```

`theme.js` is a leaf — imported by everyone, imports nothing.

## Module convention

- **Named exports only.** `export const Foo = (...) => ...` or `export function Foo(...)`.
- **One component per file.** File name = component name (e.g. `Sheet.jsx` exports `Sheet`).
- **No barrel `index.js` files.** The single exception is `src/screens/MainApp/index.jsx`, which IS the MainApp shell.

## Onboarding flow

Gated by `splashShown` and `step`. `step` advances via `advance(n, patch)` which calls `recordStep` (writes to Supabase via `/api/onboarding/step`) and then `setStep(n+1)`.

```
Landing → AboutYou → VillagePreview → Account → MainApp
(splashShown=false)  step=0      step=1            step=2    step=3
```

Returning OAuth users hydrate directly into MainApp (skip onboarding) via the `promoteSession` `useEffect` in `App.jsx`.

## Account-gated actions

Free actions (auto-schedule, RSVP, send invite, etc.) check for an account first:

```js
if (!account) {
  requestAccount({ type: 'schedule', mom, slot });
  return;
}
// otherwise proceed
```

The `CreateAccountSheet` opens; on completion, `handleAccountComplete()` replays the queued action automatically.

## Premium gating

`account.isPremium` (boolean) drives partial-vs-full views. Examples:

- Profile: blurred bio + 2 values vs. full bio + all values
- Events: first 3 attendees + count vs. all attendees + DM access
- Group chat: read-only vs. read + post
- Messaging: **25 messages per mom** free (softened from 10 on 2026-06-01) vs. unlimited

`PremiumSheet`'s `onActivate` callback flips `isPremium: true` and starts a 7-day trial timer (visual only).

## Profile verification

The Profile tab (`YouTab.jsx`) shows three connect rows: Instagram, Facebook, real photo. Each toggle flips `profile.verified.<key>`. The badge flips from "⏳ Pending" to "✓ Verified mom" when (Instagram OR Facebook) AND photo are both on.

This is currently a self-attested toggle. Real Instagram/Facebook OAuth integration is a follow-up.

## Animation injection

CSS keyframes and the Google Fonts `@import` live in `src/index.css` — no `useEffect` injects them at runtime. The 4 keyframes available globally are `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`. Apply via inline style:

```jsx
<div style={{ animation: 'fadeInUp 0.4s ease-out' }} />
```
