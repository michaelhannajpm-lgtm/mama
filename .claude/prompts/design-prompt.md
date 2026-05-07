You are helping me design "Mama" — a React prototype for a mom-friendship matching app. Here is everything you need to know to give me high-quality design feedback and proposals.

# Positioning

- **Anti-Tinder.** The core value is *real-life meetups*, not endless chat.
- **Verified-only.** Slow, intentional signup — the friction is the moat.
- **Editorial-warm aesthetic.** Magazine-cover energy, not feed/app energy.
- **Audience:** moms looking for real-life friendship with other moms — not chat pen-pals, not dating-app-style swiping.

# Stack & constraints

- Vite + React 18, Tailwind, lucide-react icons
- Phone-first prototype: design for **375×740** inside a `PhoneFrame` mockup
- No desktop layout — everything lives in that phone frame

# Design tokens (the `C` object)

**Colors — always reference, never hardcode:**

| Token | Hex | Usage |
|---|---|---|
| `C.cream` | `#F6EFE2` | Page background |
| `C.creamSoft` | `#EFE6D2` | Surfaces, sheets |
| `C.paper` | `#FAF5EA` | Cards (lightest) |
| `C.ink` | `#2A1E22` | Body text |
| `C.inkSoft` | `#5A4B4F` | Secondary text |
| `C.inkMuted` | `#8E7A7E` | Tertiary text |
| `C.divider` | `#E2D9C7` | Hairlines |
| `C.terracotta` | `#C8553D` | **1:1 intimacy** accent |
| `C.sage` | `#A8BCA0` | **Community/groups** accent |
| `C.sageDark` | `#7E9678` | Darker sage emphasis |
| `C.saffron` | `#D9A441` | **Premium / highlight** (sparingly) |
| `C.rose` | `#E8B4A0` | Atmospheric wash |

**Semantic palette discipline (don't cross the streams):**
- Terracotta = one-mom interactions (profile cards, "shared ground", schedule meetup CTAs)
- Sage = group/community (events, multi-mom chats, RSVP)
- Saffron = premium-only or rare highlight

**Typography:**
- `Fraunces` — display, serif headlines, sometimes italic for emphasis
- `Albert Sans` — UI, body, captions, eyebrows
- No third typeface

**Animations** (CSS keyframes): `slideUp`, `fadeIn`, `fadeInUp`

# App structure

**Onboarding flow:** Splash → Screen1 → Screen2 → … → Screen8 → MainApp

**MainApp has 5 tabs:**
1. Calendar — scheduled meetups + joined events
2. Places — curated meetup spots + top picks
3. Events — group meetups, RSVP-able
4. Matches — recommended moms, schedulable / messageable
5. You — profile, preferences, premium

**Sheets/modals:** `ScheduleSheet`, `ProfileSheet`, `MessageSheet`, `CreateAccountSheet`, `PremiumSheet`

# Premium model (Plus, $7.99/mo)

| Feature | Free | Plus |
|---|---|---|
| Receive matches | ✓ | ✓ |
| Schedule 1:1 meetups | ✓ | ✓ |
| RSVP to groups | ✓ | ✓ |
| Message a match | **3 messages per mom** | Unlimited |
| Profile depth | Partial: name + initial, broad kids, 2 values, 2 interests | Full bio, all values/interests, exact ages, free slots, history |
| Group attendees | First 3 + count | All + DM access |
| Group chat | Read | Read + post |

**Conversion levers — do not weaken:**
- 3-message free chat limit (intentional friction)
- Partial profile blur on free tier (drives upgrade)
- "Shared ground" terracotta card stays free on every profile (drives both signup AND upgrade — never paywall it)
- Verified-only signup gate

# Account-gated actions pattern

Free actions (auto-schedule, pick time, join group) check `if (!account)` first → fire `requestAccount({ type, mom?, slot?, event? })` → opens `CreateAccountSheet` → on completion replays the queued action.

# What I want from you

When I ask you to design something:
1. Respect the editorial-warm tone — magazine, not SaaS dashboard.
2. Use the semantic palette correctly (terracotta = 1:1, sage = group, saffron = premium).
3. Design for the 375×740 phone frame.
4. Don't propose changes that weaken the conversion levers above.
5. When proposing copy, lean warm + human + specific (e.g. "Mon 9 AM with Sara K." beats "Schedule meetup").
6. Reference component patterns that already exist (Sheets, Pills, PrimaryBtn, PhoneFrame) before inventing new ones.

Ready when you are — what should we design?
