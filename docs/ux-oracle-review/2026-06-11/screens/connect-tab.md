# Connect Tab — `src/screens/MainApp/index.jsx` tab id `connect`

- **File:** `src/screens/MainApp/ConnectTab.jsx` (1504 lines)
- **Purpose:** Moms + groups discovery. Three sections: "Recommended Moms for you" (3-up compact card grid), "Upcoming meetups" (3-up grid, live events filtered to meetup type), "Popular Mom Groups" (list of discussion cards). Hosts the SeeAll sheets for moms and groups, advanced filter drawers (MomsAdvancedFilterSheet, GroupsAdvancedFilterSheet, MeetupsFilterSheet), MomDetailSheet, EventDetailSheet, GroupDiscussionSheet, ShareSheet.
- **Entry / when shown:** Active when `tab === 'connect'` in `MainApp/index.jsx`.
- **Related components/sheets:** `MomCard`, `MomCardSkeleton`, `MomListCard`, `MeetupCard`, `DiscussionCard`, `SeeAllSheet`, `MomDetailSheet`, `EventDetailSheet`, `GroupDiscussionSheet`, `MeetupsFilterSheet`, `MomsAdvancedFilterSheet`, `GroupsAdvancedFilterSheet`, `ShareSheet`, `InviteFriendButton`, `PresenceDot`.
- **Data dependencies:** `nearbyMoms` / `nearbyLoading` (live, `/api/mom-profiles/nearby`), `events` + `thisWeek` / `eventsLoading` (live, `/api/events`). `TOP_DISCUSSIONS` / `GROUP_DISCUSSIONS` are static local imports from `src/data/discussions.js`.

## Current state (wireframe)

```
┌─────────────────────────────────┐
│  [header from MainApp shell]    │
├─────────────────────────────────┤
│  Recommended Moms for you  See all > │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │ 88px │ │ 88px │ │ 88px │   │  ← 3-up compact grid
│  │photo │ │photo │ │photo │   │
│  │ Name │ │ Name │ │ Name │   │
│  │ kids │ │ kids │ │ kids │   │
│  │ tags │ │ tags │ │ tags │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  Upcoming meetups    See all >  │
│  ┌──────┐ ┌──────┐ ┌──────┐   │  ← same MomCardSkeleton shape (WRONG)
│  │70px  │ │70px  │ │70px  │   │    real cards are MeetupCard (70px hero
│  │photo │ │photo │ │photo │   │    + date chip + title + going avatars)
│  │title │ │title │ │title │   │
│  │place │ │place │ │place │   │
│  └──────┘ └──────┘ └──────┘   │
│                                 │
│  Popular Mom Groups  See all >  │
│  ┌─────────────────────────────┐ │  ← static TOP_DISCUSSIONS, no skeleton
│  │ [icon] Title       Members  │ │
│  │        online dot  latest   │ │
│  └─────────────────────────────┘ │
│     (repeated x3–4)              │
│                                 │
│  [InviteFriendButton]           │
└─────────────────────────────────┘
```

## Audit findings

| # | Area | Severity | Finding (`file:line`) | Recommendation |
|---|------|----------|-----------------------|----------------|
| 1 | Loading contract | **High** | The "Upcoming meetups" section uses `MomCardSkeleton` (88px hero, name, two tag rows) as its loading placeholder, but the real card is `MeetupCard` (70px hero + date chip overlay + title + place + going avatar stack). The footprint mismatch causes a visible layout shift when live meetup cards swap in. `ConnectTab.jsx:1250–1253` | Create a `MeetupCardSkeleton` that mirrors the 70px hero + two text lines + avatar row. Use it in the `eventsLoading` branch. |
| 2 | Premium / config | **High** | `freeLimit` is hardcoded to `3` when passed to `MomDetailSheet` (`ConnectTab.jsx:1416`). The prop is never received from `MainApp/index.jsx` (compare with `App.jsx:697` where `dmFreeLimit` is threaded to `MessageSheet`). If the admin changes `dmFreeMessageLimit` via `/api/config`, `MomDetailSheet` launched from Connect still enforces a stale value. The `MomListCard` component also receives `freeLimit = 3` as a prop default (`ConnectTab.jsx:343`). | Add `freeLimit` to ConnectTab's prop list and thread it from `MainApp/index.jsx` (sourced from `dmFreeLimit` which is already available). Remove the hardcoded `3` from the `MomDetailSheet` call site. |
| 3 | Loading contract | **Medium** | "Popular Mom Groups" renders directly from the static `TOP_DISCUSSIONS` import (`ConnectTab.jsx:1270–1278`) with no loading state and no empty state. There is no `*Loading` flag for discussion data. While the data is currently static, the section header always appears above live-looking content and the spec demands the three-state contract for every API-backed or quasi-dynamic surface. If discussions are ever hydrated from an API, there is no scaffold to slot the states into. | Add a `discussionsLoading` prop path (even if it's always `false` today) and a `DiscussionCardSkeleton` matching the 42px icon + title + member line. Add a warm empty state: "No active groups yet — check back soon." |
| 4 | Hardcoded hex | **Medium** | Multiple hardcoded hex values that bypass design tokens: `'#8A6610'` (saffron foreground used twice, `ConnectTab.jsx:556, 619`), `'#fff'` throughout (e.g. lines 135, 157, 172, 191, 265, 291, 381, 403). `'#fff'` should be `C.paper` for card surfaces or simply the contrast color for dark backgrounds. `'#8A6610'` should be a token (there is no `C.saffronDark` today; recommend adding or using `C.saffron` at reduced opacity). | Add `C.saffronDark` to `src/theme.js` (`#8A6610`) and replace every raw hex. Replace all `'#fff'` card `background` values with `C.paper`. |
| 5 | Semantic color | **Medium** | The "Propose time & place for first meetup" toggle button uses a coral dashed border and coral text (`ConnectTab.jsx:668–669`). This is correct for 1:1 intimacy. However, the "Upcoming meetups" section header routes "See all" to `goToExploreSeeAll?.('meetups')` — meetups are a group/community action. The meetup section could reasonably use sage accents for the "going" count and avatars; currently the MeetupCard going avatars use `C.coral`, `C.sage`, and `C.lilac` together (`ConnectTab.jsx:856`), which is inconsistent: the first avatar circle is coral (a 1:1 signal) inside a group event. | Change the first going-avatar background from `C.coral` to `C.sage` so all going avatars carry the community color. |
| 6 | Empty state | **Medium** | Both empty states for moms and meetups are plain `C.muted` text strings — "No matches yet — check back soon." and "No meetups nearby yet — check back soon." (`ConnectTab.jsx:1232, 1259`). Neither is an invitation or a forward-pull. They also disappear below the `SectionHead`, leaving the header floating above nothing visually. | Wrap each empty state in a bordered card (like the Home tab's "your *village* is forming" state). For moms: "Your *village* is forming — expand your radius or check back tomorrow." With a secondary "Update preferences" CTA. For meetups: "No meetups yet — be the first to host one." |
| 7 | Mobile ergonomics | **Medium** | The "Propose time & place for first meetup" inline composer (`ConnectTab.jsx:682–788`) inside `MomListCard` (which is itself inside `SeeAllSheet`) layers day-chips, time-chips, a text input, and a send button. On a 375px viewport, at the bottom of a full-screen `SeeAllSheet`, the chips can be cut off or require significant scroll before the send button is reachable. | Consider keeping the proposal composer as a separate half-height sheet rather than an inline accordion, reducing scroll depth inside an already-scrollable drawer. |
| 8 | Accessibility | **Medium** | `MomCard` (`ConnectTab.jsx:130–284`) and `MeetupCard` (`ConnectTab.jsx:794–868`) use `<img ... alt="">` for the hero photos. Mom photos are identity-communicating content, not decorative. A screen reader user has no way to distinguish one mom card from another visually. | Set `alt={item.firstName || item.name || 'Mom profile photo'}` on MomCard (line 149) and `alt={item.title}` on MeetupCard (line 803). |
| 9 | Content clarity | **Low** | The "Upcoming meetups" `SectionHead` link routes to `goToExploreSeeAll?.('meetups')`, jumping the user to the Explore tab. The label says "See all" but the destination is a different tab. A mom who taps it will lose her position on Connect with no warning. (`ConnectTab.jsx:1249`) | Change the link label to "Explore meetups" or add a subtle "(Explore tab)" annotation so the navigation is clearly cross-tab. |
| 10 | Typography | **Low** | The match-percentage pill on `MomCard` (`ConnectTab.jsx:169–179`) uses `fontSize: 9` and `fontWeight: 800`. At 9px on a device with standard font scaling this is below the 11px minimum for legible small labels. | Raise to `fontSize: 10.5` minimum. |

## Key issues (prose, ranked)

**1. Meetup skeleton shape mismatch (High)** is the most immediately noticeable defect. When `eventsLoading` is true, a 3-up grid of MomCardSkeleton (88px tall hero + name chips) appears, then snaps to a 3-up grid of MeetupCard (70px hero + date chip overlay + smaller text). The layout shift is jarring, breaks the "calm" aesthetic, and communicates instability to a new user. One `MeetupCardSkeleton` component with the correct dimensions fixes this entirely.

**2. `freeLimit` hardcoded to 3 (High)** is a premium-model integrity issue. The architecture spec (`architecture.md`, `premium-model.md`) is explicit: DM limits come from `appConfig.dmFreeMessageLimit`, not a constant. If a product decision raises the free limit (e.g. a re-engagement campaign), the MomDetailSheet launched from Connect will silently enforce the old limit while MessageSheet enforces the new one — inconsistent gating that erodes trust.

**3. Popular Mom Groups lacks the three-state contract (Medium)** — the groups section has no loading state and no empty state, violating the audit contract for every data-backed (or soon-to-be-data-backed) surface. It also renders raw static data with no `flash` or feedback on join, while the advanced filter button exists in the SeeAll but there is nothing to filter against. If `GROUP_DISCUSSIONS` is ever migrated to a live API endpoint, this section will break silently.

**4. Hardcoded hex escapes the token system (Medium)** — `'#8A6610'` is used twice as the saffron-dark text color but is absent from `src/theme.js`. Any palette update that changes saffron will leave this text color stranded.

## Recommended redesign

```
┌─────────────────────────────────┐
│  Recommended Moms for you  See all > │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │  [MomCard or MomCardSkeleton] │
│  └──────┘ └──────┘ └──────┘   │
│  [empty: bordered warm card]    │
│                                 │
│  Upcoming meetups  Explore all > │  ← label signals cross-tab jump
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │[MeetupCardSkeleton OR card]   │  ← correct footprint
│  │70px  │ │70px  │ │70px  │   │
│  └──────┘ └──────┘ └──────┘   │
│  [empty: "Host the first meetup"] │
│                                 │
│  Popular Mom Groups  See all >  │
│  [DiscussionCardSkeleton × 3]  │  ← while loading
│  [DiscussionCard × 3]          │
│  [empty: warm bordered card]   │
└─────────────────────────────────┘
```

## Before / after comparison (what changes visually)

| Area | Before | After |
|------|--------|-------|
| Meetup skeleton | 88px hero + 3 text shimmer lines (MomCard shape) | 70px hero + date chip area + 2 text lines + avatar row (correct shape) |
| Meetup "See all" label | "See all" → jumps to Explore | "Explore all" → still jumps but label communicates it |
| Moms empty state | Plain grey text below header | Bordered warm card, forward-pull copy, optional CTA |
| Groups section | Static, no skeleton, no empty state | Skeleton rows visible during any future API fetch; warm empty state |
| freeLimit | Hardcoded `3` | Prop from `appConfig.dmFreeMessageLimit` |
| Going avatars | First circle coral | First circle sage (community signal) |

## Implementation notes

- **`MeetupCardSkeleton`** (new, co-located with `MeetupCard` at `ConnectTab.jsx:794`): `<div style={{ background: '#fff', borderRadius: 12, border: '1px solid C.line', overflow: 'hidden' }}>` → `<Skeleton w="100%" h={70} radius={0}/>` + `<div style={{ padding: '6px 7px 8px' }}>` containing `<Skeleton w="70%" h={10} radius={5}/>`, `<Skeleton w="90%" h={9} radius={5} style={{marginTop:4}}/>`, then a `<div style={{display:'flex', gap:4, marginTop:5}}>` with three overlapping 12px circle skeletons. No color shimmer — `C.skeleton`/`C.skeletonSheen` only.
- **freeLimit threading**: Add `freeLimit` to the `ConnectTab` prop destructure (line 942), default `3`. In `MainApp/index.jsx` line 209, pass `freeLimit={dmFreeLimit}` (already derived at `App.jsx:142`). Remove the literal `3` from line 1416.
- **`'#8A6610'`** → add `saffronDark: '#8A6610'` to `src/theme.js`, replace both usages at lines 556 and 619.
- **Empty states**: Use the same bordered style as Home's "your *village* is forming" card. Background `C.creamSoft`, border `C.divider`, radius 14, padding 16. Headline in Fraunces, body in Albert Sans at `C.muted`.
- **Going avatar color**: `ConnectTab.jsx:856` — change `[C.coral, C.sage, C.lilac][i]` to `[C.sage, C.sage, C.lilac][i]`.

## Acceptance criteria

- [ ] `eventsLoading` branch at line 1250 renders `MeetupCardSkeleton` (not `MomCardSkeleton`) with identical outer dimensions to the real `MeetupCard`.
- [ ] `freeLimit` is a prop on `ConnectTab`; no literal `3` appears in the `MomDetailSheet` call site.
- [ ] `MainApp/index.jsx` passes `freeLimit={dmFreeLimit}` to `<ConnectTab`.
- [ ] Both mom-empty and meetup-empty states are warm bordered cards with forward-pull copy, not plain text.
- [ ] `TOP_DISCUSSIONS` section has at minimum a no-op `discussionsLoading={false}` prop scaffold and a warm empty state for when `TOP_DISCUSSIONS` is empty.
- [ ] `#8A6610` does not appear in ConnectTab.jsx; a `C.saffronDark` token is in `theme.js`.
- [ ] Going-avatar circles at line 856 use `C.sage` for all three positions, or at minimum not `C.coral` for the first.
- [ ] "Upcoming meetups" See-all link label distinguishes the cross-tab navigation (label or annotation updated).
- [ ] `MomCard` img has a non-empty `alt` attribute; `MeetupCard` img has `alt={item.title}`.
