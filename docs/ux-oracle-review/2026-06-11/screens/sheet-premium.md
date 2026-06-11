# PremiumSheet — Plus upsell

- **File:** `src/sheets/PremiumSheet.jsx` (47 lines)
- **Purpose:** Dark-surface upsell sheet presenting Go Mama Plus benefits and a trial CTA. The single conversion surface for the premium tier.
- **Entry / when shown:** `App.jsx` via `premiumOpen` flag; also triggered from `MessageSheet` (limit hit), `GroupDiscussionSheet` (join gate), `ConnectTab` and `LocalPicksTab` (advanced filters lock), `ProfileSheet` / `MomDetailSheet` (blur reveal), `MamaHubSheet`.
- **Related components/sheets:** `Sheet` (dark), `MessageSheet`, `ProfileSheet`, `GroupDiscussionSheet`.
- **Data dependencies:** Static — props only (`plusPrice`, `plusTrialDays`, `freeLimit`). No API calls. No loading states needed.

## Current state (wireframe)

```
┌─────────────────────────────────────────┐  dark surface (C.ink)
│  ━━━━━  (drag handle, dark)  [X]        │
│                                         │
│         [crown icon, saffron circle]    │
│                                         │
│         Go Mama Plus                   │  ← Fraunces 28px; "Plus" italic+saffron
│         Stay close to the moms         │
│         you click with.                 │
│                                         │
│  ┌────────────────────────────────────┐ │
│  │ ✓  Advanced filters                │ │
│  │    Tune Explore + Connect by...   │ │
│  ├────────────────────────────────────┤ │
│  │ ✓  Unlimited messages              │ │
│  │    Beyond the first 3 — ongoing..  │ │
│  ├────────────────────────────────────┤ │
│  │ ✓  Full profiles                   │ │
│  │    Bio, all values & interests...  │ │
│  ├────────────────────────────────────┤ │
│  │ ✓  Full group attendees            │ │
│  │    See exactly who's going · DM   │ │
│  ├────────────────────────────────────┤ │
│  │ ✓  Met-up history                  │ │
│  │    Social proof — how active...    │ │
│  └────────────────────────────────────┘ │
│                                         │
│  [ Try free for 7 days ]               │  ← saffron CTA
│  Then $7.99/mo · cancel anytime        │
│                                         │
└─────────────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Content-sized compliance | **Medium** | No `tall` prop passed to `Sheet` at line 6. The feature list is 5 items (~280 px of content) plus header, CTA, and disclaimer — on a 375-wide phone this sits comfortably in the default 82% cap. But if `plusTrialDays` or feature copy grows, the sheet can clip. More importantly, the absence of `tall` is intentional (5 rows fits) but undocumented. Currently compliant but fragile. | Add a comment. If a sixth feature is ever added, add `tall`. Low urgency but worth noting. |
| 2 | CTA missing accessible label | **Medium** | `<button onClick={...}>Try free for {plusTrialDays} days</button>` at line 38 has no `aria-label` and no `type="button"`. The inner text is sufficient for sighted users but the button text alone does not communicate cost context to screen readers (price is in the div below, not inside the button). | Consider inlining the price: `aria-label={`Try Plus free for ${plusTrialDays} days, then $${plusPrice.toFixed(2)}/mo`}`. |
| 3 | No `aria-live` on activation state | **Medium** | `onActivate && onActivate()` fires at line 39 with no feedback beyond sheet closing. A screen-reader user gets no confirmation that Plus was activated. | After `onActivate` completes, announce "Plus activated" via an `aria-live="assertive"` region in the parent, or use the existing `flash()` mechanism. |
| 4 | Hardcoded `rgba` overlay in dark items | **Low** | Feature rows use `background: 'rgba(255,255,255,.06)'` at line 28 — this is a one-off dark-surface tint not represented by any `C` token. It is intentional (dark sheet context only) but is a hardcoded value. | Extract to a local constant `DARK_CARD = 'rgba(255,255,255,.06)'` at the top of the file, or note it as an intentional dark-mode one-off in the comment. |
| 5 | Implicit price formatting | **Low** | `${plusPrice.toFixed(2)}/mo` at line 43 produces "$7.99/mo" correctly but the dot between price and period could confuse some locales. No internationalization concern for Tampa-local app, but note for future. | Minor. No immediate action needed. |
| 6 | Feature order | **Low** | "Advanced filters" leads the list. For conversion, the item that closes the most immediate friction — "Unlimited messages" — should lead, since this sheet is usually opened from the DM limit wall. | Reorder: 1) Unlimited messages, 2) Full profiles, 3) Advanced filters, 4) Full group attendees, 5) Met-up history. The message gate is the primary conversion trigger per the 2026-06-08 tightening from 25→3. |

## Key issues (prose, ranked)

1. **Feature list order undersells the conversion moment (Low but impactful).** The sheet opens most often when a mom hits the 3-message DM limit. Leading with "Advanced filters" — not the blocker she just hit — creates a mismatch between her need and the pitch. Put "Unlimited messages" first, show the specific mom's name if context is passed: "Chat unlimited with [firstName] and every match."

2. **Accessibility gap on the CTA (Medium).** The price is below the button, not in it. Screen readers announce "Try free for 7 days" without cost context. This is also an App Store review risk; Apple's guidelines require the price to be clearly associated with the IAP trigger.

3. **No activation feedback for screen readers (Medium).** Sighted users see the sheet dismiss; assistive tech users receive nothing.

## Recommended redesign

```
┌─────────────────────────────────────────┐  dark (C.ink)
│  ━━━━━                       [X]        │
│                                         │
│         [crown, saffron]                │
│         Go Mama Plus                   │
│         Chat freely. Find your village. │  ← tighter, message-first copy
│                                         │
│  ┌ ✓  Unlimited messages ─────────────┐ │  ← FIRST — what she just hit
│  │    Beyond the first 3 with every    │ │
│  │    match                            │ │
│  ├────────────────────────────────────┤ │
│  │ ✓  Full profiles ...               │ │
│  │ ✓  Advanced filters ...            │ │
│  │ ✓  Full group attendees ...        │ │
│  │ ✓  Met-up history ...              │ │
│  └────────────────────────────────────┘ │
│                                         │
│  [ Try free for 7 days ]               │
│   aria-label includes "$7.99/mo"       │
│  Then $7.99/mo · cancel anytime        │
└─────────────────────────────────────────┘
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| Feature order | Advanced filters leads | Unlimited messages leads |
| Button aria-label | Generic text | Includes price context |
| Activation feedback | None (screen-reader silent) | `flash()` + `aria-live` |
| Item background | Hardcoded rgba | Local constant |

## Implementation notes

- `PremiumSheet.jsx:21-35` — reorder the `[['Advanced filters'...` array: move Unlimited messages to index 0.
- `PremiumSheet.jsx:38` — add `aria-label={`Try Plus free for ${plusTrialDays} days, then $${plusPrice.toFixed(2)}/month — cancel anytime`}` and `type="button"`.
- `PremiumSheet.jsx:6` — `onActivate` callback: caller in `App.jsx` should call `flash('Plus activated')` after `handleActivatePlus`.
- `PremiumSheet.jsx:28` — extract `const DARK_CARD = 'rgba(255,255,255,.06)'` at file top.

## Acceptance criteria

- [ ] "Unlimited messages" is the first feature row
- [ ] CTA button has `aria-label` containing the trial length and monthly price
- [ ] Plus activation fires `flash()` with a confirmation message visible to screen readers
- [ ] `npm run build` passes
