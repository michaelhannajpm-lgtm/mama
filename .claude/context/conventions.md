# Conventions & guardrails

## Things NOT to break

- **CSS keyframes (`slideUp`, `fadeIn`, `fadeInUp`, `popBadge`)** live in `src/index.css` — never inline keyframes inside JSX or duplicate them elsewhere.
- **Google Fonts `@import`** is at the top of `src/index.css` — never re-add a runtime `useEffect` for font loading.
- **`PhoneFrame`** — wraps the `/prototype` app in a centered ~375×740 phone container. `/live` skips the frame for embedding. Must remain the outermost layout for `/prototype`.
- **25-message free chat limit** — intentional monetization friction.
- **Partial profile blur on free tier** — converts to Plus; don't simplify away.
- **Verified-only positioning** — Instagram or Facebook + a real photo. Even though it slows signup, it's the moat.

## Things NOT to change for ease-of-use

- 25-message free limit on chat.
- Partial profile blur with full reveal in Plus.
- Verified-only signup gate (social + real photo).

## Design discipline

- **Always reference `C.tokenName`** — never hardcode hex.
- **Coral / terracotta = 1:1 intimacy.** Sage = community/groups. Saffron = premium / highlight. Don't cross the streams. (Token names `terracotta` / `sage` / `saffron` still map to the active palette — see `.claude/context/design-tokens.md`.)
- **Fraunces for headlines, Albert Sans for UI.** Don't introduce a third typeface.
- **Phone resolution = 375×740.** Lay out for that — don't assume desktop.

## Common Claude Code prompts

- *"Add a new MainApp tab"* — see `.claude/agents/screen-builder.md`.
- *"Audit my UI change for design-token compliance"* — see `.claude/agents/design-reviewer.md`.
- *"Add 4 more moms to SAMPLE_MOMS"* — see `.claude/agents/data-extender.md`.
