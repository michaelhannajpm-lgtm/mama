# ScheduleSheet — pick a meetup slot with a specific mom

- **File:** `src/sheets/ScheduleSheet.jsx` (122 lines)
- **Purpose:** Presents 3 pre-generated time slots for a 1:1 meetup with a matched mom. Optionally captures the user's recurring availability (when none is on file). Calls `onContinue(slot)` on confirm.
- **Entry / when shown:** `App.jsx:669` via `scheduleMom` state; triggered from `MomDetailSheet` → `onSchedule`.
- **Related components/sheets:** `Sheet` (no `tall`), `AvailabilitySheet` (conceptually related — ScheduleSheet is the quick "pick one slot" version).
- **Data dependencies:** Slots are **hardcoded** at lines 34–38: `{ day:'Tue', time:'9:30 AM', place: mom.nextPlace }`, `{ day:'Thu', time:'10:00 AM', place: 'Sightglass · 7th St' }`, `{ day:'Sat', time:'9:00 AM', place: 'Dolores Park · north end' }`. `recordStep(0, { slots })` fires on day-capture change (lib/onboarding.js).

## Current state (wireframe)

```
┌─────────────────────────────────────────┐
│  ━━━━━                       [X]        │
│                                         │
│  SCHEDULE WITH JESSICA                  │  ← coral eyebrow
│  You're both free…                      │  ← Fraunces 24px; "both" italic+coral
│                                         │
│  ┌─ day capture (shown if no prefs) ─┐  │
│  │  Which days usually work for you?  │  │
│  │  [M] [T] [W] [T] [F] [S] [S]     │  │
│  └─────────────────────────────────────┘ │
│                                         │
│  ┌─────────────────────────────────────┐ │
│  │  TUE   Tue · 9:30 AM               │ │  ← selected: dark bg, saffron check
│  │  9:30  Coffee shop name            │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │  THU   Thu · 10:00 AM              │ │  ← Sightglass · 7th St (SF)
│  │  10:00 Sightglass · 7th St         │ │  ← HARDCODED SF CONTENT
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │  SAT   Sat · 9:00 AM               │ │
│  │  9:00  Dolores Park · north end    │ │  ← HARDCODED SF CONTENT
│  └─────────────────────────────────────┘ │
│                                         │
│  [ Send invite / Continue  → ]          │  ← coral, full-width
│  🛡 Quick verify next / Adds to calendar│
└─────────────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Wrong city content | **Critical** | `slots[1].place = 'Sightglass · 7th St'` (line 36) and `slots[2].place = 'Dolores Park · north end'` (line 37) are San Francisco landmarks. Go Mama is a Tampa Bay app. These are visible to every user who opens the schedule picker. | Replace with Tampa Bay place names, or better: derive `place` from real data — `mom.nextPlace` is already used for `slots[0]`. Drive the remaining two from the live places API or remove the place field entirely and show only day/time until a real slot engine is implemented. |
| 2 | Static slots — no real availability overlap | **High** | All three slots (Tue 9:30, Thu 10:00, Sat 9:00) are hardcoded regardless of the mom's or user's actual `free_slots`. The headline "You're *both* free…" claims mutual availability but the data does not support it — these are fabricated slots. | Drive slots from real overlap: compare `prefs.slots` (current user) with `mom.freeSlots` (from the mom profile returned by the API). Show the intersection. If no overlap, show the mom's next available times with a note "Her next open times:". The `ScheduleSheet` receives `prefs` as a prop — use it. |
| 3 | Day-capture writes wrong slot format | **Medium** | `toggleDay` at line 26 produces slots as `"Mon-morning"` (always morning, line 27: `[...next].map(d => \`${d}-morning\`)`) regardless of the time windows the user just indicated via the ScheduleSheet. Only the day, not the time window, is captured here. This misrepresents availability preference. | Either capture a time window per day (add a time selector per selected day), or make clear the capture is "default to morning" and let the user refine in `AvailabilitySheet`. At minimum, rename the copy at line 62: "Which mornings usually work? (We'll let you pick times in your profile)" to be honest. |
| 4 | Content-sized compliance | **Medium** | Sheet uses `<Sheet onClose={onClose}>` at line 41 — no `tall` prop. With the day-capture section shown, content can reach ~480 px. On a 375×667 phone, the default 82% cap is ~547 px, which is sufficient but tight. Without the day-capture, the sheet is shorter. Current behavior is acceptable but bears monitoring as content grows. | No immediate change. Add `tall` if a 4th slot row or instructions copy is added. |
| 5 | No empty / error state | **Medium** | If `mom.nextPlace` is `undefined`, `slots[0].place` is `undefined`, which renders as an empty string in the slot card. No fallback. | Add `place: mom.nextPlace || 'TBD'` for the first slot; derive or stub the rest. |
| 6 | Time-of-day icon semantics | **Low** | The day-token box uses `C.saffron` (premium) as the background when selected at line 98: `background: chosen===i ? C.saffron : C.creamSoft`. Saffron should be reserved for premium/highlight, not slot selection. | Use `C.coralSoft` for the selected token box background, keeping `C.ink` as the card background. The `Check` icon in saffron at line 106 is fine as a subtle accent. |
| 7 | DAY_LABELS has two 'T' characters | **Low** | `const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']` at line 7. Two 'T' and two 'S' buttons are visually identical. For accessibility, use 'Tu', 'Th', 'Sa', 'Su' or tooltip labels. | Add `aria-label={DAY_KEYS[i]}` to each day button at line 66, and consider 'Tu'/'Th'/'Sa'/'Su' as labels. |

## Key issues (prose, ranked)

1. **San Francisco landmark content in a Tampa Bay app (Critical).** Sightglass Coffee and Dolores Park are San Francisco icons. Any Tampa mom who opens this sheet and sees these will immediately lose trust. This is a content error with brand damage potential.

2. **Fabricated "both free" claim (High).** The headline asserts mutual availability ("You're *both* free…") but the slots are hardcoded. No real overlap computation occurs. A mom who sees Thursday 10 AM as a slot but is actually free only Wednesday will be misled into scheduling a conflict.

3. **Day capture always defaults to "morning" (Medium).** The availability capture sub-step saves all days as `day-morning`, making it look like the user is free every morning of selected days. This is inaccurate and degrades match quality.

## Recommended redesign

```
── loaded, has real overlap ─────────────
│  SCHEDULE WITH JESSICA                  
│  You're both free…                      
│                                         
│  ┌─ Tue · 9:30 AM ────────────────────┐ 
│  │  TUE   Tuesday morning             │
│  │  9:30  Buddy Brew, Hyde Park       │  ← Tampa real place from API
│  └─────────────────────────────────────┘ 
│  [Thu · 10:00 AM slot]                  
│  [Sat · 9:00 AM slot]                   
│                                         
│  [ Send invite → ]                      

── no overlap ───────────────────────────
│  SCHEDULE WITH JESSICA                  
│  Her next open times:                   ← honest headline
│  [show Jessica's slots from API]        
│  [note: "Update your free times to     
│   find a shared window"]               
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| Slot 2 place | "Sightglass · 7th St" (SF) | Tampa place from API or "TBD" |
| Slot 3 place | "Dolores Park · north end" (SF) | Tampa place from API or "TBD" |
| Selected box bg | C.saffron (premium color) | C.coralSoft |
| Headline truthfulness | Always "both free" | Real overlap or "her next times" |
| Day capture format | Always "-morning" | Honest label or time selector |

## Implementation notes

- `ScheduleSheet.jsx:34-38` — replace static `slots` array with a derived overlap computation using `prefs?.slots` and `mom.freeSlots`. Fallback to `mom.freeSlots?.slice(0,3)` if user has no prefs, or empty with a callout.
- `ScheduleSheet.jsx:36-37` — immediately: replace `'Sightglass · 7th St'` and `'Dolores Park · north end'` with `'Tampa Bay meetup'` and `'Location TBD'` as stopgap until real data drives it.
- `ScheduleSheet.jsx:27` — change `${d}-morning` to surface the actual `TIME_WINDOWS` options, or rename the capture copy to be honest about defaulting to morning.
- `ScheduleSheet.jsx:98` — change `background: chosen===i ? C.saffron : C.creamSoft` to `background: chosen===i ? C.coralSoft : C.creamSoft`
- `ScheduleSheet.jsx:7` — change `DAY_LABELS` to `['M','Tu','W','Th','F','Sa','Su']` and add `aria-label` on each button.

## Acceptance criteria

- [ ] No San Francisco place names appear on any device or slot
- [ ] Slot places are derived from live data or clearly labeled "TBD"
- [ ] Selected time-token box background uses `C.coralSoft`, not `C.saffron`
- [ ] Day capture copy is honest about defaulting to morning, or captures time window
- [ ] Day buttons have `aria-label` with full day name
- [ ] `npm run build` passes
