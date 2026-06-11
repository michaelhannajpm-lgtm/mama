# MessageSheet — direct message thread

- **File:** `src/sheets/MessageSheet.jsx` (272 lines)
- **Purpose:** DM thread between the current user and one other mom. Enforces the 3-message free limit, renders the verified-only DM gate, the Plus upsell wall, and the composer. Real-time via Supabase subscription.
- **Entry / when shown:** `App.jsx:691` via `messageMom` state; also opened from `MomDetailSheet` → `onMessage`.
- **Related components/sheets:** `Sheet` (tall), `PremiumSheet` (limit hit → `openPremium`), `lib/chat.js`, `lib/chat-helpers.js` (`dmFreeState`, `DM_FREE_LIMIT`).
- **Data dependencies:** `getOrCreateDM`, `listMessages`, `sendMessage`, `subscribe` from `lib/chat.js` — live Supabase RLS-secured calls. Loading gate: `loading` local state, but no skeleton rendered.

## Current state (wireframe)

```
┌─────────────────────────────────────────┐
│  ━━━━━                       [X]        │
│                                         │
│  MESSAGE JESSICA                        │  ← eyebrow, coral
│  Your first 3 messages are free.        │  ← Fraunces 22px; "3 messages" italic+coral
│                                         │
│  ● ● ○  1 free message left            │  ← pip counter (3 dots, used=coral)
│                                         │
│  ┌─ thread ─────────────────────────┐  │
│  │         Hi Jessica! Saw we both…  │  │  ← my bubble, right, coral
│  │  Jessica  Hey! Yes park works    │  │  ← their bubble, left, paper
│  └────────────────────────────────────┘  │
│  (max-h 220px, scrollable)             │
│                                         │
│  ┌─ composer ───────────────────────┐  │
│  │ Write a message to Jessica…       │  │
│  │ 0 / 180 chars  · message 1 of 3  │  │
│  └────────────────────────────────────┘  │
│                                         │
│  [ 💬 Send ]                           │  ← coral when active
│                                         │
└─────────────────────────────────────────┘

── limit-reached state ──────────────────
│  ┌─ dark upsell card ───────────────┐  │  (C.ink bg)
│  │ 👑 Keep the conversation going   │  │
│  │  You've used your 3 free msgs.   │  │
│  │  [ Try Plus · 7 days free ]      │  │  ← saffron CTA
│  │  Then $7.99/mo · cancel anytime  │  │
│  └────────────────────────────────────┘  │
│                                         │

── verified-only blocked state ──────────
│  ┌─ sage card ─────────────────────┐   │
│  │ 🛡 Verified moms only           │   │
│  │  Jessica only accepts messages  │   │
│  └────────────────────────────────┘   │
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Three-state loading contract | **High** | `loading` starts `true` at line 16 and the sheet renders the full composer layout (header + counter + thread + composer) while data loads — the `minHeight: 540` at line 122 holds the drawer open. There is no skeleton for the thread area. When `listMessages` returns, messages snap in. On slow networks this creates a jarring layout shift when messages appear. | Add a `<MessageSkeleton>` for the thread area: 3 bubble-shaped skeleton blocks (alternating left/right alignment) rendered while `loading === true`. Use `C.skeleton`/`C.skeletonSheen` tokens + `shimmer` keyframe. |
| 2 | `minHeight: 540` constraint | **High** | Lines 101 and 122 both set `minHeight: 540` on the inner div. The "unavailable" state (line 101) has 2 short elements and would naturally be ~180 px; forcing 540 creates dead whitespace. The main state (line 122) forces the drawer tall even with 0 messages. | Remove `minHeight: 540` from both states. The `tall` Sheet prop (already set at lines 100 and 121) is sufficient. Let content size the drawer; the thread `max-h-[220px]` clamp already handles long histories. |
| 3 | Limit counter semantic color | **Medium** | The pip counter at line 147 colors used pips `C.terracotta` (coral). When 2 of 3 are used, 2 coral pips signal "used up" which reads as negative. However the counter text at line 147 uses `C.terracotta` for the `limitReached` label — this is correct. The unused-pip state (`C.divider`, `opacity:.6`) is fine. The "Last free message — make it count ✦" nudge at line 263 uses `C.terracotta` which is appropriate. No change needed here — but verify contrast: `C.terracotta` (#E96B7D) on `C.cream` (#FBF5EF) is ~3.1:1, below WCAG AA for normal text. | Either bold the counter text (makes it pass AA for large/bold) or use `C.coralDeep` (#D6446A) for the limit-reached label text to hit ~4.5:1. |
| 4 | "Last free message" emoji | **Low** | Line 263: `make it count ✦` — the ✦ character is decorative but has no `aria-hidden`. Screen readers will announce "last free message — make it count heavy four balloon-spoked asterisk". | Wrap the ✦ in `<span aria-hidden="true">`. |
| 5 | Message char counter disclosure | **Low** | The char counter "0 / 180 chars" at line 245 and "message 1 of 3" are in the same 10.5 px line, which can be hard to read on small screens. No `aria-live` on the count so screen readers don't announce remaining characters as the user types. | Add `aria-live="polite"` to the char count span. Consider bumping to 11.5 px. |
| 6 | Icebreaker pre-fill on error restore | **Low** | `handleSend` restores `body` on error at line 93 (`setText(body)`). But the icebreaker pre-fill only fires once via the `initialized` ref at line 77–79. If the icebreaker is modified and send fails, the user's edit is preserved — this is correct. No bug, just confirm this was intentional. | Confirmed as correct. No change. |
| 7 | `convId` null during typing | **Low** | `canSend` at line 82 includes `convId` as a gate. While the DM conversation is being created (async `getOrCreateDM`), the composer renders but all typing is silently disabled. There is no visible reason why the composer is un-sendable during this window. | During the `loading` phase, replace the composer with the skeleton. When loading completes, reveal the real composer — by then `convId` will be set. |

## Key issues (prose, ranked)

1. **No skeleton for the thread area (High).** The sheet loads real chat messages from Supabase. While loading, the full drawer is visible (held open by `minHeight: 540`) but the thread area is an empty void. On a slow connection this can be 1–3 seconds of blankness. Implement `MessageSkeleton` with 3 bubble shapes.

2. **`minHeight: 540` on both sheet states (High).** The "unavailable" state (2 short elements) and the main state both pin 540 px. The content-sized drawer contract is violated. Remove; the `tall` prop handles max height.

3. **Coral counter text contrast (Medium).** `C.terracotta` (#E96B7D) on `C.cream` (#FBF5EF) is ~3.1:1 contrast ratio — below WCAG AA 4.5:1 for the 11 px counter text at line 147.

4. **Composer silently disabled during `getOrCreateDM` (Low).** A mom who types immediately after opening the sheet finds her Send button grayed out with no explanation.

## Recommended redesign

```
── loading state ────────────────────────
│  MESSAGE JESSICA               (eyebrow)
│  Chat…                         (headline)
│                                         
│  ┌── skeleton thread ──────────────┐   
│  │  [        shimmer bubble      ] │   ← right-aligned, coral tint skeleton
│  │  [shimmer bubble  ]             │   ← left-aligned
│  │  [        shimmer bubble      ] │   ← right-aligned
│  └────────────────────────────────┘   
│                                         
│  [shimmer composer block 3 rows]       
│  [shimmer send button]                 

── loaded, has messages ─────────────────
│  (pip counter uses C.coralDeep for     
│   limitReached text, aria-live on      
│   char count, aria-hidden on ✦)       
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| Loading state | Empty 540 px void | 3-bubble shimmer skeleton |
| Unavailable state | 540 px tall (dead space) | Content-sizes ~200 px |
| Main state floor | 540 px forced | Shrinks to content |
| Limit counter text | `C.terracotta` (3.1:1 contrast) | `C.coralDeep` (4.5:1) |
| ✦ character | Announced by screen reader | `aria-hidden="true"` |

## Implementation notes

- `MessageSheet.jsx:101` — remove `minHeight: 540`
- `MessageSheet.jsx:122` — remove `minHeight: 540`
- Between lines 164–166: while `loading === true`, render skeleton bubble placeholders instead of the empty thread + open composer. 3 `<div>` blocks of varying widths, `background: C.skeleton`, `animation: 'shimmer 1.5s infinite'`, `borderRadius: 16`.
- `MessageSheet.jsx:147` — change `color: limitReached ? C.terracotta : C.inkSoft` to `color: limitReached ? C.coralDeep : C.inkSoft`
- `MessageSheet.jsx:263` — wrap `✦` in `<span aria-hidden="true">`
- `MessageSheet.jsx:244` — add `aria-live="polite"` to char count `<span>`

## Acceptance criteria

- [ ] While `loading === true`, shimmer skeleton bubbles appear (no blank space)
- [ ] `minHeight: 540` removed from both `unavailable` and main states
- [ ] "Unavailable" drawer is visually shorter (shrinks to content, ~180 px)
- [ ] `C.coralDeep` used for limit-reached counter text; confirm WCAG AA pass
- [ ] ✦ has `aria-hidden="true"`
- [ ] Char counter has `aria-live="polite"`
- [ ] `npm run build` passes
