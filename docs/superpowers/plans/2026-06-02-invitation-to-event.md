# Invitation to Event Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a mom invite other moms to a group event via an external share link (mocked) or by tagging moms in-app, who then receive an actionable notification (Join / Dismiss).

**Architecture:** All new state lives in `App.jsx` (`notifications`, `inviteEvent`) per the codebase's single-state-owner convention. Two new leaf UI files — `InviteSheet` (Share + Tag) and `NotificationBell` (badge + dropdown) — plus one data file (`notifications.js`) and one shared helper (`momsGoingTo`). The `onInvite` handler is threaded `App → MainApp → MatchesTab → GroupCardFull`. Community palette (sage) throughout; coral untouched.

**Tech Stack:** Vite + React 18, Tailwind (via PostCSS), `lucide-react` icons, design tokens from `src/theme.js` (`C`). No test framework — verification is `npm run build` + a manual QA pass.

**Spec:** `docs/superpowers/specs/invitation-to-event.md`

**Verification note:** This repo has no automated test runner. Each task is verified by (a) `npm run build` succeeding and (b) the manual check stated in the task. The full manual QA checklist runs in Task 7.

---

### Task 1: Data layer — `momsGoingTo` helper + notifications seed

**Files:**
- Modify: `src/data/moms.js` (add one exported helper after `SAMPLE_MOMS`)
- Create: `src/data/notifications.js`

- [ ] **Step 1: Add the `momsGoingTo` helper to `src/data/moms.js`**

`GroupCardFull` currently computes the "moms going" overlap inline. Extract it so the card and the new sheet agree. Add this immediately after the `SAMPLE_MOMS` array closes (after the line `];` that ends `SAMPLE_MOMS`, before `export const MOM_POOL`):

```js
// Moms (from SAMPLE_MOMS) whose free slots include this event's day+bucket.
// Shared by GroupCardFull (overlap badge) and InviteSheet (taggable list).
export const momsGoingTo = (event) =>
  SAMPLE_MOMS.filter((m) => m.freeSlots.includes(`${event.day}-${event.bucket}`));
```

- [ ] **Step 2: Create `src/data/notifications.js`**

```js
// In-app notifications. Currently only event invites; `type` future-proofs
// the inbox. Client-only for now (Supabase persistence is a deferred follow-up).
//
// fromMom references a real SAMPLE_MOMS entry (Sara K., id 1) so the avatar
// initials + hue match an actual mom. Sara K.'s freeSlots include 'Tue-morning',
// so she is plausibly going to the seeded Stroller Run (Tue · 9:00 AM).
export const SAMPLE_NOTIFICATIONS = [
  {
    id: 'n-seed-1',
    type: 'event-invite',
    eventId: 'e-stroller-run',
    fromMom: { id: 1, name: 'Sara K.', hue: 'linear-gradient(135deg,#E8B4A0,#C8553D)' },
    status: 'pending', // 'pending' | 'joined' | 'dismissed'
    ts: '2026-06-02T14:30:00Z',
  },
];

// Count of actionable (pending) invites — drives the bell badge.
export const pendingCount = (notifications) =>
  (notifications || []).filter((n) => n.status === 'pending').length;
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds (`✓ built in …`). No new files are imported yet, so this only confirms the new module parses.

- [ ] **Step 4: Commit**

```bash
git add src/data/moms.js src/data/notifications.js
git commit -m "feat(invite): momsGoingTo helper + notifications seed data"
```

---

### Task 2: `NotificationBell` component

**Files:**
- Create: `src/components/NotificationBell.jsx`

- [ ] **Step 1: Create `src/components/NotificationBell.jsx`**

```jsx
import { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { C } from '../theme';
import { SUGGESTED_EVENTS } from '../data/events';
import { pendingCount } from '../data/notifications';

// Bell + count badge + dropdown panel of pending event invites.
// Community action → sage palette (no coral). Join RSVPs the user into the
// event (handled by the parent); Dismiss just clears the invite from the list.
export const NotificationBell = ({ notifications, onJoin, onDismiss }) => {
  const [open, setOpen] = useState(false);
  const list = notifications || [];
  const pending = list.filter((n) => n.status === 'pending');
  const count = pendingCount(list);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Invitations"
        className="w-9 h-9 rounded-full flex items-center justify-center relative"
        style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink }}
      >
        <Bell size={18} />
        {count > 0 && (
          <span
            className="absolute flex items-center justify-center"
            style={{
              top: -3, right: -3, minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 999, background: C.sageDark, color: '#fff',
              fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 10,
              border: `1.5px solid ${C.cream}`,
            }}
          >
            {count}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* click-away layer */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute z-50 rounded-2xl overflow-hidden"
            style={{
              top: 44, right: 0, width: 300, maxHeight: 360,
              background: C.paper, border: `1px solid ${C.divider}`,
              boxShadow: '0 16px 40px -12px rgba(20,14,16,.35)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.divider}` }}>
              <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 16, color: C.ink }}>
                Invitations
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 300, scrollbarWidth: 'none' }}>
              {pending.length === 0 ? (
                <div
                  className="px-4 py-6 text-center"
                  style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.muted }}
                >
                  You&rsquo;re all caught up ✦
                </div>
              ) : (
                pending.map((n) => {
                  const ev = SUGGESTED_EVENTS.find((e) => e.id === n.eventId);
                  const evName = ev ? ev.name : 'an event';
                  const evWhen = ev ? `${ev.day} · ${ev.time}` : '';
                  const first = n.fromMom.name.split(' ')[0];
                  const initials = n.fromMom.name.split(' ').map((s) => s[0]).join('');
                  return (
                    <div
                      key={n.id}
                      className="px-4 py-3 flex gap-3"
                      style={{ borderBottom: `1px solid ${C.divider}` }}
                    >
                      <div
                        className="rounded-full flex items-center justify-center shrink-0"
                        style={{
                          width: 36, height: 36, background: n.fromMom.hue, color: '#fff',
                          fontFamily: 'Fraunces', fontWeight: 500, fontSize: 13,
                        }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.ink, lineHeight: 1.3 }}>
                          <strong style={{ fontWeight: 700 }}>{first}</strong> invited you to{' '}
                          <strong style={{ fontWeight: 700 }}>{evName}</strong>
                        </div>
                        {evWhen && (
                          <div className="mt-0.5" style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.muted }}>
                            {evWhen}
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => { onJoin(n); setOpen(false); }}
                            className="rounded-xl flex items-center justify-center gap-1"
                            style={{
                              height: 32, padding: '0 14px', background: C.sageDark, color: '#fff',
                              fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12,
                            }}
                          >
                            <Check size={13} /> Join
                          </button>
                          <button
                            onClick={() => onDismiss(n)}
                            className="rounded-xl flex items-center justify-center"
                            style={{
                              height: 32, padding: '0 14px', background: C.paper,
                              border: `1px solid ${C.divider}`, color: C.inkSoft,
                              fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12,
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds. (Component is not yet mounted; this confirms it parses and imports resolve.)

- [ ] **Step 3: Commit**

```bash
git add src/components/NotificationBell.jsx
git commit -m "feat(invite): NotificationBell — badge + invites dropdown"
```

---

### Task 3: `InviteSheet` component

**Files:**
- Create: `src/sheets/InviteSheet.jsx`

- [ ] **Step 1: Create `src/sheets/InviteSheet.jsx`**

```jsx
import { useState } from 'react';
import { Link2, MessageSquare, Facebook, Instagram, Check } from 'lucide-react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';

// Invite moms to a group event. Two mechanisms in one sheet:
//   1) Share a link  — Copy link works; Text/FB/IG icons are visual-only.
//   2) Tag moms here — multi-select (moms going + your matches), then Send.
// Community action → sage palette only.
export const InviteSheet = ({ event, matches, going, onShareLink, onSend, onClose }) => {
  // Union of moms going + matched moms, deduped by id, going first.
  const seen = new Set();
  const taggable = [...(going || []), ...(matches || [])].filter((m) => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
  const goingIds = new Set((going || []).map((m) => m.id));

  const [selected, setSelected] = useState(new Set());
  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedMoms = taggable.filter((m) => selected.has(m.id));

  const shareTargets = [
    { key: 'text', label: 'Text', Icon: MessageSquare },
    { key: 'facebook', label: 'Facebook', Icon: Facebook },
    { key: 'instagram', label: 'Instagram', Icon: Instagram },
  ];

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-6 pt-2 pb-6">
        {/* Header */}
        <div
          className="text-[11px] tracking-[.18em] uppercase"
          style={{ color: C.sageDark, fontFamily: 'Albert Sans', fontWeight: 600 }}
        >
          Invite to
        </div>
        <h3
          className="mt-1.5"
          style={{ fontFamily: 'Fraunces', fontSize: 22, fontWeight: 500, color: C.ink, letterSpacing: '-.02em' }}
        >
          {event.name}
        </h3>
        <div className="mt-0.5" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft }}>
          {event.day} · {event.time} · {event.place}
        </div>

        {/* Share a link */}
        <div
          className="text-[10.5px] uppercase tracking-[.16em] mt-5"
          style={{ fontFamily: 'Albert Sans', fontWeight: 600, color: C.sageDark }}
        >
          Share a link
        </div>
        <button
          onClick={() => onShareLink(event)}
          className="w-full rounded-2xl flex items-center justify-center gap-2 mt-2"
          style={{ height: 46, background: C.sageDark, color: '#fff', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13.5 }}
        >
          <Link2 size={16} /> Copy link
        </button>
        <div className="flex gap-2 mt-2">
          {shareTargets.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => onShareLink(event)}
              aria-label={`Share via ${label}`}
              className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-1 py-2.5"
              style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.inkSoft }}
            >
              <Icon size={18} />
              <span style={{ fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11 }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Tag moms */}
        <div
          className="text-[10.5px] uppercase tracking-[.16em] mt-5"
          style={{ fontFamily: 'Albert Sans', fontWeight: 600, color: C.sageDark }}
        >
          Tag moms here
        </div>
        <div className="mt-1" style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.muted }}>
          They&rsquo;ll get an invite to join.
        </div>

        <div className="mt-2 flex flex-col gap-1.5">
          {taggable.length === 0 ? (
            <div className="py-4 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.muted }}>
              No moms to tag yet
            </div>
          ) : (
            taggable.map((m) => {
              const on = selected.has(m.id);
              const initials = m.name.split(' ').map((s) => s[0]).join('');
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className="w-full rounded-2xl flex items-center gap-3 px-3 py-2"
                  style={{ background: on ? `${C.sage}40` : C.paper, border: `1px solid ${on ? C.sageDark : C.divider}` }}
                >
                  <div
                    className="rounded-full flex items-center justify-center shrink-0"
                    style={{ width: 34, height: 34, background: m.hue, color: '#fff', fontFamily: 'Fraunces', fontWeight: 500, fontSize: 12 }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 text-left">
                    <span style={{ fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13.5, color: C.ink }}>
                      {m.name.split(' ')[0]}
                    </span>
                    {goingIds.has(m.id) && (
                      <span
                        className="ml-2 px-2 py-0.5 rounded-full"
                        style={{ background: `${C.sage}50`, color: C.sageDark, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 10 }}
                      >
                        going
                      </span>
                    )}
                  </div>
                  <div
                    className="rounded-full flex items-center justify-center shrink-0"
                    style={{
                      width: 22, height: 22,
                      background: on ? C.sageDark : 'transparent',
                      border: `1.5px solid ${on ? C.sageDark : C.divider}`,
                      color: '#fff',
                    }}
                  >
                    {on && <Check size={13} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onSend(event, selectedMoms.map((m) => m.name.split(' ')[0]))}
          disabled={selected.size === 0}
          className="w-full rounded-2xl flex items-center justify-center mt-5"
          style={{
            height: 50,
            background: selected.size === 0 ? `${C.sage}55` : C.sageDark,
            color: selected.size === 0 ? C.sageDark : '#fff',
            fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 14,
            opacity: selected.size === 0 ? 0.7 : 1,
          }}
        >
          {selected.size === 0 ? 'Select moms to invite' : `Send invites (${selected.size})`}
        </button>
      </div>
    </Sheet>
  );
};
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: build succeeds. (Sheet not yet mounted; confirms parse + imports.)

- [ ] **Step 3: Commit**

```bash
git add src/sheets/InviteSheet.jsx
git commit -m "feat(invite): InviteSheet — share link + tag moms"
```

---

### Task 4: Wire state, handlers, and render into `App.jsx`

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add imports**

After the existing sheet imports near the top of `src/App.jsx` (the block ending with `import { PremiumSheet } from './sheets/PremiumSheet';` at line 28), add:

```jsx
import { InviteSheet } from './sheets/InviteSheet';
import { SAMPLE_NOTIFICATIONS } from './data/notifications';
import { SAMPLE_MOMS, momsGoingTo } from './data/moms';
import { SUGGESTED_EVENTS } from './data/events';
```

- [ ] **Step 2: Add state**

Immediately after the `joinedEvents` state line (`const [joinedEvents, setJoinedEvents] = useState([]);`, line 62), add:

```jsx
  // Event invites (in-app notifications). Seeded so the inbox is demoable.
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  // The group event whose Invite sheet is open (null = closed).
  const [inviteEvent, setInviteEvent] = useState(null);
```

- [ ] **Step 3: Add handlers**

Immediately after the `flash` definition (`const flash = (m) => { … };`, line 66), add:

```jsx
  // --- Event invitations ---------------------------------------------------
  // Inviting is free (core meetup value), but creating an account is required
  // to send — same gate as every other write action.
  const openInvite = (event) => {
    if (!account) { requestAccount({ type: 'event-invite', event }); return; }
    setInviteEvent(event);
  };

  const sendEventInvites = (event, momNames) => {
    setInviteEvent(null);
    flash(`Invited ${momNames.join(', ')} ✦`);
  };

  const shareEventLink = (event) => {
    const url = `https://gomama.app/e/${event.id}`;
    navigator.clipboard?.writeText(url);
    flash('Event link copied ✦');
  };

  // Invitee accepts: RSVP into the event + mark the notification joined.
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

- [ ] **Step 4: Add the account-gating replay branch**

In `handleAccountComplete`, add a new `else if` branch immediately after the existing `a.type === 'invite'` branch (after line 166, before the closing `} else {`):

```jsx
      } else if (a.type === 'event-invite' && a.event) {
        setInviteEvent(a.event);
        flash(`Welcome, ${acct.firstName} ✦`);
```

The surrounding structure should read:

```jsx
      } else if (a.type === 'invite' && a.mom) {
        flash(`Welcome, ${acct.firstName}. Invite sent to ${a.mom.name.split(' ')[0]} ✦`);
      } else if (a.type === 'event-invite' && a.event) {
        setInviteEvent(a.event);
        flash(`Welcome, ${acct.firstName} ✦`);
      } else {
        flash(`Welcome, ${acct.firstName} ✦`);
      }
```

- [ ] **Step 5: Pass props to `<MainApp>`**

In the `step===3 && <MainApp …>` block, add the four new props. Change:

```jsx
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
            savedItems={savedItems} setSavedItems={setSavedItems}
            account={account} requestAccount={requestAccount}
```

to:

```jsx
            joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
            savedItems={savedItems} setSavedItems={setSavedItems}
            account={account} requestAccount={requestAccount}
            notifications={notifications}
            onInvite={openInvite}
            onJoinInvite={joinFromInvite}
            onDismissInvite={dismissInvite}
```

- [ ] **Step 6: Render the `InviteSheet`**

Immediately after the `{scheduleMom && <ScheduleSheet … />}` block closes (after line 250), add:

```jsx
          {inviteEvent && <InviteSheet
            event={inviteEvent}
            matches={SAMPLE_MOMS}
            going={momsGoingTo(inviteEvent)}
            onShareLink={shareEventLink}
            onSend={sendEventInvites}
            onClose={()=>setInviteEvent(null)}/>}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: build succeeds. `MainApp` ignores the four new props until Task 5, so no functional change is visible yet — this only confirms `App.jsx` compiles.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx
git commit -m "feat(invite): wire notifications + invite handlers in App"
```

---

### Task 5: Mount `NotificationBell` + thread `onInvite` in the MainApp shell

**Files:**
- Modify: `src/screens/MainApp/index.jsx`

- [ ] **Step 1: Add the import**

After the existing tab imports (the block ending `import { YouTab } from './YouTab';`), add:

```jsx
import { NotificationBell } from '../../components/NotificationBell';
```

- [ ] **Step 2: Accept the new props**

In the `MainApp` destructured signature, add `notifications, onInvite, onJoinInvite, onDismissInvite`. The signature becomes:

```jsx
export const MainApp = ({ profile, setProfile, prefs, setPrefs, location, distance, scheduled1to1, joinedEvents, setJoinedEvents, savedItems, setSavedItems, openSchedule, openProfile, openMessage, openPremium, account, requestAccount, restart, flash, notifications, onInvite, onJoinInvite, onDismissInvite }) => {
```

- [ ] **Step 3: Add the header row with the bell**

Immediately after `<StatusBar/>` (the line right below the root `<div className="h-full flex flex-col" …>`), add a slim header. `StatusBar` renders nothing, so this is the app's top edge; a full-width header avoids colliding with the full-width Meetups toggle:

```jsx
      {/* App header — brand wordmark + notification bell */}
      <div className="flex items-center justify-between px-5 pt-2 pb-1">
        <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 18, color: C.ink, letterSpacing: '-.01em' }}>
          Go M<span style={{ fontStyle: 'italic', color: C.coral }}>a</span>ma
        </div>
        <NotificationBell
          notifications={notifications}
          onJoin={onJoinInvite}
          onDismiss={onDismissInvite}
        />
      </div>
```

(The wordmark's italic coral `a` is the established brand signature — this is the one allowed coral usage near this feature.)

- [ ] **Step 4: Thread `onInvite` into `MatchesTab`**

In the `tab==='meetups' && <MatchesTab …>` block, add `onInvite={onInvite}` to the prop list. It becomes:

```jsx
      {tab==='meetups'   && <MatchesTab
        profile={profile}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        savedItems={savedItems} setSavedItems={setSavedItems}
        account={account} requestAccount={requestAccount} flash={flash}
        onInvite={onInvite}/>}
```

- [ ] **Step 5: Verify the build + visual check**

Run: `npm run build`
Expected: build succeeds.

Then run: `npm run dev`, open `/prototype`, complete onboarding into MainApp (or sign in). Expected: a "Go Mama" wordmark top-left and a bell top-right with a **1** sage badge. Clicking the bell opens the "Invitations" dropdown listing "Sara invited you to Stroller Run · Tue · 9:00 AM".

- [ ] **Step 6: Commit**

```bash
git add src/screens/MainApp/index.jsx
git commit -m "feat(invite): mount NotificationBell + thread onInvite in MainApp"
```

---

### Task 6: Add the Invite button to `GroupCardFull` + pass `onInvite` from `MatchesTab`

**Files:**
- Modify: `src/components/GroupCardFull.jsx`
- Modify: `src/screens/MainApp/MatchesTab.jsx`

- [ ] **Step 1: Import the `UserPlus` icon in `GroupCardFull.jsx`**

Change the first import line from:

```jsx
import { Plus, Check, MessageCircle, Info } from 'lucide-react';
```

to:

```jsx
import { Plus, Check, MessageCircle, Info, UserPlus } from 'lucide-react';
```

- [ ] **Step 2: Accept the `onInvite` prop**

Change the component signature from:

```jsx
export const GroupCardFull = ({ event, joined, onJoin, onChat, onDetails }) => {
```

to:

```jsx
export const GroupCardFull = ({ event, joined, onJoin, onChat, onDetails, onInvite }) => {
```

- [ ] **Step 3: Add the Invite button to the action row**

In the action row `<div className="flex gap-2 mt-3">`, insert a new Invite icon button between the "I'm in" button and the Chat button. Place it immediately after the `onJoin` button's closing `</button>` and before the `onChat` button:

```jsx
          <button onClick={() => onInvite && onInvite(event)} aria-label={`Invite moms to ${event.name}`} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <UserPlus size={16}/>
          </button>
```

The row now holds four controls: `I'm in` (flex-1) · Invite · Chat · Details. At 375px these fit (≈155px for the flex-1 button after three 44px icon buttons + gaps) — confirm in the visual check.

- [ ] **Step 4: Pass `onInvite` through `MatchesTab.jsx`**

Add `onInvite` to the destructured props. Change:

```jsx
export const MatchesTab = ({
  profile,
  openSchedule,
  openProfile,
  openMessage,
  joinedEvents,
  setJoinedEvents,
  account,
  requestAccount,
  flash,
}) => {
```

to:

```jsx
export const MatchesTab = ({
  profile,
  openSchedule,
  openProfile,
  openMessage,
  joinedEvents,
  setJoinedEvents,
  account,
  requestAccount,
  flash,
  onInvite,
}) => {
```

Then pass it to `GroupCardFull`. Change the `<GroupCardFull …>` block to add `onInvite={onInvite}`:

```jsx
            <GroupCardFull
              event={event}
              joined={(joinedEvents || []).includes(event.id)}
              onJoin={handleJoin}
              onChat={() => flash && flash('Group chat coming soon')}
              onDetails={() => flash && flash(`${event.name} · details soon`)}
              onInvite={onInvite}
            />
```

- [ ] **Step 5: Verify the build + visual check**

Run: `npm run build`
Expected: build succeeds.

Then in `npm run dev` at `/prototype`: open Meetups → Groups. Expected: each group card's action row shows `I'm in`, a person-plus (Invite) icon, a chat icon, and an info icon, with no overflow. Tapping Invite opens the InviteSheet (if signed in) or the account-creation sheet first (if not).

- [ ] **Step 6: Commit**

```bash
git add src/components/GroupCardFull.jsx src/screens/MainApp/MatchesTab.jsx
git commit -m "feat(invite): Invite button on GroupCardFull + MatchesTab passthrough"
```

---

### Task 7: Full manual QA pass

**Files:** none (verification only)

- [ ] **Step 1: Run the dev server**

Run: `npm run dev` and open `/prototype` in a narrow window (or the phone-framed desktop view). Complete onboarding to reach MainApp, or sign in as a returning user.

- [ ] **Step 2: Walk the QA checklist**

Verify each item from the spec (`docs/superpowers/specs/invitation-to-event.md` → "Testing — manual QA checklist"):

1. **Gate:** With no account, tapping **Invite** on a group card opens `CreateAccountSheet`; on completion the Invite sheet opens for the same event.
2. **Copy link:** **Copy link** → toast "Event link copied ✦"; clipboard holds `https://gomama.app/e/e-stroller-run` (etc).
3. **Share icons:** Text / Facebook / Instagram fire the same copy/flash and perform no navigation.
4. **Tag select:** Tapping mom rows toggles sage checks; CTA shows "Send invites (N)"; disabled at 0 ("Select moms to invite").
5. **Send:** **Send invites** closes the sheet; toast "Invited <names> ✦".
6. **Badge:** On entering MainApp the bell shows a **1** sage badge.
7. **Dropdown:** Bell opens "Sara invited you to Stroller Run · Tue · 9:00 AM".
8. **Join:** **Join** → toast; badge clears; the event now appears in Profile → Upcoming (driven by `joinedEvents`).
9. **Dismiss:** A pending invite **Dismiss** removes it from the list and clears the badge.
10. **Layout:** Four controls on `GroupCardFull` fit at 375px; header + dropdown don't shift tab content.
11. **Tokens:** No hardcoded hex / no coral in this feature's surfaces (the wordmark's italic-`a` is the sanctioned exception).

- [ ] **Step 3: Run the design-token audit**

Dispatch the `design-reviewer` agent on the changed files (`InviteSheet.jsx`, `NotificationBell.jsx`, `GroupCardFull.jsx`, `MainApp/index.jsx`). Expected: no hardcoded hex (the gradient hue in `notifications.js` seed data is data, not styling, and mirrors existing `SAMPLE_MOMS` hues) and no coral misuse.

- [ ] **Step 4: Final verification build**

Run: `npm run build`
Expected: build succeeds with no warnings introduced by these files.

---

## Self-review notes

- **Spec coverage:** Share link (Task 3 + 4), tag moms (Task 3 + 4), notification + bell (Task 2 + 5), Join/Dismiss (Task 2 + 4), account gating + replay (Task 4), seeded inbound invite (Task 1), `momsGoingTo` refactor (Task 1), Invite entry point on card (Task 6). All spec sections map to a task.
- **Out of scope (unchanged):** Supabase persistence, real share targets, real delivery/push, invitee history — all listed as deferred in the spec.
- **Type/name consistency:** `momsGoingTo`, `pendingCount`, `SAMPLE_NOTIFICATIONS` are defined in Task 1 and consumed unchanged in Tasks 2–4. Handler names (`openInvite`, `sendEventInvites`, `shareEventLink`, `joinFromInvite`, `dismissInvite`) and MainApp prop names (`notifications`, `onInvite`, `onJoinInvite`, `onDismissInvite`) match across Tasks 4–6. Notification fields (`id`, `type`, `eventId`, `fromMom{id,name,hue}`, `status`, `ts`) are consistent across the seed (Task 1), the bell (Task 2), and the handlers (Task 4).
- **Deviation from spec wording:** The bell lives in a slim MainApp header row rather than an absolute overlay — `StatusBar` renders nothing and the Meetups toggle is full-width, so an absolute top-right bell would collide. Same outcome (one global bell, no per-tab edits).
