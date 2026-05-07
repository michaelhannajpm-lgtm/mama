# Architecture conventions

## State lives in `src/App.jsx` (~181 lines)

`App.jsx` is the slim coordinator: it owns all app-level state, wires routing, and passes props down to screens / sheets. The 14 useStates:

- `step` (0–8) — onboarding progress
- `splashShown` — whether the splash has been shown
- `profile` — user's profile data (name, kids, momTypes, values, interests)
- `prefs` — `{ slots, places }` matching preferences
- `location`, `distance` — geographic preferences
- `account` — auth/account info, including `isPremium`
- `pendingAction` — queued action awaiting account creation
- `scheduleMom`, `profileMom`, `messageMom` — currently-selected mom for each sheet
- `premiumOpen` — premium sheet visibility
- `scheduled1to1` — array of scheduled 1:1 meetups
- `joinedEvents` — array of joined events
- `messageHistory` — `{ momId: messageCount }` for free-tier 3-message limit
- `toast` — current toast message

Helper functions also live in `App`:
- `flash(message)` — shows a toast
- `requestAccount({ type, mom?, slot?, event? })` — gates an action behind account creation
- `handleAccountComplete()` — replays the pending action after sign-up

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

Gated by `splashShown` and `step`. `step` advances via `setStep(n+1)`. `StepHeader` renders progress.

```
Splash → Screen1 → Screen2 → ... → Screen8 → MainApp
```

## Account-gated actions

Free actions (auto-schedule, pick time, join group, etc.) check for an account first:

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

`PremiumSheet`'s `onActivate` callback flips `isPremium: true` and starts a 7-day trial timer (visual only).

## Animation injection

CSS keyframes and the Google Fonts `@import` live in `src/index.css` — no `useEffect` injects them at runtime. The 4 keyframes available globally are `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`. Apply via inline style:

```jsx
<div style={{ animation: 'fadeInUp 0.4s ease-out' }} />
```
