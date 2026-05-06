# Architecture conventions

## State lifted to the `App` component

All app-level state lives at the top in `App`:

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

The `useEffect` in `App` injects CSS keyframes into `document.head`. **Don't break this** when refactoring — if files are split, either keep injection in App or migrate to `index.css`.
