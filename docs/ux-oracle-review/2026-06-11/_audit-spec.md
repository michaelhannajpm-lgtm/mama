# Audit spec (shared) — read before writing any audit file

This is the shared contract for the 2026-06-11 non-admin UX/UI audit. Every per-screen
and per-component file must follow it. Output lives under
`docs/ux-oracle-review/2026-06-11/`.

## Hard constraints
- **Do NOT modify any production app code** under `src/` (read-only audit). Only write
  markdown files under `docs/ux-oracle-review/2026-06-11/`.
- **No real screenshots are possible** in this environment (no Playwright/Puppeteer; the
  Vite-only dev server does not serve live `api/*` data, so screens would render empty).
  Replace "before screenshots" with a faithful **ASCII/markdown wireframe** reconstructed
  from the actual JSX, and replace "after visuals" with an **annotated markdown/ASCII
  wireframe** of the redesign. Reference real code with `file.jsx:line`.
- Ground EVERY finding in the actual code. No generic design advice. Cite `file:line`.

## Design system (the rubric to audit against)
Tokens are the `C` object in `src/theme.js` (coral/navy editorial). Key rules:
- **Never hardcode hex** — always `C.tokenName`. Flag any literal hex in JSX as a finding.
- Semantics: **coral/terracotta = 1:1 intimacy** (primary CTAs, profile, "shared ground");
  **sage = community/groups** (events, RSVP, multi-mom, verified success);
  **saffron = premium/highlight** (Plus, sparingly).
- Typography: **Fraunces** (serif display/headlines, italic for one emphasis word),
  **Albert Sans** (UI/body/eyebrows). Two-typeface discipline. The signature device is
  *italic + coral together* on one word per headline (never italic alone, never color alone).
- **Three-state loading contract:** every API-backed surface must render
  loading skeleton → data → warm empty state, with the header/container always visible and
  no layout shift. Skeletons use `C.skeleton`/`C.skeletonSheen` (never coral).
- Phone frame targets ~375×740; vertical scroll happens inside the frame; no `100vw/100vh`
  or fixed widths > 375 in phone UI; safe-area insets on phone viewports.
- Verification gate (orthogonal to Plus) blocks connect/RSVP/join for unverified moms.
- Premium: `account.isPremium` drives partial-vs-full; never paywall the verification gate
  or the free "shared ground" card; DM free limit default 3.

## Severity scale
- **Critical** — broken/blocking, inaccessible, data-loss, or violates a core brand/safety rule.
- **High** — significant usability/conversion/accessibility harm; should fix before next release.
- **Medium** — noticeable friction or inconsistency; fix soon.
- **Low** — polish / nice-to-have.

## Per-SCREEN file template (`screens/<name>.md`)
```
# <Screen name> — <route or entry point>

- **File:** `src/.../X.jsx` (N lines)
- **Purpose:** …
- **Entry / when shown:** …
- **Related components/sheets:** …
- **Data dependencies:** (live api/* fetches + loading flags, or static)

## Current state (wireframe)
<ASCII/markdown wireframe reconstructed from the JSX>

## Audit findings
Table for each criterion that has a finding:
| # | Area | Severity | Finding (with `file:line`) | Recommendation |
Cover: visual hierarchy, layout & spacing, responsiveness, navigation clarity,
content clarity, CTAs, form usability, loading/empty/error/success states,
accessibility, color contrast, typography, component consistency, interaction states,
trust signals, perceived performance, mobile ergonomics, conversion.

## Key issues (prose, ranked)

## Recommended redesign
<annotated after-wireframe>

## Before / after comparison (what changes visually)

## Implementation notes
<concrete: which file/line, which token, which component to reuse>

## Acceptance criteria
<checklist an engineer can verify against>
```

## Per-COMPONENT file template (`components/<name>.md`)
```
# <Component> — `src/components/X.jsx`

- **Props / API:** …
- **Used by:** (grep — list call sites)
- **Purpose:** …

## Audit findings
| # | Area | Severity | Finding (`file:line`) | Recommendation |
Cover: consistent behavior, responsive behavior, accessibility, props clarity,
styling consistency (token usage), duplicate/overlapping components, interaction states.

## Recommended improvements
## Implementation notes
## Acceptance criteria
```

Keep each file self-contained and skimmable. Use the severity words verbatim.
