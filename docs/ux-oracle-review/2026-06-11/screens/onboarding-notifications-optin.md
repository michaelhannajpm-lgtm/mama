# NotificationsOptIn — last onboarding beat

- **File:** `src/screens/onboarding/NotificationsOptIn.jsx` (59 lines)
- **Purpose:** One-time push notification opt-in screen shown after account creation, before the mom enters MainApp. Fires the real browser `Notification.requestPermission()` flow via `onAllow`, or persists `enabled = false` via `onSkip`. Shown only once: when `settings.notifications.enabled` is `undefined`.
- **Entry / when shown:** Rendered by `PrototypeApp` at `step === 3` (one-time flag). After either choice, the mom enters MainApp.
- **Related components/sheets:** `StatusBar`, `PrimaryBtn`
- **Data dependencies:** None — fully static. No API calls, no loading states.

---

## Current state (wireframe)

```
┌─────────────────────────────────┐
│ [StatusBar]                     │
│                                 │
│                                 │
│                                 │
│          ┌────────┐             │
│          │  🔔    │             │  84×84 coralSoft circle
│          └────────┘             │  popBadge animation on mount
│                                 │
│     Stay in the loop            │  Fraunces 27 (weight:400); italic+coral "loop"
│                                 │
│  We'll let you know when a      │  Albert Sans 13.5 muted, max-width 280
│  mom replies or a meetup is     │
│  coming up. No spam — just      │
│  your village.                  │
│                                 │
│                                 │
│                                 │  flex-1 vertically centered
│                                 │
│ [🔔 Allow notifications →]     │  PrimaryBtn terracotta, height 56
│ [       Not now        ]        │  Albert Sans 13 inkMuted, transparent
└─────────────────────────────────┘
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|-----------------------|----------------|
| 1 | Perceived performance — no loading feedback on "Allow" | Medium | `allow()` at NotificationsOptIn.jsx:19–23 sets `busy = true` and calls `onAllow()`, but the `PrimaryBtn` label only changes from "Allow notifications" to "One sec…" (line 47). On some browsers, the `Notification.requestPermission()` dialog does not appear immediately — there can be a 200–800ms delay while the browser resolves whether to show the native permission dialog. During this window the button reads "One sec…" but nothing visible happens. A mom may tap again, causing a double-fire. | The `busy` guard already prevents double-fire (`if (busy) return`). However improve the visual feedback: animate the `Bell` icon (e.g. `animation: 'livePulse 1s infinite'` on the badge while `busy`) to signal that something is happening. |
| 2 | Accessibility — icon in CTA | Medium | The primary CTA at line 47 renders a `<Bell size={16} fill="currentColor"/>` icon alongside the text label inside `PrimaryBtn`. `PrimaryBtn` renders a `<button>` element with both the icon and text as children. The icon has no `aria-hidden="true"`, so screen readers will attempt to describe the SVG as part of the button's accessible name. Most SVGs from `lucide-react` are `aria-hidden` by default, but this should be verified and explicit. | Add `aria-hidden="true"` to the `<Bell>` icon at line 47 and the `<ArrowRight>` at line 47. If lucide sets `aria-hidden` automatically, confirm; if not, add it explicitly. |
| 3 | "Not now" button has no minimum tap target | Medium | The "Not now" button at NotificationsOptIn.jsx:50–54 has `padding: '6px 0'` and no explicit height — making its tap target roughly 13px (font) + 12px (padding) = ~25px. iOS Human Interface Guidelines and Material guidelines both require a minimum 44pt touch target. | Add `minHeight: 44` to the "Not now" button style, or wrap it with additional padding so the tap area is comfortably 44px tall. |
| 4 | CTA icon semantic mismatch | Low | The primary CTA uses `<Bell size={16} fill="currentColor"/>` (NotificationsOptIn.jsx:47). Placing a filled bell inside a permission-request CTA conflates "I have already enabled notifications" with "tap to enable notifications". The bell is solid/filled (active state visual) before the permission is granted. | Use `<Bell size={16} strokeWidth={2}/>` (outline, not filled) on the CTA to signal "request to enable", matching the hollow `<Bell size={36} strokeWidth={1.8}/>` used in the badge illustration above. |
| 5 | Fraunces weight 400 inconsistency | Low | The headline at NotificationsOptIn.jsx:38 uses `fontWeight: 400` (Fraunces). The onboarding standard is `fontWeight: 700` for headlines (AboutYou.jsx:215, Account.jsx:188). The lighter weight creates a softer tone here — this may be intentional (the "calm last beat" before the app) but it is inconsistent with the three preceding screens. | If intentional, document the design rationale. If not, align to `fontWeight: 700` for typographic consistency. |
| 6 | No back navigation | Low | `NotificationsOptIn` has no back button. This is correct by design — it is the last step before MainApp and there is no meaningful "back" destination — but it is the only screen in the entire onboarding flow that offers no escape route other than skipping. A mom who arrives here accidentally (e.g. after OTP verification) cannot return to Account. | Consider whether `onBack` should be threaded in. If not, document the decision explicitly in the component comment. The current comment says "either choice persists the preference so it never returns" — which explains why back is not useful, but the comment could be more explicit. |
| 7 | Content — "your village" without context | Low | The body copy ends with "just your village" (NotificationsOptIn.jsx:43). At this point in the flow, the mom has not yet seen MainApp — "your village" is a Go Mama brand concept that she may not have internalized after three onboarding steps. | Consider grounding the promise more concretely: "No spam — just the moms and events that matter to you." This lands even if she doesn't yet know what "village" means. |

---

## Key issues (prose, ranked)

**1. "Not now" has a ~25px tap target — too small for a tired mom's thumb (Medium).**
At `padding: '6px 0'` with `fontSize: 13`, the "Not now" skip option is the smallest tappable element in the entire onboarding flow. Since this is a dismissal of a permission prompt (a low-commitment action a mom may prefer to take), making it hard to tap is an accessibility issue and subtly coercive — not a conversion pattern worth keeping. Minimum 44px height.

**2. Filled bell icon on the "Allow" CTA visually misrepresents the pre-permission state (Low, brand integrity).**
The badge illustration uses an outline bell (before permission is granted). The CTA uses a filled/active bell. These are different visual states applied to the same concept in the same moment. The filled bell implies "enabled" before the mom has tapped — a small but perceptible mismatch.

**3. Loading/permission delay feedback is a UX gap on slow devices (Medium).**
The "One sec…" text during the `busy` state is correct, but the 200–800ms window before the native permission dialog appears — especially on low-end Android devices — can feel like a broken button. Adding a subtle pulse animation to the badge on `busy` gives the user a physical affordance that the app is working.

---

## Recommended redesign

```
┌─────────────────────────────────┐
│ [StatusBar]                     │
│                                 │
│          ┌────────┐             │
│          │  🔔    │             │  bell pulses gently when busy=true
│          └────────┘             │  popBadge on mount (unchanged)
│                                 │
│     Stay in the loop            │  Fraunces 27, weight:700 (align w/ siblings)
│                                 │
│  We'll let you know when a      │  Consider: "No spam — just the moms
│  mom replies or a meetup is     │   and events that matter to you."
│  coming up. No spam — just      │
│  your village.                  │
│                                 │
│ [🔔(outline) Allow notifications→] │  Bell: outline, not filled
│                                 │
│ [         Not now          ]    │  minHeight: 44px
│ ↑ min 44px tall tap target      │
└─────────────────────────────────┘
```

Annotations:
- `[A]` — `fontWeight: 700` on `h2` at line 38 (align with heading convention)
- `[B]` — `<Bell>` on CTA: `fill` prop removed (outline)
- `[C]` — `"Not now"` button: `minHeight: 44`
- `[D]` — Badge `<Bell>`: add `style={{ animation: busy ? 'livePulse 1.4s infinite' : 'popBadge 0.5s ease-out' }}`
- `[E]` — Both icon children of PrimaryBtn: add `aria-hidden="true"`

---

## Before / after comparison

| Before | After |
|--------|-------|
| `h2` `fontWeight: 400` | `fontWeight: 700` (or document as intentional) |
| Bell icon on CTA: `fill="currentColor"` (filled) | Bell icon: outline (no fill) |
| "Not now" padding: 6px 0 (~25px target) | "Not now" `minHeight: 44` |
| Badge during `busy`: static | Badge during `busy`: `livePulse` animation |
| `<Bell>` + `<ArrowRight>` in CTA: no `aria-hidden` | Both icons: `aria-hidden="true"` |

---

## Implementation notes

- `NotificationsOptIn.jsx:38` — change `fontWeight: 400` to `fontWeight: 700` (or leave at 400 if the softer tone is an intentional design decision — document it in the comment).
- `NotificationsOptIn.jsx:47` — change `<Bell size={16} fill="currentColor"/>` to `<Bell size={16} aria-hidden="true"/>` (outline); add `aria-hidden="true"` to `<ArrowRight size={17}/>` on the same line.
- `NotificationsOptIn.jsx:50–54` — add `minHeight: 44` to the "Not now" button style.
- `NotificationsOptIn.jsx:31–35` — on the badge `<div>`, change animation to: `animation: busy ? 'livePulse 1.4s ease-in-out infinite' : 'popBadge 0.5s ease-out'`. The `livePulse` keyframe is already in `src/index.css`.
- No new dependencies, no new state, no API changes.

---

## Acceptance criteria

- [ ] `npm run build` succeeds.
- [ ] "Not now" button has a visible tap target of at least 44px height (verify in browser inspector).
- [ ] The Bell icon in the primary CTA is outline (no fill) — visually matches the badge bell above.
- [ ] `<Bell>` and `<ArrowRight>` inside `PrimaryBtn` carry `aria-hidden="true"`.
- [ ] While `busy === true`, the badge `<div>` plays `livePulse` animation instead of `popBadge`.
- [ ] Screen is visually consistent with adjacent onboarding screens (headline weight matches).
