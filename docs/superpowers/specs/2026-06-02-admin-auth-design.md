# Admin authentication — design

**Date:** 2026-06-02
**Status:** Approved → implementing

## Problem

`/admin` and every `/api/admin/*` endpoint are **unauthenticated**. The API
routes use the Supabase **service-role key** (full DB access, bypasses RLS),
so anyone who knows a URL can:

- `GET /api/admin/onboarding` → read all signup PII
- `POST /api/admin/reset` → truncate every table
- `POST /api/admin/mom-profiles/update` → flip moderation flags

Gating only the React UI would be security theater — the lock must live at the
**API layer**.

## Decision

- **Auth model:** single shared password (one operator / market-study tool).
- **Session:** stays signed in until explicit sign-out (no expiry).
- **Mechanism:** password is exchanged **once** for an HMAC-signed token. The
  password itself is never stored client-side and never replayed. Only the
  signed token persists (localStorage) and travels (`Authorization: Bearer`).

Rejected alternatives:
- *Raw password as bearer token* — simpler, but the real secret would live in
  localStorage and ride every request. Worse blast radius if it leaks.
- *Supabase Auth + admin allowlist* — overkill for a single operator.
- *Vercel platform password protection* — all-or-nothing, plan/account-bound.

## Architecture

### Server (the real lock)

**`api/_lib/admin-auth.js`** (new)
- `signToken()` → `"<payloadB64>.<hmacB64url>"`, payload `{ r: 'admin', iat }`.
  HMAC-SHA256 keyed by `ADMIN_SESSION_SECRET`.
- `verifyToken(token)` → boolean. Recomputes the HMAC and compares with
  `crypto.timingSafeEqual` (constant-time). No expiry check (session = until
  sign-out).
- `checkPassword(candidate)` → boolean, `timingSafeEqual` against
  `ADMIN_PASSWORD`. Length-guarded so the compare can't throw on mismatched
  buffer sizes.
- `requireAdmin(req, res)` → reads the `Authorization: Bearer <token>` header,
  returns `true` if valid; otherwise writes `401 { error: 'Unauthorized' }`
  and returns `false`. Returns `503 { error: 'Admin auth not configured' }`
  when the env secrets are missing, so misconfiguration is obvious.

**`api/admin/login.js`** (new)
- `POST { password }` → `checkPassword` → `200 { token }` or `401`.
- Missing env → `503`. Wrong method → `405`.

**All 9 existing `api/admin/*` handlers** — add one line directly after the
`OPTIONS` preflight, before any work:

```js
if (!requireAdmin(req, res)) return;
```

Handlers: `onboarding`, `waitlist`, `mom-profiles`, `mom-profiles/update`,
`places`, `feedback`, `events`, `reset`, `seed`. (Preflight `OPTIONS` stays
unauthenticated so CORS still works.)

### Client (`src/AdminPage.jsx`)

- On mount, read `gm_admin_token` from localStorage.
- **No / invalid token →** render a password gate in the coral/navy aesthetic
  (Fraunces heading, Albert Sans body, coral CTA). Submit → `POST
  /api/admin/login` → store token → show dashboard. Wrong password → inline
  "Incorrect password" message.
- Send `Authorization: Bearer <token>` on every admin fetch (`fetchEndpoint`
  helper + the `reset`, `seed`, and `mom-profiles/update` calls).
- Any `401` from a data call → clear token, drop back to the gate.
- **Sign out** button in the header → clears `gm_admin_token`.

### Config

- `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` — server-only env vars (NOT
  `VITE_`-prefixed, so they never enter the browser bundle).
- Added to local `.env` (for `vercel dev`) and must be set in the Vercel
  project env for production.
- Under plain `npm run dev` the API routes don't run, so admin data doesn't
  load there regardless — the gate is only meaningful under `vercel dev` / prod.

## Error handling

| Case | Response |
|---|---|
| Wrong password at login | `401` → inline "Incorrect password" |
| Request with no/invalid token | `401 { error: 'Unauthorized' }` |
| Env secrets missing | `503 { error: 'Admin auth not configured' }` |
| Token expired | n/a — no expiry by design |

## Verification (repo has no test framework)

1. `curl /api/admin/onboarding` with no header → **401**.
2. `curl /api/admin/login` with wrong password → **401**; correct → **200 { token }**.
3. `curl /api/admin/onboarding` with `Authorization: Bearer <token>` → **200**.
4. Browser: login gate renders → enter password → dashboard loads (screenshot).

## Out of scope (YAGNI)

- Rate-limiting / lockout on failed logins — single-secret prototype; noted as
  a future hardening item, not built.
- Token expiry / refresh — user chose "until I sign out".
- Per-user accounts, audit log.
