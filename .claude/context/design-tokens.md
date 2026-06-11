# Design tokens

All tokens are defined as the `C` object in `src/theme.js` (named export). **Always reference `C.tokenName` — never hardcode hex values.**

The palette was ported from the GoMama Expo prototype on 2026-06-01 (see
`docs/superpowers/specs/2026-06-01-coral-navy-palette-design.md`).
Existing token names are preserved so all `C.tokenName` references inherit
the new palette without a rename.

## Color palette

| Token | Hex | Usage |
|---|---|---|
| `C.cream` | `#FBF5EF` | Page background |
| `C.creamSoft` / `C.blush` | `#FCEEEE` | Slightly pink-warm surfaces, sheets |
| `C.paper` | `#FFFFFF` | Cards (lightest surface) |
| `C.lilac` | `#EDE4F4` | Secondary chip background |
| `C.peach` | `#FDE2D4` | Tertiary chip background |
| `C.ink` / `C.navy` | `#1B2A4E` | Body text, strong emphasis |
| `C.inkSoft` / `C.navySoft` | `#3A4A6D` | Secondary text |
| `C.inkMuted` / `C.muted` | `#7C8499` | Tertiary text |
| `C.terracotta` / `C.coral` | `#E96B7D` | **Primary accent** — intimacy, 1:1, primary CTAs |
| `C.terracottaDark` / `C.coralDeep` | `#D6446A` | Pressed/hover, gradient end |
| `C.coralSoft` | `#F8D7DD` | Coral pill backgrounds, soft accents |
| `C.sage` | `#E2EBD8` | Light sage chip background (community) |
| `C.sageDark` | `#5E7A3B` | Readable sage foreground |
| `C.saffron` | `#D9A441` | Highlight, premium pop |
| `C.rose` | `#FDE2D4` | Atmospheric wash (same as peach) |
| `C.divider` / `C.line` | `#EFE5E0` | Hairlines |
| `C.premium` | `#1B1517` | Premium card backgrounds |

## Semantic mapping

- **Coral / terracotta = 1:1 intimacy.** Use it for one-mom interactions: profile cards, "shared ground" reveals, primary CTAs, the italic-`a` of the wordmark.
- **Sage = community.** Use it for groups: events, multi-mom chats, RSVP buttons, the "verified mom" success state.
- **Saffron = premium / highlight.** Use it sparingly for Plus features and key callouts.
- **Lilac / peach** are decorative chip backgrounds on the Landing screen's 4-feature grid.

## Typography

| Family | Use |
|---|---|
| `Fraunces` | Display, serif headlines, sometimes italic for emphasis |
| `Albert Sans` | UI, body, captions, eyebrows |

Loaded via Google Fonts `@import` at the top of `src/index.css`.

## Animations

Defined as CSS keyframes in `src/index.css`:

- `slideUp`
- `fadeIn`
- `fadeInUp`
- `popBadge`
- `shimmer` — light-band sweep for skeleton loaders (see `components/Skeleton.jsx`)

Used inline as `style={{ animation: '...' }}`.

Skeleton loaders use the neutral tokens `C.skeleton` (base) and
`C.skeletonSheen` (the sweeping highlight) — never coral. The `Skeleton`
primitive (`src/components/Skeleton.jsx`) is composed into shape-matched
placeholders inside each content tab so live data swaps in with no layout shift.

## Italic + color = emphasis

The brand's signature typographic device:

```jsx
<span style={{ fontStyle: 'italic', color: C.coral, fontWeight: 500 }}>word</span>
```

Used to highlight one key word per headline (`your village`, `friend,`, `you`, italic-`a` in `Mama`). Always italic + colored together — never just italic, never just colored.
