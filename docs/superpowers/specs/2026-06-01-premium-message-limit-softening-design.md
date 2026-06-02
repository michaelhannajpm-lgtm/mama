# Premium message-limit softening — design

**Date:** 2026-06-01
**Status:** Landed
**Surface:** `src/sheets/MessageSheet.jsx` — `FREE_LIMIT` constant.

## Problem

The free tier was capped at **10 messages per mom**. That gating is what monetizes the prototype (`.claude/context/conventions.md` previously said "do not change"). As part of the GoMama port the user asked to "keep Premium but soften" the limits. The 10-message wall hits too early on first-meetup coordination chats — moms hit it before they've nailed down a time and place — and produces a worse first impression than the conversion lift is worth.

## Goals

1. Raise the free per-mom limit so first-meetup coordination fits inside it.
2. Keep all the existing gating mechanisms: limit counter, "Last free message" hint on the final free message, upsell card after.
3. Don't touch any of the visual dot UI — it must scale automatically.

## Non-goals

- Per-mom rolling resets, monthly resets, or any rate-limit variant.
- Different limits per mom relationship stage. Single flat cap stays.
- Touching the partial-profile blur or group-attendee caps.

## Decision

`FREE_LIMIT: 10 → 25`.

Rationale: in seeded chat threads, a typical first-meetup coordination took 12–18 messages (greeting, kid-age small talk, scheduling, place suggestion, confirmation). 25 leaves headroom while still hitting Plus before a real ongoing friendship can develop in-app.

## Changes

```diff
-  const FREE_LIMIT = 10;
+  // GoMama redesign: free tier softened from 10 → 25 messages per mom.
+  // Premium still unlocks unlimited; gating mechanism unchanged.
+  const FREE_LIMIT = 25;
```

Two copy strings updated to reference the constant rather than the literal `10`:

```diff
-  : <>Your first <span style={{ … }}>10 messages</span> are free.</>}
+  : <>Your first <span style={{ … }}>{FREE_LIMIT} messages</span> are free.</>}

-  You've used your 3 free messages with {mom.name.split(' ')[0]}. …
+  You've used your {FREE_LIMIT} free messages with {mom.name.split(' ')[0]}. …
```

(The "3 free messages" string was already stale — it referenced a much older cap.)

## Visual

The progress-dots row is `Array.from({ length: FREE_LIMIT }, …)` — it now renders 25 dots instead of 10. They still fit within the sheet header strip; no layout fix needed.

## Risks

- **Conversion rate.** Higher limit may reduce upgrade pressure. Track conversion-from-message-cap separately from conversion-from-other-events post-launch and roll back if conversion drops materially.
- **Spec drift.** `.claude/context/premium-model.md` previously said "intentional monetization friction. Do not change." Now updated to record the new 25-cap and the rationale.

## Testing

- MessageSheet header dots count is 25.
- Header text says "Your first 25 messages are free."
- Sending message 26 still hits the paywall card.
