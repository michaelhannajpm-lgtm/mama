You are helping me design "Go Mama" — a React prototype for a mom-friendship matching app. Here is everything you need to know to give me high-quality design feedback and proposals.

# Positioning

- **Anti-Tinder.** The core value is *real-life meetups*, not endless chat.
- **Verified-only.** Two-signal gate: Instagram or Facebook + a real photo. The friction is the moat.
- **Coral + navy editorial aesthetic.** Hero-image landing, magazine-cover energy, not feed/app energy.
- **Audience:** moms looking for real-life friendship with other moms — not chat pen-pals, not dating-app-style swiping.

# Stack & constraints

- Vite + React 18, Tailwind, lucide-react icons
- Supabase Auth + Postgres backing the prototype
- Phone-first prototype: design for **375×740** inside a `PhoneFrame` mockup
- No desktop layout — everything lives in that phone frame

# Design tokens (the `C` object)

**Colors — always reference, never hardcode** (palette ported from the GoMama Expo prototype on 2026-06-01):

| Token | Hex | Usage |
|---|---|---|
| `C.cream` | `#FBF5EF` | Page background |
| `C.creamSoft` / `C.blush` | `#FCEEEE` | Surfaces, sheets |
| `C.paper` | `#FFFFFF` | Cards (lightest) |
| `C.lilac` | `#EDE4F4` | Secondary chip bg |
| `C.peach` | `#FDE2D4` | Tertiary chip bg |
| `C.ink` / `C.navy` | `#1B2A4E` | Body text |
| `C.inkSoft` / `C.navySoft` | `#3A4A6D` | Secondary text |
| `C.inkMuted` / `C.muted` | `#7C8499` | Tertiary text |
| `C.divider` / `C.line` | `#EFE5E0` | Hairlines |
| `C.terracotta` / `C.coral` | `#E96B7D` | **1:1 intimacy** accent + primary CTA |
| `C.terracottaDark` / `C.coralDeep` | `#D6446A` | Gradient end / pressed state |
| `C.coralSoft` | `#F8D7DD` | Coral pill bg |
| `C.sage` | `#E2EBD8` | **Community/groups** chip bg |
| `C.sageDark` | `#5E7A3B` | Readable sage foreground |
| `C.saffron` | `#D9A441` | **Premium / highlight** (sparingly) |
| `C.rose` | `#FDE2D4` | Atmospheric wash (= peach) |

**Semantic palette discipline (don't cross the streams):**
- Coral / terracotta = one-mom interactions (profile cards, "shared ground", schedule meetup CTAs)
- Sage = group/community (events, multi-mom chats, RSVP, verified-mom badge)
- Saffron = premium-only or rare highlight
- Lilac / peach = decorative chip backgrounds on Landing's feature grid

**Typography:**

- `Fraunces` — display serif. Headlines, brand wordmark, emotional body. Italic + colored together is the brand signature.
- `Albert Sans` — UI sans. Labels, captions, buttons, tracked-uppercase microtext.

# Onboarding flow (4 screens — ported from GoMama)

```
Landing (hero image + 4-feature grid + "Let's Go Mama")
   ↓
AboutYou (single-screen chip picker: Tampa area + kid ages + mom type + days + interests)
   ↓
VillagePreview (3 sections of bookmarkable preview cards: Mom Matches / Group Meetups / Activities for kids)
   ↓
Account (Supabase Auth — Apple / Google / email magic link)
   ↓
MainApp
```

# MainApp (4 tabs)

```
Meetups · Places · Favorites · Profile
```

- **Meetups** has a Moms/Groups toggle inside (single tab, both modes).
- **Favorites** lists bookmarked items (meetups, places, moms).
- **Profile** includes a verification panel (Instagram + Facebook + real photo) and an Upcoming section (scheduled 1:1s + joined groups). The old Calendar tab folded in here.

# Brand voice

- Editorial-warm. Short, declarative sentences. Italic Fraunces with a coral key word for emphasis.
- Honest about loneliness, optimistic about connection. Never preachy.
- Schedule-first. Concrete time/place language preferred over vague "let's meet up."
- Anti-corporate. No "we believe…" or "join our community." Speak to *one mother* at a time.

# What never changes

1. **3-message free chat limit per mom** — intentional friction (tightened from 25 on 2026-06-08).
2. **Partial profile blur with full reveal in Plus.**
3. **Verified-only positioning** — social + photo.
4. **"Shared ground" coral card stays free** on every profile.
5. **`PhoneFrame`** as the outermost layout for `/prototype`.
6. **Italic + colored emphasis** — the brand's typographic signature. Never just italic, never just colored.
