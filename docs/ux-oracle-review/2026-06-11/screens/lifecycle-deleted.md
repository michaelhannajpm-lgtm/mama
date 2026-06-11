# DeletedScreen — deleted-account gate

- **File:** `src/screens/DeletedScreen.jsx` (110 lines)
- **Purpose:** Full-screen gate shown after login when `account_status === 'deleted'`. Two modes: restorable (within 30-day window — shows countdown and a Restore CTA) and terminal (past 30 days — shows a farewell message and only Sign Out). No app access in either mode.
- **Entry / when shown:** `accountStatus === 'deleted'` in `PrototypeApp` root render. Triggered when a previously-deleted user attempts to sign in again before or after the purge window.
- **Related components/sheets:** `StatusBar`, `PrimaryBtn`. No sheets.
- **Data dependencies:** Static. `deletedAt` ISO timestamp from `account` prop. `onRestore` async (calls `/api/account/restore`). `onSignOut`. No live API. Local `daysLeft()` computation.

---

## Current state (wireframe)

```
MODE A — Restorable (deletedAt within 30 days):

┌─────────────────────────────────┐
│  StatusBar                      │
├─────────────────────────────────┤
│                                 │
│         ╭──────────╮            │
│         │  ↺ Rotate│  ← RotateCcw 24, coralDeep; bg: coralSoft rounded square
│         ╰──────────╯            │
│                                 │
│   Your account is               │
│        waiting*                 │  ← Fraunces 26; "waiting" italic coral
│                                 │
│   You asked us to delete your   │
│   account. We'll erase          │
│   everything in {N} days.       │  ← {N} in bold C.navy
│   Change your mind? Restore it  │
│   now and pick up right where   │
│   you left off.                 │
│                                 │
│   ╔═══════════════════════════╗ │
│   ║   Restore my account     ║ │  ← PrimaryBtn coral; marginTop 28
│   ╚═══════════════════════════╝ │
│                                 │
│       Sign out                  │  ← text-only button, C.muted; marginTop 18
│                                 │
└─────────────────────────────────┘

MODE B — Terminal (past 30 days / left <= 0):

┌─────────────────────────────────┐
│  StatusBar                      │
├─────────────────────────────────┤
│                                 │
│         ╭──────────╮            │
│         │  ⏱ Clock │  ← Clock 24, C.muted; bg: C.divider (gray)
│         ╰──────────╯            │
│                                 │
│   This account has been deleted │  ← Fraunces 26, navy; NO italic accent
│                                 │
│   Your account and personal     │
│   data have been removed.       │
│   Thanks for being part of      │
│   Go Mama — you're always       │
│   welcome back with a fresh     │
│   start.                        │
│                                 │
│   (no PrimaryBtn)               │
│                                 │
│       Sign out                  │  ← text-only button; marginTop 28
│                                 │
└─────────────────────────────────┘

Error state (mode A only, when onRestore throws):
  → inline error text above CTA, coralDeep, Albert Sans 12.5
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Accessibility — error state not announced | High | The error `<div>` at lines 80–84 has no `role="alert"` or `aria-live`. Identical to `ReactivateScreen.jsx:56` — same root cause. When `onRestore` throws, the error is visible but silent to screen readers. | Add `role="alert"` to the error `<div>` at `line 80`. |
| 2 | Accessibility — disabled Sign out | Medium | The "Sign out" button at lines 97–106 uses `opacity: busy ? 0.4 : 1` is **not present** — there is only `cursor: busy ? 'default' : 'pointer'`. Same issue as `ReactivateScreen`; on touch screens `cursor` is irrelevant. Disabled state is invisible. | Add `opacity: busy ? 0.4 : 1` to the Sign out button style at `line 100`. |
| 3 | Content clarity — terminal-state headline has no italic emphasis | Medium | Mode B headline "This account has been deleted" (line 63) is a flat statement in Fraunces with no italic-coral accent word — the only screen in the app that uses Fraunces for a headline without the brand's signature device. While the terminal state is intentionally austere, a single warm word ("you're always *welcome* back") at minimum acknowledges the brand voice. The body paragraph already contains this warmth but the headline is cold and final. | Change headline to `<>This account has been <span style={{ fontStyle:'italic', color:C.coral, fontWeight:500 }}>deleted</span></>` or rewrite as `Your account is gone — for now` with "for now" italic coral, if that fits the reacquisition strategy. |
| 4 | Content clarity — "N days" without urgency framing | Medium | Mode A body copy says "We'll erase everything in {N} days" (line 71). This is factually correct but clinical. For a mom with 25 days left, the urgency is low; for one with 1 day left, this reads as a countdown warning. The copy does not adapt its emotional register to `left`. | When `left <= 3`, change the `<strong>` countdown to a red-tinted `color: C.coralDeep` instead of `C.navy`, and consider adding "Act now" to the body (e.g., "We'll erase everything **today** — restore now before it's gone."). |
| 5 | Content clarity — no firstName in terminal state | Low | Mode B shows no personalization at all. The `ReactivateScreen` has `firstName` in the headline; `DeletedScreen` receives no `firstName` prop at all (line 24 destructuring). For Mode B this is acceptable — a cold farewell is honest. For Mode A it would be warmer to address her by name. | Add optional `firstName` prop; in Mode A, change headline to `{firstName}'s account is *waiting*` or keep as-is. Low priority. |
| 6 | CTA clarity — button label length | Low | "Restore my account" (line 91) is 3 words + "my account" — 18 characters. As with `ReactivateScreen`, "Restore" alone is cleaner and decisive. | Change to `{busy ? 'Restoring…' : 'Restore'}` at `line 91`. |
| 7 | Trust signals — Mode A doesn't confirm data is still intact | Medium | The copy says "pick up right where you left off" (line 73) which implies data is preserved — but does not say it explicitly. A mom who deleted 10 days ago may be uncertain whether her profile still exists. One explicit sentence would remove the doubt. | Add to Mode A body: "Your profile, matches, and saved spots are still intact." |
| 8 | Edge case — `daysLeft` with null/invalid `deletedAt` | Low | `daysLeft(null)` at line 18 returns 0, which sets `restorable = false` (line 28). This means a user whose `deletedAt` is missing from the DB will see the terminal "permanently deleted" screen instead of being directed to sign out or contact support. An undefined `deletedAt` is ambiguous — it could mean a data error, not an expired account. | Add a third state: if `deletedAt` is null/undefined, show a neutral "Something went wrong — please sign out and try again" message rather than the terminal screen. |
| 9 | Semantic palette — Mode A icon | Low | `RotateCcw` (undo/rotate icon) in `coralDeep` on `coralSoft` background at line 50. The icon is semantically appropriate (restore = undo). The coral on coral-soft is a correct token use. No change needed. | No change. |
| 10 | Perceived performance — Mode A no optimistic UI | Low | Same as `ReactivateScreen`: `busy` toggles the label and disables both buttons with no additional visual treatment. The screen sits still for the duration of the async call. | Optionally: add a subtle `livePulse` animation to the icon during `busy`. Low priority. |
| 11 | Mobile ergonomics — "Sign out" touch target | Medium | The "Sign out" text-only button has no explicit `minHeight` or `padding` set beyond the browser default for `<button>`. At `fontSize: 13` the computed height may fall below the 44pt WCAG minimum. | Add `style={{ minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}` to the Sign out button at `line 97`. |

---

## Key issues (prose, ranked)

**1. Error state not announced to screen readers (High, #1).** Same gap as `ReactivateScreen`: the error `<div>` has no `role="alert"`. In Mode A, if `onRestore` fails (network error, session expired), a screen reader user has no feedback. One attribute fixes it: `role="alert"` at `line 80`.

**2. Terminal-state headline lacks the brand's italic emphasis device (Medium, #3).** Every other Fraunces headline in the app uses the italic-coral word device. "This account has been deleted" is the only one that doesn't — and paradoxically it is the screen where the brand most needs to speak with warmth and voice (the offboarding moment). Even "deleted" in italic coral reads warmer than the flat statement. This is a brand consistency failure on a low-traffic but high-emotional-weight surface.

**3. Null `deletedAt` routes to terminal state silently (Low→Medium, #8).** A data bug (missing `deletedAt`) would cause a restorable user to see the terminal screen, believe her account is gone, and not attempt restoration. The `daysLeft` helper returns 0 for null input — a silent failure. Adding an explicit null-check and a third state ("Something went wrong") prevents permanent data loss from a schema gap.

---

## Recommended redesign (annotated wireframe)

```
MODE A — Restorable:

┌─────────────────────────────────┐
│  StatusBar                      │
├─────────────────────────────────┤
│         ╭──────────╮            │
│         │  ↺ Rotate│  ← unchanged
│         ╰──────────╯            │
│                                 │
│   Your account is               │
│        waiting*                 │  ← unchanged
│                                 │
│   You asked us to delete.       │
│   Your profile, matches, and    │  ← NEW: explicit data-intact reassurance
│   saved spots are still intact. │
│   We'll erase everything in     │
│   {N} days                      │  ← coralDeep when left <= 3
│   — restore now to keep them.   │
│                                 │
│   [role="alert" error]          │  ← ADDED
│                                 │
│   ╔═══════════════════════════╗ │
│   ║         Restore          ║ │  ← shortened label
│   ╚═══════════════════════════╝ │
│                                 │
│   Sign out (opacity 0.4 when    │  ← ADDED disabled visual
│     busy; minHeight: 44)        │
└─────────────────────────────────┘

MODE B — Terminal:

┌─────────────────────────────────┐
│  StatusBar                      │
├─────────────────────────────────┤
│         ╭──────────╮            │
│         │  ⏱ Clock │            │
│         ╰──────────╯            │
│                                 │
│   This account has been         │
│        deleted*                 │  ← italic coral on "deleted" (ADDED)
│                                 │
│   Your account and personal     │
│   data have been removed.       │
│   Thanks for being part of      │
│   Go Mama — you're always       │
│   welcome back with a fresh     │
│   start.                        │
│                                 │
│   Sign out (minHeight: 44)      │  ← unchanged behavior; touch-target fix
└─────────────────────────────────┘

NULL/INVALID deletedAt:

┌─────────────────────────────────┐
│  StatusBar                      │
├─────────────────────────────────┤
│   Something went wrong.         │
│   Please sign out and try       │
│   again. If this keeps          │
│   happening, contact us.        │
│                                 │
│   Sign out                      │
└─────────────────────────────────┘
```

---

## Before / after comparison (what changes visually)

| Element | Before | After |
|---------|--------|-------|
| Mode A error div | No ARIA | `role="alert"` |
| Mode A button label | "Restore my account" | "Restore" |
| Mode A body copy | No data-intact reassurance | Adds "profile, matches, and saved spots are still intact" |
| Mode A countdown color | Always `C.navy` bold | `C.coralDeep` when `left <= 3` (urgency signal) |
| Mode A Sign out disabled | Cursor-only | `opacity: 0.4` |
| Mode B headline | Flat Fraunces, no italic | "deleted" in italic coral |
| Sign out touch target | Implicit ~32px | `minHeight: 44` |
| Null `deletedAt` | Terminal screen | Neutral error screen |

---

## Implementation notes

- `DeletedScreen.jsx:17–22` — update `daysLeft` to return `-1` (a sentinel) when `deletedAtIso` is null/undefined/NaN; check for sentinel in the component to render a third state.
- `DeletedScreen.jsx:24` — add optional `firstName` destructuring if Mode A personalization is desired.
- `DeletedScreen.jsx:56–73` — in Mode A body `<p>`, add the data-intact sentence before the countdown; conditionally color the `<strong>` countdown in `C.coralDeep` when `left <= 3`.
- `DeletedScreen.jsx:58–63` — Mode B headline: wrap "deleted" in `<span style={{ fontStyle:'italic', color:C.coral, fontWeight:500 }}>`.
- `DeletedScreen.jsx:80` — add `role="alert"` to the error `<div>`.
- `DeletedScreen.jsx:91` — change to `{busy ? 'Restoring…' : 'Restore'}`.
- `DeletedScreen.jsx:97` — add `style={{ minHeight: 44, display:'flex', alignItems:'center', justifyContent:'center', opacity: busy ? 0.4 : 1 }}` to the Sign out button (current `style` object at line 100 has `cursor` — add `opacity` and `minHeight`).

---

## Acceptance criteria

- [ ] Mode A: error `<div>` has `role="alert"` so screen readers announce restore failures.
- [ ] Mode A: CTA label is "Restore" (single verb).
- [ ] Mode A: body copy explicitly states data (profile, saved spots, matches) is still intact.
- [ ] Mode A: countdown `<strong>` renders in `C.coralDeep` when `left <= 3`, `C.navy` otherwise.
- [ ] Mode A: "Sign out" shows `opacity: 0.4` when `busy=true`.
- [ ] Mode B: "deleted" in the headline is styled italic coral.
- [ ] Both modes: "Sign out" button has `minHeight: 44`.
- [ ] Null/invalid `deletedAt`: renders a neutral error state, not the terminal screen.
- [ ] No literal hex values in the file (current code is clean — maintain this).
