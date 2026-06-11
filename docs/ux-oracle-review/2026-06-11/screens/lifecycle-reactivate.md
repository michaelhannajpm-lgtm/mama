# ReactivateScreen — deactivated-account gate

- **File:** `src/screens/ReactivateScreen.jsx` (85 lines)
- **Purpose:** Full-screen gate shown after login when `account_status === 'deactivated'`. Blocks all app access. Presents a warm re-welcome, explains the paused state in plain language, and provides one primary CTA (Reactivate) plus a secondary escape (Sign out).
- **Entry / when shown:** `accountStatus === 'deactivated'` in `PrototypeApp` root render (replaces MainApp). The user has previously signed in and then paused/deactivated her account.
- **Related components/sheets:** `StatusBar`, `PrimaryBtn`. No sheets.
- **Data dependencies:** Static. `firstName` from `account` prop. `onReactivate` is async (calls `/api/account/reactivate`). No loading flags needed beyond the local `busy` state.

---

## Current state (wireframe)

```
┌─────────────────────────────────┐
│  StatusBar                      │
├─────────────────────────────────┤
│                                 │
│                                 │
│         ╭──────────╮            │
│         │ ✦ Sparkles│  ← 60×60 coralSoft rounded square, coralDeep icon
│         ╰──────────╯            │
│                                 │
│   Welcome back, {firstName}*    │  ← Fraunces 27, navy; firstName italic coral
│                                 │    (if no firstName: "Welcome back" plain)
│   Your account is paused, so    │
│   you're hidden from matching.  │  ← Albert Sans 14, inkSoft, lineHeight 1.5
│   Reactivate to jump back into  │
│   your village.                 │
│                                 │
│                                 │
│   ╔═══════════════════════════╗ │
│   ║  Reactivate my account   ║ │  ← PrimaryBtn coral, height 56, borderRadius 18
│   ╚═══════════════════════════╝ │
│                                 │
│       Sign out                  │  ← text-only button, C.muted
│                                 │
│                                 │
└─────────────────────────────────┘

Error state (when onReactivate throws):
  → inline error text above CTA, coralDeep, Albert Sans 12.5
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Content clarity — missing firstName fallback | Medium | When `firstName` is falsy, the heading renders as `"Welcome back"` with a trailing comma and space (`line 44: "Welcome back{firstName ? \`, \` : ''}"`) but the comma is conditional — the space after the comma is inside the conditional block, so no trailing comma is emitted. However, the heading is then just "Welcome back" with no name — a cold opening compared to the warmth of the brand. The `Sparkles` icon does not compensate. | Consider rendering "Welcome back, mama" when `firstName` is absent, using the same italic-coral treatment on "mama". |
| 2 | CTA clarity — button label length | Low | "Reactivate my account" (line 66) is 4 words and 20 characters — longer than the "1–3 words" button copy guideline. On a 320px screen at `fontSize: 15.5` this still fits comfortably in the 56px button. However "Reactivate" alone is clearer and saves 11 characters. | Change to "Reactivate" (one verb, decisive, warm). Busy state becomes "Reactivating…" (unchanged). |
| 3 | Accessibility — error state is not announced | High | The error message at line 56–62 appears as a `<div>` below the headline when `err` is set. There is no `role="alert"` or `aria-live="assertive"` attribute, so screen readers will not announce the error when it appears dynamically. A user who triggers a network error while `busy` has no audible signal. | Add `role="alert"` to the error `<div>` at `line 56`. |
| 4 | Accessibility — Sign out button disabled state | Medium | The "Sign out" button at line 71 sets `cursor: busy ? 'default' : 'pointer'` but does not change `color` to signal disabled state. When `busy=true` the button appears identical to its enabled state (same `C.muted` text) — only the cursor changes, which is invisible on mobile. Additionally `disabled={busy}` is set but the disabled style is the same as the enabled style. | Add `opacity: busy ? 0.4 : 1` to the "Sign out" button style at `line 76`. |
| 5 | Semantic palette — Sparkles icon choice | Low | `Sparkles` (line 37) is a whimsical, celebration-adjacent icon. For a "your account is paused" state the context is a gentle nudge back in, not a celebration. The icon works tonally for a welcome-back but `Heart` or `Users` would better communicate "your village is waiting" — aligning the visual with the body copy ("jump back into your village"). | Consider replacing `Sparkles` with `Heart` (line 2 import, line 37 usage). This is a minor tone judgment. |
| 6 | Visual hierarchy — no second message | Low | The screen has one message (welcome back, reactivate), but the icon, the heading, and the body text are all center-aligned in a single column with generous vertical spacing. There is nothing to *pull forward* — no reminder of what she had in her village, no "Sarah and 2 other moms are waiting" social nudge. For a reactivation gate this is fine (keep it calm), but a single sentence of social proof could lift conversion. | Add a subtle social-proof line below the body paragraph, e.g., "Your saved moms and meetups are still here." in `C.muted` at 12px. This requires no new data. |
| 7 | Trust signals — no explanation of what "paused" means for data | Medium | The copy says "you're hidden from matching" but does not confirm that her data (profile, saved moms, preferences) is still intact. A deactivated mom may worry her data was deleted. The `DeletedScreen` copy handles this well ("pick up right where you left off") but `ReactivateScreen` does not. | Add a reassurance line: "Your profile, saved moms, and meetups are right where you left them." |
| 8 | Perceived performance — no optimistic UI on reactivate | Low | On tap, the button label changes to "Reactivating…" (line 67) and `busy=true` disables both buttons. If `onReactivate` is fast (< 300ms), the user sees a flicker of the busy state before the screen transitions. If slow (> 1s), there is no progress indication beyond the changed label. | The current approach is acceptable. Optionally add a subtle spinner or a `livePulse` animation to the icon during `busy`. |

---

## Key issues (prose, ranked)

**1. Error state not announced to screen readers (High, #3).** When `onReactivate` throws, an inline error `<div>` appears with no `role="alert"`. A VoiceOver or TalkBack user may tap the button, wait, and have no way of knowing it failed — the error is silent to assistive tech. Adding `role="alert"` is a one-attribute fix.

**2. Disabled "Sign out" button has no visual signal (Medium, #4).** During `busy`, both buttons are disabled, but "Sign out" shows identical styling to its enabled state (only the cursor changes, invisible on touch screens). A mom who accidentally taps "Sign out" during a reactivation attempt gets no feedback that the button is inactive. Adding `opacity: 0.4` gives a clear disabled signal.

**3. Missing reassurance that data is intact (Medium, #7).** The copy covers what reactivating does ("jump back into your village") but not what staying deactivated has preserved. A mom who's been away for months has a legitimate anxiety about data loss. One sentence of reassurance ("Your profile is still here") would reduce hesitation at the CTA.

---

## Recommended redesign (annotated wireframe)

```
┌─────────────────────────────────┐
│  StatusBar                      │
├─────────────────────────────────┤
│                                 │
│         ╭──────────╮            │
│         │  ♥ Heart │  ← Heart icon (community/belonging tone)
│         ╰──────────╯            │
│                                 │
│   Welcome back,                 │
│        {firstName}*             │  ← italic coral; or "mama" if no firstName
│                                 │
│   Your account is paused, so    │
│   you're hidden from matching.  │
│   Your profile, saved moms, and │  ← NEW: data reassurance
│   meetups are right where you   │
│   left them.                    │
│                                 │
│   Reactivate to jump back in.   │  ← condensed; trimmed to one sentence
│                                 │
│   [error — role="alert"]        │  ← ARIA alert added
│                                 │
│   ╔═══════════════════════════╗ │
│   ║       Reactivate         ║ │  ← shortened label
│   ╚═══════════════════════════╝ │
│                                 │
│       Sign out (opacity:0.4     │  ← visual disabled state added
│         when busy)              │
└─────────────────────────────────┘
```

---

## Before / after comparison (what changes visually)

| Element | Before | After |
|---------|--------|-------|
| Icon | `Sparkles` (celebration) | `Heart` (belonging) |
| No-firstName fallback | "Welcome back" (bare) | "Welcome back, mama" (italic coral) |
| Body copy | 2-sentence; no data reassurance | 3-sentence; adds data reassurance |
| CTA label | "Reactivate my account" | "Reactivate" |
| Error div | Plain `<div>`, silent to AT | `<div role="alert">` |
| Sign out disabled state | Cursor-only signal | `opacity: 0.4` |

---

## Implementation notes

- `ReactivateScreen.jsx:2` — import `Heart` from `lucide-react` (replace `Sparkles`).
- `ReactivateScreen.jsx:37` — `<Heart size={26} color={C.coralDeep}/>`.
- `ReactivateScreen.jsx:44` — change fallback from empty to `<>Welcome back, <span style={{ fontStyle:'italic', color:C.coral, fontWeight:500 }}>mama</span></>`  when `!firstName`.
- `ReactivateScreen.jsx:49–54` — add reassurance sentence to the `<p>` body.
- `ReactivateScreen.jsx:56` — add `role="alert"` to the error `<div>`.
- `ReactivateScreen.jsx:66` — change button label to `{busy ? 'Reactivating…' : 'Reactivate'}`.
- `ReactivateScreen.jsx:76` — add `opacity: busy ? 0.4 : 1` to the Sign out button style.

---

## Acceptance criteria

- [ ] Error message `<div>` has `role="alert"` so screen readers announce it dynamically.
- [ ] "Sign out" button shows `opacity: 0.4` when `busy=true`.
- [ ] When `firstName` is falsy, the heading reads "Welcome back, mama" with "mama" in italic coral.
- [ ] Body copy includes a sentence confirming the user's data (profile, saved items) is intact.
- [ ] CTA label is "Reactivate" (one word).
- [ ] No literal hex values in the file (current code is clean — maintain this).
