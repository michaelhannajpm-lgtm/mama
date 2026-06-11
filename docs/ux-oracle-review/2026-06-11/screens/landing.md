# Landing — app entry point (`/`)

- **File:** `src/screens/Landing.jsx` (272 lines)
- **Purpose:** First impression and conversion gate. Presents the brand, social proof, and a single coral CTA to begin onboarding. Also houses the "Log in" path for returning members and dev shortcuts.
- **Entry / when shown:** Rendered by `PrototypeApp` when `splashShown === false` and `step === null` (pre-onboarding). Shown inside `PhoneFrame` on wide viewports.
- **Related components/sheets:** `StatusBar`, `HeroCarousel`
- **Data dependencies:** Static only. `STAT_PILLS` at line 38 uses hardcoded counts ("1,200+", "50+", "300+"). No live API fetches, no loading flags. `__PUBLISHED_AT__` is a build-time define.

---

## Current state (wireframe)

```
┌─────────────────────────────────┐
│ [StatusBar]              [⚙ gear]│  ← absolute gear, top-right
│                                 │
│  [pink blob TL]  [pink blob TR] │  ← decorative, z=0
│                                 │
│       [Go Mama logo .png]       │  h=84
│            ♡    ✦               │  ← coral decorative glyphs
│                                 │
│  Your kid needs a friend.       │  Fraunces 24 bold
│  So do you.                     │  italic+coral on "friend"+"you"
│  [subhead: Get out of the house…]│  Albert Sans 12 muted
│                                 │
│ ┌─────────────────────────────┐ │  flex-1 (hero carousel)
│ │  [HeroCarousel]             │ │  swipeable, auto-advance 3.8s
│ │  (cover image)              │ │
│ │  CONNECT                    │ │  eyebrow + badge
│ │  Meet other moms nearby     │ │  Fraunces 19
│ │  Real moms in your…         │ │  Albert Sans 11.5
│ │                   [• • • •] │ │  dot indicators
│ └─────────────────────────────┘ │
│                                 │
│ ┌──────────┬──────────┬───────┐ │  Stats card
│ │👥 1,200+ │📅  50+   │📍 300+│ │  white, border C.line
│ │moms near │events    │local  │ │
│ │          │this week │gems   │ │
│ └──────────┴──────────┴───────┘ │
│                                 │
│   ✦ [──── Get Started ────] ✦  │  coral gradient pill, h=54
│      Already a member? Log in   │  Albert Sans 11
│      [⚡ Pick seeded mom]       │  purple gradient pill (visible in prod)
│      Published Wed 06/11 05:13  │  9px muted stamp
└─────────────────────────────────┘
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|-----------------------|----------------|
| 1 | Color token | High | `const BG = '#FAF3F0'` at `Landing.jsx:19` is a hardcoded hex instead of `C.cream` (`#FBF5EF`). The values differ by a perceptible warm shift and will drift if the palette is updated. | Replace `BG` constant with `C.cream` from theme; remove the local constant entirely. |
| 2 | Color token | High | Decorative blob gradients at `Landing.jsx:75` and `Landing.jsx:79` hardcode `#F8D2DC` and `rgba(248,210,220,0)`. These are close to `C.coralSoft` (`#F8D7DD`) but not identical and will not update with palette changes. | Use `C.coralSoft` with a CSS `radial-gradient` fade: `${C.coralSoft} 0%, rgba(0,0,0,0) 65%`. |
| 3 | Trust / conversion | High | Stats in `STAT_PILLS` (Landing.jsx:38–42) are hardcoded static values: "1,200+", "50+", "300+". A new mom who happens to know the real Tampa mom count will lose trust. More critically these numbers cannot reflect actual platform growth without a deploy. | Fetch real counts from `/api/config` or add a `/api/stats` endpoint; show `—` or a skeleton until they load. Acceptable to hydrate at app-boot and pass as props alongside `appConfig`. |
| 4 | Brand safety | High | "Pick seeded mom" button (Landing.jsx:243–259) is visible in production — there is no `import.meta.env.DEV` guard (contrast: Account.jsx:270 uses the guard correctly). A real mom sees a purple "⚡ Pick seeded mom" button below "Log in", which is disorienting and undermines trust. | Wrap lines 243–259 in `{import.meta.env.DEV && ( … )}`, identical to the guard used in `Account.jsx:270`. |
| 5 | Semantic palette | Medium | The third stat pill uses `tint: C.sage` and `fg: C.sageDark` for "300+ local gems" (Landing.jsx:41). Sage is the community/groups semantic. Local gems / places are not a group concept — the pill reads as a group indicator. | Use `tint: C.peach` and `fg: C.coralDeep` for "local gems" to stay within the warm accent range without misusing the community color. |
| 6 | Content clarity | Medium | The headline reads "Your kid needs a friend. / So do you." The first sentence assumes the user has a child, excluding expecting moms (a key early segment the app onboards on Q1). | Consider "You both deserve great friends." or keep the current copy but verify with user research that the "your kid" frame doesn't read as exclusionary to pregnant moms. |
| 7 | Admin shortcut exposure | Medium | The gear button (Landing.jsx:55–70) is always visible with `zIndex: 5` and navigates to `/admin` via `window.location.href`. It has a label "Admin dashboard" that is read aloud by screen readers to all users. A mom who uses VoiceOver will hear "Admin dashboard" as the first announced interactive element after the logo. | Move the gear to be dev/admin-only (check a cookie or env flag before rendering) and give it `aria-hidden="true"` paired with `tabIndex={-1}` if it must stay, or move it to a less prominent screen position. |
| 8 | Typography — CTA weight | Low | "Get Started" CTA uses `fontWeight: 800` (Landing.jsx:217). `PrimaryBtn` uses `fontWeight: 600` on the same typeface across all other screens. Inconsistency makes the Landing feel slightly heavier than the rest of onboarding. | Align to `fontWeight: 700` or `800` consistently across all primary CTAs. |
| 9 | Interaction — tap on carousel | Low | `HeroCarousel.jsx:103` — a tap with no drag advances to the next slide (`go(idx + 1)`). A user who taps to "pause and look" accidentally advances. The behavior is undiscoverable and mismatches the mental model (tap = select, drag = swipe). | Distinguish tap from drag by checking `Math.abs(dragDx) < 4`; a tap with no meaningful drag should not advance. |
| 10 | Typography — subhead size | Low | Subhead below headline uses `fontSize: 12` (`Landing.jsx:125`). On a 375pt screen this renders at roughly 12px / 9pt — below the iOS/Android minimum readable body size of 11pt for body copy seen at arm's length by a tired mom. | Raise to 13–14px. |
| 11 | Build-time stamp | Low | `PUBLISHED_LABEL` (Landing.jsx:36, 262–269) shows a build timestamp ("Published Wednesday 06/11 05:13") to all real users. This is a dev artifact; there is no business reason for a mom to see the deployment time. | Remove or restrict to `import.meta.env.DEV`. |
| 12 | Accessibility | Low | Decorative emoji characters in stat pills (`♡`, `✦`) at Landing.jsx:103–108 and Landing.jsx:206–207 have no `aria-hidden="true"`. Screen readers will announce "heart" and "sparkle" as content. | Add `aria-hidden="true"` to each decorative `<span>` element. |

---

## Key issues (prose, ranked)

**1. Hardcoded hex values break the design system (Critical discipline, High severity).**
Two token violations — the background `BG` constant (`Landing.jsx:19`) and the decorative blob hex strings (`Landing.jsx:75`, `79`) — mean Landing is visually decoupled from the palette. When `C.cream` or `C.coralSoft` updates, Landing will not follow. This is the highest-priority fix because Landing is the only screen every new user sees.

**2. "Pick seeded mom" button is visible in production (High).**
`Landing.jsx:243–259` lacks the `import.meta.env.DEV` guard that `Account.jsx:270` uses correctly for the equivalent button. A purple "⚡ Pick seeded mom" button appears below "Log in" for every real user, destroying trust at the most critical conversion moment. Single-line fix.

**3. Static hardcoded stats erode trust over time (High).**
"1,200+ moms nearby" and "50+ events this week" are static strings baked into the bundle. They are not wrong today but will become wrong and cannot be updated without a deploy. Because this is the app's social-proof mechanism (the primary trust signal before a mom taps "Get Started"), stale numbers are a conversion liability.

**4. Admin gear is accessible to all users via VoiceOver (Medium).**
The gear button at `Landing.jsx:55–70` is keyboard-reachable and screen-reader-visible with label "Admin dashboard". On an iPhone with VoiceOver, the first button a mom with accessibility needs encounters is an admin control.

---

## Recommended redesign

```
┌─────────────────────────────────┐
│ [StatusBar]                     │  ← gear removed or hidden from SR
│                                 │
│  [pink blobs: C.coralSoft fade] │  ← use C.coralSoft token
│                                 │
│       [Go Mama logo .png]       │
│            ♡(hidden) ✦(hidden)  │  ← aria-hidden on decoratives
│                                 │
│  Your kid needs a friend.       │  Fraunces 24 bold
│  So do you.                     │  italic+coral; consider expecting-inclusive
│  [subhead 13–14px muted]        │  ← increased font size
│                                 │
│ ┌─────────────────────────────┐ │  flex-1
│ │  [HeroCarousel — unchanged] │ │  tap=pause, drag=swipe
│ └─────────────────────────────┘ │
│                                 │
│ ┌──────────┬──────────┬───────┐ │  Stats: live from API or appConfig
│ │👥 1,200+ │📅  50+   │📍 300+│ │  ← 3rd pill uses C.peach/C.coralDeep
│ └──────────┴──────────┴───────┘ │
│                                 │
│   [──── Get Started ────]       │  coral gradient, weight:700
│      Already a member? Log in   │
│   (no seeded mom, no timestamp) │  ← removed from prod
└─────────────────────────────────┘
```

Annotations:
- `[A]` — Replace `background: BG` with `background: C.cream` (Landing.jsx:49)
- `[B]` — Blobs at :75/:79 use `${C.coralSoft}` token
- `[C]` — Remove seeded-mom button or guard with `import.meta.env.DEV`
- `[D]` — Remove PUBLISHED_LABEL render or guard with DEV
- `[E]` — Third stat tint: `C.peach` / fg: `C.coralDeep`
- `[F]` — Add `aria-hidden="true"` on all decorative emoji spans

---

## Before / after comparison

| Before | After |
|--------|-------|
| Background `#FAF3F0` (custom const) | Background `C.cream` (`#FBF5EF`) |
| Blob radials hardcode `#F8D2DC` | Blob radials use `${C.coralSoft}` |
| Stats: "1,200+ / 50+ / 300+" static strings | Stats: live from config/API |
| Third stat: sage tint (community color) | Third stat: peach tint (neutral warm) |
| Seeded mom button always visible | Seeded mom button: DEV-only |
| Timestamp always visible | Timestamp: DEV-only |
| Admin gear announced by VoiceOver | Admin gear: `aria-hidden` or removed |
| Carousel tap = advance | Carousel tap = pause, drag = advance |

---

## Implementation notes

- `Landing.jsx:19` — delete `const BG = '#FAF3F0'` and replace its single usage at `:49` with `background: C.cream`.
- `Landing.jsx:75` — replace the gradient string to: `` `radial-gradient(120% 100% at 0% 0%, ${C.coralSoft} 0%, rgba(248,215,221,0) 65%)` `` (using the hex of `coralSoft` in the transparent stop until CSS variables are available).
- `Landing.jsx:243` — add `{import.meta.env.DEV && (` wrapper before line 243, close after line 259.
- `Landing.jsx:262` — add `{import.meta.env.DEV && PUBLISHED_LABEL && (` wrapper.
- `Landing.jsx:41` — change `tint: C.sage, fg: C.sageDark` to `tint: C.peach, fg: C.coralDeep`.
- Stats hydration: add a `stats` prop to `Landing` (threaded from `App.jsx` alongside `appConfig`) sourced from `/api/config` or a new lightweight `/api/stats` response. Render `stats?.nearbyMoms ?? '1,200+'` etc. so fallback text still shows if the fetch is pending.
- `Landing.jsx:55` — add `aria-hidden="true"` and `tabIndex={-1}` to the gear `<button>`, or gate it entirely on an admin session cookie.

---

## Acceptance criteria

- [ ] `npm run build` produces no new warnings.
- [ ] `grep -n '#FAF3F0\|#F8D2DC\|rgba(248,210,220' src/screens/Landing.jsx` returns no results.
- [ ] "Pick seeded mom" button is NOT visible when `import.meta.env.DEV` is false (verified in a production preview build).
- [ ] Build timestamp label is NOT visible in production preview.
- [ ] Third stat pill background is `C.peach` (`#FDE2D4`), not sage.
- [ ] VoiceOver on iOS does not announce "Admin dashboard" or "Pick seeded mom" on the Landing screen.
- [ ] All decorative emoji spans (`♡`, `✦`) carry `aria-hidden="true"`.
- [ ] Subhead font size is ≥ 13px.
