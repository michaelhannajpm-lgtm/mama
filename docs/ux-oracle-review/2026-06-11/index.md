# Go Mama — Non-Admin UX/UI Audit · 2026-06-11

A detailed, code-grounded UX/UI audit of every user-facing **phone-app** surface (screens,
tabs, bottom-sheets) and every shared **component** outside the `/admin` console. Each finding
cites real `file:line` and maps to the `C` design-token system in `src/theme.js`.

> **Scope note — admin excluded.** `src/screens/admin/**` and its `AC` design system were
> deliberately left out per the brief.

## How this audit was produced (and a limitation)
The repo has **no browser-automation tooling** (no Playwright/Puppeteer), and `npm run dev`
serves the Vite client only — the `api/*` routes that feed live places/events/moms are **not
live** there, so any captured screenshot would render empty loading/empty states. Real PNG
"before" screenshots were therefore **not feasible** in this environment. Instead, every
screen was reconstructed into a faithful **ASCII/markdown wireframe from the actual JSX**, and
every "after" is an **annotated markdown wireframe** of the proposed redesign. The `assets/`
folder is intentionally empty. To add true screenshots later: `npm i -D playwright`, run
`npm run dev:api` (full stack) against a seeded Supabase, and drive `/` at 1440px (desktop),
768px (tablet), and 390px (mobile).

---

## Executive summary

Go Mama is a strong, opinionated design — a coherent coral/navy editorial system, a well-named
token set, a documented three-state loading contract, and a clear premium/verification model.
The **visual language is largely intact**; the audit found very few taste-level problems.

The real risks are in three buckets:

1. **Seeded/test data shipping to production (Critical).** Several user-facing surfaces still
   carry developer placeholders — a real stranger's name + Tampa phone number pre-filled into
   two account forms, San Francisco venue names in the Tampa 1:1 scheduler, a dev-only "Pick
   seeded mom" button on the Landing screen with no `DEV` guard, and static "12 moms visited
   this week" social proof. These are trust- and conversion-destroying at the highest-stakes
   moments, and two of them carry **legal exposure** (pre-checked consent → GDPR/CCPA, Apple
   5.1.1).

2. **Accessibility gaps on the highest-traffic primitives (Critical/High).** The universal
   `Sheet` drawer (27 call sites) has no `role="dialog"`, no focus trap, no Escape-to-close,
   and a sub-44pt close button — one fix unblocks the entire modal surface. The bottom tab bar
   has no `tablist`/`tab`/`aria-current` semantics. Keyboard activation is missing on the
   AboutYou kid-count steppers.

3. **Design-system drift under pressure (High/Medium).** Hardcoded hex values have crept back
   into the most-seen surfaces (tab bar, home rails, category lists, profile chips), revealing
   ~3 missing tokens (`lilacDark`, `saffronDark`, a continue-tile palette). The three-state
   loading contract is violated in a few places (Home age/feature sections vanish during load;
   a meetup skeleton with the wrong shape causes a layout snap; MessageSheet shows blank white
   for 1–3s). The shared `PrimaryBtn` is bypassed by 26+ sheets, each re-rolling its own CTA.

None of these require a redesign. They are a **focused hardening pass**: delete the seeded
data, harden `Sheet` once, sweep hex→token, and enforce the loading contract. The brand and
IA are sound.

---

## Screens audited (22)

| Surface | File | Audit |
|---|---|---|
| Landing | `src/screens/Landing.jsx` | [screens/landing.md](screens/landing.md) |
| Onboarding · AboutYou | `src/screens/onboarding/AboutYou.jsx` | [screens/onboarding-aboutyou.md](screens/onboarding-aboutyou.md) |
| Onboarding · Account | `src/screens/onboarding/Account.jsx` | [screens/onboarding-account.md](screens/onboarding-account.md) |
| Onboarding · Login | `src/screens/onboarding/Login.jsx` | [screens/onboarding-login.md](screens/onboarding-login.md) |
| Onboarding · Notifications opt-in | `src/screens/onboarding/NotificationsOptIn.jsx` | [screens/onboarding-notifications-optin.md](screens/onboarding-notifications-optin.md) |
| MainApp shell + tab bar | `src/screens/MainApp/index.jsx` | [screens/mainapp-shell.md](screens/mainapp-shell.md) |
| Home tab | `src/screens/MainApp/HomeTab.jsx` | [screens/home-tab.md](screens/home-tab.md) |
| Connect tab | `src/screens/MainApp/ConnectTab.jsx` | [screens/connect-tab.md](screens/connect-tab.md) |
| Explore tab | `src/screens/MainApp/LocalPicksTab.jsx` | [screens/explore-tab.md](screens/explore-tab.md) |
| Profile tab | `src/screens/MainApp/YouTab.jsx` | [screens/profile-tab.md](screens/profile-tab.md) |
| Lifecycle · Reactivate | `src/screens/ReactivateScreen.jsx` | [screens/lifecycle-reactivate.md](screens/lifecycle-reactivate.md) |
| Lifecycle · Deleted | `src/screens/DeletedScreen.jsx` | [screens/lifecycle-deleted.md](screens/lifecycle-deleted.md) |
| Sheet · Create account | `src/sheets/CreateAccountSheet.jsx` | [screens/sheet-create-account.md](screens/sheet-create-account.md) |
| Sheet · Premium | `src/sheets/PremiumSheet.jsx` | [screens/sheet-premium.md](screens/sheet-premium.md) |
| Sheet · Message | `src/sheets/MessageSheet.jsx` | [screens/sheet-message.md](screens/sheet-message.md) |
| Sheet · Schedule | `src/sheets/ScheduleSheet.jsx` | [screens/sheet-schedule.md](screens/sheet-schedule.md) |
| Sheet · Profile | `src/sheets/ProfileSheet.jsx` | [screens/sheet-profile.md](screens/sheet-profile.md) |
| Sheet · Mom detail | `src/sheets/MomDetailSheet.jsx` | [screens/sheet-mom-detail.md](screens/sheet-mom-detail.md) |
| Sheet · Place detail | `src/sheets/PlaceDetailSheet.jsx` | [screens/sheet-place-detail.md](screens/sheet-place-detail.md) |
| Sheet · Event detail | `src/sheets/EventDetailSheet.jsx` | [screens/sheet-event-detail.md](screens/sheet-event-detail.md) |
| Sheet · Verify prompt | `src/sheets/VerifyPromptSheet.jsx` | [screens/sheet-verify-prompt.md](screens/sheet-verify-prompt.md) |
| **All 31 sheets — roll-up** | `src/sheets/*` | [screens/sheets-overview.md](screens/sheets-overview.md) |

## Components audited (14 + overview)

| Component | File | Audit |
|---|---|---|
| **Overview / cross-cutting** | `src/components/*` | [components/_components-overview.md](components/_components-overview.md) |
| Sheet (drawer primitive) | `src/components/Sheet.jsx` | [components/sheet.md](components/sheet.md) |
| PrimaryBtn | `src/components/PrimaryBtn.jsx` | [components/primary-btn.md](components/primary-btn.md) |
| PhoneFrame | `src/components/PhoneFrame.jsx` | [components/phone-frame.md](components/phone-frame.md) |
| StatusBar | `src/components/StatusBar.jsx` | [components/status-bar.md](components/status-bar.md) |
| Skeleton | `src/components/Skeleton.jsx` | [components/skeleton.md](components/skeleton.md) |
| Toast | `src/components/Toast.jsx` | [components/toast.md](components/toast.md) |
| HeroCarousel | `src/components/HeroCarousel.jsx` | [components/hero-carousel.md](components/hero-carousel.md) |
| ConversationFeed | `src/components/ConversationFeed.jsx` | [components/conversation-feed.md](components/conversation-feed.md) |
| PresenceDot | `src/components/PresenceDot.jsx` | [components/presence-dot.md](components/presence-dot.md) |
| Dot | `src/components/Dot.jsx` | [components/dot.md](components/dot.md) |
| NeighborhoodPicker | `src/components/NeighborhoodPicker.jsx` | [components/neighborhood-picker.md](components/neighborhood-picker.md) |
| CodeVerify | `src/components/CodeVerify.jsx` | [components/code-verify.md](components/code-verify.md) |
| InviteFriendButton | `src/components/InviteFriendButton.jsx` | [components/invite-friend-button.md](components/invite-friend-button.md) |
| AuthLoading | `src/components/AuthLoading.jsx` | [components/auth-loading.md](components/auth-loading.md) |

---

## Top UX risks

1. **Seeded developer data on production surfaces.** Real-stranger name + phone pre-filled in
   `Account.jsx:55–59` and `CreateAccountSheet.jsx:19–20`; SF venues in `ScheduleSheet.jsx:36–37`;
   un-guarded "Pick seeded mom" button on `Landing.jsx:243–259`; static "12 moms" proof in
   `PlaceDetailSheet.jsx:305`. **Trust + conversion + legal.**
2. **Modal accessibility.** `Sheet.jsx:28–103` has no dialog role / focus trap / Escape and a
   32px close target — affects all 27 sheets at once.
3. **Pre-checked consent.** `agreed: true` default (`Account.jsx`) — GDPR/CCPA + Apple 5.1.1.
4. **Broken three-state loading contract.** Home age/feature sections disappear during load
   (`HomeTab.jsx:391`); meetup skeleton wrong shape → snap (`ConnectTab.jsx:1250–1253`);
   MessageSheet blank 540px for 1–3s (`MessageSheet.jsx:101,122`).
5. **Navigation has no a11y semantics.** Tab bar lacks `tablist`/`tab`/`aria-current`
   (`MainApp/index.jsx:277–308`).
6. **Design-token drift.** Hardcoded hex on the most-seen surfaces (tab bar, home tiles,
   category lists, profile chips) → ~3 missing tokens.
7. **Stale premium gate.** `freeLimit` hardcoded `3` in `ConnectTab.jsx:1416` ignores
   `appConfig.dmFreeMessageLimit` — split DM behavior by entry point.
8. **CTA inconsistency.** `PrimaryBtn` bypassed by 26+ sheets; heights 48/52/56px, radii vary.

---

## Top 10 recommendations

| # | Recommendation | Severity | Anchor |
|---|---|---|---|
| 1 | Strip ALL seeded data → empty strings / `import.meta.env.DEV` guards; default `agreed:false` | Critical | `Account.jsx:55–59`, `CreateAccountSheet.jsx:19–20`, `ScheduleSheet.jsx:36–37`, `Landing.jsx:243` |
| 2 | Harden `Sheet`: `role="dialog"` + `aria-modal`, focus trap, Escape-to-close, ≥44pt close | Critical | `components/sheet.md` |
| 3 | Add `tablist`/`tab`/`aria-selected`/`aria-current` to the bottom nav | High | `MainApp/index.jsx:277–308` |
| 4 | Enforce three-state contract: pass `placesLoading` to HomeTab; keep section headers mounted | High | `HomeTab.jsx:391`, `index.jsx:236` |
| 5 | Sweep hardcoded hex → tokens; add `lilacDark`, `saffronDark`, continue-tile palette to `theme.js` | High | `theme.js`, HomeTab/Explore/Profile/Connect |
| 6 | Thread `appConfig.dmFreeMessageLimit` into ConnectTab/MomDetailSheet (drop literal `3`) | High | `ConnectTab.jsx:1416` |
| 7 | Build a shape-correct `MeetupCardSkeleton`; replace `MomCardSkeleton` misuse | High | `ConnectTab.jsx:1250–1253` |
| 8 | Add `size` prop to `PrimaryBtn`; migrate the 26+ sheet CTAs onto it; tokenize disabled color | High | `components/primary-btn.md` |
| 9 | Skeleton state for MessageSheet while `listMessages()` loads; size drawer to content | High | `MessageSheet.jsx:101,122` |
| 10 | Make AboutYou kid-count steppers keyboard-operable (`tabIndex`+`onKeyDown` or `<button>`) | High | `AboutYou.jsx:160–189` |

---

## Quick wins (≤ ~30 min each, high signal)

- Delete seeded `'Sana'` / `'(813) 956-2058'` defaults → `''` (#1). *Trivial, Critical impact.*
- Wrap the Landing "Pick seeded mom" button in `import.meta.env.DEV` (Account already does at `:270`).
- `agreed` default `true → false`.
- Tab-bar background `'#fff' → C.paper` (`index.jsx:275`).
- `GoingButton` pre-tap CTA coral → sage (community semantics) (`LocalPicksTab.jsx:210`).
- Replace SF venue names with Tampa defaults (or empty/computed) in `ScheduleSheet.jsx:36–37`.
- Remove/parameterize the static "12 moms visited this week" (`PlaceDetailSheet.jsx:305`).
- Delete orphaned dead `Dot.jsx`.
- Pass `freeLimit={appConfig.dmFreeMessageLimit}` through to ConnectTab.

## Larger redesign opportunities

- **Modal accessibility platform** — one hardening of `Sheet` (dialog role, focus trap,
  Escape, safe-area, ≥44pt close) propagates to all 27 sheets. Migrate the 2 sheets that
  bypass the primitive (`PlaceDetailSheet.jsx:77`) onto `<Sheet fullScreen>`.
- **Shared interaction primitives** — extract `Button` (from `PrimaryBtn` + the 26 inline
  CTAs), `CarouselDots` (from `HeroCarousel`, deleting `Dot`), and a `Chip`/`Card` to stop the
  hex drift at its source.
- **Loading-contract enforcement pass** — audit every API-backed rail/sheet for shape-matched
  skeletons and always-mounted headers; add a lint/checklist so new surfaces inherit it.
- **Premium-gate config plumbing** — make every gate read from `appConfig`, never literals,
  so admin config changes take effect everywhere.

## Priority roadmap

- **P0 — before any real users (this week):** Recs #1 (seeded data + consent). Pure deletions
  and guards; trust/legal blockers.
- **P1 — next release:** Recs #2, #3, #4, #9, #10 (accessibility + loading contract).
- **P2 — design-system hardening:** Recs #5, #6, #7, #8 + the shared-primitive extraction.
- **P3 — polish:** GoingButton semantics, dead-code removal, sheet height-to-content, the
  Medium/Low findings in each per-file audit.

---

## Master summary table

| Screen / component | Route / file | Severity | Main issue | Recommendation | Effort |
|---|---|---|---|---|---|
| Landing | `screens/Landing.jsx` | High | Dev "Pick seeded mom" button shown to all users (`:243–259`) | `import.meta.env.DEV` guard | XS |
| Onboarding · AboutYou | `onboarding/AboutYou.jsx` | High | Kid-count steppers not keyboard-operable (`:160–189`) | `<button>` + `onKeyDown` | S |
| Onboarding · Account | `onboarding/Account.jsx` | **Critical** | Pre-filled stranger name/phone + pre-checked consent (`:55–59`) | Empty defaults; `agreed:false` | XS |
| Onboarding · Login | `onboarding/Login.jsx` | Medium | Error/edge-state clarity | See file | S |
| Onboarding · Notifications | `onboarding/NotificationsOptIn.jsx` | Low | Value framing for opt-in | See file | S |
| MainApp shell | `MainApp/index.jsx` | High | Tab bar no ARIA (`:277–308`); `'#fff'` hex (`:275`) | tablist/tab/aria-current; `C.paper` | S |
| Home tab | `MainApp/HomeTab.jsx` | High | `placesLoading` absent → sections vanish (`:391`); hardcoded tile hex | Thread flag; tokenize | M |
| Connect tab | `MainApp/ConnectTab.jsx` | High | Wrong skeleton shape (`:1250`); stale `freeLimit=3` (`:1416`) | Meetup skeleton; thread config | M |
| Explore tab | `MainApp/LocalPicksTab.jsx` | High | 6 hardcoded category hex (`:798–803`); coral RSVP CTA (`:210`) | Tokens; sage CTA | M |
| Profile tab | `MainApp/YouTab.jsx` | High | 5 un-tokened hex ×9 (`:137,696,714,720,753`) — missing `lilacDark` | Add tokens; sweep | M |
| Lifecycle · Reactivate | `ReactivateScreen.jsx` | Medium | Tone/CTA clarity | See file | S |
| Lifecycle · Deleted | `DeletedScreen.jsx` | Medium | Recovery-window clarity | See file | S |
| Sheet · Create account | `sheets/CreateAccountSheet.jsx` | **Critical** | Pre-filled stranger name/phone (`:19–20`) | Empty defaults | XS |
| Sheet · Premium | `sheets/PremiumSheet.jsx` | Medium | Upsell hierarchy / trial clarity | See file | S |
| Sheet · Message | `sheets/MessageSheet.jsx` | High | No skeleton during load; forced 540px blank (`:101,122`) | Skeleton; size to content | M |
| Sheet · Schedule | `sheets/ScheduleSheet.jsx` | **Critical** | San Francisco venues in Tampa app (`:36–37`) | Tampa/empty defaults | XS |
| Sheet · Profile | `sheets/ProfileSheet.jsx` | Medium | Premium blur / shared-ground hierarchy | See file | S |
| Sheet · Mom detail | `sheets/MomDetailSheet.jsx` | High | Inherits stale `freeLimit`; premium-depth clarity | Thread config | S |
| Sheet · Place detail | `sheets/PlaceDetailSheet.jsx` | High | Bypasses `Sheet` (`:77`); static "12 moms" (`:305`) | Use `<Sheet fullScreen>`; parameterize | M |
| Sheet · Event detail | `sheets/EventDetailSheet.jsx` | Medium | RSVP/loading consistency | See file | S |
| Sheet · Verify prompt | `sheets/VerifyPromptSheet.jsx` | Medium | Verification-value clarity | See file | S |
| Sheets — roll-up | `sheets/*` (31) | High | Half-height vs full-screen + a11y consistency | Per overview | — |
| Sheet (primitive) | `components/Sheet.jsx` | **Critical** | No dialog role/focus trap/Escape; 32px close (`:28–103`) | Harden once → all 27 | M |
| PrimaryBtn | `components/PrimaryBtn.jsx` | High | Bypassed by 26+ sheets; hardcoded disabled `#D8CCB6` (`:8`) | `size` prop + migrate | M |
| Dot | `components/Dot.jsx` | High | Orphaned dead code; duplicates HeroCarousel dots | Delete; extract `CarouselDots` | XS |
| HeroCarousel | `components/HeroCarousel.jsx` | Medium | Inline dot pattern (`:183–199`) | Extract primitive | S |
| ConversationFeed | `components/ConversationFeed.jsx` | Medium | See file | See file | S |
| PresenceDot | `components/PresenceDot.jsx` | Low | See file | See file | XS |
| NeighborhoodPicker | `components/NeighborhoodPicker.jsx` | Medium | See file | See file | S |
| CodeVerify | `components/CodeVerify.jsx` | Medium | See file | See file | S |
| InviteFriendButton | `components/InviteFriendButton.jsx` | Low | See file | See file | XS |
| Skeleton | `components/Skeleton.jsx` | Low | Token-correct; coverage gaps elsewhere | See file | XS |
| StatusBar / Toast / PhoneFrame / AuthLoading | `components/*` | Low | Minor polish | See files | XS |

*Effort key: XS ≤30min · S ≤2h · M ≤1d · L multi-day.*

> Per-file audits contain the full findings tables (every criterion), wireframes, before/after,
> implementation notes, and acceptance criteria. This index is the navigation + synthesis layer.
