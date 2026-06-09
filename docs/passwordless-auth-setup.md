# Passwordless auth — Supabase setup guide

Go Mama dropped passwords. Login **and** signup now work the same way:

- **Email** → a 6-digit code **and** a magic link (either one signs you in)
- **Phone** → a 6-digit code by SMS
- **Google / Facebook / Apple** → unchanged OAuth

The app calls `supabase.auth.signInWithOtp(...)` to send the code and
`supabase.auth.verifyOtp(...)` to confirm it (see `src/lib/onboarding.js`).
`signInWithOtp` creates the user on first use, so there is **no separate
signup vs. login** anymore.

---

## 1. Database — nothing to change ✅

The OTP flow reuses the existing pipeline:

1. `verifyOtp` returns a Supabase session.
2. The `SIGNED_IN` event fires → `promoteSession` (`src/lib/onboarding.js`).
3. `/api/onboarding/promote` links the auth user to `onboarding_profiles` and
   creates the `mom_profiles` row — exactly what OAuth already did.

No new columns, no migrations. Passwords were never stored in our tables
(Supabase Auth owns them), so removing them needs no schema edit. The old
`/api/onboarding/signup` endpoint is now a deprecation stub (returns 410).

---

## 2. Supabase Dashboard — Authentication config

All paths below are in the Supabase Dashboard for your project.

### 2a. Email — enable OTP + show the code in the email

1. **Authentication → Providers → Email** — make sure **Email** is enabled.
2. Leave **"Confirm email"** on. (OTP inherently confirms ownership.)
3. **Authentication → Email Templates → Magic Link** — the default template
   only contains the link (`{{ .ConfirmationURL }}`). To support the inline
   6-digit code, add the token to the template body, e.g.:

   ```html
   <h2>Your Go Mama code</h2>
   <p>Enter this code in the app:</p>
   <p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
   <p>Or just tap this link: <a href="{{ .ConfirmationURL }}">Sign in</a></p>
   ```

   `{{ .Token }}` is the 6-digit code; `{{ .ConfirmationURL }}` is the magic
   link. Keeping both means the email works whether the user types the code or
   taps the link.

### 2b. Phone — enable + connect an SMS provider (required for phone codes)

Phone OTP **will not work** until an SMS provider is connected. This costs
money per message.

1. **Authentication → Providers → Phone** — toggle **Enable Phone provider**.
2. Choose an **SMS provider** and paste its credentials. Supabase supports
   **Twilio**, **Twilio Verify**, **MessageBird**, **Vonage**, and **TextLocal**.
   - Easiest to start: **Twilio**. You'll need Account SID, Auth Token, and a
     Messaging Service SID (or a verified sender number).
3. (Optional) Customize the SMS template; the code is `{{ .Code }}`.

> If you skip this step, the app still works for demos — `sendOtp` detects the
> "provider not configured" error and falls back to **demo mode**, where any
> 6-digit code is accepted (see the hint shown on the code screen). Email +
> OAuth are unaffected.

### 2c. URL configuration (for the email magic link to return to the app)

**Authentication → URL Configuration**

- **Site URL** → your production origin, e.g. `https://your-app.vercel.app`
- **Redirect URLs** → add every origin the app runs on, so the magic link is
  allowed to bounce back:
  - `https://your-app.vercel.app/**`
  - `http://localhost:5173/**` (Vite dev)
  - any Vercel preview domains you use

The app passes `emailRedirectTo: window.location.origin + '/'`, which must
match one of these entries.

### 2d. (Optional) Rate limits

**Authentication → Rate Limits** — the default OTP send limit is conservative
(roughly one code per 60s per address). Leave as-is unless you hit it in
testing; the "Resend code" button respects whatever you set here.

---

## 3. Environment variables (unchanged)

No new keys are required. Confirm these are set in Vercel
(**Project → Settings → Environment Variables**) and in `.env` locally:

| Variable | Where it's used |
|---|---|
| `VITE_SUPABASE_URL` | browser client (`src/lib/supabase.js`) |
| `VITE_SUPABASE_ANON_KEY` | browser client |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | serverless `promote`/`step` |

SMS provider credentials (Twilio, etc.) live **only in the Supabase
dashboard**, not in Vercel.

---

## 4. Test checklist

1. **Email code** — enter an email → check inbox → type the 6 digits → land in
   the app.
2. **Email magic link** — same, but tap the link instead → the app's
   `onAuthChange`/`promoteSession` hydrates you in.
3. **Phone code** — enter a real mobile → receive the SMS → type the code.
4. **OAuth** — Google/Facebook/Apple still work end to end.
5. **Returning user** — `Login` screen with the same email/phone signs you
   straight in (no new account created).
6. **Demo mode** — run with the SMS provider off: phone falls back to
   "enter any 6 digits," so demos never block.
