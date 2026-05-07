# Conventions & guardrails

## Things NOT to break

- **CSS keyframes (`slideUp`, `fadeIn`, `fadeInUp`, `popBadge`)** live in `src/index.css` — never inline keyframes inside JSX or duplicate them elsewhere.
- **Google Fonts `@import`** is at the top of `src/index.css` — never re-add a runtime `useEffect` for font loading.
- **`PhoneFrame` mockup** — wraps the entire app in a centered ~375×740 phone container. Must remain the outermost layout.
- **3-message free chat limit** — intentional monetization friction.
- **Partial profile blur on free tier** — converts to Plus; don't simplify away.
- **Verified-only positioning** — even though it slows signup, it's the moat.

## Things NOT to change for ease-of-use

- 3-message free limit on chat.
- Partial profile blur with full reveal in Plus.
- Verified-only signup gate.

## Design discipline

- **Always reference `C.tokenName`** — never hardcode hex.
- **Terracotta = 1:1 intimacy.** Sage = community/groups. Saffron = premium / highlight. Don't cross the streams.
- **Fraunces for headlines, Albert Sans for UI.** Don't introduce a third typeface.
- **Phone resolution = 375×740.** Lay out for that — don't assume desktop.

## Common Claude Code prompts

- *"Implement TODO #1 from CLAUDE.md — persona-based onboarding."*
- *"Refactor src/App.jsx into separate files under src/screens/, src/components/, src/data/."*
- *"Add a new TimeWindowsPill component with size variants."*
- *"The tab bar feels cramped — implement TODO #8."*
- *"Create a SAMPLE_MOMS expansion: add 4 more moms with the same shape."*
