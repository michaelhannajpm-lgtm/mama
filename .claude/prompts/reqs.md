# Mama — Complete Product Requirements Document

> **Editorial-warm React prototype for a mom-friendship matching app.**
> Anti-Tinder positioning: the value is *real meetups*, not endless chat. Schedule-first product, verified moms only, designed for the actual constraints of motherhood.

---

## 0. Project meta

- **Name:** Mama
- **Tagline:** *"Your kids need friends, and so do you."*
- **Promise:** Real meetups, made for mom's busy calendar.
- **Tech stack:** React 18 + Vite + Tailwind CSS + lucide-react + Google Fonts (Fraunces + Albert Sans)
- **Rendering target:** Phone-frame mock (~375×740px) inside a centered desktop container. Mobile-first. All UI uses `h-full` inside that frame.

---

## 1. Brand identity

### 1.1 Logo — `MamaLogo` component

A bold filled heart with a check mark inside.

**Symbolism:** Heart = friendship between moms. Check mark = scheduled / confirmed / "made it happen." Together: ***meetup confirmed***. Says the entire product value in one mark. Works at any size; distinct from every other dating/friendship app (Tinder = flame, Bumble = bee, Hinge = H, Peanut = P).

**Construction:**
- Default `size={32}`, props: `{ size, className, style }`
- ViewBox `100 100`
- Three SVG layers:
  1. `ellipse cx=50 cy=92 rx=22 ry=2.5 fill=ink opacity=0.1` — soft ground shadow
  2. Heart `path` — `fill=terracotta`, organic asymmetric curves
  3. Check mark `path` — `stroke=cream strokeWidth=8.5 strokeLinecap=round strokeLinejoin=round`, traces from inside-left to top-right

**Usage:** All sizes scale crisply. Used in Splash (20px), and recommended for app icon, You/Profile tab header, empty states, brand mark in any sheet header.

### 1.2 Wordmark

`Mama` in Fraunces serif. The **last `a`** is `fontStyle: italic`, `color: terracotta`, `fontWeight: 500`. The other letters: regular weight, ink color. Letter-spacing `-.03em` to `-.04em`.

In horizontal lockup with the logo, the wordmark sits to the right of the heart with a `gap-2` between them, both vertically baseline-aligned.

### 1.3 Decorative SVG components

- **`Sprig`** — sage leaf-on-stem motif, used as accent on Screen 2 and other onboarding eyebrows. ViewBox `60 60`. Three opacity-`.55` leaves on a sage centerline.
- **`Sun3`** — saffron sun with 12 rays, used decoratively in some onboarding screens.

### 1.4 Voice & tone

- **Editorial-warm.** Magazine sensibility — short, declarative sentences. Italic Fraunces for emotional inflection, terracotta highlight for the noun that matters.
- **Honest about loneliness, optimistic about connection.** Never preachy.
- **Schedule-first.** Concrete time/place language preferred over vague "let's meet up."
- **Anti-corporate.** No "we believe…" or "join our community." Speak to *one mother* at a time.

---

## 2. Color tokens — `C` object

Defined at the top of `App.jsx` and used inline via `style={{ color: C.x, background: C.y }}`. **Never use raw hex codes** in component code; always reference `C.<token>`.

| Token             | Hex       | Usage |
|-------------------|-----------|-------|
| `C.cream`         | `#F6EFE2` | Page background (default for the app) |
| `C.creamSoft`     | `#FBF6EC` | Sheet backgrounds, sub-surfaces, segmented-control inactive backgrounds |
| `C.paper`         | `#FFFEFA` | Card backgrounds (highest surface) |
| `C.ink`           | `#2A1E22` | Primary text, headlines, primary button bg (`variant=dark`) |
| `C.inkSoft`       | `#5C4A4F` | Secondary text |
| `C.inkMuted`      | `#8C7A7E` | Tertiary text, captions, disabled state, dot/divider opacity reference |
| `C.terracotta`    | `#C8553D` | **Primary accent**: 1:1 matches, intimacy, primary CTAs (`variant=terracotta`), italic-`a` of wordmark, heart icon, match % |
| `C.terracottaDark`| `#A8412C` | Pressed/hover state for terracotta elements (rarely used) |
| `C.sage`          | `#7E9678` | **Secondary accent**: community, groups, verified-mom badges |
| `C.sageDark`      | `#5E7A5A` | Stronger sage for emphasis |
| `C.saffron`       | `#D9A441` | Tertiary accent: highlights, premium pop, sparks of joy |
| `C.rose`          | `#E8B4A0` | Atmospheric wash only (top-right radial on Splash) |
| `C.divider`       | `#E8DECB` | Hairline borders on cards and sheets |
| `C.premium`       | `#1B1517` | Premium card backgrounds (very dark ink) |

### Color application rules
- Terracotta = "the personal, the intimate, the moment." Used on hearts, match percentages, primary CTAs, italic-a flourishes, "you" emphasis in copy.
- Sage = "the community, the others, the verified." Used on group badges, "friends" emphasis in copy, verified shield icons, group-meetup CTAs.
- Saffron = "the magic moment." Used sparingly — the highlight on the rare match, shared time-slot pills, premium-tier accents.
- Rose = atmospheric only. Never used for text or borders.
- Cream tones are layered (cream → creamSoft → paper) for surface depth without using shadow alone.

---

## 3. Typography system

Loaded via Google Fonts in `<head>` at runtime (in App's `useEffect`):
- `Fraunces:opsz,wght@9..144,400;9..144,500;9..144,500i;9..144,400i`
- `Albert Sans:wght@400;500;600;700`

### 3.1 Font roles

| Family       | Role | Used for |
|--------------|------|----------|
| **Fraunces** | Display serif | Headlines, brand wordmark, emotional/poetic body (italic), large numbers in stats |
| **Albert Sans** | Body sans | UI labels, captions, eyebrows, button labels, tracked-uppercase microtext |

### 3.2 Type scale (used across the app)

These sizes are pixel-specific and used as-is in inline `style={{ fontSize: 13 }}`. There is **no** Tailwind text-class system for headings — sizes are explicit per element.

| Size | Family/style | Use |
|------|--------------|-----|
| 38px | Fraunces 500, letterSpacing -.04em | Splash stat numbers (the big 9, 7) |
| 32px | Fraunces 400 | Splash stat numbers (current variant), large screen titles |
| 28px | Fraunces 400 italic | Tab section titles ("Your *matches*") |
| 22px | Fraunces 400 | Splash wordmark |
| 16-22px | Fraunces 400-500 | Card heroes, sheet titles |
| 14-15px | Fraunces 500 / italic 400 | Section headlines inside cards |
| 13-13.5px | Fraunces 500 / italic 400 | Body emphasis, marketing line, empathy quote |
| 12-13.5px | Fraunces italic 400 | Tagline, "of 10 moms" labels |
| 11-12px | Albert Sans 500-600 | Body text, UI labels, secondary info |
| 10-11px | Albert Sans 600 | Captions, distance/kids meta lines |
| 9-10.5px | Albert Sans 600-700 tracking-[.16em-.2em] uppercase | Eyebrows, step labels, market-study attribution |
| 8.5-9px | Albert Sans 700 tracking-[.18em] uppercase | Smallest microcaps (badges, tiny labels) |

### 3.3 Italic + color = emphasis
The single most-used typographic device:
```jsx
<span style={{ fontStyle: 'italic', color: C.terracotta, fontWeight: 500 }}>word</span>
```
Used to highlight one key word in a sentence (`Your matches`, `tailored`, `actually meet`, italic-`a` in `Mama`). **Always italic + colored together** — never just italic, never just colored. This is the brand's signature.

### 3.4 Letter spacing
- Headlines / display: `letterSpacing: -.02em` to `-.04em` (tight)
- Body: `-.005em` to `-.01em` (slight)
- Uppercase labels: `tracking-[.16em]` to `tracking-[.32em]` (loose)

---

## 4. Layout primitives

### 4.1 `StepHeader`
- Used on all onboarding screens (Screen2 through AccountScreen)
- Three regions: back button (left), progress dots (center), skip (right)
- Props: `step` (0-indexed), `total`, `onBack`, `onSkip`
- Back button is **disabled** (transparent / no-op) when `step === 0`
- Progress dots: array of `total` `Dot` components, the one at `index === step` is filled
- Skip text: `"Skip"` for all steps except the last; `""` when `step === total - 1`

### 4.2 `Dot`
Tiny round indicator used by StepHeader. Filled when `on={true}` (terracotta), hollow otherwise (divider color).

### 4.3 `Pill`
Generic touchable pill button:
- Active state: terracotta bg + white text + shadow lift
- Inactive state: paper bg + ink text + divider border
- Sizes: `sm` (~28px tall) and `md` (~36px tall)

### 4.4 `PrimaryBtn`
Bottom CTA button — full-width, 56px tall, rounded-2xl.
- Two variants: `dark` (default — ink bg, cream text) and `terracotta` (terracotta bg, white text)
- Disabled state: dimmed background `#D8CCB6`, muted text
- Active scale `.98` for press feedback

### 4.5 `Sheet` (base)
Bottom-sheet modal:
- Slides up from the bottom with `slideUp` animation
- Backdrop: ink at 35% opacity, click to close
- Two prop variants: `tall` (90vh max-height) and `dark` (premium dark bg)
- Children render inside a paper-bg card with rounded-top corners and tab indicator at top

### 4.6 `Toast`
Bottom-floating notification:
- Auto-dismisses after ~2.5s (managed by `flash()` helper in App)
- Ink-dark bg, cream text, rounded-2xl
- Single-line message with optional emoji prefix

---

## 5. Animation system

CSS keyframes injected once in App's `useEffect`:
- `slideUp` — 250ms cubic-bezier — used by sheets opening from bottom
- `fadeIn` — 400ms ease — generic fade
- `fadeInUp` — 400ms ease — fade in + 8px translate up — used everywhere on Splash/onboarding sections

**Animation rhythm** on Splash: each section has `animation: 'fadeInUp .7s [delay] ease both'` with cascading delays (0s, .15s, .25s, .35s, .55s, .65s) so the screen builds up element by element.

**Microinteractions:**
- `active:scale-[.98]` or `[.95]` on every interactive element for press feedback
- Button `transition-all` so color/bg changes are smooth

---

## 6. Iconography (lucide-react)

All icons imported from `lucide-react`. Standard sizes: 11, 13, 15, 17, 19px. Stroke-width usually 1.7-2.

**Icons in active use:**
- `Heart` — matches, 1:1, primary action
- `Users` — groups, attendees, group meetups
- `MapPin` — places, location
- `Calendar` (aliased `CalendarIcon`) — calendar tab, time slots
- `CalendarDays` — schedule action button
- `Clock` — time-related
- `MessageCircle` — chat / messages
- `User` — profile single
- `ShieldCheck` — verified mom badge
- `Shield` — generic safety
- `Coffee`, `TreePine`, `Leaf`, `Palette`, `BookOpen`, `Flower2`, `Music`, `Sparkles` — interest tags
- `Briefcase`, `Home`, `Sun` — mom-type icons
- `Lock` — premium gating, password field
- `Eye`, `EyeOff` — password visibility toggle
- `Phone`, `Mail` — auth contact methods
- `Check` — confirmation, joined state
- `X` — close sheet, remove item
- `ChevronRight`, `ChevronDown`, `ChevronUp` — disclosure
- `ArrowLeft`, `ArrowRight` — navigation, CTAs
- `Search` — search inputs
- `Crown`, `Star`, `Award`, `Quote` — premium / decorative
- `Plus`, `Minus` — kids-age stepper
- `Compass`, `Bell`, `Building2`, `Library`, `Trees`, `PawPrint`, `Waves`, `Droplets`, `Flame` — place categories
- `Bell` — reminders / notifications

---

## 7. Data constants

All defined at top of `App.jsx`. These are the source of truth for the prototype — replace with API calls in production.

### 7.1 `MOM_TYPES` (7 items)
`{ id, label, icon }` shape. IDs: `working`, `sahm`, `solo`, `new`, `multi`, `hybrid`, `prefer_not`. Icons from lucide. User can select multiple in profile (cap at 3 recommended for ease of use).

### 7.2 `VALUES` (9 items)
String array: `Gentle parenting`, `Outdoorsy`, `Bookworm`, `Honest & open`, `Slow living`, `Playful`, `Adventurous`, `Multilingual home`, `Faith-based`. Plus sentinel `VALUE_NO_PREF = 'No preference'`.

### 7.3 `INTERESTS` (8 items)
`{ label, icon }` shape: `Coffee dates`, `Park hangs`, `Stroller walks`, `Art & craft`, `Book club`, `Yoga / fitness`, `Music time`, `Markets`. Plus sentinel `INTEREST_NO_PREF = 'Surprise me'`.

### 7.4 `KID_AGES` (6 buckets)
`['0–1','1–3','3–5','5–8','8–12','12–18']`. Used in Screen 4 stepper. User specifies count per bucket: `{ '1–3': 2, '3–5': 1 }`.

### 7.5 `NEIGHBORHOODS` (~80 cities/neighborhoods)
String array spanning SF Bay Area, LA, NYC, Chicago, Boston, Pacific NW, Texas, Florida, Mountain & SW, Southeast, Midwest & East. Used in Screen 3 location picker (searchable typeahead).

### 7.6 `DISTANCES` (6 options)
`{ val, label }` shape: 5/10/20/50/100/150 mi. Plus implicit "anywhere" sentinel.

### 7.7 `PLACES` (10 categories)
Object with category keys, each containing array of place objects:
```js
{
  cafes: [{ id, name, area, badges: ['mom_fav', 'top_rated'], notes: 'kid-friendly seating' }, ...],
  parks: [...], playgrounds: [...], museums: [...], indoor: [...],
  libraries: [...], homes: [...], zoos: [...], water: [...], pools: [...]
}
```
~50 places total, all SF Bay Area in current data. Each has `badges` array referencing `BADGE_META` keys.

Sentinel: `PLACES_NO_PREF = 'any'` — user toggles "Open to anywhere."

### 7.8 `TOP_PICKS` (5 curated badges)
`[{ id: 'mom_fav', label: 'Mom favorite', color: ... }, { 'top_rated' }, { 'editor_pick' }, { 'best_for_kids' }, { 'trending' }]`

### 7.9 `BADGE_META`
Includes the TOP_PICKS keys plus:
- `yours` — sageDark color, label "Yours" — for user-added custom places

### 7.10 `SUGGESTED_EVENTS` (8 events)
```js
{
  id, name: 'Saturday Playgroup',
  day: 'Sat', time: '10:00 AM',
  bucket: 'Sat-morning',  // matches WINDOW_TO_BUCKET key
  place: 'Dolores Park',
  going: 12,              // attendee count
  recurring: true,        // weekly recurrence flag
  tags: ['outdoor', 'toddler-friendly'],
  hue: 'linear-gradient(135deg,#C8553D,#D9A441)',
}
```

### 7.11 `WINDOW_TO_BUCKET`
Maps `TIME_WINDOWS.id` → human-readable bucket label:
```js
{ early: '6–9 AM', morning: '9 AM–12 PM', lunch: '12–2 PM',
  afternoon: '2–5 PM', evening: '5–8 PM', night: '8 PM+' }
```

### 7.12 `DAYS` + `DAY_LABELS`
- `DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']`
- `DAY_LABELS = { Mon: 'Monday', ..., Sun: 'Sunday' }`
- Slot keys are `${day}-${windowId}` like `'Sat-morning'`

### 7.13 `TIME_WINDOWS` (6 windows)
`[{ id, label }]`: early/morning/lunch/afternoon/evening/night with human labels.

### 7.14 `SAMPLE_MOMS` (4 hardcoded profiles)
Each shape:
```js
{
  id, name: 'Sara K.', age: 32, kids: '2y · 4y', type: 'Working mom',
  overlap: 87,                                  // match %
  distance: '0.6 mi',
  tags: ['Coffee dates', 'Same kid ages', 'Tue mornings'],
  nextSlot: 'Tue · 9:30 AM', nextPlace: 'Blue Bottle, Mission',
  hue: 'linear-gradient(135deg,#E8B4A0,#C8553D)',  // gradient for avatar bg
  bio: 'Lawyer turned half-time. Toddler tantrum survivor. Always down for an iced oat latte and a stroller loop.',
  values: ['Gentle parenting', 'Honest & open', 'Slow living'],
  interests: ['Coffee dates', 'Park hangs', 'Book club'],
  freeSlots: ['Tue-morning', 'Thu-morning', 'Sat-morning', 'Sat-afternoon', 'Sun-afternoon'],
  verified: true,
}
```

The 4 moms: **Sara K.** (working, 87%), **Mei L.** (new mom, 74%), **Aisha R.** (stay-at-home, 82%, NOT verified), **Priya N.** (hybrid/WFH, 79%).

### 7.15 `DAYS_SHORT_BY_DOW`
`{ Mon: 'MON', Tue: 'TUE', ..., Sun: 'SUN' }` — for compact display in calendar grid.

---

## 8. State management — App component

All state lifted to root `App` component. Passed down as props.

### 8.1 Onboarding/routing state
| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `splashShown` | `boolean` | `false` | If false → render Splash; if true → render step-routed onboarding |
| `step` | `number` | `0` | Current onboarding step. 0..6 = onboarding screens, 7 = MainApp |

### 8.2 User data state
| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `profile` | `object` | `{ kidsAges: {}, momTypes: [], values: [], interests: [] }` | User's profile from Screen 4 |
| `prefs` | `object` | `{ slots: [], places: [] }` | Time + place preferences (Screens 5 & 6) |
| `location` | `string` | `''` | Selected neighborhood (Screen 3) |
| `distance` | `string \| number` | `''` | Distance radius in miles, or `'any'` |

### 8.3 Account state
| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `account` | `object \| null` | `null` | `{ firstName, method: 'phone'\|'email', phone?, email?, isPremium: bool, trialEndsAt: number }` |
| `pendingAction` | `object \| null` | `null` | Queued action waiting for account: `{ type: '1to1' \| 'group' \| 'invite', mom?, slot?, event? }` |

### 8.4 Modal/sheet open state
| State | Type | Purpose |
|-------|------|---------|
| `scheduleMom` | `mom \| null` | Open ScheduleSheet for this mom |
| `profileMom` | `mom \| null` | Open ProfileSheet for this mom |
| `messageMom` | `mom \| null` | Open MessageSheet for this mom |
| `premiumOpen` | `boolean` | Open PremiumSheet |
| `groupChatEvent` | `event \| null` | Open GroupChatSheet (future) |
| `toast` | `string \| null` | Message to show in Toast (auto-clears) |

### 8.5 Cross-screen state (matches/calendar conflict detection)
| State | Type | Purpose |
|-------|------|---------|
| `scheduled1to1` | `{ [momId]: { day, slot, place, time } }` | Confirmed 1:1 meetups |
| `joinedEvents` | `string[]` | Array of event IDs the user has RSVP'd to |
| `messageHistory` | `{ [momId]: [{ from, text, ts }] }` | Per-mom chat thread (for 3-message free limit) |

### 8.6 Helper functions in App
- `flash(msg)` — shows toast for 2.5s
- `requestAccount(actionDescriptor)` — sets `pendingAction` and opens CreateAccountSheet
- `handleAccountComplete()` — replays queued action after account creation
- `restart()` — resets everything and returns to Splash (`setSplashShown(false)`)

---

## 9. Routing flow

```
Splash (splashShown === false)
   ↓ Begin → setSplashShown(true)
Step 0  →  Screen2  · How it works (You. Time. Place. Match.)
Step 1  →  Screen3  · Where are you, mama?      (location + distance)
Step 2  →  Screen4  · Tell us about you         (profile: kids + types + values + interests)
Step 3  →  Screen5  · When you're free          (time grid)
Step 4  →  Screen6  · Where you like to meet    (place picker)
Step 5  →  SummaryScreen · Your week awaits     (compact preview of matches + events)
Step 6  →  AccountScreen · Match me             (full-screen account creation)
   ↓ Match me CTA → setStep(7)
Step 7  →  MainApp                               (default tab: 'matches')
```

**StepHeader on all onboarding:** `total={7}`, `step` matching above (0..6). Back button on Screen2 is disabled.

**Restart flow:** From YouTab → "Start over" → resets all state → returns to Splash. This is purely a demo affordance.

**Orphaned components:** `Screen1`, `Screen7`, `Screen8` exist in the file but are not routed. They are pre-restructure remnants. Safe to delete.

---

## 10. Splash screen — current design (final version)

The first screen the user sees. Cream background with atmospheric radial washes and noise texture.

### 10.1 Layout structure
```
[StatusBar]
[Atmosphere layer: rose top-right wash, sage bottom-left wash, noise overlay]

[Content area — flex column, justify-center]
  ── Brand mark (centered)
       [♥ logo 20px]  Mama (Fraunces 22px, last 'a' italic terracotta)
       Your kids need friends, and so do you.   ← italic Fraunces 13.5px,
                                                   "friends" sage, "you" terracotta
  ── Stats (mt-3.5, grid-cols-2 gap-2)
       [Box]                       [Box]
        9 of 10 moms                7 of 10 moms
        feel lonely                 have no new mom friends
       (terracotta)                 (sage)
  ── Empathy (mt-2)
       [Box]
        You love your kids.           ← Fraunces 15px 500
        But it can still feel        ← Fraunces italic 13.5px,
        isolating.                       "isolating" terracotta
  ── Marketing (mt-2)
       [Box]
        Real meetups, made for       ← Fraunces 13.5px 500,
        mom's busy calendar.           "mom's busy calendar" italic sage

[Pinned bottom — px-7 pt-2 pb-5]
  [Begin →]                          ← PrimaryBtn dark variant
  Already a Mama? Sign in            ← Albert Sans 11px, "Sign in" terracotta underline
```

### 10.2 Box treatment (used for Stats / Empathy / Marketing)
Every box on Splash:
- `rounded-2xl`
- `background: C.paper`
- `border: 1px solid C.divider`
- `boxShadow: 0 2px 8px ${C.ink}06`
- A radial corner-wash in the section's accent color (terracotta for stat 1 + empathy, sage for stat 2 + marketing, plus saffron secondary wash on empathy)
- Centered text inside

### 10.3 Atmospheric layer (zIndex: 0)
Three absolute-positioned layers:
1. Rose radial top-right (~420px, 60% transparent)
2. Sage radial bottom-left (~380px)
3. Noise-texture SVG overlay (multiply blend mode, opacity .35)

All `pointer-events-none` so they never block taps.

### 10.4 Animation cascade
- Brand: `fadeInUp .8s ease both`
- Stats: `fadeInUp .7s .2s ease both`
- Empathy: `fadeInUp .7s .35s ease both`
- Marketing: `fadeInUp .7s .5s ease both`

### 10.5 Sign-in link
Currently visual-only (no auth flow). Tapping does nothing. Wire to a sign-in screen when auth backend exists.

---

## 11. Onboarding screens (Screen2 → Screen6)

All share the same skeleton:
```jsx
<div className="h-full flex flex-col" style={{ background: C.cream }}>
  <StatusBar/>
  <StepHeader step={N} total={7} onBack={onBack} onSkip={onNext}/>
  <div className="flex-1 overflow-y-auto px-7" style={{ scrollbarWidth: 'none' }}>
    {/* eyebrow */}
    {/* big serif title */}
    {/* subtitle/description */}
    {/* interactive content */}
  </div>
  <div className="px-7 pb-8 pt-3" style={{ background: C.cream }}>
    <PrimaryBtn onClick={onNext}>Continue <ArrowRight size={18}/></PrimaryBtn>
  </div>
</div>
```

### 11.1 Screen 2 — How it works
**Step 1 of 7 · `step={0}`**
- Title: ***How Mama works.***
- Four numbered cards: **You · Time · Place · Match.**
  - Each card has an eyebrow number (01, 02, 03, 04) in tracked uppercase
  - Each has a Fraunces title and one-line description
  - Subtle illustrative icon
- Bottom CTA: ***Continue →***
- Back button disabled (entry to onboarding)

### 11.2 Screen 3 — Where are you, mama?
**Step 2 of 7 · `step={1}`**
- Title: *Where are **you**, mama?*
- Eyebrow: "Your neighborhood"
- **Location input** — text field with autocomplete dropdown filtering `NEIGHBORHOODS`
- **Distance picker** — horizontal pill row of `DISTANCES` options, plus "Open to anywhere" toggle
- Sets `location` (string) and `distance` (number or 'any')

### 11.3 Screen 4 — Tell us about you
**Step 3 of 7 · `step={2}`**
- Title: *Tell us about **you**.*
- Three sub-sections:
  1. **Kids** — for each `KID_AGES` bucket, a `+/-` stepper (cap at 5). Visual badge per kid that decrements by one tap.
  2. **Mom types** — multi-select pill grid from `MOM_TYPES` (cap at 3 recommended)
  3. **Values** — multi-select pill grid from `VALUES`
  4. **Interests** — multi-select pill grid from `INTERESTS` (with icons)
- Sets `profile = { kidsAges, momTypes, values, interests }`

### 11.4 Screen 5 — When you're free
**Step 4 of 7 · `step={3}`**
- Title: *When you're **free**.*
- 7×6 grid (7 days × 6 time windows), each cell is a pill toggle
- Cells use `${day}-${windowId}` as key
- Selected cells get terracotta bg + cream text; unselected get paper bg + ink text
- Sets `prefs.slots` array
- **TODO (UX improvement):** Restructure to top row of 7 day pills (tap = whole day with sensible defaults), expanded time windows shown only for selected days. Reduces 35 toggles to ~7.

### 11.5 Screen 6 — Where you like to meet
**Step 5 of 7 · `step={4}`**
- Title: *Where you like to **meet**.*
- Two-mode UI:
  - **Top picks** — selectable cards with badges (`mom_fav`, `top_rated`, etc.)
  - **Browse more** — category dropdown (cafes/parks/playgrounds/etc.) showing each `PLACES[category]` list
- "Open to anywhere" sage toggle at the top — overrides everything
- **Custom place adding** — sage dashed-border button at the top of each browse panel: "+ Add a place." Opens an inline form with name+area inputs. After submit, the place gets a `'Yours'` badge (sageDark) and is auto-selected.
- Sets `prefs.places` array

---

## 12. SummaryScreen — Step 6 of 7 · `step={5}`

Compact preview of what the user can expect.

### 12.1 Computed metrics
- **Mom count** = `SAMPLE_MOMS.filter(m => m.freeSlots && m.freeSlots.some(s => prefs.slots.includes(s))).length` — falls back to all moms if no slots set
- **Event count** = `SUGGESTED_EVENTS.filter(e => selectedDays.length === 0 || selectedDays.includes(e.day)).length` — `selectedDays = unique days from prefs.slots`

### 12.2 Layout
- Eyebrow: ✨ "Step 6 · Your week awaits"
- Title: *We found your **people**.*
- Subtitle: "Based on your week, here's what's waiting for you in [location]."

- **Two big counter tiles** (grid-cols-2 gap-3):
  - Left tile: terracotta bordered, Heart icon, big 44px Fraunces number + italic "moms", "match your week"
  - Right tile: sage bordered, Users icon, same treatment, "in your area"
  - Both have radial corner washes in their accent color

- **Mom preview row** (if mom count > 0): "A taste of your matches" eyebrow, three tiny mom cards each showing initials avatar + first name + first kid age

- **Event preview row** (if event count > 0): "Group meetups this week" eyebrow, two compact event rows (gradient icon + name + day/time/place + going count)

- **Empty fallback** (both counts = 0): "Widen your availability or location to see more moms."

### 12.3 CTA
***Create account & meet them →*** (terracotta variant)

---

## 13. AccountScreen — Step 7 of 7 · `step={6}`

Full-screen account creation. Last onboarding step before MainApp.

### 13.1 Form fields
1. **First name** — `firstName` state, plain text input, validates ≥ 2 chars
2. **Phone | Email toggle** — segmented control, default `phone`
3. **Phone input** — auto-formatted as `(555) 123-4567`, validates 10 digits
4. **Email input** — type=email, validates regex
5. **Password** — type=password by default, eye icon toggles visibility, validates ≥ 8 chars
6. **Terms checkbox** — pre-checked by default, "I agree to Mama's Terms and Community Pact"

### 13.2 Submit logic
- All-fields valid → enable CTA
- CTA: ***♥ Match me →*** (terracotta with Heart icon, fill on enabled state)
- On submit: `setAccount({ firstName, method, phone?, email? })` → `onNext()` → goes to MainApp

### 13.3 Privacy footer
🔒 "Your phone is never shown to other moms."

---

## 14. MainApp — 5 tabs

### 14.1 Tab order (canonical)
Bottom nav, left to right:
1. **Matches** (default) — Heart icon
2. **Calendar** — CalendarIcon
3. **Places** — MapPin
4. **Events** — Users
5. **Profile** — User

Active tab: terracotta icon, ink label, bold; inactive: muted icon, muted label, regular weight. Each button: `flex-col gap-0.5 py-1.5 flex-1`.

### 14.2 Default tab on entry
`useState('matches')` — user lands on matches because that's what they just clicked "Match me" to see.

---

## 15. MatchesTab — Tinder-style cards

The hero tab. One mom or one event filling the screen at a time.

### 15.1 Header
- Title: *Your **matches*** (Fraunces 26px)

### 15.2 Hero toggle (the segmented switch between 1:1 and Groups)
Two big pill buttons side by side, ~44px tall:
- **1:1 Moms** — active state: terracotta bg + white text + soft drop-shadow + slight `scale(1.02)` lift; inactive: paper bg + soft text + thin border
- **Groups** — active state: sage bg + white text + drop-shadow + lift; inactive: paper bg + soft text + thin border
- Each button: filled icon (Heart on left, Users on right) + label + small inline count chip (white-on-translucent when active, cream-on-muted when inactive)

### 15.3 Position indicator
Below toggle: left side `MOM 1 OF 4` (or `GROUP 1 OF 8`) in tracked uppercase. Right side: dot pagination — active dot stretches into a small bar in the section's color.

### 15.4 Individual mom card
- **Hero strip** (160px tall) — full-bleed gradient using `mom.hue`, with noise overlay
  - Initials in white Fraunces 64px center, soft text-shadow
  - Top-left: Verified pill (`ShieldCheck` + sage caps) on white-frosted bg, only if `mom.verified`
  - Top-right: stat tile — match % (Fraunces 22px terracotta + tiny "MATCH" label) on white-frosted bg with drop-shadow

- **Identity block**
  - Name in 24px Fraunces 500
  - Meta: `MapPin` + "0.6 mi away · Kids 2y, 4y"

- **"What you have in common" card** (the star of the show)
  - Soft terracotta-tinted bg (terracotta @ 8% opacity), terracotta @ 30% border, terracotta corner wash
  - Eyebrow with `Sparkles` icon: ***WHAT YOU HAVE IN COMMON***
  - Three pill flavors:
    - **Saffron pills with `CalendarIcon`** — shared time slots (`prefs.slots ∩ mom.freeSlots`), label like "Sat morning"
    - **Terracotta pills** — shared interests (`profile.interests ∩ mom.interests`)
    - **Sage pills with ✦** — shared values (`profile.values ∩ mom.values`)
  - Empty fallback: italic "Shared interests revealed once you connect."

- **Bio quote** — italic Fraunces 13.5px, prefixed with small terracotta `Quote` icon

- **Action bar** (3 buttons)
  - **Profile** — cream-soft bg, `User` icon, opens ProfileSheet
  - **Chat** — cream-soft bg, `MessageCircle` icon, opens MessageSheet
  - **Schedule** — terracotta bg, white text, drop-shadow glow, 1.6× wider than other buttons, `CalendarDays` icon, opens ScheduleSheet
  - All have `active:scale-95` press feedback

### 15.5 Group event card (same template, different content)
- **Hero strip** (160px tall) — gradient with `event.hue`, noise overlay
  - Big translucent `Users` icon (64px) in center with drop-shadow
  - Top-left: "WEEKLY" pill if `event.recurring` (sage caps on white)
  - Top-right: "going" tile (Fraunces 22px sage + "GOING" caps) on white-frosted bg

- **Body**
  - Title in Fraunces 22px
  - Meta: `CalendarIcon` + "Sat · 10:00 AM" + dot + `MapPin` + "Dolores Park"

- **"Why this fits you" card** (sage-themed equivalent of shared ground)
  - Sage corner wash, sage border @ 33% opacity
  - Eyebrow: ✨ ***WHY THIS FITS YOU***
  - Pills:
    - "Free at this time" (saffron pill with `CalendarIcon`) — if user has matching slot
    - Event tags (sage pills)
    - "↻ Same time, every week" (terracotta pill) — if recurring

- **Action bar**
  - **Group chat** — cream-soft, `MessageCircle`, currently shows toast "Group chat opens after joining"
  - **Details** — cream-soft, `User`, shows toast with going count + place
  - **Join / Joined** — sage filled (with shadow) when not joined, sage outlined cream-soft when joined; updates `joinedEvents`. Account-gated via `requestAccount`.

### 15.6 Card navigation chevrons
Below the card: two circular `ArrowLeft`/`ArrowRight` buttons, paper bg, hairline border, soft shadow, `active:scale-90`. "SWIPE THROUGH" tracked label between them. Wraps around at array ends.

### 15.7 Match % calculation
```js
const computeMatchPct = (mom) => {
  const sV = (profile?.values || []).filter(v => mom.values?.includes(v)).length;
  const sI = (profile?.interests || []).filter(i => mom.interests?.includes(i)).length;
  const sS = (prefs?.slots || []).filter(s => mom.freeSlots?.includes(s)).length;
  return Math.min(99, 55 + sV * 10 + sI * 7 + sS * 5);
};
```

---

## 16. CalendarTab

### 16.1 Layout
- Title: *Your **calendar*** (Fraunces 28px)
- Month name + year header
- 7×N month grid:
  - Weekday headers (Mon-Sun)
  - Day cells:
    - Today: bordered terracotta
    - Selected: filled terracotta
    - Has availability: cream-soft tinted bg
    - Has 1:1 meetup: terracotta dot indicator
    - Has group event: sage dot indicator (dual dots possible)
- **Selected day detail panel** below the grid:
  - Day name + date
  - Meetup chips (1:1 or group, with mom name or event name)
  - 5 sage time-window pills for editing availability for this day
  - "Find new matches" CTA → `goToMatches()` (sets MainApp tab to 'matches')

### 16.2 Empty state
"Nothing on the calendar yet." **TODO:** Add CTA button "Schedule your first meetup →" that jumps to Matches tab.

---

## 17. PlacesTab

### 17.1 Layout
- Title: *Your **places*** (Fraunces 28px)
- "Open to anywhere" toggle (sage)
- **Top Picks** rows (toggleable selection)
- **Browse more** dropdown — category pills, expand to show full place list per category
- Selected places get a checkmark indicator
- "Find moms who love these spots" CTA → `goToMatches()`

### 17.2 Same custom-place adding pattern as Screen 6
Sage dashed button → name+area form → adds to user's collection with "Yours" badge.

---

## 18. EventsTab

### 18.1 Layout
- Title: *Group **meetups*** (Fraunces 28px)
- Filter row (TODO): This week / This weekend / All
- Event cards:
  - Hero strip with gradient + Users icon
  - Title + day/time/place
  - **Attendee preview**: first 3 avatars + faded "+N" + 🔒 "See all N" terracotta link → opens PremiumSheet (free users); Plus users see all + sage "All N visible"
  - "+N more" badge if recurring weekly
  - Join button (terracotta), account-gated via `requestAccount`. Joined → sage outlined cream-soft "Joined ✓"

### 18.2 This-month dates computed from current `Date`
Helper `occurrencesThisMonth(event)` returns count of times this recurring event happens in the current calendar month. Drives the "+N more" badge.

---

## 19. YouTab (Profile)

### 19.1 Layout
- Header: greeting "Hi, {firstName}" or "Mama" if no account
- Profile card showing:
  - Mom-type label (e.g., "Working mom & Hybrid")
  - Kids label (e.g., "2 × 1–3, 1 × 3–5")
  - Location + distance
- **If account.isPremium:** Plus crown badge + "trial ends in N days"
- **If !account.isPremium:** "Try Plus" terracotta button → opens PremiumSheet
- Settings list (visual only):
  - Edit profile
  - Notifications
  - Safety & verification
  - Help
  - **Restart** — calls `restart()` → resets all state → returns to Splash (demo affordance)

---

## 20. Sheets / modals

All extend the base `Sheet` component (slide-up bottom sheet, ink backdrop @ 35% opacity).

### 20.1 ScheduleSheet
- Opens from MatchesTab "Schedule" button
- Shows mom's available slots that overlap with user's
- User picks a slot + place
- Anti-ghosting callout: sage card with "24h reply window — moms confirm or pass within 24h"
- "Send invite" CTA — account-gated via `requestAccount({ type: 'invite', mom, slot })`
- On confirm: adds to `scheduled1to1`, flashes toast "Invite sent to {mom.name} ✓", closes sheet

### 20.2 ProfileSheet
- Opens from MatchesTab "Profile" button (or any mom card tap elsewhere)
- **Free tier (partial profile):**
  - First name + last initial only
  - Broad kid ages (e.g., "toddler" not "2y, 4y")
  - 2 values + 2 interests
  - "Shared ground" terracotta-tinted card showing what user has in common with mom — **always free** because this converts users
  - Blurred premium preview with "PLUS REVEALS" overlay (full bio, all values/interests, exact ages, all freeSlots, met-up history)
  - "Unlock with Plus" CTA → opens PremiumSheet
- **Plus tier (full profile):**
  - Full first + last name
  - Exact kid ages
  - All values, all interests
  - Complete bio
  - All freeSlots
  - Met-up history social proof ("Met up with 8 moms this month")
- "Schedule meetup" CTA → opens ScheduleSheet

### 20.3 MessageSheet
- Per-mom chat thread with bubbles (user vs mom, alternating sides)
- **Free tier: 3-message limit per mom**
  - Counter pill at top: "2/3 free messages"
  - "Last free message — make it count" hint on 3rd message
  - After 3rd message: ink-bg upsell card "Unlimited messaging with Plus" + crown icon → opens PremiumSheet
- **Plus tier:** Unlimited
- TODO: 1-2 free replies allowed if Plus mom messages a free user

### 20.4 CreateAccountSheet
- Used when `requestAccount(actionDescriptor)` is called
- Single-stage form (same shape as AccountScreen but as a sheet):
  - Phone/Email toggle
  - Password with eye icon
  - Terms checkbox
- **Pending action summary card** at top: "Sign up to schedule Mon 9 AM with Sara K." — sets context
- Dynamic CTA based on `pendingAction.type`:
  - `'1to1'` → "Create account & schedule"
  - `'group'` → "Create account & join"
  - `'invite'` → "Create account & send invite"
- On complete: `handleAccountComplete()` replays the queued action

### 20.5 PremiumSheet
- Dark sheet (variant `dark`, ink-deep bg)
- Crown icon header
- Title: ***Mama Plus***
- Price: **$7.99/mo**
- Feature list:
  - ✓ Unlimited messaging
  - ✓ Full profiles
  - ✓ Full group attendees
  - ✓ Met-up history & social proof
- "Start 7-day trial" CTA — calls `onActivate` which sets `account.isPremium = true` and `trialEndsAt = Date.now() + 7*24*3600*1000`
- Toast: "✦ Welcome to Mama Plus · 7-day trial started"

---

## 21. Premium model — free vs Plus tier

| Feature | Free | Plus ($7.99/mo) |
|---------|------|-----------------|
| Receive matches | ✓ | ✓ |
| Schedule 1:1 meetups | ✓ | ✓ |
| RSVP to groups | ✓ | ✓ |
| Set availability + preferences | ✓ | ✓ |
| Profile blur preview | ✓ | — (full) |
| **Shared ground card** (terracotta-tinted) | **✓ — always free** | ✓ |
| Message a match | 3 messages / mom | Unlimited |
| Profile depth | First name + last initial, broad kid ages, 2 values, 2 interests | Full bio, all values/interests, exact ages, all freeSlots, met-up history |
| Group attendees | First 3 visible + count | All visible + DM access |
| Group chat | Read | Read + post |
| Create custom groups | — | ✓ |

### 21.1 What NEVER changes (intentional friction)
- 3-message free limit — converts users
- Partial profile blur — converts users
- Verified-only positioning even though it slows signup — it's the moat
- Don't soften the upsell language to "be nice." Be honest about value.

### 21.2 Where the upsell appears (only at moments of friction)
- 4th message in a chat → MessageSheet upsell card
- Tap on locked profile section → ProfileSheet "PLUS REVEALS"
- Tap on "See all N" group attendees link → PremiumSheet
- YouTab "Try Plus" button (passive)

**Never appears pre-emptively.** No splash-screen upsell. No "before you continue" upsell.

---

## 22. Account flow + gating

### 22.1 Account-gated actions
These actions check `account` first:
- Auto-schedule a meetup (Screen 7 or Matches)
- Commit a slot
- Join a group (EventsTab or MatchesTab)
- Send invite via ScheduleSheet
- Send first message via MessageSheet (after a placeholder pre-account flow)

### 22.2 Gating pattern
```js
if (!account) {
  requestAccount({ type: 'group', event: currentEvent });
  return;
}
// proceed with the action
```

`requestAccount` sets `pendingAction` AND opens CreateAccountSheet. After successful account creation, `handleAccountComplete()` reads `pendingAction` and replays the action automatically (joins the group, schedules the slot, etc.) plus shows a confirmation toast.

### 22.3 The pending-action summary card
Always shown at the top of CreateAccountSheet so users understand WHY they're being asked to sign up. Reduces friction perception by ~30%.

---

## 23. Atmosphere primitives — radial washes + noise

Used on Splash, Screen 1 (orphaned), and any screen needing a warmer feel.

### 23.1 Radial color washes
```jsx
<div className="absolute pointer-events-none" style={{
  top: -160, right: -120, width: 420, height: 420, borderRadius: '50%',
  background: `radial-gradient(circle, ${C.rose}CC 0%, transparent 60%)`,
  zIndex: 0,
}}/>
```
Pattern: large soft circular gradient bleeding off-edge in an accent color. Always `pointer-events-none` and `zIndex: 0`. Multiple layered for depth (rose top-right, sage bottom-left, saffron center on Splash logo area).

### 23.2 Noise texture overlay
```jsx
<div className="absolute inset-0 pointer-events-none" style={{
  opacity: .35, mixBlendMode: 'multiply', zIndex: 0,
  backgroundImage: `url("data:image/svg+xml,...")`,
}}/>
```
SVG noise filter (fractal turbulence at .85 baseFrequency) baked as data URL. Adds film-grain warmth.

### 23.3 Card corner washes
Inside any card, a small radial wash anchored to a corner adds the section's accent color without needing a colored border:
```jsx
<div className="absolute pointer-events-none" style={{
  top: -30, right: -30, width: 70, height: 70, borderRadius: '50%',
  background: `radial-gradient(circle, ${C.terracotta}1F 0%, transparent 70%)`,
}}/>
```
Use 1F (12%) opacity for subtle, 1A (10%) for very subtle, 22 (13%) for slightly more present. Inside cards, wrap content in `<div className="relative">` so it sits above the corner wash.

---

## 24. Common UX patterns / shared component behavior

### 24.1 Pill toggle pattern
- Active: filled bg in accent color, white text, optional shadow lift
- Inactive: paper bg, ink text, divider border
- Used in: Pill component, segmented controls, time-window selectors, distance picker, mom-type selector, etc.

### 24.2 Dashed-border "add" pattern (sage)
For user-added items (custom places, custom slots): sage dashed border, "+ Add a place" / "+ Add custom" label, opens an inline form. After submit: gets a "Yours" badge in sageDark.

### 24.3 Eyebrow + title + body
Standard hierarchy inside any section:
```jsx
<div className="text-[11px] tracking-[.2em] uppercase mb-3" style={{ color: C.terracotta, fontFamily:'Albert Sans', fontWeight:600 }}>
  Step 6 · Your week awaits
</div>
<h2 style={{ fontFamily:'Fraunces', fontWeight:400, fontSize: 28, lineHeight:1.1, color: C.ink, letterSpacing:'-.02em' }}>
  Title with <span style={{ fontStyle:'italic', color: C.terracotta }}>emphasis</span>.
</h2>
<p className="mt-2 text-[12.5px]" style={{ fontFamily:'Albert Sans', color: C.inkSoft, lineHeight:1.5 }}>
  Subtitle/description in soft ink.
</p>
```

### 24.4 Italic-color emphasis
Repeating: every section title has one italic terracotta word. This is the brand's typographic signature.

### 24.5 Distance / kids meta line
Pattern: small icon + bullet-separated meta text in inkSoft.
```jsx
<div className="text-[11.5px] flex items-center gap-1" style={{ fontFamily:'Albert Sans', color: C.inkSoft }}>
  <MapPin size={10}/> 0.6 mi away · Kids 2y, 4y
</div>
```

---

## 25. Things to avoid breaking

1. **Animation `useEffect` in App** — injects keyframes (`slideUp`, `fadeIn`, `fadeInUp`) into `document.head`. Required by every animated element. If splitting App.jsx, keep this in App or move to `index.css` as actual `@keyframes` rules.

2. **Google Fonts `<link>`** — also injected via App's useEffect. Same advice.

3. **`PhoneFrame`** — wraps the entire app. The app is designed for ~375×740px phone resolution. Do not remove for desktop preview.

4. **Account-gated action pattern** — `requestAccount` + `pendingAction` + `handleAccountComplete` is the convention. Don't add direct `setAccount` calls bypassing this flow; you'll lose the action replay.

5. **Color tokens via `C.*`** — never use raw hex codes in component code. Add new tokens to the `C` object first.

6. **The "shared ground" terracotta card stays free.** This is what converts users by proving the matching is real. Do not premium-gate it.

7. **The 3-message limit.** Intentional friction.

8. **The verified-only positioning.** Slows signup but it's the moat.

---

## 26. UX TODO list (prioritized)

### Top 3 (highest impact, ship first)

1. **Persona-based onboarding.** Replace the dense profile screen (kids + mom-types + values + interests) with one screen showing 4-5 picker cards: *Working mama · Stay-at-home · New mom · Toddler mom · Big-kid mom*. Each pre-fills sensible defaults for `profile.values`, `profile.interests`, `profile.momTypes`. Keep the kids stepper. Goal: cut onboarding friction by 50%+.

2. **When-screen redesign — tap-once-per-day.** Top row of 7 day pills (tap = whole day with sensible default time windows), then only enabled days expand to show editable time windows below. Reduces ~35 toggles to ~7.

3. **Live "X moms match" counter.** Persistent counter at the bottom of the When screen, the Where screen, and the persona picker. Updates in real-time as preferences narrow. Computed by intersecting selected slots/places against `SAMPLE_MOMS`. Confirms matching is real + creates dopamine pull forward.

### Next round

4. **Match overlap on group cards.** Show *"Sara + 2 of your matches going"* on EventsTab cards.

5. **Empty-state CTAs.** Calendar's *"Nothing on the calendar yet"* should have a button: *"Schedule your first meetup →"* that jumps to Matches tab. Same pattern for other empty states.

6. **Filter chips on Matches tab.** Row of chips: *This week · Same kid ages · Weekends · Verified · < 1 mile*.

7. **Confirm-before-paywall.** When the CreateAccountSheet pops, the pending-action summary should be louder/bolder.

### Polish

8. **Bigger tab labels** or icon-only with active label below (Instagram pattern). Current 10px labels feel cramped.

9. **Save + resume onboarding.** Persist `step`, `profile`, `prefs`, `location`, `distance` to localStorage. Splash detects partial state → "Welcome back, you're on step N" with Continue / Start over.

10. **Undo toast for destructive actions.** When user removes a place / unjoins / cancels, show *"Removed · Undo"* for 5s. Add an `action` prop to Toast.

11. **Search bar in Places tab.** Filter `PLACES` and `TOP_PICKS` live.

---

## 27. Tech stack & file conventions

### 27.1 Stack
- **React 18.3.1** + Vite 5
- **Tailwind CSS 3.4** for utility classes; inline `style={{}}` for design tokens (color, font-size, font-family that aren't in the Tailwind config)
- **lucide-react 0.383** for icons
- **Google Fonts** for Fraunces + Albert Sans (loaded at runtime in App's useEffect)

### 27.2 Conventions
- All color values via `C.*` tokens (never raw hex)
- All font sizes specified in pixels via inline `style` (not Tailwind text classes) for design precision
- All animations use the three CSS keyframes injected by App: `slideUp`, `fadeIn`, `fadeInUp`
- Icons are sized in pixels: 11/13/15/17/19 standard
- Section spacing: `mt-2` (~8px) for tight, `mt-3` (~12px) for standard, `mt-4` (~16px) for breathing room

### 27.3 Project structure (currently single-file)
```
mama-app/
├── package.json          # React + Vite + Tailwind + lucide-react
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── README.md
├── CLAUDE.md             # Architecture notes for Claude Code
└── src/
    ├── main.jsx          # React bootstrap (StrictMode + createRoot)
    ├── index.css         # Tailwind directives
    └── App.jsx           # The whole app (~4,700 lines)
```

### 27.4 Setup
```bash
npm install
npm run dev         # localhost:5173
npm run build       # outputs to dist/
```

---

## 28. Brand asset checklist (for designer / Claude Design)

- [x] Logo (heart + check) — `MamaLogo` SVG component, terracotta + cream
- [x] Wordmark — Fraunces serif, italic-a, terracotta
- [x] Color palette — 13 named tokens
- [x] Typography — 2 families (Fraunces serif, Albert Sans sans), 4 type roles
- [x] Atmospheric system — radial washes (rose/sage/saffron) + noise texture
- [x] Decorative SVG — `Sprig` (sage leaves), `Sun3` (saffron rays)
- [x] Iconography — lucide-react, ~30 icons in active use
- [x] Animation system — slideUp/fadeIn/fadeInUp keyframes
- [x] Card system — paper bg, divider border, rounded-2xl, optional drop-shadow + corner wash
- [x] Pill system — active (filled) vs inactive (outlined)
- [x] Sheet system — bottom slide-up, ink backdrop, optional dark variant for premium
- [x] Status bar mockup, phone frame mockup, step header with progress dots
- [ ] App icon (use MamaLogo at 1024×1024)
- [ ] Splash screen video / intro animation (future)
- [ ] Push notification iconography (future)
- [ ] Marketing page assets (future)

---

## 29. Open questions / future work

- **Auth backend.** Sign-in link on Splash currently does nothing. Decide: magic link, social auth, or phone OTP.
- **Real matching algorithm.** Current match % is `55 + 10×values + 7×interests + 5×slots` — needs replacement with actual matching backend.
- **Real availability calendars.** Currently `prefs.slots` is a static array of slot keys. In production, this would sync with the user's actual calendar (Apple Calendar, Google Calendar).
- **Messaging.** Currently in-memory `messageHistory`. Needs WebSocket / Firebase / similar for real-time.
- **Verification.** No actual verification flow built. The "Verified" badge is hardcoded per mom. Add ID-document upload + manual review or third-party (Stripe Identity, Persona).
- **Location services.** `location` is a string from `NEIGHBORHOODS`. In production, request iOS location permission and use a geocoding service.
- **Push notifications.** Not implemented. Required for "X moms confirmed your invite" / "New match nearby" / etc.
- **Group chat for joined events.** Currently shows "opens after joining" placeholder.
- **Profile photo upload.** Currently using initials avatars. Add image upload + crop UI.

---

## 30. Demo affordances (remove for production)

- The "Restart" button on YouTab — resets all state. Useful for demos, remove for production.
- Hardcoded `SAMPLE_MOMS` (4 moms). Replace with API fetch.
- Hardcoded `SUGGESTED_EVENTS` (8 events). Replace with API fetch.
- Hardcoded `PLACES`. Replace with venue API + user-generated content.
- The 7-day trial timer is visual-only (no enforcement). Wire to billing backend.

---

*End of requirements document. Maintained alongside `MamaApp_v1.jsx`.*
