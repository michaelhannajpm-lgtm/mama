# Matches redesign — full-screen photo deck + top toggle

**Status:** approved 2026-05-06
**Scope:** Matches tab in `MainApp`, the post-signup landing route, and the bottom tab bar.

## Goal

Turn the Matches tab into the visual heart of the app — a full-screen photo deck users see immediately after signup, with a clear toggle between 1:1 mom matches and group events. Reorder the bottom tab bar so Matches is the first tab.

## Non-goals

- No swipe-to-like / swipe-to-skip gestures. Anti-Tinder positioning stays — vertical scroll only.
- No new group chat surface. The chat button on a group card opens a placeholder toast for this iteration.
- No new event-details surface. The info button on a group card opens a placeholder toast.
- No premium gating changes. The 3-message limit, profile blur, and attendee blur all stay exactly as today.
- No image curation pipeline. Photos are static Unsplash placeholder URLs hard-coded into the data files.

## User flow

1. User completes onboarding through `AccountScreen`.
2. `handleAccountComplete` in `App.jsx` runs and (when no `pendingAction` is queued) advances `step` to 7, mounting `MainApp`.
3. `MainApp` mounts with `tab = 'matches'` (changed from `'calendar'`).
4. The Matches tab opens with the **Moms** side of the toggle active and the first mom's full-screen card visible.
5. User scrolls vertically to reveal the next mom card. Native scroll-snap aligns each card to the viewport.
6. Tapping the **Groups** half of the toggle switches the deck to event cards (sage accent). Same vertical-scroll mechanic.
7. Action buttons on each card open existing sheets (`ScheduleSheet`, `MessageSheet`, `ProfileSheet`) or, for groups, set `joinedEvents` / fire a placeholder toast.

## Layout — phone frame split

The phone frame is ~375 × 740. Inside the Matches tab:

| Region | Height | Contents |
|---|---|---|
| Status bar | ~44 | (existing) |
| Top toggle | ~70 | Pill segmented `[ ♥ Moms · N | 👥 Groups · M ]` |
| Card deck | flex / fills | Vertical-snap scroll of full-screen cards |
| Tab bar | ~78 | (reordered, see §6) |

The card itself targets the visible area between toggle and tab bar — roughly 540–560px tall on the prototype phone frame.

## 1. Top toggle — `MatchesToggle`

Lives at the top of `MatchesTab`. State (`view: 'moms' | 'groups'`) is owned by `MatchesTab`.

Visual spec:

- Outer pill: `borderRadius: 999`, `padding: 5`, background `C.creamSoft`, `border: 1px solid C.divider`. Sits in a horizontal-padded container with ~16–20px page padding above and below.
- Two buttons, `flex: 1` each, `borderRadius: 999`, `padding: 10px 14px`, font `Albert Sans` 13px / 600.
- Active button: filled background (terracotta on Moms, sage on Groups), white text, `boxShadow: 0 2px 8px rgba(...,.4)`.
- Inactive button: transparent background, `C.inkMuted` text.
- Counts inline: `♥ Moms · {momCount}` / `👥 Groups · {groupCount}` — both update from the live arrays (no caching).
- Heart and people emojis can be replaced with `lucide-react` `Heart` and `Users` icons at 13px for design consistency.

Counts:

- `momCount = SAMPLE_MOMS.length` (current data: 4).
- `groupCount = SUGGESTED_EVENTS.length` (no upcoming-only filter — keep parity with EventsTab's existing card list).

## 2. Mom card — `MatchCardFull`

New component at `src/components/MatchCardFull.jsx`. Receives one `mom` and the open-sheet callbacks.

Layout (top→bottom):

1. **Hero (≈60% of card height):** background-image is `mom.photo` with `cover` sizing. A bottom-up gradient overlay (`linear-gradient(180deg, transparent 50%, rgba(0,0,0,.6))`) provides legibility for the text below.
2. **Top-right pill** on the hero: `{overlap}% match` — white pill (`rgba(255,255,255,.92)`), ink text, `Albert Sans` 11px / 600.
3. **Bottom-left text on hero:** name + age in `Fraunces` 26px / 500 (`Sara K. · 32`), then a thin secondary line `Kids {kids} · {distance} away` in `Albert Sans` 12px / 500 white at 92% opacity.
4. **Lower panel (≈40%):** background `C.paper`, padding `14px 18px`.
   - Eyebrow: `SHARED GROUND` — `Albert Sans` 10.5px / 600, terracotta, letter-spacing `.16em`, uppercase.
   - Chip row: each shared item rendered as a chip (`background: C.terracotta + '15'`, terracotta text, `Albert Sans` 11px / 600, padding `4px 10px`, fully rounded). See §4 for the matching algorithm.
   - Bio line: `mom.bio`, truncated to one line with ellipsis (`Albert Sans` 12px / 400, `C.inkSoft`, line-height 1.4).
   - Action row (`marginTop: 14px`, `display: flex`, `gap: 8px`):
     - Primary `Schedule` button: `flex: 1`, height 42, `borderRadius: 14`, `background: C.ink`, `color: C.cream`, `Albert Sans` 12px / 600. Calls `openSchedule(mom)`.
     - Square chat button: `width: 44`, height 42, `borderRadius: 14`, `background: C.paper`, `border: 1px solid C.divider`, contains `MessageCircle` icon. Calls `openMessage(mom)`.
     - Square profile button: same shape, contains `User` icon. Calls `openProfile(mom)`.

Card chrome: outer wrapper `borderRadius: 28`, `overflow: hidden`, `background: C.cream`. Sits in the scroll container with ~16px horizontal page padding.

## 3. Group card — `GroupCardFull`

New component at `src/components/GroupCardFull.jsx`. Receives one `event`, the user's matched moms (for overlap), and `onJoin` / `onChat` / `onDetails` callbacks.

Differs from the mom card in these ways only:

- **Sage** (`C.sageDark`) accent everywhere terracotta would be (toggle pill match, `+ I'm in` button background, eyebrow color).
- Top-left pill on hero: `GROUP` in sage with white text.
- Top-right pill on hero: short date `SAT · MAY 11` (no `% match`).
- Hero text bottom-left: event name in `Fraunces` 24px / 500, then `{time} · {place} · {going} going`.
- Eyebrow `FROM YOUR MATCHES` (sage) instead of `SHARED GROUND`. Followed by an avatar stack of moms from `SAMPLE_MOMS` whose `freeSlots` include the slot string `` `${event.day}-${event.bucket}` `` (e.g. `Sat-morning` for the Saturday Playgroup), plus a text label like `"Sara, Aisha + Priya going"`. If the overlap list has 0 entries, render `"{going} going"` as a fallback. If 1–2 entries, list names; if 3+, list first two and `+N more`.
- Below the overlap stack: `SHARED GROUND` eyebrow with sage chips for `event.tags` (or a sensible 2–3-item subset).
- Action row:
  - Primary `+ I'm in` button — sage background, white text. After joining, swaps to `✓ Going` (sage-dark text on sage-15% background). Calls `onJoin(event)`.
  - Square chat button (group thread placeholder): calls `onChat(event)` which fires a `flash("Group chat coming soon")` for now.
  - Square info button: calls `onDetails(event)` which fires `flash` for now.

## 4. Shared-ground matching

For the mom card, "shared ground" is the intersection of the user's profile interests/values with the mom's:

```
const userTags = [...(profile.interests || []), ...(profile.values || [])];
const momTags  = [...(mom.interests || []), ...(mom.values || [])];
const shared   = momTags.filter(t => userTags.includes(t));
const display  = shared.length ? shared.slice(0, 3) : (mom.tags || []).slice(0, 3);
```

Render up to 3 chips. The fall-back to `mom.tags` covers the case where the user skipped the values/interests screens.

For the group card, the chip row uses `event.tags` directly (no profile intersection — events don't carry mom-style values).

## 5. Vertical scroll deck

Both decks render as:

```jsx
<div style={{
  height: '100%',
  overflowY: 'auto',
  scrollSnapType: 'y mandatory',
  scrollbarWidth: 'none',
}}>
  {items.map(item => (
    <div key={item.id} style={{
      scrollSnapAlign: 'start',
      padding: '12px 16px',
      minHeight: '100%',
    }}>
      <CardFull ... />
    </div>
  ))}
</div>
```

Native scroll-snap handles the snapping. No JS gesture library, no virtualization (4–6 cards is small). The `minHeight: '100%'` ensures each item fills the deck region so snapping behaves predictably even when a card's content is shorter than the available height.

Switching the toggle remounts the deck (different items, different keys) — the new deck always opens at scrollTop 0.

## 6. Bottom tab bar — reorder + bigger labels

In `src/screens/MainApp/index.jsx`:

- Default `useState('matches')` (was `'calendar'`).
- New tab order in the render array: `matches, calendar, places, events, profile` (was `calendar, places, events, matches, profile`).
- Bump label `font-size` from `10px` to `11.5px`. Keep icon size at 19px. Keep the existing terracotta-on-active treatment.

This addresses TODO #8 ("bigger tab labels") incidentally.

## 7. Data additions

### `src/data/moms.js`

Add a `photo` field to each entry in `SAMPLE_MOMS`. Choose four warm, diverse Unsplash portraits (mom-and-kid or mom-portrait imagery). Format:

```js
photo: 'https://images.unsplash.com/photo-...?w=600&auto=format&fit=crop',
```

Pick the URLs to feel intentional — avoid stock-photo cliché. Keep `hue` field for fallback (used by the avatar stack on group cards and elsewhere).

`MOM_POOL` does not need photos — it isn't shown in the new deck.

### `src/data/events.js`

Add a `photo` field to each entry in `SUGGESTED_EVENTS`. Pick imagery that matches the event vibe (park picnic, café, library story-time, kids' music class, etc.).

## 8. File-level changes

| Action | Path | Purpose |
|---|---|---|
| Edit | `src/screens/MainApp/index.jsx` | Default tab `'matches'`, new tab order, label size 11.5px |
| Rewrite | `src/screens/MainApp/MatchesTab.jsx` | Owns toggle state, renders mom or group deck |
| New | `src/components/MatchCardFull.jsx` | Full-screen mom card |
| New | `src/components/GroupCardFull.jsx` | Full-screen event card |
| Edit | `src/data/moms.js` | Add `photo` to each `SAMPLE_MOMS` entry |
| Edit | `src/data/events.js` | Add `photo` to each `SUGGESTED_EVENTS` entry |
| Delete | `src/components/MiniMatchCard.jsx` | Verified only used by the old MatchesTab — safe to remove |

## 9. Routing — landing on Matches after signup

`App.jsx` already advances `step` to 7 inside `AccountScreen.onNext` (which runs after `setAccount`). No change to `handleAccountComplete` itself — the only change is the default tab in `MainApp`. The "Match me" button on `AccountScreen` therefore lands the user on the Matches deck without any new state plumbing.

## 10. Token discipline

- All colors via `C.tokenName`. The terracotta accent on Moms uses `C.terracotta`; the sage accent on Groups uses `C.sageDark` for buttons and `C.sage` for atmospheric tints. White overlays on hero photos use `rgba(255,255,255,.92)` for legibility — this is acceptable since it's a contrast aid, not a brand color.
- Fonts: `Fraunces` for the name/title on hero, `Albert Sans` for everything else.
- No new keyframes. The toggle slide-in can use a simple `transition: transform .25s ease`.

## 11. Verification

After implementation:

- Run `npm run dev`. Manually walk the full onboarding to the AccountScreen, click "Match me," confirm the app lands on the Matches tab with the Moms toggle active.
- Confirm vertical scroll-snaps between mom cards.
- Tap each of the three action buttons — verify each existing sheet opens correctly.
- Tap the Groups half of the toggle. Confirm the deck switches to event cards with sage styling.
- Tap "I'm in" — confirm the button state flips to "Going" and the event is in `joinedEvents`.
- Switch tabs. Confirm new tab order and that labels are readable.
- Confirm no other screen broke (Calendar, Places, Events, Profile all still render).

## 12. Open questions / risks

- **Photo loading flicker.** Hero images load over the network. For a prototype this is acceptable; if it feels bad in practice we can preload by setting `<link rel="preload" as="image">` for the four mom photos in `index.html`. Out of scope for first pass.
- **Unsplash rate limiting.** The photos are direct image URLs (not API calls), so this should be fine for a prototype.
- **Card height on small screens.** The phone frame is fixed (~740px) so this is constrained. Real mobile would need a `min-height: 100dvh` strategy — out of scope while we're in the phone-frame mock.
