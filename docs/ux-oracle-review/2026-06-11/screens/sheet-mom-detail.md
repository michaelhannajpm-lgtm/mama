# MomDetailSheet — comprehensive mom profile + actions

- **File:** `src/sheets/MomDetailSheet.jsx` (579 lines)
- **Purpose:** Full profile and action surface for a single mom. Hosts connect request, message (3 free / Plus), schedule, propose-first-meetup (inline composer), save, and share. The richest per-mom surface in the app.
- **Entry / when shown:** `HomeTab.jsx:843`, `ConnectTab.jsx:1406` — rendered directly within those tabs' JSX. Accepts `fullScreen` prop; when `true`, `Sheet` renders as a full-phone-height "screen" with back arrow instead of drawer.
- **Related components/sheets:** `Sheet` (tall bleedTop, optionally fullScreen), `ScheduleSheet` (via `onSchedule`), `MessageSheet` (via `onMessage`), `PremiumSheet` (via `onPremium`), `PresenceDot` component.
- **Data dependencies:** Static — all data from `mom` prop. No API calls within the sheet. Actions fire callbacks to parent. No loading states inside.

## Current state (wireframe)

```
── fullScreen=true (HomeTab treatment) ──

←  [back arrow, top-left, white circle]   (no drag handle in full-screen mode)

┌─── hero section ────────────────────────
│  [coral gradient background]            
│  [avatar 110px, white border]           
│     [shield badge, sageDark, bottom-right]
│     [presence dot, top-right]          
│  Sara Chen               ✨ 87% match  
│  👶 2 kids · 1–3 yrs  ·  📍 0.8 mi   
│  [tag chip: "New mom · Hyde Park"]     
└─────────────────────────────────────────

┌─── shared ground (coral) ──────────────
│ ♥ YOU BOTH SHARE                        
│ [Coffee dates] [Stroller walks]         
└─────────────────────────────────────────

About Sara
  (bio, up to 3 lines, Read more link)

┌─── availability ────────────────────────
│  FREE TIME                              
│  [Tue mornings] [Thu mornings]          
└─────────────────────────────────────────

Into
  [tag] [tag] [tag] (up to 5 interests)

┌─── suggested meetup ───────────────────
│  ✨ SUGGESTED FIRST MEETUP              
│  Saturday morning coffee               
│  Buddy Brew, Hyde Park · 0.7 mi        
└─────────────────────────────────────────

[ ＋ Send connection request ]           ← coral gradient, full-width
  ┌── Message ──┬─── Schedule ───┬─ Save ─┐
  │ 💬 Message  │ 📅 Schedule   │ 🔖    │
  │  2 free     │  Pick a slot  │  Save  │
  └─────────────┴────────────────┴────────┘

[ 📤 Share profile ]

[+ Propose time & place for first meetup]  ← dashed coral border, collapsible
  ─── (when open) ──────────────────────
  DAY: [Mon][Tue][Wed]...[Sun]
  TIME: [☕ Morning][✨ Midday]...
  PLACE: _________________ (optional)
  [ Send proposal to Sara ]
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Hardcoded `'#8A6610'` | **Medium** | Line 355: `color: connectionStatus === 'pending' ? '#8A6610' : '#fff'` — `#8A6610` is a brownish-gold color used as "pending" text. This is a one-off hex with no token. The closest semantic token is `C.saffron` (#D9A441) but it differs. | Extract to a local constant `PENDING_TEXT = '#8A6610'` at the top of file and document it. Longer-term, add `C.saffronDark` to `theme.js`. |
| 2 | Hardcoded `'#fff'` throughout | **Medium** | Lines 142, 150, 162, 163, 235, 284, 302, 353, 356, 472, 473, 495, 496, 531, 557, 564 — `'#fff'` used for white text on colored backgrounds and white border-rings. These are all `C.paper` (#FFFFFF). | Replace `'#fff'` with `C.paper` throughout. (Note: `ring="#fff"` on `PresenceDot` at line 170 — check if `PresenceDot` accepts `C.paper` as a string; it should since it's the same hex.) |
| 3 | Suggested meetup content is hardcoded | **High** | Lines 326–334: `"Saturday morning coffee"`, `"Buddy Brew, Hyde Park · 0.7 mi"` are hardcoded. This is a Tampa Bay place name (Buddy Brew is real in Tampa) but the time, day, and specific branch are static. Every mom profile shows the same suggestion. | Drive the suggested meetup from the mom's `nextSlots[0]` + nearest shared place from the places API. If unavailable, omit the section rather than show a fabricated suggestion. |
| 4 | Three-state contract missing | **High** | No skeleton for this sheet. However, since `MomDetailSheet` receives its data fully via props (no internal API calls), the sheet itself cannot be in a "loading" state. The parent tab (`HomeTab`, `ConnectTab`) is responsible for not opening this sheet until the mom object is ready. The `if (!mom) return null` guard at line 90 handles the null case. Contract is technically satisfied at the sheet level — the parent owns the loading state. | No change needed inside the sheet. Document this explicitly in a file comment: "Data arrives fully via props; no internal loading state. Parent must not set selectedMom until mom data is available." |
| 5 | Proposal composer accessibility | **Medium** | The collapsible "Propose time & place" section at lines 439–543 uses `+` / `−` as collapse icons (line 455: `proposeOpen ? '−' : '+'`). These are not accessible expand/collapse patterns. | Replace with `aria-expanded={proposeOpen}` on the trigger button, and replace `+`/`−` glyphs with `<ChevronDown>` / `<ChevronUp>` icons that have `aria-hidden="true"`. |
| 6 | ActionTile `Schedule` opens ScheduleSheet even when booked | **Medium** | Line 396: the "Schedule" tile (`booked` state) still fires `onClick={() => onSchedule?.(mom)}` even when `booked` is true — the tile shows "Booked" but remains tappable, presumably to reschedule. There is no visual indication that tapping a "Booked" tile does something (re-schedule vs. view). | When `booked`, either disable the tile (if re-scheduling is not supported) or change the label to "Reschedule" and document the flow. |
| 7 | `BoxShadow` hardcoded rgba | **Low** | Multiple `boxShadow` values use hardcoded rgba: `'0 6px 20px -6px rgba(27,42,78,.25)'` (line 144), `'0 6px 16px -6px rgba(214,68,106,.55)'` (line 366), etc. These are not in the token system but are pervasive across the app, not unique to this sheet. | Low urgency; consistent pattern across the codebase. Could extract shadow tokens in a future design-token pass. |
| 8 | `bio` always italic | **Medium** | Lines 253–258: bio text is styled `fontStyle: 'italic'`. Applying italic to every bio universally removes the author's voice — not all bios benefit from italic. Italic is a typographic emphasis tool, not a prose style. | Remove `fontStyle: 'italic'` from the bio paragraph. Reserve italic for the Fraunces headline brand signature device. |
| 9 | Content-sized / fullScreen split | **Low** | `fullScreen` defaults to `false` (line 82). When used with `bleedTop tall` (line 124) but `fullScreen=false`, the sheet is a drawer. When `fullScreen=true`, it covers the phone. Both modes work correctly per the `Sheet` primitive. The dual behavior is intentional and documented. | Compliant. No change needed. |

## Key issues (prose, ranked)

1. **Hardcoded "Saturday morning coffee" + "Buddy Brew" as the universal suggestion (High).** Every mom gets the same suggested meetup. This looks seeded and breaks trust when a mom sees the exact same proposal for someone who lives across town. Derive from real data or hide.

2. **`'#fff'` throughout instead of `C.paper` (Medium).** 16 instances of hardcoded white. Not a visual bug today (same hex) but creates brittleness if `C.paper` ever shifts.

3. **Bio forced into italic (Medium).** Italic is the brand signature typographic accent, not a prose default. Bio text in an `Albert Sans` italic at 13 px is harder to read at length.

4. **Proposal collapse button inaccessible (Medium).** `+`/`−` glyphs with no `aria-expanded` or `role`.

## Recommended redesign (key diffs)

```
── suggested meetup (data-driven) ───────
│  ✨ SUGGESTED FIRST MEETUP              
│  [derived from mom.nextSlots[0]]       
│  [place from places API — nearest shared]
│  → omit section if no data available   

── bio section ──────────────────────────
│  About Sara                             
│  Real mom. Real schedule...            │  ← no italic (Albert Sans regular)

── proposal toggle button ───────────────
│  [+ Propose time & place]    [▼]       │  ← ChevronDown, aria-expanded
```

## Before / after comparison (what changes visually)

| | Before | After |
|---|---|---|
| Suggested meetup | "Saturday morning coffee" / "Buddy Brew" always | Data-driven or hidden |
| Bio font style | Italic | Regular (not italic) |
| `'#fff'` | Raw hex | `C.paper` token |
| Propose toggle | `+`/`−` glyph | `ChevronDown` + `aria-expanded` |
| `#8A6610` | Hardcoded | Local constant |

## Implementation notes

- `MomDetailSheet.jsx:326-334` — replace hardcoded suggested meetup with `mom.nextSlots?.[0]` + place lookup, or `return null` from the section when unavailable
- `MomDetailSheet.jsx:253` — remove `fontStyle: 'italic'`
- `MomDetailSheet.jsx:355` — extract `const PENDING_TEXT = '#8A6610'` at file top; replace inline usage
- All `'#fff'` occurrences — replace with `C.paper` from `import { C } from '../theme'` (already imported)
- `MomDetailSheet.jsx:439-458` — add `aria-expanded={proposeOpen}` to the toggle button; replace `+`/`−` with `<ChevronDown size={16} aria-hidden="true"/>` / `<ChevronUp ...>`

## Acceptance criteria

- [ ] Suggested meetup section is hidden when no real data is available
- [ ] Bio paragraph not italic
- [ ] All `'#fff'` replaced with `C.paper`
- [ ] `#8A6610` extracted to a named constant
- [ ] Proposal toggle has `aria-expanded` and chevron icon
- [ ] "Booked" tile behavior is unambiguous (disabled or labeled "Reschedule")
- [ ] `npm run build` passes
