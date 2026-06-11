# MainApp shell — 5-tab bottom-nav shell

- **File:** `src/screens/MainApp/index.jsx` (383 lines)
- **Purpose:** Root container for the signed-in experience. Renders the shared top header (GoMama wordmark / tab title + notification bell), mounts the active tab, and owns the bottom tab bar, cross-tab intent routing, verify gate, and all overlay sheets (Notifications, VerifyPrompt, Location, MyVillage, SubjectThread, GroupDiscussion).
- **Entry / when shown:** `step === 3` in `PrototypeApp` (i.e., once onboarding is complete and the account is active). Persists for the full signed-in session.
- **Related components/sheets:** `StatusBar`, `HomeTab`, `ConnectTab`, `LocalPicksTab`, `YouTab`, `MamaHubSheet` (rendered `asScreen`), `MyVillageSheet`, `NotificationsSheet`, `VerifyPromptSheet`, `LocationSheet`, `SubjectThreadSheet`, `GroupDiscussionSheet`.
- **Data dependencies:** Receives all live data as props from `App.jsx` (`nearbyMoms`/`nearbyLoading`, `places`/`placesLoading`, `events`/`eventsLoading`, `localFavorite`, `appConfig`). No fetches of its own.

---

## Current state (wireframe)

```
┌─────────────────────────────────┐
│  StatusBar (mock)               │
├─────────────────────────────────┤
│  Go Mama*          [Bell●]      │  ← header, 14px paddingTop, always present
├─────────────────────────────────┤
│                                 │
│   <Active Tab content>          │  ← flex-1, fills remaining height
│   (HomeTab / ConnectTab /       │
│    LocalPicksTab / YouTab /     │
│    MamaHubSheet asScreen)       │
│                                 │
├─────────────────────────────────┤
│  [▬─Home][Users·Connect]        │
│  [Compass·Explore][Grid·My Hub] │  ← tab bar, pb-6, background:#fff (hardcoded)
│  [User·Profile]                 │  ← active: coral top-bar + coralDeep label
└─────────────────────────────────┘
  * "Go" in navy Fraunces 700, "Mama" italic coral

Overlays (stacked above, z-index via Sheet primitive or sheet-level fixed):
  NotificationsSheet · VerifyPromptSheet · LocationSheet
  MyVillageSheet · SubjectThreadSheet · GroupDiscussionSheet
```

---

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|----------------------|----------------|
| 1 | Color — hardcoded hex | High | Tab bar background hardcoded as `background: '#fff'` at `index.jsx:275`. All other surfaces use `C.paper`. If `C.paper` ever changes this surface diverges silently. | Replace `'#fff'` with `C.paper`. |
| 2 | Color — hardcoded hex | Medium | `MeetupCard` fallback gradient uses `C.coral` and `C.saffron` — not a shell issue, but the shell's tab bar is the only non-`C` hex in this file. See finding #1. | As above. |
| 3 | Mobile ergonomics — hit target | High | Each tab button is `py-1.5` (6px) top + 6px bottom padding + 20px icon + 2px gap + 10px label ≈ ~44px total tap zone, but only because of `pb-6` on the container. The touch region of the buttons themselves is `flex-col` with no explicit `min-height`. On a phone without `pb-6` safe area the bottom two-thirds of the last row would be clipped. Safe area inset (`env(safe-area-inset-bottom)`) is not applied; `pb-6` (24px) is a static proxy that may be too small on iPhone 14 Pro (34px home indicator) and may be excessive on older phones. | Replace `pb-6` with `paddingBottom: \`calc(1.5rem + env(safe-area-inset-bottom))\`` (or a CSS `pb-safe` utility) at `index.jsx:275`. |
| 4 | Mobile ergonomics — hit target | Medium | Tab bar buttons have no explicit `min-height`. On Tailwind `flex-col items-center` the clickable area collapses to content height. Add `style={{ minHeight: 44 }}` to each `<button>` at `index.jsx:283` to guarantee the 44×44 pt WCAG / Apple HIG minimum. | Add `minHeight: 44` to the tab button style. |
| 5 | Navigation clarity — "My Hub" tab | Medium | `id: 'hub'` in `TABS` (line 36) renders `MamaHubSheet` with `asScreen` (line 261), but the conditional is `{tab === 'hub' && <MamaHubSheet …/>}`. `MamaHubSheet` was designed as a bottom-drawer sheet; switching it into a tab-sibling means it renders without the scroll-container discipline that other tabs enforce (`flex-1 overflow-y-auto`). If `MamaHubSheet` sets its own `h-full` it will fight the shell. Verify `MamaHubSheet asScreen` handles safe-area bottom padding consistently with the other tabs. | Confirm `MamaHubSheet` uses the same `flex-1 overflow-y-auto paddingBottom: 16` inner-scroll pattern as `HomeTab`/`ConnectTab`. If not, wrap it in the shell at line 261. |
| 6 | Navigation clarity — active indicator visibility | Low | The active-tab top-bar is 2.5px high and 20px wide, positioned `top: -1` (line 287). On small phone screens or when focused with assistive tech, this hairline is the only non-label active signal. Increasing to 3px or 24px width would improve legibility without visual noise. | Increase `height` to 3 and `width` to 24 at `index.jsx:288–289`. |
| 7 | Navigation clarity — unread badge position | Low | The notification unread dot is positioned `top: 7, right: 8` (line 177–178) within a 36×36 button. This places the dot inside the button boundary rather than as a conventional badge overlapping the icon's top-right corner. `top: 7, right: 8` places it to the right of the bell icon center but below the top edge — visually reads as a label, not a badge. | Move to `top: 4, right: 5` to match conventional badge positioning. |
| 8 | Accessibility — notifications button | Medium | The bell button has `aria-label="Notifications"` (line 164) but no `aria-live` region or accessible indication when `notifsUnread` changes. A screen reader user has no way to know a new notification arrived without focusing the button. | Add `aria-label={notifsUnread ? "Notifications, unread" : "Notifications"}` at `index.jsx:164` so the state is announced when the user navigates to it. |
| 9 | Accessibility — tab bar ARIA | High | The five tab `<button>` elements have no `role`, no `aria-selected`, and no wrapping `role="tablist"`. This is a WCAG 2.1 Level A failure (4.1.2 Name, Role, Value) for a navigation pattern. Screen readers will announce them as generic buttons with no indication of selection state. | Wrap the tab row div at `index.jsx:277` in a `<nav aria-label="Main navigation">`, add `aria-current={active ? 'page' : undefined}` (or `role="tab"` + `aria-selected`) to each button. |
| 10 | Interaction states — no loading gate between tabs | Low | Tapping a tab while its data is still loading (e.g. tapping Connect while `nearbyLoading=true`) immediately renders the tab with skeleton states. This is correct behavior — but there is no visual feedback that the tab switch happened (the top header updates, but the active indicator and label change are subtle). A brief `fadeIn` on the tab content container would sharpen the perceived switch. | Wrap each `{tab === '...' && <…/>}` in a keyed container with `animation: 'fadeIn 0.15s ease-out'`. |
| 11 | Semantic palette — notification dot color | Low | The unread dot uses `C.coralDeep` (line 179). The coral semantic is "1:1 intimacy / profile / CTA." A notification badge is a system signal, not a 1:1 interaction. Consider `C.saffron` (premium highlight / key callout) for a cleaner semantic read. This is a low-priority judgment call. | Change to `C.saffron` at `index.jsx:179`. |
| 12 | Typography — header font-size | Low | The shared top header renders the tab title at `fontSize: 26` (line 152) matching the Home wordmark. For non-Home tabs (Connect, Explore, My Hub, My Profile) a 26px Fraunces title is heavy-handed for a simple header label. A standard 20–22px would feel more like a section header and less like a landing splash. | Add a `isHome ? 26 : 21` conditional to `fontSize` at `index.jsx:153`. |

---

## Key issues (prose, ranked)

**1. Missing ARIA tab semantics (Critical/High, #9).** The bottom nav is functionally a tab list but has no `role="tablist"`, no `aria-selected`, and no `aria-current`. VoiceOver and TalkBack users hear five anonymous buttons. This is a Level A WCAG failure on the app's primary navigation surface — the highest-traffic element in the entire product. Fix: `<nav aria-label="Main">` wrapper, `aria-current="page"` on the active button, at a minimum.

**2. Safe-area inset not applied to tab bar (High, #3).** `pb-6` is a static 24px proxy. On iPhone 14 Pro and later the home indicator requires 34px clearance; on older devices 24px wastes screen space. Without `env(safe-area-inset-bottom)` the tab bar will be obscured or have awkward padding depending on the device. This is a layout invariant that affects every user on a modern iPhone.

**3. Hardcoded `#fff` on the tab bar background (High, #1).** `index.jsx:275` uses a literal `'#fff'` rather than `C.paper`. This breaks the design-system contract ("never hardcode hex") and means any future palette adjustment to `C.paper` will silently miss the most-seen element in the app.

---

## Recommended redesign (annotated wireframe)

```
┌─────────────────────────────────┐
│  StatusBar                      │
├─────────────────────────────────┤
│  Go Mama*          [Bell○]      │  ← header unchanged on Home
│  Connect           [Bell○]      │  ← fontSize 21 (not 26) on other tabs
├─────────────────────────────────┤
│                                 │
│   <Active Tab, fadeIn 0.15s>    │  ← keyed container, fade on tab change
│                                 │
├─────────────────────────────────┤
│  <nav aria-label="Main">        │
│  [▬─Home▬][Connect][Explore]    │  ← active pill: 3px h / 24px w
│  [My Hub][Profile]              │  ← aria-current="page" on active
│  </nav>                         │
│  background: C.paper (token)    │
│  paddingBottom: calc(1.5rem +   │
│    env(safe-area-inset-bottom)) │
└─────────────────────────────────┘
  * notification dot: top:4 right:5; aria-label includes "unread" when ●
  * each button: minHeight: 44
```

---

## Before / after comparison (what changes visually)

| Element | Before | After |
|---------|--------|-------|
| Tab bar background | `'#fff'` literal | `C.paper` token |
| Tab bar bottom padding | `pb-6` (static 24px) | `calc(1.5rem + env(safe-area-inset-bottom))` |
| Tab buttons | No ARIA | `aria-current="page"` on active; nav wrapper |
| Active indicator | 2.5px × 20px | 3px × 24px |
| Notification badge position | `top:7 right:8` | `top:4 right:5` |
| Bell aria-label | always "Notifications" | "Notifications, unread" when dot is shown |
| Non-Home header font-size | 26px | 21px |
| Tab button min tap area | implicit (~44px with padding) | explicit `minHeight: 44` |

---

## Implementation notes

- `index.jsx:275` — change `background: '#fff'` to `background: C.paper`; change `pb-6` class to a style with `paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))'`.
- `index.jsx:277` — wrap the flex row in `<nav aria-label="Main navigation" className="flex justify-between items-center">`.
- `index.jsx:283` — add `style={{ minHeight: 44 }}` to the tab `<button>`.
- `index.jsx:283` — add `aria-current={active ? 'page' : undefined}` to the tab `<button>`.
- `index.jsx:288–289` — `width: 24, height: 3`.
- `index.jsx:153` — `fontSize: isHome ? 26 : 21`.
- `index.jsx:164` — `aria-label={notifsUnread ? 'Notifications, unread' : 'Notifications'}`.
- `index.jsx:177` — `top: 4, right: 5`.

---

## Acceptance criteria

- [ ] Tab bar background renders `C.paper` (no literal `#fff` in the file).
- [ ] Tab bar bottom padding uses `env(safe-area-inset-bottom)` so it is flush on iPhone 14 Pro and not clipped on iPhone SE.
- [ ] VoiceOver on iOS announces the active tab differently from inactive tabs (via `aria-current` or `aria-selected`).
- [ ] Each tab button tap target is at minimum 44×44 pt (verify with Xcode Accessibility Inspector or equivalent).
- [ ] The notification bell announces "Notifications, unread" when the unread dot is visible.
- [ ] Non-Home tab headers render at ≤22px, not 26px.
- [ ] No hardcoded hex values remain in `index.jsx`.
