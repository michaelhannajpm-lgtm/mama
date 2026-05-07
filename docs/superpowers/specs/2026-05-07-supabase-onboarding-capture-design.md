# Onboarding data capture in Supabase

**Date:** 2026-05-07
**Status:** Approved — implementation in flight
**Owner:** Mama prototype
**Related:** existing `api/waitlist.js`, `supabase/waitlist_schema.sql`

## Goal

Persist every piece of onboarding data a mom enters in the Mama prototype into Supabase, **after each screen advance**, so we can:

1. Capture full profiles for moms who finish signup.
2. Capture partial profiles for moms who drop off mid-flow (and see *where* they dropped).
3. Support multiple sign-up paths: phone+password, email+password, Google, Facebook, Apple.
4. Generate a Mama username for every mom regardless of auth path.
5. Reserve a schema slot for moms to link their Instagram / Facebook / WhatsApp / TikTok handles later (post-onboarding profile-edit feature).

## Non-goals

- Profile-edit UI for social-link fields (column exists, UI is a separate spec).
- Existing-user login screen (auto-promote on mount handles re-login implicitly).
- OAuth provider configuration in the Supabase dashboard (callback URLs are documented; dashboard setup is manual).
- Real billing / Plus trial wiring (still prototype-only).
- Funnel-events table / per-event analytics (`current_step` on the profile row is enough for v1).

## Architecture

### Transport split

```
Browser (PrototypeApp)
  ├── @supabase/supabase-js  ── auth only
  │      • signUp({email|phone, password})
  │      • signInWithOAuth({provider})
  │      • getSession() / signOut()
  │
  └── fetch /api/onboarding/* ── data only (service role)
         • POST /step       upsert progress after each screen
         • POST /signup     password signup + row promotion
         • POST /promote    OAuth-return: attach auth_user to row
         • GET  /get        hydrate state on session restore
```

### Identity model

- On first onboarding screen, the client generates a UUID `session_id` and persists it in `localStorage` under `mama:session_id`.
- Every step write upserts the same row in `onboarding_profiles` keyed by `session_id`.
- At signup (password OR OAuth-return), we obtain an `auth.users.id` and UPDATE the same row, attaching `auth_user_id`, `auth_provider`, `username`, and the AccountScreen fields.
- One row per mom. Drop-offs preserved with `auth_user_id IS NULL`. Completed signups have `completed_at IS NOT NULL`.

### Why API routes for data, SDK for auth

- **OAuth requires a browser redirect flow** — that path can't be implemented purely in API routes, so the SDK is necessary anyway.
- **API routes for data writes** keeps the service-role key out of the browser and avoids writing RLS policies that allow anonymous upserts (a non-trivial security surface).
- **Hybrid is clean:** SDK does what it does best (auth flows, JWT management); API routes do what they do best (privileged writes with validation).

## Data model

```sql
create extension if not exists pgcrypto;

create table public.onboarding_profiles (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null unique,
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  current_step    smallint not null default 0,
  completed_at    timestamptz,

  -- Screen 3
  location        text,
  distance_miles  smallint,

  -- Screen 4
  kids_ages       jsonb,
  mom_types       text[],
  values          text[],
  interests       text[],

  -- Screen 5 + 6
  slots           text[],
  places          text[],

  -- AccountScreen / OAuth
  first_name      text,
  username        text unique,
  contact_method  text check (contact_method in ('phone','email','google','facebook','apple')),
  phone           text,
  email           text,
  agreed_terms    boolean,
  auth_provider   text,

  -- Future profile-edit feature
  social_links    jsonb not null default '{}'::jsonb,

  -- Telemetry
  user_agent      text,
  referrer        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index on public.onboarding_profiles (auth_user_id);
create index on public.onboarding_profiles (completed_at);
create index on public.onboarding_profiles (current_step);

alter table public.onboarding_profiles enable row level security;
-- No RLS policies: only the service role (via API routes) writes or reads.
```

A `BEFORE UPDATE` trigger sets `updated_at = now()`. Schema lives in `supabase/onboarding_schema.sql`.

### `social_links` shape (forward-looking)

```json
{
  "instagram":   "@sarak",
  "facebook":    "sara.k",
  "whatsapp":    "+15551234567",
  "tiktok":      "@sarak"
}
```

Set by the future profile-edit feature; not written during onboarding.

### Username generation

- **Base:** `first_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)`. Empty → `'mama'`.
- **Collision strategy:** attempt insert with `base`. On unique-violation, retry with `${base}${randomHex(4)}`. Up to 3 retries. Still failing → fall back to `mama-${randomHex(8)}`.
- Generated server-side at signup/promote time. User can rename later (out of scope here).

## Client wiring

### New: `src/lib/supabase.js`

```js
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } },
);
```

### New: `src/lib/onboarding.js`

Exports:

- `getSessionId()` — UUID, lazily created and cached in `localStorage`.
- `recordStep(step, patch)` — fire-and-forget POST to `/api/onboarding/step`. **Never blocks the UI; never throws.** Errors are silently swallowed.
- `completeSignup({ firstName, method, phone, email, password, agreedTerms })` — awaited; calls `/api/onboarding/signup`, surfaces errors to caller.
- `signInWithProvider('google' | 'facebook' | 'apple')` — calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/prototype' } })`.
- `promoteSession()` — reads current session via `supabase.auth.getSession()`. If a session exists, POSTs `{ session_id, access_token }` to `/api/onboarding/promote` and returns the hydrated profile. Returns `null` if no session.
- `clearSession()` — clears `localStorage` session_id and signs out via `supabase.auth.signOut()`. Used by `restart()`.

### Wiring in `App.jsx`

**On mount (one-shot):**

```js
useEffect(() => {
  promoteSession().then(result => {
    if (!result?.auth_user_id) return;
    setProfile(result.profile);
    setPrefs(result.prefs);
    setLocation(result.location);
    setDistance(result.distance);
    setAccount({
      firstName: result.first_name,
      username: result.username,
      auth_user_id: result.auth_user_id,
      method: result.contact_method,
      phone: result.phone,
      email: result.email,
    });
    setSplashShown(true);
    setStep(7);              // skip to MainApp
  });
}, []);
```

This handles both OAuth-return and existing-session restore via the same code path.

**On each screen advance** the `onNext` handler in App.jsx calls `recordStep(currentStepIndex, patch)` before `setStep(n+1)`:

| Step | Screen | Patch |
|---|---|---|
| 1 | Screen3 | `{ location, distance_miles: distance }` |
| 2 | Screen4 | `{ kids_ages: profile.kidsAges, mom_types: profile.momTypes, values: profile.values, interests: profile.interests }` |
| 3 | Screen5 | `{ slots: prefs.slots }` |
| 4 | Screen6 | `{ places: prefs.places }` |
| 5 | SummaryScreen | `{}` (no new data, just advances `current_step`) |
| 6 | AccountScreen | handled by `/api/onboarding/signup` or `/api/onboarding/promote`, not `/step` |

### AccountScreen changes

- New OAuth row above the Phone / Email tabs:
  ```
  [ Continue with Google  ]
  [ Continue with Facebook ]
  [ Continue with Apple   ]
  ─── or sign up with ───
  ```
- "Continue with X" calls `signInWithProvider('x')`. The browser redirects out; on return the App.jsx mount-effect handles promotion.
- The existing phone/email + password form stays. On submit, `handleSubmit` becomes async:
  ```js
  const result = await completeSignup({ firstName, method, phone, email, password, agreedTerms });
  // result: { ok, auth_user_id, username, first_name, error? }
  ```
- Error states (existing email, weak password, network) surface inline as a banner under the submit button.

## Server endpoints

All four endpoints follow the validation/CORS shape of `api/waitlist.js`. All require `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` env vars.

### `POST /api/onboarding/step`

**Request:**
```json
{ "session_id": "uuid", "step": 1, "patch": { "location": "Tampa, FL", "distance_miles": 5 } }
```

**Behavior:**
1. Validate `session_id` is a UUID, `step` ∈ [0, 6], `patch` keys are in the allowlist (`location`, `distance_miles`, `kids_ages`, `mom_types`, `values`, `interests`, `slots`, `places`).
2. Upsert via Supabase REST `POST /rest/v1/onboarding_profiles?on_conflict=session_id` with `Prefer: resolution=merge-duplicates,return=minimal` and `current_step = greatest(current_step, $step)`.
3. Capture `user_agent` + `referrer` from request headers on first insert only.
4. Return `{ ok: true }`.

### `POST /api/onboarding/signup`

**Request:**
```json
{
  "session_id": "uuid",
  "firstName": "Sara",
  "method": "phone" | "email",
  "phone": "(555) 123-4567",
  "email": "sara@example.com",
  "password": "...",
  "agreedTerms": true
}
```

**Behavior:**
1. Validate fields. Reject if `agreedTerms !== true`.
2. POST to Supabase Auth: `POST /auth/v1/signup` with `{ phone, password }` or `{ email, password }`. Use `apikey` = service role.
3. On success, generate username from `firstName`. Update the `onboarding_profiles` row `WHERE session_id = $1` with `auth_user_id`, `first_name`, `username`, `contact_method = method`, `phone`, `email`, `agreed_terms`, `auth_provider = method`, `completed_at = now()`.
4. On username conflict, retry with hex suffix (see Username generation).
5. Return `{ ok: true, auth_user_id, username, first_name }`. Errors return 4xx with `{ error: "<user-facing message>" }`.

### `POST /api/onboarding/promote`

**Request:**
```json
{ "session_id": "uuid", "access_token": "eyJ..." }
```

**Behavior:**
1. Verify the JWT by calling `GET /auth/v1/user` with `Authorization: Bearer <access_token>` and `apikey` = service role. Get back the user object.
2. Read `provider = user.app_metadata.provider` (one of `google`, `facebook`, `apple`, `email`, `phone`).
3. Read `firstName` from row's existing `first_name` if set; else from `user.user_metadata.full_name` / `user.user_metadata.name` / email local-part.
4. Generate username if row doesn't already have one.
5. UPDATE the row WHERE `session_id = $1` setting `auth_user_id`, `auth_provider`, `contact_method = provider`, `email`/`phone` (from `user.email`/`user.phone`), `username`, `first_name`, `completed_at = now()`.
6. SELECT the row and return its full hydrated state for the client to restore.

### `GET /api/onboarding/get?session_id=<uuid>`

Returns the full row (or `null`) for hydration on app reload. Used when the SDK has a cached session but `promoteSession` returns no auth match — currently unused by the wired flow but exists for debugging and future "resume signup" feature.

## Failure & error handling

- **`recordStep` fire-and-forget:** if `/api/onboarding/step` is down, the user's flow continues. The next step's upsert overwrites with cumulative state, so we don't lose anything except that single step's *delta*. Acceptable for a prototype.
- **Signup errors:** returned as 4xx JSON with `{ error: <message> }`. AccountScreen renders inline.
- **OAuth failures:** if `signInWithOAuth` redirects back without a session (user denied), `promoteSession` returns null and the user simply lands back on the AccountScreen with no side effect.
- **Promote race conditions:** if two tabs both promote the same `session_id`, the second UPDATE is idempotent (auth_user_id collision returns conflict; we treat that as success).

## Environment variables

Server (Vercel): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already exist).
Client (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (new).

`.env.example` updated to list all four.

## Supabase dashboard setup (manual, one-time)

Listed here as out-of-scope for the implementation but required before OAuth works:

1. **Auth → Providers** — enable Google, Facebook, Apple. Paste OAuth client ID/secret for each.
2. **Auth → URL Configuration** — set Site URL to production domain. Add `https://<domain>/prototype` to redirect URLs (and `http://localhost:5173/prototype` for dev).
3. Run `supabase/onboarding_schema.sql` in the SQL editor.

## Out of scope for this spec

- Profile-edit UI to set `social_links`.
- Username editing UI.
- Existing-user login screen / "I already have an account" flow on the splash.
- Sign-out UI.
- Phone-OTP confirmation flow (Supabase phone signup with confirmations enabled).
- Email confirmation flow.
- Password reset.
- Plus / billing changes.
