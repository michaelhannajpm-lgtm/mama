# Invitation to Event — design spec

**Date:** 2026-06-02
**Status:** Approved, ready for implementation plan
**Surface:** `/prototype` and `/live` (the interactive product)

## Summary

Let a mom invite other moms to a group activity/event. One **Invite** entry
point on each group card opens a sheet with two mechanisms:

1. **Share a link** externally — a mocked share sheet (Copy link + Text /
   Facebook / Instagram targets).
2. **Tag moms from the app** — multi-select her matched moms plus moms already
   going; each tagged mom receives an **in-app notification** inviting her to
   join.

The receiving side is built and demoable: a notification **bell + dropdown** in
the MainApp shell lists pending invites with **Join** / **Dismiss**. A sample
inbound invite is seeded so the inbox is non-empty on first load.

This is a **community** action, so it uses the **sage** palette throughout —
coral stays reserved for 1:1 intimacy (per `.claude/context/design-tokens.md`).

## Background

The app already has a 1:1 `invite` action (inviting one mom to a *scheduled
meetup*, fired from `ScheduleSheet` → `pendingAction.type === 'invite'`). That
is unrelated to this feature and is **not** changed here. This feature is about
inviting moms to an existing **group event** (`SUGGESTED_EVENTS` in
`src/data/events.js`, rendered by `GroupCardFull`).

There is **no notification system** in the app today. This spec introduces the
first one, intentionally scoped small.

## Goals

- A mom can share any group event via an external link (mocked).
- A mom can tag one or more moms (matches + others going) to invite them.
- Tagged moms receive a persistent, actionable in-app notification.
- An invitee can Join (which RSVPs her into the event) or Dismiss the invite.
- The whole loop is demoable in a single-user prototype.

## Non-goals (explicit follow-ups)

- **Supabase persistence** of invites/notifications — client-only for now.
  (Mirrors the existing `savedItems` / `profile.verified` client-only state;
  see `.claude/context/todo.md` items 2.)
- **Real delivery** to other users' devices (single-user prototype — no real
  recipients). The seeded inbound notification stands in for the invitee POV.
- **Real share targets / OAuth** (Text / Facebook / Instagram icons are
  visual-only; only Copy link performs a real action).
- **Push notifications** (no service worker / FCM).
- Inviting moms to **1:1 scheduled meetups** (already exists; untouched).

## User stories

1. As a mom looking at "Stroller Run", I tap **Invite**, copy the event link,
   and paste it into my group text.
2. As a mom, I tap **Invite**, select Sara and Mia from my matches, tap **Send
   invites**, and see a confirmation toast.
3. As an invited mom, I see a **1** badge on the bell, open the dropdown, read
   "Sara invited you to Stroller Run · Tue · 9:00 AM", tap **Join**, and the
   event appears in my Profile → Upcoming.
4. As an invited mom, I tap **Dismiss** and the invite leaves my inbox.

---

## Architecture

State stays in `App.jsx` (per `.claude/context/architecture.md`); everything
else is leaf components/sheets. Dependency direction unchanged:
`data ← components ← sheets ← screens ← App.jsx`.

### New state in `App.jsx`

```js
// Seeded from SAMPLE_NOTIFICATIONS so the inbox is demoable on load.
const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

// The group event whose Invite sheet is open (null = closed).
const [inviteEvent, setInviteEvent] = useState(null);
```

### Notification shape

```js
{
  id: 'n-1',                 // stable string id
  type: 'event-invite',      // only type for now; future-proofs the inbox
  eventId: 'e-stroller-run', // FK into SUGGESTED_EVENTS (by `id`)
  fromMom: { id, name, hue },// minimal sender info for avatar + label
  status: 'pending',         // 'pending' | 'joined' | 'dismissed'
  ts: '2026-06-02T14:30:00Z',// ISO string (sortable; newest first)
}
```

- `status` drives display: only `pending` shows in the dropdown list; the
  badge counts `pending`.
- `joined` and `dismissed` are retained in state (not deleted) so the
  transition is non-destructive and could later show a history; they simply
  fall out of the pending list.

### New data file — `src/data/notifications.js`

Pure data + small helpers (mirrors `events.js` / `moms.js`).

```js
export const SAMPLE_NOTIFICATIONS = [
  {
    id: 'n-seed-1',
    type: 'event-invite',
    eventId: 'e-stroller-run', // a real SUGGESTED_EVENTS id (Tue · 9:00 AM Stroller Run)
    // fromMom references a real SAMPLE_MOMS entry (Sara K., id 1).
    fromMom: { id: 1, name: 'Sara K.', hue: 'linear-gradient(135deg,#E8B4A0,#C8553D)' },
    status: 'pending',
    ts: '2026-06-02T14:30:00Z',
  },
];

// Count of actionable invites (drives the bell badge).
export const pendingCount = (notifications) =>
  notifications.filter((n) => n.status === 'pending').length;
```

- `fromMom` should reference a real `SAMPLE_MOMS` entry (id, name, hue) so the
  avatar initials + color match an actual mom. Pick one whose `freeSlots`
  plausibly overlaps the seeded event.
- `ts` is a hardcoded ISO string (no `Date.now()` in seed data — keeps it
  deterministic).

### Handlers in `App.jsx`

```js
// Open the Invite sheet for an event, gating on account first.
const openInvite = (event) => {
  if (!account) { requestAccount({ type: 'event-invite', event }); return; }
  setInviteEvent(event);
};

// Tag-and-send: confirmation toast only (no real recipients in prototype).
const sendEventInvites = (event, momNames) => {
  setInviteEvent(null);
  flash(`Invited ${momNames.join(', ')} ✦`);
};

// Copy link: real clipboard write + toast.
const shareEventLink = (event) => {
  const url = `https://gomama.app/e/${event.id}`;
  navigator.clipboard?.writeText(url);
  flash('Event link copied ✦');
};

// Invitee accepts: RSVP into the event + mark notif joined.
const joinFromInvite = (notif) => {
  setJoinedEvents((j) => (j.includes(notif.eventId) ? j : [...j, notif.eventId]));
  setNotifications((ns) =>
    ns.map((n) => (n.id === notif.id ? { ...n, status: 'joined' } : n)));
  const ev = SUGGESTED_EVENTS.find((e) => e.id === notif.eventId);
  flash(`You're in${ev ? ` · ${ev.name}` : ''} ✦`);
};

const dismissInvite = (notif) => {
  setNotifications((ns) =>
    ns.map((n) => (n.id === notif.id ? { ...n, status: 'dismissed' } : n)));
};
```

### Account gating + replay

`requestAccount({ type: 'event-invite', event })` opens `CreateAccountSheet`.
On completion, `handleAccountComplete` gets a new branch:

```js
} else if (a.type === 'event-invite' && a.event) {
  setInviteEvent(a.event);
  flash(`Welcome, ${acct.firstName} ✦`);
}
```

**Gating policy:** sending invites and sharing are **free**, not premium-gated.
Inviting moms to real meetups is the core product value (consistent with RSVP
and 1:1 scheduling being free; only messaging is gated — see
`.claude/context/premium-model.md`). Account creation is still required to send,
matching every other write action.

---

## Components

### `src/sheets/InviteSheet.jsx` (new)

Bottom sheet using the existing `Sheet` component (`tall`). Props:

```
InviteSheet({ event, matches, going, onShareLink, onSend, onClose })
```

- `matches` — the user's matched moms (`SAMPLE_MOMS`, same set MatchesTab shows).
- `going` — moms already going to this event (`GroupCardFull` already computes
  this as `SAMPLE_MOMS.filter(m => m.freeSlots.includes(\`${event.day}-${event.bucket}\`))`).
  Extract that overlap logic into a shared helper so the sheet and the card
  agree (see "Refactor" below).

Layout, top to bottom:

1. **Eyebrow + title** — eyebrow `INVITE TO` in `C.sageDark`; title
   `<EventName>` in Fraunces. Subtitle line: `<time> · <place>`.
2. **Share a link** section
   - `Copy link` primary-ish button (sage), full width → `onShareLink(event)`.
   - Row of three round icon buttons: Text (`MessageSquare`), Facebook,
     Instagram. Visual-only; tapping fires `flash('Opening share…')` or is inert
     — **no real navigation**. Label the row "Share to" in muted caps.
3. **Divider** ("or" hairline).
4. **Tag moms here** section
   - Caption: "Tag moms from the app — they'll get an invite."
   - De-duplicated union of `going` + `matches` (going first), rendered as
     tappable rows: avatar (initials on `m.hue`), first name, optional
     "going" pill for moms already attending. Tapping toggles a sage check
     (`Check` icon) and adds/removes from local `selected` set.
   - Local state: `const [selected, setSelected] = useState(new Set())`.
5. **Sticky CTA** — `Send invites (N)` sage button, full width.
   - Disabled when `selected.size === 0`.
   - On tap → `onSend(event, selectedMoms.map(m => m.name.split(' ')[0]))`.

Palette: all accents `C.sageDark` / `C.sage`; surfaces `C.paper` / `C.cream`;
text `C.ink` / `C.inkSoft` / `C.muted`. No hardcoded hex.

### `src/components/NotificationBell.jsx` (new)

```
NotificationBell({ notifications, onJoin, onDismiss })
```

- Renders a `Bell` icon button. If `pendingCount(notifications) > 0`, overlay a
  small coral-free **sage badge** (community) with the count, top-right of the
  icon. (Badge uses `C.coralDeep`? — **No.** Use `C.sageDark` to stay in the
  community lane. A red-style badge would cross the streams.)
- Local `const [open, setOpen] = useState(false)` toggles a **dropdown panel**
  anchored under the bell (absolute-positioned within the phone frame, right
  aligned, max-width ~300px, max-height with internal scroll).
- Panel header: "Invitations".
- Empty state (no pending): "You're all caught up ✦" in muted text.
- Each pending invite row:
  - Sender avatar (initials on `fromMom.hue`).
  - Text: `<FirstName> invited you to <EventName>` + sub-line
    `<dateLabel> · <time>` (resolve event via `SUGGESTED_EVENTS`).
  - Two buttons: **Join** (sage filled) → `onJoin(notif)`; **Dismiss** (ghost) →
    `onDismiss(notif)`.
- Tapping outside or a row action closes the panel (`Join`/`Dismiss` close it).

The bell + panel are rendered in the **MainApp shell** (`MainApp/index.jsx`),
absolutely positioned in the top-right just below `StatusBar`, so it overlays
every tab without restructuring each tab's own header. It must not shift tab
content layout.

---

## Wiring

### `src/components/GroupCardFull.jsx`

Add an **Invite** affordance to the action row. The row currently holds:
`I'm in` (flex-1) · `Chat` (44px icon) · `Details` (44px icon).

- Add a new `UserPlus` icon button (44px, `C.paper` bg, `C.divider` border,
  `C.ink` icon) between `I'm in` and `Chat`.
- New prop `onInvite: (event) => void`; button calls `onInvite(event)`.
- Verify the four controls fit at 375px: `I'm in` is flex-1 and absorbs the
  remaining width after three 44px buttons + three 8px gaps (~150px). It fits;
  confirm visually during QA. If too tight, drop the `Details` button's gap or
  reduce icon button width to 42px.

### `src/screens/MainApp/index.jsx`

- New props from `App.jsx`: `notifications`, `onJoinInvite`, `onDismissInvite`,
  `onInvite` (the event-invite opener).
- Render `<NotificationBell notifications onJoin={onJoinInvite}
  onDismiss={onDismissInvite} />` absolutely top-right.
- Thread `onInvite` into `MatchesTab`.

### `src/screens/MainApp/MatchesTab.jsx`

- Accept `onInvite` and pass it to every `GroupCardFull` as
  `onInvite={onInvite}`. No other change.

### `src/App.jsx`

- Add the state, handlers, and `'event-invite'` replay branch above.
- Pass `onInvite={openInvite}`, `notifications`, `onJoinInvite={joinFromInvite}`,
  `onDismissInvite={dismissInvite}` into `<MainApp>`.
- Render `{inviteEvent && <InviteSheet event={inviteEvent} matches={…}
  going={…} onShareLink={shareEventLink} onSend={sendEventInvites}
  onClose={() => setInviteEvent(null)} />}` alongside the other sheets.

### Refactor (small, in-scope)

`GroupCardFull` computes the "moms going" overlap inline. Extract it to a shared
helper in `src/data/moms.js`:

```js
export const momsGoingTo = (event) =>
  SAMPLE_MOMS.filter((m) => m.freeSlots.includes(`${event.day}-${event.bucket}`));
```

`GroupCardFull` and `InviteSheet` both call `momsGoingTo(event)` so the "going"
set is defined once. This is the only refactor; no unrelated cleanup.

---

## Data flow (end to end)

**Sending (tag):**
```
GroupCardFull [Invite] → onInvite(event)
  → App.openInvite: no account? requestAccount({type:'event-invite', event})
                                  → CreateAccountSheet → handleAccountComplete
                                      → setInviteEvent(event)
                    has account? → setInviteEvent(event)
  → InviteSheet (Tag section) select moms → [Send invites (N)]
  → App.sendEventInvites(event, names) → toast "Invited Sara, Mia ✦"
```

**Sharing (link):**
```
InviteSheet [Copy link] → App.shareEventLink(event)
  → navigator.clipboard.writeText('https://gomama.app/e/<id>') → toast
```

**Receiving (seeded):**
```
App mount → notifications = SAMPLE_NOTIFICATIONS (1 pending)
  → NotificationBell badge shows "1"
  → [Bell] → dropdown lists "Sara invited you to Stroller Run · Tue · 9:00 AM"
  → [Join]    → joinFromInvite → joinedEvents += eventId; notif.status='joined';
                 toast; event now in Profile → Upcoming
  → [Dismiss] → dismissInvite → notif.status='dismissed'; leaves list
```

---

## Edge cases & error handling

- **`navigator.clipboard` unavailable** (insecure context / old browser):
  guard with `?.`; if absent, still show the toast (best-effort) — acceptable
  for a prototype.
- **Join an event already joined:** `joinFromInvite` is idempotent
  (`includes` guard), so double-join is a no-op; notif still flips to `joined`.
- **Empty inbox:** dropdown shows the "all caught up" empty state; badge hidden.
- **No moms to tag:** if both `going` and `matches` are empty (shouldn't happen
  with seed data), the Tag section shows "No moms to tag yet" and only the Share
  section is usable.
- **Event lookup miss:** if a notification's `eventId` has no matching
  `SUGGESTED_EVENTS` entry, render the sender + a generic "an event" label and
  still allow Dismiss; Join falls back to adding the raw `eventId`.

---

## Design tokens / discipline

- **Sage = community** — every accent in this feature (buttons, checks, badge,
  pills, eyebrows) uses `C.sage` / `C.sageDark`. Do **not** use coral.
- **Saffron** is not used here (no premium surface).
- **Fraunces** for the sheet title and event names; **Albert Sans** for all UI.
- Reference `C.tokenName` only — **no hardcoded hex**.
- Run the `design-reviewer` agent after implementation.

---

## Testing — manual QA checklist

No test framework in the repo. Verify by hand on `/prototype` (375×740):

1. **Gate:** With no account, tap **Invite** on a group card → `CreateAccountSheet`
   opens; on completion the Invite sheet opens for the same event.
2. **Copy link:** Tap **Copy link** → toast "Event link copied ✦"; clipboard
   holds `https://gomama.app/e/<id>`.
3. **Share icons:** Text / Facebook / Instagram are visual-only (no navigation).
4. **Tag select:** Tap several mom rows → sage checks toggle; CTA reads
   "Send invites (N)" with the right N; disabled at 0.
5. **Send:** Tap **Send invites** → sheet closes; toast "Invited <names> ✦".
6. **Badge:** On load the bell shows a **1** sage badge.
7. **Dropdown:** Tap bell → "Sara invited you to Stroller Run · Tue · 9:00 AM".
8. **Join:** Tap **Join** → toast; badge clears; the event now appears in
   Profile → Upcoming (`joinedEvents`).
9. **Dismiss:** Re-seed / use a second pending invite → **Dismiss** removes it
   from the list and clears the badge.
10. **Layout:** Four controls on `GroupCardFull` fit without overflow at 375px;
    bell + dropdown don't shift tab content.
11. **Tokens:** `design-reviewer` reports no hardcoded hex and no coral in this
    feature's surfaces.

---

## File summary

**New**
- `src/data/notifications.js` — `SAMPLE_NOTIFICATIONS`, `pendingCount`
- `src/sheets/InviteSheet.jsx` — combined Share + Tag sheet
- `src/components/NotificationBell.jsx` — bell + badge + dropdown

**Edited**
- `src/App.jsx` — state (`notifications`, `inviteEvent`), handlers
  (`openInvite`, `sendEventInvites`, `shareEventLink`, `joinFromInvite`,
  `dismissInvite`), `'event-invite'` replay branch, render `InviteSheet`,
  pass props to `MainApp`
- `src/screens/MainApp/index.jsx` — render `NotificationBell`, thread `onInvite`
- `src/screens/MainApp/MatchesTab.jsx` — pass `onInvite` to `GroupCardFull`
- `src/components/GroupCardFull.jsx` — `UserPlus` invite button + `onInvite` prop
- `src/data/moms.js` — extract `momsGoingTo(event)` helper

## Future work (deferred)

- Persist invites + notifications to Supabase (new table or columns on
  `onboarding_profiles`); mirror through `recordStep` for the admin dashboard.
- Real share targets via `navigator.share()` / deep links.
- Real notification delivery between users + push.
- Invitee history view (show `joined` / `dismissed`, not just `pending`).
- Tag from a broader pool with search (beyond matches + going).
