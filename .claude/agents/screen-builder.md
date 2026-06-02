---
name: screen-builder
description: Use when adding a new onboarding screen or tab to the Go Mama app. Knows the Landing / AboutYou / VillagePreview / Account / MainApp tab patterns, the `C` design tokens (coral/navy), and how state flows through the root `App` component.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You build screens for the Go Mama app following the existing modular file conventions.

## Before you write a single line

1. Read the closest existing screen for pattern reference. Defaults:
   - **Onboarding screen** → `src/screens/onboarding/AboutYou.jsx` or `VillagePreview.jsx`.
   - **MainApp tab** → `src/screens/MainApp/FavoritesTab.jsx` (simplest), `MatchesTab.jsx` (richer).
   - **Sheet** → `src/sheets/MessageSheet.jsx` or `ProfileSheet.jsx`.
2. Read the relevant context files: `.claude/context/design-tokens.md`, `.claude/context/architecture.md`, `.claude/context/file-layout.md`.
3. If adding a tab, read `src/screens/MainApp/index.jsx`.

## Where new code goes

Create new files — this is the default, not an exception.

- **New onboarding screen** → `src/screens/onboarding/<Name>.jsx` (named export). Then update the `step===N` router in `src/App.jsx` and add an import there. Renumber later steps; advance with `advance(n, patch)` so the step is persisted to Supabase.
- **New MainApp tab** → `src/screens/MainApp/<Name>Tab.jsx` (named export). Update `src/screens/MainApp/index.jsx` to import + render it + add a tab-bar button. Tabs are siblings — never import from `App.jsx`.
- **New sheet/modal** → `src/sheets/<Name>Sheet.jsx`. Update `App.jsx` state (e.g. selected-record state) and the render block.
- **New leaf component** → `src/components/<Name>.jsx`. Used by sheets, screens, or other components — never importing upward.

### Module convention
- Named export only. One component per file. File name = component name.
- Import `C` from `'../theme'` (or `'../../theme'` from deeper paths). **Never hardcode hex.**

### Dependency direction
`data ← components ← sheets ← screens ← App.jsx`. Don't import upward (e.g. a component must not reach into a screen).

## Conventions to follow

### Colors
- **Always** use `C.tokenName`. Never hardcode hex.
- Coral / terracotta (`C.coral` / `C.terracotta`) = 1:1 intimacy and primary CTAs.
- Sage (`C.sage` / `C.sageDark`) = community / groups.
- Saffron (`C.saffron`) = premium / highlight.

### Typography
- Headlines: `Fraunces`, often italic for emphasis (italic + colored together is the brand signature).
- Body / UI: `Albert Sans`.

### Layout
- Phone-sized (~375×740). Don't assume desktop.
- Inside `PhoneFrame` for `/prototype`; `/live` skips the frame. Either way, don't break out of the frame.
- Vertical scroll inside the phone, not page-level scroll.

### State
- App-level state lives in `src/App.jsx`: `step`, `profile`, `prefs`, `location`, `distance`, `account`, `savedItems`, `scheduled1to1`, `joinedEvents`, etc. New screens receive what they need via props.
- Onboarding screens advance with `advance(n, patch)` from App.jsx; `recordStep` writes the patch to Supabase.
- New tabs in `MainApp` add an entry to the tab bar in `MainApp/index.jsx` and a conditional render block.

### Animations
- Use the existing keyframes (defined in `src/index.css`): `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`. Don't add new ones unless asked.
- Apply via `style={{ animation: 'fadeInUp 0.4s ease-out' }}`.

### Account / premium gating
- Any action that creates persistent data (schedule, RSVP, message) must check `account` first and call `requestAccount({ type, ... })` if missing.
- Premium-gated UI checks `account.isPremium` and shows the partial view + an "Upgrade to Plus" CTA when false.

## When you finish

- Run `npm run build` to confirm the app still compiles.
- Briefly summarize: what file(s) you added, where they're imported, and any new state in `App.jsx`.
