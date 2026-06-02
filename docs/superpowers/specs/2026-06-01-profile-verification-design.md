# Profile verification — design

**Date:** 2026-06-01
**Status:** Landed (visual; OAuth still mocked)
**Surface:** `src/screens/MainApp/YouTab.jsx` — new "Verify your profile" section near the top.

## Problem

Go Mama's positioning is "verified moms only." The GoMama Expo prototype operationalizes verification as a two-signal gate: connect a social account (Instagram or Facebook) AND add a real photo. The current web app shipped without a UX for either signal — `verified` was a hardcoded boolean on each sample mom.

## Goals

1. Surface the verification status prominently in the Profile tab.
2. Three explicit connect rows: Instagram, Facebook, Real photo.
3. Each row tap-flips its sub-state.
4. Status badge: "⏳ Pending" → "✓ Verified mom" when (Instagram OR Facebook) AND photo are both on.
5. Store the result on `profile.verified` so we can mirror it to Supabase later.

## Non-goals

- **Real OAuth.** This is currently a self-attested toggle. Hooking up real Instagram OAuth (Meta Graph API) and Facebook OAuth (Supabase already supports it) is a follow-up.
- **Photo-quality enforcement.** "Real photo" today means the user has uploaded one — we don't run a verification ML model.

## Data model

```js
profile.verified = {
  instagram: boolean,
  facebook:  boolean,
  photo:     boolean,
}
```

Initialized in `App.jsx` defaults. Resets via `restart()`.

## Layout (inside YouTab)

```
[Section label "VERIFY YOUR PROFILE"]            [Badge: ⏳ Pending  or  ✓ Verified mom]

[Box, paper bg, divider border]

  "Connect a social account + add a real photo. Keeps the space safe for moms."

  [Row]  [IG icon coralPink]    Connect Instagram                  [› or ✓]
  [Row]  [FB icon blue]         Connect Facebook                   [› or ✓]
  [Row]  [User icon coral]      Add a real photo                   [› or ✓]
```

Rows are tap-able full-width buttons. Active row gets sage background + sageDark border + `✓` chevron.

## Verification logic

```js
const isFullyVerified =
  (verified.instagram || verified.facebook) && verified.photo;
```

Photo verification is *required*; the social half is satisfied by either Instagram OR Facebook.

## Badge

| State | Background | Color | Label |
|---|---|---|---|
| Not verified | `#FFF4D6` | `#B8852A` | "⏳ Pending" |
| Verified | `#DFF5E5` | `#2A7A48` | "✓ Verified mom" |

Both badges live in the section-label row, top-right.

## Persistence

Currently client-only. `profile.verified` will be promoted to a Supabase column or JSONB field in a follow-up so the admin can see the verification funnel for real users (not just seed data). The admin dashboard already reads `r.verified?.instagram` etc. and treats `undefined` as off — see the admin spec.

## Risks

- **Self-attestation is meaningless.** A user could toggle all three on without doing anything. For prototype validation that's fine; do not ship as the real verification gate.
- **Token-style social row colors.** Instagram pink (`#E4405F`) and Facebook blue (`#1877F2`) are hardcoded brand colors — intentionally not in the palette tokens because they're third-party brand references, not Go Mama design.

## Testing

- Tap each row → row flips sage / `✓` and the badge updates.
- Verified state requires photo + (IG OR FB). Just photo isn't enough; just social isn't enough.
- Refresh page → verified state is lost (client-only). Documented as a follow-up.
