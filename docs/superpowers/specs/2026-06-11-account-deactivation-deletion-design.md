# Account Deactivation & Deletion — design

**Date:** 2026-06-11
**Status:** Approved (design)

## Goal

Let a signed-in mom **deactivate** her account (reversible pause) or request
**permanent deletion** (with a stored reason) from her Profile. While
deactivated, she cannot interact with the app; on her next login she must
reactivate before reaching any tab. Deletion is a soft-delete with a 30-day
grace period and self-serve restore, then a hard purge.

Covers the full stack: database, API, root-level guards, and UI.

## Decisions (locked)

- **Delete model:** soft delete + 30-day purge. Access removed immediately
  (sign out, hidden everywhere); full erasure within 30 days; self-serve
  **Restore** available during the grace window.
- **Reason capture:** preset reason chips + optional free-text note.
- **Placement:** Deactivate & Delete live inside the existing Privacy sheet
  (a new "Account" footer section), not a top-level card.

## 1. Data model

New idempotent migration: `supabase/_apply_phase13_account_lifecycle.sql`.

On `public.mom_profiles` (the canonical per-user record, keyed by `auth_user_id`):

```sql
alter table public.mom_profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists deactivated_at timestamptz,
  add column if not exists deleted_at timestamptz;

-- account_status ∈ {'active','deactivated','deleted'} (enforced by a CHECK).
alter table public.mom_profiles
  add constraint mom_profiles_account_status_chk
  check (account_status in ('active','deactivated','deleted')) not valid;
```

New table — survives the purge so the reason is never lost:

```sql
create table if not exists public.account_deletion_feedback (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid,          -- opaque id; the PII it pointed to is purged
  username      text,          -- denormalized snapshot at deletion time
  reason_code   text,
  reason_note   text,
  created_at    timestamptz not null default now()
);

revoke all on public.account_deletion_feedback from anon, authenticated;
alter table public.account_deletion_feedback enable row level security;
-- No policies => service-role-only, matching the backend-only table model.
```

The feedback row is written **before** `account_status` flips to `deleted`, so
a mid-flight failure never loses the reason and never half-deletes.

## 2. API

New service-role endpoints under `api/account/`, each authed by a Supabase
`access_token` in the JSON body and verified against `/auth/v1/user` (the exact
pattern `promote.js` uses). All resolve the caller's `mom_profiles` row by
`auth_user_id`; reject anonymous sessions.

| Endpoint | Effect |
|---|---|
| `POST /api/account/deactivate` | `account_status='deactivated'`, `deactivated_at=now()`, `settings.privacy.discoverable=false`. |
| `POST /api/account/reactivate` | `account_status='active'`, `deactivated_at=null`. |
| `POST /api/account/delete` `{reason_code, reason_note}` | Insert `account_deletion_feedback` row, **then** `account_status='deleted'`, `deleted_at=now()`, `settings.privacy.discoverable=false`. |
| `POST /api/account/restore` | Only valid when `account_status='deleted'` AND `deleted_at > now()-interval '30 days'` → `account_status='active'`, `deleted_at=null`. Otherwise 409. |

Shared helper `api/_lib/account.js`: `loadOwnMomProfile(creds, accessToken)`
(verify JWT → fetch row by `auth_user_id`; returns `{user, row}` or an error),
reused by all four endpoints.

**Discovery guard (server-side):** `api/_lib/nearby.js` adds
`account_status=eq.active` to the nearby/discovery query so deactivated and
deleted moms vanish from everyone else's app at the source — not just hidden
client-side.

**promote change:** `hydratedShape` in `api/onboarding/promote.js` returns
`account_status` and `deleted_at` so the launch guard knows the state on every
app load. `promote` itself does not block — it reports status; routing decides.

## 3. 30-day purge

`POST /api/internal/purge-deleted` — guarded by the existing internal/admin
secret (see `api/internal/` + `api/_lib/admin-auth.js`), runnable on a Vercel
cron. Selects `mom_profiles` where `account_status='deleted'` AND
`deleted_at < now()-interval '30 days'` and for each:

1. Delete the `mom_profiles` row.
2. Scrub PII on the matching `onboarding_profiles` row — null out
   `first_name, email, phone, location*, kids_ages, mom_types, values,
   interests` and set `auth_user_id=null`. Keep the row shell (avoids breaking
   any FK / referral history); the row carries no PII afterward.
3. Best-effort delete the user's chat rows (`conversations`,
   `conversation_participants`, `messages`, `message_reactions`) by `auth.uid()`.
4. Delete the Supabase auth user via the admin API
   (`DELETE /auth/v1/admin/users/{id}` with the service-role key).

`account_deletion_feedback` is intentionally **not** purged (no PII; it's the
retained reason record).

Compliance: `public/data-deletion.html` gets one clarifying sentence — deletion
takes effect immediately (profile hidden, access removed at once), is fully
erased within 30 days, and can be undone by logging back in during that window.
This keeps the page consistent with the soft-delete + grace behavior.

## 4. UI / client

### Client API (`src/lib/account.js`, new)
Thin wrappers — `deactivateAccount()`, `reactivateAccount()`,
`deleteAccount({reasonCode, reasonNote})`, `restoreAccount()` — each pulls the
`access_token` from the Supabase session (like `updateMomProfile`) and POSTs to
the matching endpoint. Return `{ok}` / throw a friendly error.

### Privacy sheet entry point
`ToggleSettingsSheet` gains an optional `footer` prop (a node rendered below the
toggles, above the Save CTA). YouTab's Privacy invocation passes an **"Account"**
section with two rows:
- **Deactivate account** (muted) → confirm sheet → `deactivateAccount()` →
  `signOut()` + `restart()`. Copy: "Take a break — you'll disappear from
  matching until you reactivate. Log back in anytime to return."
- **Delete account** (coral/danger) → opens `DeleteAccountSheet`.

### `DeleteAccountSheet.jsx` (new)
Content-sized drawer following existing sheet patterns. Fraunces headline with
one italic-coral word; preset reason chips:
`Found my people` · `Not enough moms nearby` · `Too many notifications` ·
`Privacy concerns` · `Taking a break` · `Other`; optional note textarea
(maxlength ~280). Two-step confirm ("This hides your profile now and erases
everything in 30 days. You can restore by logging back in within 30 days.") →
`deleteAccount()` → `signOut()` + `restart()`.

### New launch-gate screens (`src/screens/`)
Rendered from App.jsx alongside the existing `authResolving`/Landing/MainApp
routing (same gate pattern as the session probe):
- **`ReactivateScreen.jsx`** — shown when `account_status==='deactivated'`.
  Warm copy, one coral CTA "Reactivate my account" → `reactivateAccount()` →
  set status active → MainApp. Secondary "Sign out".
- **`DeletedScreen.jsx`** — shown when `account_status==='deleted'`. Within 30
  days of `deleted_at`: show days-left + "Restore my account" → `restoreAccount()`
  → MainApp. Otherwise terminal "This account has been deleted" + Sign out. No
  app access in either case.

### Root guard (App.jsx)
- New state `accountStatus` (from the promote payload).
- Routing precedence after the `authResolving` gate clears:
  `authResolving` → `AuthLoading`; else `accountStatus==='deactivated'` →
  `ReactivateScreen`; `accountStatus==='deleted'` → `DeletedScreen`; else the
  existing Login / Landing / onboarding / MainApp flow.
- Because the gate sits at the root before MainApp mounts, a deactivated or
  deleted user cannot reach any tab, sheet, or action.
- On successful reactivate/restore, set `accountStatus='active'` and proceed.
- `restart()` already resets state + signs out; reuse for the sign-out paths.

## 5. Flow & testing

User-traced paths:
- Deactivate → sign out → login → ReactivateScreen → reactivate → MainApp.
- Delete → reason stored → sign out → login (within 30d) → DeletedScreen →
  restore → MainApp.
- Delete → 30 days elapse → purge job removes data + auth user → login no longer
  finds the account → Landing (fresh start).

Automated (`node --test`, `*.test.mjs`):
- purge selection query targets only `deleted` + `>30d` rows;
- `delete` writes the feedback row before flipping status (ordering);
- `promote`'s `hydratedShape` includes `account_status`/`deleted_at`;
- nearby query excludes non-active accounts.

Manual: dev-server walk of all three gate screens + the Privacy/Delete sheets.

## Out of scope
- Email/SMS notifications on deactivate/delete.
- Admin dashboard surfacing of deletion-reason analytics (data is captured; the
  dashboard view is a follow-up).
- Re-onboarding niceties after a post-purge return (treated as a brand-new user).
