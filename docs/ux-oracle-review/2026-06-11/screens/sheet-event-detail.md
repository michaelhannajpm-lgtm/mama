# EventDetailSheet — event / meetup detail and RSVP

- **File:** `src/sheets/EventDetailSheet.jsx` (421 lines)
- **Purpose:** Detail view for events and meetups. Photo hero, when/where, description, optional meetup instructions (checklist), blurred "moms going" preview, hosted-by card, "I'm going" primary CTA, secondary row (Interested / Join chat / Share). Supports `variant='meetup'` for the richer meetup treatment.
- **Entry / when shown:** `HomeTab`, `ConnectTab`, `LocalPicksTab` — opened when a mom taps an event or meetup card. `fullScreen` prop controls drawer vs. full-phone presentation.
- **Related components/sheets:** `Sheet` (tall bleedTop, optionally fullScreen), `SubjectThreadSheet` (via `onDiscuss`).
- **Data dependencies:** Static from `event` prop. No internal API calls. `goingAvatars` from `event.goingAvatars` or `DEFAULT_GOING_AVATARS` (hardcoded Unsplash URLs). `flash` callback for toast messages.

## Current state (wireframe)

```
┌─────────────────────────────────────────┐
│  [hero photo 200px]                     │
│  [dark gradient overlay]                │
│  [close/back button — Sheet handles]    │
│  EVENT / MEETUP  (eyebrow, white)       │
│  Stroller Walk + Coffee (Fraunces 24px) │
│                                         │
├─────────────────────────────────────────┤
│  🕐 Saturday · 9:00 AM                 │
│  📍 Bayshore Boulevard · 0.8 mi        │
│  👥 14 moms going         (sageDark)   │
│  ★ 4.7 stars · 32 reviews  (saffron)  │
│                                         │
│  [tag chips: coralSoft bg]             │
│                                         │
│  ABOUT THIS MEETUP                      │
│  (description, 3-line clamp, Read more) │
│                                         │
│  MEETUP INSTRUCTIONS (if meetup)        │
│  ┌─────────────────────────────────┐   │
│  │ ☑ Show up 5 min early…         │   │
│  │ ☑ Wear something coral…        │   │  ← HARDCODED instructions always shown
│  │ ☑ Strollers welcome…           │   │
│  │ ☑ Bail-out friendly…           │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─ blurred avatars + count ──────────┐ │
│  │ [blurred row of 5 photos]          │ │
│  │ 14 moms going · RSVP to see who's │ │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─ Hosted by Go Mama ──────────────┐  │
│  │ [GM avatar coral]  Hosted by Go  │  │
│  │ Mama · Verified mom-friendly ✨  │  │
│  └─────────────────────────────────────┘ │
│                                         │
│  [ ✓ I'm going ]                       │  ← coral gradient, primary CTA
│  [ Interested ] [ Join chat ] [ Share ] │  ← secondary row
│  Group chat closes 2 days after...     │  ← only when isGoing
└─────────────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | RSVP flash fires profile-completion nudge | **High** | `handleImGoing` at line 127–129: `flash?.('Complete your profile & earn verified badge')` fires on every RSVP tap, including when `isGoing` is already true (the button re-fires on tap). After the first RSVP, subsequent taps always flash the profile-completion prompt — even for fully verified users. The comment at lines 28–31 confirms this is intentional ("nudge profile completion") but it fires unconditionally. | Gate the nudge: only show if `!senderVerified` or profile is incomplete. Never show to already-verified moms. Repeated, irrelevant nudges are friction masquerading as guidance. |
| 2 | Hardcoded FALLBACK_INSTRUCTIONS always rendered | **High** | Lines 41–46: `FALLBACK_INSTRUCTIONS` includes `'Wear something coral so other moms can find you.'` — this fallback fires for every meetup that lacks custom instructions. The "coral" detail is endearing but fabricated. Line 115–117: instructions are used when `event.instructions?.length` is falsy — i.e., any event from the API without instructions. | Hide the "Meetup instructions" section when `event.instructions` is null/empty. Or show only when `isMeetup && event.instructions?.length > 0`. Do not show fallback instructions as if they were real. |
| 3 | DEFAULT_GOING_AVATARS hardcoded Unsplash photos | **Medium** | Lines 48–55: `DEFAULT_GOING_AVATARS` contains 6 specific Unsplash portrait URLs. These same 6 people appear on every event when `event.goingAvatars` is empty. Any user who sees multiple events in one session will notice the same faces in the blurred avatar row. | When `event.goingAvatars` is empty and `goingCount > 0`, render blurred placeholder circles (using `C.skeleton` shimmer circles) instead of real photos of real people. When `goingCount === 0`, omit the avatar row. |
| 4 | "Join chat" tab misrepresents state | **Medium** | `SecondaryTile` for "Join chat" at line 375 is always `active={false}` (white background). When `isGoing` is true and the user has joined the chat, the button still looks un-active. The chat is accessible, but the button does not reflect it. | When `isGoing`, show "Join chat" with `active={true}` (sage accent — chat = community). |
| 5 | Join chat locked behavior is invisible | **Medium** | Line 131–135: `handleJoinChat` fires a flash message "Only accessible for moms going to the event" when `chatLocked`. But the "Join chat" button has no visible lock icon or disabled state — it looks identical to the Share button in terms of interactivity. A mom taps it and gets an unexpected toast. | Add `Lock` icon or `opacity: 0.5` to the "Join chat" tile when `chatLocked`. Or show it disabled with a tooltip: "RSVP first to join the group chat." |
| 6 | `PrimaryCTA` active gradient is single-color | **Medium** | Line 66: `background: active ? \`linear-gradient(135deg, ${accent}, ${accent})\`` — when `active`, both stops are the same color, producing a flat fill, not a gradient. This is intentional as a "solid selected" state, but the CSS is misleading. | Use a solid background for the active state: `background: active ? accent : \`linear-gradient(135deg, ${C.coral}, ${C.coralDeep})\``. Cleaner and semantically honest. |
| 7 | Three-state contract: loading | **High** | No skeleton inside the sheet — but like `MomDetailSheet`, all data comes from the `event` prop. The parent tab owns loading. The `if (!event) return null` at line 111 handles the guard. This is structurally correct. | No change needed. Document in a file comment. |
| 8 | Hero photo not bleedTop close button | **Low** | Sheet uses `bleedTop` (line 145) correctly for the drag handle. The `Sheet` primitive positions the drag handle over the hero. But the hero at 200 px is shorter than the 220 px used in `MomDetailSheet`. This means the bottom hero content can overlap the Sheet's close button on some phones. | Increase hero to `224px` or adjust the close button z-index via `zIndex: 5` in the hero section to ensure it sits above. |

## Key issues (prose, ranked)

1. **Profile-completion toast fires on every RSVP, including re-taps and verified moms (High).** This is dark-pattern-adjacent: a valid action (confirming you're going) always triggers an unrelated self-promotional nudge. Gate it to unverified / incomplete profiles only.

2. **FALLBACK_INSTRUCTIONS shown as real meetup content (High).** Instructions like "Wear something coral" and "Bail-out friendly" are charming copy but they are fictional. Moms who act on these at a real event that has different logistics will be confused or misled.

3. **Hardcoded DEFAULT_GOING_AVATARS (Medium).** The same 6 people appear in every event's "moms going" blur row. Skeleton circles are more honest and look better.

4. **"Join chat" button invisible lock state (Medium).** Tapping produces an unexpected toast with no visual cue that it was locked.

## Recommended redesign (key diffs)

```
── RSVP CTA ─────────────────────────────
handleImGoing:
  onJoin?.(event);
  if (!senderVerified) flash?.('Verify to unlock more features'); // gate nudge

── meetup instructions ───────────────────
{isMeetup && event.instructions?.length > 0 && (
  <Section>Meetup instructions: {event.instructions}</Section>
)}
// omit section when no instructions from API

── going avatars ─────────────────────────
{goingCount > 0 && (
  // show skeleton circles (C.skeleton bg) instead of Unsplash photos
  // unless event.goingAvatars has real data
)}

── join chat tile ────────────────────────
<SecondaryTile
  active={isGoing}          // active when RSVP'd
  accent={C.sageDark}       // sage = community/group
  Icon={chatLocked ? Lock : MessageCircle}
  label="Join chat"
  opacity={chatLocked ? 0.55 : 1}
/>
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| RSVP nudge toast | Always fires | Only for unverified/incomplete moms |
| Meetup instructions | Always shown (fallback) | Only shown when event has real instructions |
| Going avatars | 6 same Unsplash faces | Skeleton circles or real `event.goingAvatars` |
| Join chat (RSVP'd) | White (inactive-looking) | Sage active state |
| Join chat (locked) | No visible lock | Semi-transparent + Lock icon |
| PrimaryCTA gradient (active) | Single-color gradient CSS | Flat solid `accent` color |

## Implementation notes

- `EventDetailSheet.jsx:127-129` — add guard: `if (!senderVerified) flash?.('Complete your profile & earn verified badge');`
- `EventDetailSheet.jsx:113-117` — change `const instructions = event.instructions?.length ? event.instructions : FALLBACK_INSTRUCTIONS;` to `const instructions = event.instructions?.length ? event.instructions : [];` and gate the section on `isMeetup && instructions.length > 0`
- `EventDetailSheet.jsx:48-55` — change DEFAULT_GOING_AVATARS usage: when `event.goingAvatars` is empty, render `avatars.map(... style={{ background: C.skeleton }})` placeholder circles instead of `backgroundImage: url(...)`
- `EventDetailSheet.jsx:374-380` — change `active={false}` on Join chat tile to `active={isGoing}`, add `accent={C.sageDark}`, add opacity and icon based on `chatLocked`
- `EventDetailSheet.jsx:66` — change to `background: active ? accent : \`linear-gradient(135deg, ${C.coral}, ${C.coralDeep})\``

## Acceptance criteria

- [ ] RSVP toast shown only to unverified/incomplete profiles
- [ ] Meetup instructions section hidden when `event.instructions` is null/empty
- [ ] Going avatars: no Unsplash fallback URLs; skeleton circles instead
- [ ] "Join chat" tile shows sage active state after RSVP
- [ ] "Join chat" tile shows Lock icon and reduced opacity when locked
- [ ] `PrimaryCTA` active uses flat `accent` color (not gradient)
- [ ] `npm run build` passes
