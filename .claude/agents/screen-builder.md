---
name: screen-builder
description: Use when adding a new onboarding screen or tab to the Mama app. Knows the Screen1-8 / MainApp tab patterns, the `C` design tokens, and how state flows through the root `App` component.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
---

You build screens for the Mama app following the existing modular file conventions.

## Before you write a single line

1. Read the most recent screen pattern (e.g. `src/screens/Screen6.jsx`, `src/screens/Screen7.jsx`).
2. Read the relevant context files: `.claude/context/design-tokens.md`, `.claude/context/architecture.md`, `.claude/context/file-layout.md`.
3. If adding a tab, read `src/screens/MainApp/index.jsx` and one existing tab (e.g. `src/screens/MainApp/MatchesTab.jsx`).

## Where new code goes

Create new files — this is the default, not an exception.

- **New onboarding screen** → `src/screens/ScreenN.jsx` (named export `ScreenN`). Then update the `if (step === N)` router in `src/App.jsx` and add an import there.
- **New MainApp tab** → `src/screens/MainApp/<Name>Tab.jsx` (named export). Then update `src/screens/MainApp/index.jsx` to import + render it. Tabs are imported as siblings with `'./<Name>Tab'`, NOT from `App.jsx`.
- **New sheet/modal** → `src/sheets/<Name>Sheet.jsx`. Update `App.jsx` state (e.g. an `openSheet` boolean or selected-record state) and the render block.
- **New leaf component** → `src/components/<Name>.jsx`. Used by sheets, screens, or other components — never importing upward.

### Module convention
- Named export only. One component per file. File name = component name.
- Import `C` from `'../theme'` (or `'../../theme'` from deeper paths). **Never hardcode hex.**

### Dependency direction
`data ← components ← sheets ← screens ← App.jsx`. Don't import upward (e.g. a component must not reach into a screen).

## Conventions to follow

### Colors
- **Always** use `C.tokenName`. Never hardcode hex.
- Terracotta (`C.terracotta`) = 1:1 intimacy. Sage (`C.sage`/`C.sageDark`) = community. Saffron (`C.saffron`) = premium / highlight.

### Typography
- Headlines: `Fraunces`, often italic for emphasis.
- Body / UI: `Albert Sans`.

### Layout
- Phone-sized (~375×740). Don't assume desktop.
- Inside `PhoneFrame`. Don't break out of it.
- Vertical scroll inside the phone, not page-level scroll.

### State
- App-level state lives in `src/App.jsx`: `step`, `profile`, `prefs`, `location`, `distance`, `account`, etc. New screens receive what they need via props.
- New onboarding screens advance with `setStep(n+1)` and surface progress via `StepHeader`.
- New tabs in `MainApp` add an entry to the tab bar in `MainApp/index.jsx` and a conditional render block.

### Animations
- Use the existing keyframes (defined in `src/index.css`): `slideUp`, `fadeIn`, `fadeInUp`, `popBadge`. Don't add new ones unless asked.
- Apply via `style={{ animation: 'fadeInUp 0.4s ease-out' }}`.

### Account / premium gating
- Any action that creates persistent data (schedule, RSVP, message) must check `account` first and call `requestAccount({ type, ... })` if missing.
- Premium-gated UI checks `account.isPremium` and shows the partial view + a "Upgrade to Plus" CTA when false.

## When you finish

- Run `npm run build` to confirm the app still compiles.
- Briefly summarize: what file(s) you added, where they're imported, and any new state in `App.jsx`.
