# Design tokens

All tokens are defined as the `C` object in `src/theme.js` (named export). **Always reference `C.tokenName` — never hardcode hex values.**

## Color palette

| Token | Hex | Usage |
|---|---|---|
| `C.cream` | `#F6EFE2` | Page background |
| `C.creamSoft` | `#EFE6D2` | Slightly darker — surfaces, sheets |
| `C.paper` | `#FAF5EA` | Lightest — cards |
| `C.ink` | `#2A1E22` | Body text, strong emphasis |
| `C.inkSoft` | `#5A4B4F` | Secondary text |
| `C.inkMuted` | `#8E7A7E` | Tertiary text |
| `C.divider` | `#E2D9C7` | Hairlines |
| `C.terracotta` | `#C8553D` | **Primary accent** — intimacy, 1:1 |
| `C.sage` | `#A8BCA0` | Secondary accent — community |
| `C.sageDark` | `#7E9678` | Darker sage — group emphasis |
| `C.saffron` | `#D9A441` | Tertiary accent — highlights, premium pop |
| `C.rose` | `#E8B4A0` | Atmospheric wash |
| `C.premium` | (gradient) | Premium card backgrounds |

## Semantic mapping

- **Terracotta = 1:1 intimacy.** Use it for one-mom interactions: profile cards, "shared ground" reveals, schedule meetup CTAs.
- **Sage = community.** Use it for groups: events, multi-mom chats, RSVP buttons.
- **Saffron = premium / highlight.** Use it sparingly for Plus features and key callouts.

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

Used inline as `style={{ animation: '...' }}`.
