# Profile Tab (YouTab) — `src/screens/MainApp/index.jsx` tab id `profile`

- **File:** `src/screens/MainApp/YouTab.jsx` (977 lines)
- **Purpose:** The mom's own profile. Sections (top to bottom): photo hero carousel + identity band, profile completion progress card, bio editor, settings rows (Interests, Location, Kids, Availability, Notifications, Privacy), social link (Instagram / Facebook → verification), refer-a-friend CTA, referred friends list, sign out. Hosts nine bottom sheets: ProfilePhotosSheet, EditIdentitySheet, InterestsPreferencesSheet, ToggleSettingsSheet (notifications + privacy), LocationSheet, KidsSheet, AvailabilitySheet, ContactVerifySheet, DeleteAccountSheet. Deactivation confirmation lives inline as a `Sheet` at the YouTab level.
- **Entry / when shown:** Active when `tab === 'profile'` in `MainApp/index.jsx`.
- **Related components/sheets:** `Sheet`, `ProfilePhotosSheet`, `EditIdentitySheet`, `InterestsPreferencesSheet`, `ToggleSettingsSheet`, `LocationSheet`, `KidsSheet`, `AvailabilitySheet`, `ContactVerifySheet`, `DeleteAccountSheet`, `StatPill`, `ContactRow`, `SettingsRow`, `SocialRow`.
- **Data dependencies:** Entirely local / app-state driven. `profile`, `account`, `location`, `prefs` from `App.jsx`. `fetchReferrals()` from `src/lib/onboarding.js` (async, best-effort). No `*Loading` flag is threaded for the referral fetch. `profileCompletion()` is a pure client-side computation.

## Current state (wireframe)

```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │  [190px photo hero]       │  │  ← swipeable carousel if >1 photo
│  │  [Verified badge top-left]│  │     or empty-state placeholder
│  │  [Camera button top-right]│  │
│  │  [paging dots bottom]     │  │
│  ├───────────────────────────┤  │
│  │  Display name   [status]  │  │  ← Pencil edit tap → EditIdentitySheet
│  │  @handle · Mom of N · 📍  │  │
│  ├───────────────────────────┤  │
│  │  ✉ email            Verified│  │  ← ContactRow (OTP-verified, private)
│  │  📞 phone           Verified│  │
│  │  🔒 Only you can see this  │  │
│  └───────────────────────────┘  │
│                                 │
│  [Complete your profile card]   │  ← only when completionPct < 100
│  ██████░░░░░░  42%              │
│  5 of 7 done · finish to verify │
│  [> Add your first photo]       │
│  [> Add your interests]         │
│                                 │
│  About me                 [Add] │
│  [bio text / textarea]          │
│  [@instagram] [Facebook]        │
│                                 │
│  ┌─────────────────────────────┐│
│  │ ❤ Interests & Preferences  ││  ← SettingsRow × 6
│  │ 📍 Location                ││
│  │ 👶 Kids                    ││
│  │ 📅 Availability            ││
│  │ 🔔 Notifications           ││
│  │ 🔒 Privacy                 ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ Link social media           ││
│  │ [Instagram]  [Connect]      ││
│  │ [Facebook]   [Connect]      ││
│  └─────────────────────────────┘│
│                                 │
│  [Refer a friend → Share]       │
│  [N friends joined (expanded)]  │
│                                 │
│  [Sign out]                     │
└─────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|-----------------------|----------------|
| 1 | Hardcoded hex | **High** | Five distinct off-token hex values appear in YouTab: `'#5E4A8A'` (purple — used at lines 137, 695, 714, 753; appears 4×), `'#E7EEF8'` (Facebook blue-light background, line 696), `'#2B5CA8'` (Facebook blue foreground, line 696), `'#FFF4D6'` (saffron-light background for Bell icon, line 720), `'#8A6610'` (saffron-dark foreground for Bell icon, line 720). None of these have a `C.*` token equivalent. | Add tokens to `src/theme.js`: `lilacDark: '#5E4A8A'` (already used in `C.lilac` as its foreground), `facebookBg: '#E7EEF8'`, `facebookFg: '#2B5CA8'`, `saffronBg: '#FFF4D6'`, `saffronDark: '#8A6610'`. Replace all raw hex in YouTab with these tokens. The `'#5E4A8A'` purple for Baby/Kids and the Gift icon is a 4× repetition — it clearly needs a token. |
| 2 | Loading / three-state contract | **High** | The referral fetch (`fetchReferrals()`, `YouTab.jsx:263–267`) is async and sets `referrals` state, but the referred-friends section (`YouTab.jsx:771–831`) renders `{referredFriends.length > 0 && ...}` — meaning it's simply absent during the fetch. There is no skeleton or loading indicator. On a slow connection, the section silently disappears then pops in with layout shift. | Add a `referralsLoading` local flag initialized to `true`, set to `false` in the effect's cleanup path. While loading, render a compact shimmer row (2 overlapping avatar skeletons + a text shimmer). When loaded with zero results, render nothing (correct — absence of friends is not an error to communicate). |
| 3 | Semantic color | **Medium** | The `SocialRow` "Connect" button (`YouTab.jsx:159–164`) for Instagram and Facebook uses solid `C.coral` background with white text. Connecting a social account is a verification action, not a 1:1 intimacy action — it gates access to the community. The "Verified Mom" badge that results uses sage. The CTA that leads to it should also signal safety/community (sage), not intimacy (coral). | Change the un-linked `SocialRow` "Connect" pill background from `C.coral` to `C.sageDark` (the same green as the resulting "Verified" badge). This creates a visual trail: sage CTA → tap → sage "Linked" badge. |
| 4 | Hardcoded hex | **Medium** | `SocialRow` (`YouTab.jsx:137`) sets `background: C.lilac, color: '#5E4A8A'` for the social icon tile. The value `'#5E4A8A'` is the correct foreground for `C.lilac` (as documented in design-tokens.md) but has no token name. This is the same value as the un-tokened purple appearing at lines 695, 714, 753. | Add `C.lilacDark: '#5E4A8A'` to `theme.js` (it is the natural foreground pair for `C.lilac`, mirrors `C.sageDark` for `C.sage`). |
| 5 | Trust signal / UX | **Medium** | The "Verified" badge appears in two places inside the identity band: overlaid on the photo hero (top-left, `YouTab.jsx:506–516`) AND inline next to the display name (`YouTab.jsx:553–559`). The double badge is redundant and reduces the signal value of each. On screens where neither is visible simultaneously (long bios, scrolled state) the inconsistency also appears when only one is in view. | Remove the name-row inline "Verified" badge (lines 553–559). Keep the photo-hero overlay badge only — it is more prominent and contextually meaningful (it is part of the same visual zone as the photo, which is itself a verification input). The "Unverified" pill can remain in the name row as a low-key prompt. |
| 6 | Content clarity / copy | **Medium** | The `ContactRow` empty state copy says "Add your {label}" (`YouTab.jsx:72`) — so it renders "Add your email" and "Add your phone". Underneath this row is the note: "Only you can see this — never shared with other moms." (`YouTab.jsx:586–589`). The note is correct and reassuring, but it is in `C.muted` at `fontSize: 10` — too small and too dim to register as trust-building copy. It reads like fine print. | Raise the private-contact note to `fontSize: 11`, `color: C.inkMuted` (slightly darker than `C.muted`). Consider leading it with a lock icon in `C.sageDark` to signal safety rather than restriction. |
| 7 | Interaction state | **Medium** | The bio editing state (`YouTab.jsx:666–699`) renders a `<textarea>` with `autoFocus`. On iOS, `autoFocus` on a textarea inside a scrollable container causes the virtual keyboard to appear and scroll the page in an unpredictable way — the textarea may be scrolled behind the keyboard. There is no `inputMode` or `enterKeyHint` hint to control the keyboard. | Add `enterKeyHint="done"` to the textarea. Wrap the bio card in a scroll-into-view `ref.scrollIntoView({behavior:'smooth', block:'nearest'})` called after the state flip so the textarea is visible above the keyboard. |
| 8 | Accessibility | **Medium** | `<img ... alt="">` on every profile photo in the hero carousel (`YouTab.jsx:470`) and in the referred-friends list (`YouTab.jsx:786, 810`). Hero profile photos are not decorative — they are the primary identity signal. Referred-friends photos identify named people. | Hero carousel: `alt={displayName}`. Referred friends: `alt={f.name || 'Friend'}`. |
| 9 | Mobile ergonomics | **Medium** | The sign-out button (`YouTab.jsx:836–844`) is positioned at the very bottom of a long scroll — it is an extremely low-priority action and rightly buried, but the deactivate/delete account actions are behind Privacy → accountFooter, requiring three taps and a lot of scroll. For a destructive action, discovery is not a problem; but the journey (Privacy sheet → account section → confirm sheet) is non-obvious. The only signal that "account" settings exist in Privacy is a small "Account" eyebrow header injected into the Privacy sheet footer. | Add a subtle "Manage account" row at the bottom of the main Settings block, above Sign out, with a `C.navy` label and muted subtitle — "Deactivate or delete". This surfaces the path without promoting destructive actions. |
| 10 | Loading contract | **Low** | The profile completion card (`YouTab.jsx:594–644`) is conditionally rendered only when `completionPct < 100`. The computation `profileCompletion(profile, location)` runs synchronously from local state — no loading state needed. However if `profile` is `null` (briefly during a fresh session before App.jsx hydrates), the function still runs (`YouTab.jsx:209`) and may produce unexpected output. | Guard the destructure: `const { items: completionItems, done: completionDone, pct: completionPct } = profile ? profileCompletion(profile, location) : { items: [], done: 0, pct: 0 };`. |
| 11 | Content clarity | **Low** | The referral CTA subline says "Unlock rewards as friends join" (`YouTab.jsx:758`). There are no rewards described anywhere in the app and `CLAUDE.md` does not document a rewards system. This copy sets an expectation the prototype does not fulfil. | Change to "Invite a friend to Go Mama" or "Help your friends find their village" — accurate, warm, and on-brand without a promise the app cannot keep. |
| 12 | Visual hierarchy | **Low** | The "Refer a friend" button (`YouTab.jsx:743–767`) uses `background: C.lilac` with an inline `Share` pill in `C.coralDeep`. This makes the coral pill the most visually prominent element in a button whose primary surface is lilac. The button reads as if Share is the main CTA and the surrounding button is decorative. `C.lilac` is documented as a "decorative chip background" (design-tokens.md). | Use a warm-neutral card background (`C.creamSoft` or `C.paper` with a `C.divider` border) for the Refer button so the coral Share pill is the accent, not a fight between two focal points. |

## Key issues (prose, ranked)

**1. Five hardcoded hex values (High)** is a systemic token gap. The purple `#5E4A8A` appears four times as the foreground for `C.lilac` surfaces — it is clearly a designed pairing that belongs in `theme.js` as `C.lilacDark`. The Facebook brand colors (`#E7EEF8`, `#2B5CA8`) and saffron derivatives (`#FFF4D6`, `#8A6610`) are all intentional design decisions that have been inline-hardcoded instead of tokenized. A single palette update would leave all of them stranded.

**2. Referral fetch has no skeleton (High)** — the referred-friends section appears or disappears based on async data with no transition. On a slow connection this causes a pop-in layout shift below the sign-out button. While the section is lower-priority, the three-state contract still applies to any async surface.

**3. SocialRow "Connect" CTA is coral (Medium)** — the most actionable design-semantics error. Tapping "Connect" on Instagram or Facebook begins the verification flow that earns the sage "Verified Mom" badge. Sage throughout would make the causal chain obvious: green CTA → green badge. Coral misleads this moment as intimate.

**4. Double "Verified" badge (Medium)** — displaying the same badge in both the photo overlay and the name row is redundant. The photo overlay is the canonical, most visible position. The name-row badge reduces the signal-to-noise ratio in the identity band, which is already dense with handle, kid count, and location.

## Recommended redesign

```
┌─────────────────────────────────┐
│  ┌───────────────────────────┐  │
│  │  [190px photo hero]       │  │
│  │  [Verified ✓] top-left    │  │  ← ONE verified badge only
│  │  [Camera] top-right       │  │
│  ├───────────────────────────┤  │
│  │  Display name  [Unverified]│ │  ← Unverified pill only when not verified
│  │  @handle · Mom of N · 📍  │  │    (no duplicate Verified badge here)
│  ├───────────────────────────┤  │
│  │  ✉  email         Verified │  │
│  │  📞 phone         Verified │  │
│  │  🔐 Only you see this      │  │  ← 11px, C.inkMuted, sage lock icon
│  └───────────────────────────┘  │
│                                 │
│  [Complete profile card]        │
│                                 │
│  About me  [Edit]               │
│  [bio]                          │
│  [@instagram] [Facebook]        │
│                                 │
│  ┌─────────────────────────────┐│
│  │ ❤ Interests                ││
│  │ 📍 Location                ││
│  │ 👶 Kids                    ││
│  │ 📅 Availability            ││
│  │ 🔔 Notifications           ││
│  │ 🔒 Privacy                 ││
│  │ ⚙ Manage account  ──────> ││  ← NEW row surfacing deactivate/delete
│  └─────────────────────────────┘│
│                                 │
│  Link social media              │
│  [Instagram]  [sage Connect →]  │  ← sage CTA, not coral
│  [Facebook]   [sage Connect →]  │
│                                 │
│  [Refer a friend card — paper   │
│   background, coral Share pill] │
│                                 │
│  [referral friends list]        │
│  [Sign out]                     │
└─────────────────────────────────┘
```

## Before / after comparison (what changes visually)

| Area | Before | After |
|------|--------|-------|
| Verified badge | Two instances: photo overlay + name row | One instance: photo overlay only |
| SocialRow Connect CTA | `C.coral` background | `C.sageDark` background (verification = community safety) |
| Hardcoded purple `#5E4A8A` | 4× inline hex | `C.lilacDark` token |
| Facebook brand colors | `#E7EEF8` / `#2B5CA8` hardcoded | `C.facebookBg` / `C.facebookFg` tokens |
| Saffron Notifications row | `#FFF4D6` / `#8A6610` hardcoded | `C.saffronBg` / `C.saffronDark` tokens |
| Referral fetch loading | Silent absence → pop in | Shimmer skeleton row |
| Referral card background | `C.lilac` (decorative chip color) | `C.creamSoft` with `C.divider` border |
| Private contact note | 10px `C.muted` fine-print | 11px `C.inkMuted` with sage lock icon |
| Manage account | Hidden behind Privacy → footer | Visible settings row above Sign out |
| Referral subline | "Unlock rewards as friends join" | "Invite a friend to Go Mama" |

## Implementation notes

- **`C.lilacDark: '#5E4A8A'`** — add to `src/theme.js`. Replace all 4 occurrences in YouTab: lines 137, 695, 714, 753.
- **`C.facebookBg: '#E7EEF8'`, `C.facebookFg: '#2B5CA8'`** — add to `src/theme.js`. Replace `YouTab.jsx:696`.
- **`C.saffronBg: '#FFF4D6'`, `C.saffronDark: '#8A6610'`** — add to `src/theme.js`. Replace `YouTab.jsx:720`. (Note: `ConnectTab.jsx` also uses `#8A6610` at lines 556 and 619 — the same token addition fixes both files.)
- **Remove duplicate Verified badge** in identity band: delete the `{verified && ...}` block at `YouTab.jsx:553–559`. Keep only the photo-overlay badge at lines 506–516.
- **SocialRow Connect pill** (`YouTab.jsx:159–164`): change `background: C.coral` to `background: C.sageDark`.
- **Referral loading skeleton**: In the effect at line 260, initialize `const [referralsLoading, setReferralsLoading] = useState(true)`. Set `setReferralsLoading(false)` after `setReferrals(data)`. Render `{referralsLoading && <ReferralSkeleton/>}` before the `{referredFriends.length > 0 && ...}` block. `ReferralSkeleton`: a `<div style={{marginTop:8,...}}>` containing a flex row of two 28px circle skeletons + a 80px text shimmer.
- **"Manage account" row**: Insert a new `<SettingsRow>` between Privacy and sign-out: `Icon={Settings}`, `iconBg={C.cream}`, `iconFg={C.inkMuted}`, `label="Manage account"`, `sub="Deactivate or delete"`, `onClick={() => setSheet('priv')}` (the Privacy sheet already contains the account footer, so routing there is correct without adding a new sheet).
- **Bio textarea ergonomics** (`YouTab.jsx:669`): Add `enterKeyHint="done"` attribute.
- **Hero photo alt** (`YouTab.jsx:470`): Change `alt=""` to `alt={displayName}`.
- **Friend photo alt** (`YouTab.jsx:786, 810`): Change `alt=""` to `alt={f.name || 'Friend'}`.

## Acceptance criteria

- [ ] `src/theme.js` gains: `lilacDark`, `facebookBg`, `facebookFg`, `saffronBg`, `saffronDark`.
- [ ] No raw hex values `#5E4A8A`, `#E7EEF8`, `#2B5CA8`, `#FFF4D6`, `#8A6610` appear in YouTab.jsx.
- [ ] The Verified badge inline in the identity name row (lines 553–559) is removed; the photo-overlay badge remains.
- [ ] `SocialRow` "Connect" pill uses `C.sageDark` background.
- [ ] Referral fetch shows a skeleton shimmer while `referralsLoading === true`.
- [ ] Hero photo img has `alt={displayName}`.
- [ ] Referred-friend photos have `alt={f.name || 'Friend'}`.
- [ ] A "Manage account" settings row is visible in the main settings block without entering Privacy.
- [ ] Referral card uses `C.creamSoft` or `C.paper` (not `C.lilac`) as its background.
- [ ] Referral subline copy does not promise "rewards".
- [ ] Bio textarea has `enterKeyHint="done"`.
- [ ] Private-contact note is at least 11px and uses `C.inkMuted` or darker.
