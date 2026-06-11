# Requirement — Honor profile privacy settings (non-admin)

**Date:** 2026-06-10 · **Status:** Implemented

Three per-mom privacy toggles live at `mom_profiles.settings.privacy.*` (booleans,
**default on**; surfaced in Profile → Privacy). When fetching mom profiles for the
**non-admin app** they must be honored. The admin view is unaffected (admins see
everyone and their true status).

| Setting key | Default | Rule |
|---|---|---|
| `discoverable` | on | When **off**, she never appears in discovery results (nearby / recommended). She still shows in group members and elsewhere. |
| `show_last_active` | on | When **off**, her avatar shows **no presence dot** (she opted out of showing her active status). |
| `verified_only_dms` | on | When **on**, an **unverified** sender cannot message her — the DM composer is disabled with an explanation. |

## Implementation

**1. Discoverable → exclude from discovery.**
`api/mom-profiles/nearby.js` SELECTs `settings`; `api/_lib/nearby.js`
`rankAndShape` skips any row with `settings.privacy.discoverable === false`
(undefined ⇒ discoverable). Group-member lists come from chat author snapshots,
not this query, so she remains visible there.

**2. Show last active → no dot.**
`api/_lib/mom-card.js` reads `show_last_active` (default true). When off it sets
`last_seen_at: null` and `presenceHidden: true` on the card. The client
(`App.jsx`) maps `presenceHidden` to a `null` presence, and `<PresenceDot>`
renders nothing for a null/`'hidden'` status. Offline moms (not hidden) still
show the gray dot.

**3. Verified-only messages → block unverified senders.**
The card carries `verifiedOnlyDms` (default true). `App.jsx` computes the
current user's verified status (`computeVerified` over their socials + photo) and
passes `senderVerified` to `MessageSheet`. When
`mom.verifiedOnlyDms && !senderVerified`, the composer is replaced by a
"Verified moms only" gate and `canSend` is false.

## Tests
- `nearby.test.mjs`: non-discoverable rows excluded, default/true kept.
- `mom-card.test.mjs`: privacy defaults; `show_last_active:false` ⇒ null
  `last_seen_at` + `presenceHidden:true`; `verified_only_dms:false` exposed.

## Notes / limitations (v1)
- **Verified-only is the default**, so an **unverified user can't DM most moms** —
  intentional given the verified-only positioning, but worth knowing when testing
  (verify your own profile to message).
- The DM block is **client-side** (UI gate). Server-side enforcement on the
  `messages` insert (RLS) is a follow-up — a determined unverified user could
  bypass the UI today.
- Settings stored as `undefined` (never toggled) are treated as the default (on).
