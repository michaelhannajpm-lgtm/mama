# Onboarding gate + notification opt-in — design

**Date:** 2026-06-11
**Status:** Approved, pre-implementation

## Problem

Two issues:

1. **Signed-in users with no profile reach the home page.** When a user signs in
   (OTP or OAuth) but has never completed onboarding, the app drops them straight
   into MainApp. They never provide the name / location / kids information that the
   product depends on. They should instead be routed into onboarding — and because
   they are *already authenticated*, they must skip the Account/login screen.

2. **No notification opt-in.** Push notifications are coming. We need an
   "Allow notifications" opt-in both in onboarding and in the Profile tab, and the
   real browser permission prompt should fire when the user allows.

## Part A — "Has this user finished onboarding?" gate

### A1. New DB column

Add to `onboarding_profiles`:

```sql
alter table public.onboarding_profiles
  add column if not exists onboarding_completed boolean not null default false;
```

A first-class column (not inferred, not in a jsonb bag) so the admin dashboard can
query it. Migration lives in `supabase/` following the existing `_apply_*.sql`
convention.

### A2. Why not reuse `completed_at`

`api/onboarding/promote.js` already stamps `completed_at` on *every* first sign-in
(`completed_at: existing.completed_at || new Date().toISOString()`), so it is true
even for a user who never filled out AboutYou. It cannot serve as the
"finished onboarding" signal. The new flag stays `false` until onboarding is
genuinely complete.

### A3. Flipping the flag — authenticated endpoint

New endpoint: `POST /api/onboarding/complete`

- Body: `{ access_token }`.
- Verifies the JWT (same pattern as `promote.js`), resolves the auth user.
- Sets `onboarding_completed = true` on the row where `auth_user_id = user.id`.
- Returns `{ ok: true }`.

**Why auth-keyed, not the session-id `recordStep` path:** a returning user's
`localStorage` session id can differ from their canonical auth-linked
`onboarding_profiles` row (cleared cookies, new device). Writing the flag by
session id could flip a *different* row, leaving the canonical row `false` and
looping the user back into onboarding on the next load. Keying on `auth_user_id`
flips exactly the right row.

Client helper in `src/lib/onboarding.js`:

```js
export const completeOnboarding = async () => { /* POST access_token → /api/onboarding/complete */ };
```

Soft no-op (returns null) when not signed in or backend unreachable — same
defensive shape as `updateMomProfile` / `sendHeartbeat`.

### A4. `promote.js` only reads the flag

`promote.js` must **not** set `onboarding_completed`. Add it to `hydratedShape`'s
output:

```js
onboarding_completed: row.onboarding_completed === true,
```

### A5. Routing in `App.jsx` `hydrate()`

Today `hydrate()` unconditionally calls `setStep(3)`. New logic after the existing
state hydration:

```js
setSplashShown(true);
if (result.onboarding_completed) {
  setStep(3);                 // returning, complete → MainApp (as today)
  flash(`Welcome back, ${result.first_name} ✦`);
} else {
  setStep(0);                 // signed in, not onboarded → AboutYou (account already set)
}
```

The `account` state is still populated from the promote result in both branches, so
when the not-onboarded user later finishes AboutYou, `account` is truthy and the
Account screen is skipped (see A6).

### A6. AboutYou `onNext` becomes account-aware

In `App.jsx`, the `AboutYou` `onNext` currently hardcodes `setStep(2)` (Account).
Change to:

```js
onNext={() => {
  recordStep(0, { /* existing location/kids/types patch */ });
  if (account) {
    completeOnboarding();     // flip the flag on the auth-linked row
    setStep(/* NotificationsOptIn step */);  // → then MainApp; skip Account
  } else {
    setStep(2);               // new user → Account as today
  }
}}
```

(Exact step value for NotificationsOptIn defined in B3.)

### A7. New-user completion still flips the flag

A brand-new user finishes onboarding at the Account step (they have no session
until then). After their account is created and they are authenticated, call
`completeOnboarding()` at the point they transition to MainApp so their flag is set.
This is the same single call as A6, just reached from the new-user branch.

### A8. Login path respects the flag

`Login.onSuccess` in `App.jsx` currently force-jumps to `setStep(3)`. The Supabase
`SIGNED_IN` event already fires the authoritative `hydrate()`, which now performs
the flag-aware routing (A5). Route OTP login through that single decision point
rather than the bare step-3 jump, so OTP and OAuth behave identically. In
demo/local mode (no Supabase, `SIGNED_IN` never fires), default to onboarding
(step 0) when there is no local profile.

## Part B — Notification opt-in

### B1. Single source of truth

`profile.settings.notifications.enabled` (boolean) — the master push opt-in. The
existing granular keys (`meetups`, `messages`, `groups`, `digest`) remain nested
under `settings.notifications`. Persisted through the existing
`mom_profiles.settings` jsonb path (`saveProfile({ settings: ... })`).

### B2. Profile tab behavior

In the Notifications `ToggleSettingsSheet`:

- When `enabled` is **off**: only the master **"Allow notifications"** switch is
  visible. The four granular toggles are **hidden**.
- Flipping the master **on** fires the real permission prompt (B4) and reveals the
  granular toggles **live** (no sheet re-open).
- Flipping it **off** hides them again.

Extend `ToggleSettingsSheet` with an optional `gatedBy` prop: items carrying
`gatedBy: 'enabled'` (or a configured master key) are hidden whenever the master
key in the current draft is falsy. The master item itself triggers the permission
request on flip-on.

### B3. Onboarding opt-in screen

New screen `src/screens/onboarding/NotificationsOptIn.jsx`, shown once as the final
onboarding beat — after Account (new user) and after AboutYou (returning-incomplete
user), just before MainApp. Both flows converge here so everyone sees it once.

Content (follows existing onboarding visual idiom — Fraunces headline, italic+coral
accent word, `PrimaryBtn`):

- Eyebrow + "Stay in the loop" headline.
- One-line value prop (meetup reminders, new messages).
- **Allow notifications** primary button → calls `requestPushPermission()` (B4),
  persists the result, advances to MainApp.
- **Not now** text button → advances to MainApp with `enabled = false`.

Routing: introduce a dedicated step for this screen in `App.jsx`'s step switch,
reached from both A6 (returning) and A7 (new), terminating in `setStep(3)`.

### B4. Real permission request

New `src/lib/push.js`:

```js
export const requestPushPermission = async () => {
  if (!('Notification' in window)) return { ok: false, reason: 'unsupported' };
  const perm = await Notification.requestPermission();      // 'granted' | 'denied' | 'default'
  if (perm !== 'granted') return { ok: false, reason: perm };
  await subscribeToPush();   // best-effort; see B5
  return { ok: true };
};
```

The caller (onboarding screen / profile sheet) persists
`settings.notifications.enabled` from the `ok` result. On denial, keep
`enabled = false` and surface a gentle toast.

### B5. Push subscription infrastructure

None exists today (no service worker, no `web-push` dep, no VAPID keys, no
subscriptions table). Add the minimal real pipeline:

- `public/sw.js` — service worker with `push` and `notificationclick` handlers.
- `VITE_VAPID_PUBLIC_KEY` env var (public key). Private key server-side only.
- `push_subscriptions` table — service-role only (consistent with the
  service-role-only data model; chat is the only browser-accessible exception).
  Columns: `id`, `auth_user_id`, `endpoint` (unique), `p256dh`, `auth`,
  `user_agent`, `created_at`.
- `POST /api/push/subscribe` — verifies the JWT, upserts the subscription keyed by
  endpoint.
- `subscribeToPush()` in `src/lib/push.js`: registers the SW, calls
  `PushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, POSTs
  the result.

**Graceful degrade:** if `VITE_VAPID_PUBLIC_KEY` is absent, `subscribeToPush()` is a
no-op — the permission prompt still fires and the opt-in preference is still saved.
The app ships and works today; subscription storage lights up the moment a VAPID
keypair is configured for the sending work.

### B6. Delivery — IMPLEMENTED (2026-06-11)

Originally scoped as a follow-up; built and shipped in the same pass.

- **VAPID keypair** generated (`web-push`). Env: `VITE_VAPID_PUBLIC_KEY` (client,
  build-time), `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` + `PUSH_HOOK_SECRET` (server).
  Set on Vercel (Production + Development).
- **`api/_lib/push-send.js`** — `web-push` wrapper. `sendToUser()` delivers to all
  of a user's `push_subscriptions`, prunes dead endpoints (404/410). `notifyAllowed()`
  gates on the master switch + per-category toggle (unit-tested).
- **`api/push/send.js`** — internal fan-out endpoint, authed by `x-push-secret`
  (== `PUSH_HOOK_SECRET`). `{ type:'message', message_id }` resolves the
  conversation's participants (minus author), checks each recipient's
  notification settings, and delivers. DM → category `messages`; group/subject →
  `groups`.
- **Automatic trigger** — `notify_push_on_message()` (SECURITY DEFINER) on
  `messages` AFTER INSERT POSTs the endpoint via `pg_net` (non-blocking). The
  hook secret is read from **Supabase Vault** (`push_hook_secret`), never from a
  client-reachable table. DDL in `supabase/_apply_push_message_trigger.sql`.
- Verified end-to-end in production: message insert → trigger → `pg_net` →
  `200 {ok, recipients, delivered}`.

Still deferred: meetup/group/digest *triggers* (only DM/group-chat messages push
today — the other categories' toggles exist but have no emitter yet).

## Data-model summary

| Store | Field | Purpose |
|---|---|---|
| `onboarding_profiles` | `onboarding_completed boolean` | A1 — the routing gate |
| `mom_profiles.settings` | `notifications.enabled boolean` | B1 — master push opt-in |
| `mom_profiles.settings` | `notifications.{meetups,messages,groups,digest}` | existing granular prefs |
| `push_subscriptions` (new) | endpoint + keys | B5 — web-push targets |

## Design discipline

- Coral = 1:1 intimacy; the onboarding opt-in and master switch use coral CTAs
  (already the `ToggleSettingsSheet` / `PrimaryBtn` default).
- Fraunces headline + Albert Sans body on the new screen; no third typeface.
- All colors via `C.tokenName`.
- Laid out for 375×740.
