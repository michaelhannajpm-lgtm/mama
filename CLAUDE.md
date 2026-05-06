# Mama — project notes for Claude Code

## What this is

A React prototype for **Mama**, a mom-friendship matching app. Anti-Tinder positioning: the core value is *real meetups*, not endless chat. Aesthetic is editorial-warm — magazine cover energy, terracotta and sage palette.

## File layout

Currently single-file: `src/App.jsx` (~4,000 lines). Everything lives there:

- Color tokens (`C` object near top)
- Custom SVG components (`Sprig`, `MamaLogo`, `Sun3`, `PhoneFrame`, etc.)
- Data constants (`PLACES`, `SAMPLE_MOMS`, `SUGGESTED_EVENTS`, `NEIGHBORHOODS`, `DAYS`, `TIME_WINDOWS`, `MOM_TYPES`, `VALUES`, `INTERESTS`, etc.)
- Onboarding screens: `Splash`, `Screen1` through `Screen8`
- `MainApp` shell with 5 tabs: `CalendarTab`, `PlacesTab`, `EventsTab`, `MatchesTab`, `YouTab`
- Sheets/modals: `ScheduleSheet`, `ProfileSheet`, `MessageSheet`, `CreateAccountSheet`, `PremiumSheet`, `Sheet` (base), `Toast`
- Root `App` component at the bottom — owns all state, handles routing between Splash → onboarding steps → MainApp

If/when you split this up, target structure would be:
```
src/
  App.jsx                 # root component + routing
  data/
    places.js, moms.js, events.js, taxonomy.js
  components/
    Sheet.jsx, MamaLogo.jsx, PhoneFrame.jsx, Pill.jsx, PrimaryBtn.jsx, ...
  screens/
    Splash.jsx, Screen1.jsx ... Screen8.jsx
    MainApp/
      index.jsx
      CalendarTab.jsx, PlacesTab.jsx, EventsTab.jsx, MatchesTab.jsx, YouTab.jsx
  sheets/
    ScheduleSheet.jsx, ProfileSheet.jsx, MessageSheet.jsx, CreateAccountSheet.jsx, PremiumSheet.jsx
```

## Design tokens

Defined as the `C` object near the top of App.jsx:

| Token | Color | Usage |
|-------|-------|-------|
| `C.cream` | `#F6EFE2` | Page background |
| `C.creamSoft` | `#EFE6D2` | Slightly darker cream — for surfaces, sheets |
| `C.paper` | `#FAF5EA` | Lightest — cards |
| `C.ink` | `#2A1E22` | Body text, strong emphasis |
| `C.inkSoft` | `#5A4B4F` | Secondary text |
| `C.inkMuted` | `#8E7A7E` | Tertiary text |
| `C.divider` | `#E2D9C7` | Hairlines |
| `C.terracotta` | `#C8553D` | Primary accent (intimacy, 1:1) |
| `C.sage` / `C.sageDark` | `#A8BCA0` / `#7E9678` | Secondary accent (community, groups) |
| `C.saffron` | `#D9A441` | Tertiary accent (highlights, premium pop) |
| `C.rose` | `#E8B4A0` | Atmospheric wash |
| `C.premium` | (gradient) | Premium card backgrounds |

**Typography:** `Fraunces` for display/serif and headlines (sometimes italic for emphasis). `Albert Sans` for UI, captions, eyebrows. Loaded via Google Fonts inside `App` useEffect.

## Architecture conventions

- **State lifted to App component**: `step`, `splashShown`, `profile`, `prefs` (slots+places), `location`, `distance`, `account`, `pendingAction`, `scheduleMom`, `profileMom`, `messageMom`, `premiumOpen`, `scheduled1to1`, `joinedEvents`, `messageHistory`, `toast`. Helpers `flash()` and `requestAccount()` and `handleAccountComplete()` also live in App.
- **Onboarding is gated by `splashShown` and `step`**: `step` is 0–8, advances via `setStep(n+1)`. StepHeader shows progress.
- **Account-gated actions** (auto-schedule, pick time, join group, etc.) call `requestAccount({ type, mom?, slot?, event? })` if no account; the account sheet then opens, and on completion the queued action replays automatically.
- **Premium gating**: `account.isPremium` boolean drives partial-vs-full views. PremiumSheet has an `onActivate` callback that flips `isPremium: true` and starts a 7-day trial timer (visual only).
- **Animations**: defined as CSS keyframes injected once via `useEffect` in App (`slideUp`, `fadeIn`, `fadeInUp`). Used inline as `style={{ animation: '...' }}`.

## Premium model (current)

| Feature | Free | Plus ($7.99/mo) |
|---------|------|-----------------|
| Receive matches | ✓ | ✓ |
| Schedule 1:1 meetups | ✓ | ✓ |
| RSVP to groups | ✓ | ✓ |
| Set availability + preferences | ✓ | ✓ |
| Message a match | 3 messages per mom | Unlimited |
| Profile depth | Partial (name+initial, broad kids, 2 values, 2 interests, shared-ground highlighted) | Full (bio, all values/interests, exact kid ages, all free slots, met-up history) |
| Group attendees | First 3 visible + count | All visible + DM access |
| Group chat | Read | Read + post |

The "shared ground" terracotta card on profiles **stays free** — it's the matching signal that converts users.

---

## TODO — UX improvements (prioritized)

Each item is a discrete, achievable task. Ask Claude Code to do them one at a time and commit between each.

### Top 3 (highest impact)

1. **Persona-based onboarding.** Replace the dense profile screen (kids + mom-types + values + interests) with one screen showing 4-5 picker cards: *Working mama · Stay-at-home · New mom · Toddler mom · Big-kid mom*. Each pre-fills sensible defaults for `profile.values`, `profile.interests`, `profile.momTypes`. Keep the kids stepper — that's specific. Goal: cut onboarding completion friction by 50%+.

2. **When-screen redesign — tap-once-per-day.** Current Screen 6 is a 7×5 grid (35 toggles). Restructure: top row of 7 day pills (tap to enable that whole day with sensible default time windows), then only enabled days expand to show editable time windows below. Power users can refine; everyone else taps 3-4 days and is done.

3. **Live "X moms match" counter.** Add a small persistent counter at the bottom of the When screen, the Where screen, and the persona picker that updates in real-time as preferences narrow: *"7 moms match your week."* Confirms matching is real + creates dopamine pull forward. Computed by intersecting selected slots/places against `SAMPLE_MOMS`.

### Next round

4. **Match overlap on group cards.** Show *"Sara + 2 of your matches going"* on EventsTab cards. Compute overlap between event attendees (mock from SAMPLE_MOMS) and the user's matched moms.

5. **Empty-state CTAs.** Calendar's *"Nothing on the calendar yet"* should have a button: *"Schedule your first meetup →"* that jumps to Matches tab. Same pattern for Chat (when added) and any other empty state. Use `setTab('matches')` from MainApp.

6. **Filter chips on Matches tab.** Add a row of filter chips under the headline: *This week · Same kid ages · Weekends · Verified · < 1 mile*. Filter the displayed `SAMPLE_MOMS` accordingly. State lives locally in MatchesTab.

7. **Confirm-before-paywall.** When a free user taps Auto-schedule and `requestAccount` fires, the CreateAccountSheet pops with a one-line micro-confirmation above the form: *"Sign up to schedule Mon 9 AM with Sara K."* Already partially implemented via the pending-action summary card — verify and improve copy.

### Polish

8. **Bigger tab labels** (or icon-only with active label below — Instagram pattern). Current 10px labels on 5 tabs feel cramped.

9. **Save + resume onboarding.** Persist `step`, `profile`, `prefs`, `location`, `distance` to localStorage on each change. On Splash render, detect partial state → show *"Welcome back, you're on step N"* and a *"Continue"* CTA alongside *"Start over"*.

10. **Undo toast for destructive actions.** When user removes a place / unjoins a group / cancels a meetup, show *"Removed · Undo"* for 5s. The Toast component exists; add an `action` prop and an inverse-action callback.

11. **Search bar in Places tab.** Add a search input that filters across `PLACES` (and TOP_PICKS). Local state in PlacesTab.

### Things NOT to change for ease-of-use

- 3-message free limit on chat — intentional monetization friction, leave it.
- Partial profile blur with full reveal in Plus — converts well, leave it.
- Verified-only positioning even though it slows signup — it's the moat.

---

## Common Claude Code prompts

- *"Implement TODO #1 from CLAUDE.md — persona-based onboarding."*
- *"Refactor src/App.jsx into separate files under src/screens/, src/components/, src/data/."*
- *"Add a new TimeWindowsPill component with size variants."*
- *"The tab bar feels cramped — implement TODO #8."*
- *"Create a SAMPLE_MOMS expansion: add 4 more moms with the same shape."*

## Things to avoid breaking

- The animation `useEffect` in `App` — adds CSS keyframes to `document.head`. If you split files, keep the animation injection in App or move to `index.css`.
- The `<link>` element for Google Fonts — also in App's useEffect. Same advice.
- The `PhoneFrame` mockup — wraps the entire app in a centered phone-shaped container. The app is designed for ~375×740px phone resolution.
