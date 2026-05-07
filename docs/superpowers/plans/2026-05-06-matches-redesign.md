# Matches Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Matches tab into a full-screen photo deck with a pill toggle between 1:1 mom matches and group events, and route users to it directly after signup.

**Architecture:** Two new full-screen card components (`MatchCardFull`, `GroupCardFull`) consumed by a rewritten `MatchesTab` that owns toggle state and renders one of two vertical-snap scroll decks. Photos added to `SAMPLE_MOMS` and `SUGGESTED_EVENTS` data. `MainApp` updates: default tab `'matches'`, reordered tab bar, larger labels.

**Tech Stack:** React 18 (function components, hooks), Tailwind utility classes for layout, inline `style` for design-token colors, `lucide-react` icons. No test framework — verification is manual via `npm run dev` and a real browser.

**Spec:** `docs/superpowers/specs/2026-05-06-matches-redesign-design.md`

---

## Task 1: Add photo URLs to `SAMPLE_MOMS`

**Files:**
- Modify: `src/data/moms.js` (the four `SAMPLE_MOMS` entries, lines 1–54)

- [ ] **Step 1: Add `photo` field to each of the four SAMPLE_MOMS entries**

Edit `src/data/moms.js`. For each entry, insert a `photo:` line just below `verified:` (or anywhere consistent inside the object). Use these warm Unsplash URLs:

```js
// Sara K. (id 1)
photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop',
// Mei L. (id 2)
photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=600&auto=format&fit=crop',
// Aisha R. (id 3)
photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop',
// Priya N. (id 4)
photo: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=600&auto=format&fit=crop',
```

Final shape of one entry (Sara K. shown):

```js
{
  id: 1, name: 'Sara K.', age: 32, kids: '2y · 4y', type: 'Working mom',
  overlap: 87, distance: '0.6 mi',
  tags: ['Coffee dates','Same kid ages','Tue mornings'],
  nextSlot: 'Tue · 9:30 AM',
  nextPlace: 'Blue Bottle, Mission',
  hue: 'linear-gradient(135deg,#E8B4A0,#C8553D)',
  photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop',
  bio: 'Lawyer turned half-time. Toddler tantrum survivor. Always down for an iced oat latte and a stroller loop.',
  values: ['Gentle parenting','Honest & open','Slow living'],
  interests: ['Coffee dates','Park hangs','Book club'],
  freeSlots: ['Tue-morning','Thu-morning','Sat-morning','Sat-afternoon','Sun-afternoon'],
  verified: true,
},
```

- [ ] **Step 2: Verify no syntax errors**

Run: `npm run build`
Expected: build succeeds, no module errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/moms.js
git commit -m "data(moms): add Unsplash photo URL to each SAMPLE_MOMS entry"
```

---

## Task 2: Add photo URLs to `SUGGESTED_EVENTS`

**Files:**
- Modify: `src/data/events.js` (the eight `SUGGESTED_EVENTS` entries, lines 3–28)

- [ ] **Step 1: Add `photo` field to each of the eight SUGGESTED_EVENTS entries**

Insert a `photo:` field on each event object. Use these URLs:

```js
// e-stroller-run
photo: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=600&auto=format&fit=crop',
// e-coffee-mom
photo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop',
// e-helen-play
photo: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&auto=format&fit=crop',
// e-storytime
photo: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&auto=format&fit=crop',
// e-yoga
photo: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=600&auto=format&fit=crop',
// e-sat-brunch
photo: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&auto=format&fit=crop',
// e-park-pic
photo: 'https://images.unsplash.com/photo-1552083375-1447ce886485?w=600&auto=format&fit=crop',
// e-evening-walk
photo: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=600&auto=format&fit=crop',
```

Example final shape for one event:

```js
{ id:'e-stroller-run', day:'Tue', bucket:'morning', time:'9:00 AM', name:'Stroller Run',
  place:'Dolores Park · north end', going: 8, recurring:'Weekly', tags:['Stroller','Free','All paces'],
  hue:'linear-gradient(135deg, #C8553D 0%, #D9A441 100%)',
  photo: 'https://images.unsplash.com/photo-1483721310020-03333e577078?w=600&auto=format&fit=crop' },
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/data/events.js
git commit -m "data(events): add Unsplash photo URL to each SUGGESTED_EVENTS entry"
```

---

## Task 3: Create `MatchCardFull` component

**Files:**
- Create: `src/components/MatchCardFull.jsx`

- [ ] **Step 1: Create the file with the full component**

Write `src/components/MatchCardFull.jsx`:

```jsx
import { Calendar, MessageCircle, User, ShieldCheck } from 'lucide-react';
import { C } from '../theme';

export const MatchCardFull = ({ mom, profile, onSchedule, onMessage, onProfile }) => {
  const userTags = [
    ...((profile && profile.interests) || []),
    ...((profile && profile.values) || []),
  ];
  const momTags = [
    ...(mom.interests || []),
    ...(mom.values || []),
  ];
  const sharedRaw = momTags.filter(t => userTags.includes(t));
  const display = (sharedRaw.length ? sharedRaw : (mom.tags || [])).slice(0, 3);

  return (
    <div className="rounded-[28px] overflow-hidden h-full flex flex-col relative" style={{
      background: C.cream, border: `1px solid ${C.divider}`, boxShadow: '0 6px 24px rgba(42,30,34,.06)',
    }}>
      {/* Hero — photo with bottom gradient overlay */}
      <div className="relative" style={{ flex: '0 0 60%', backgroundImage: `url('${mom.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,.6))' }}/>

        {/* Match pill */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full" style={{
          background: 'rgba(255,255,255,.92)', color: C.ink,
          fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11,
        }}>
          {mom.overlap}% match
        </div>

        {/* Verified pill */}
        {mom.verified && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full flex items-center gap-1" style={{
            background: 'rgba(255,255,255,.92)', color: C.sageDark,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 10.5,
          }}>
            <ShieldCheck size={11}/> Verified
          </div>
        )}

        {/* Hero text */}
        <div className="absolute left-4 right-4 bottom-3 text-white">
          <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 26, letterSpacing: '-.02em', lineHeight: 1.05 }}>
            {mom.name} <span style={{ fontSize: 18, opacity: .85 }}>· {mom.age}</span>
          </div>
          <div className="mt-0.5" style={{ fontFamily: 'Albert Sans', fontWeight: 500, fontSize: 12, opacity: .92 }}>
            Kids {mom.kids} &nbsp;·&nbsp; {mom.distance} away
          </div>
        </div>
      </div>

      {/* Lower panel */}
      <div className="px-4 py-3" style={{ flex: '1 1 40%', background: C.paper }}>
        <div className="text-[10.5px] uppercase tracking-[.16em]" style={{
          fontFamily: 'Albert Sans', fontWeight: 600, color: C.terracotta,
        }}>
          Shared ground
        </div>

        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {display.map((t, i) => (
            <span key={i} className="px-2.5 py-1 rounded-full" style={{
              background: `${C.terracotta}15`, color: C.terracotta,
              fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11,
            }}>{t}</span>
          ))}
        </div>

        <div className="mt-2 truncate" style={{
          fontFamily: 'Albert Sans', fontWeight: 400, fontSize: 12, color: C.inkSoft, lineHeight: 1.4,
        }}>
          “{mom.bio}”
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={() => onSchedule(mom)} className="flex-1 rounded-2xl flex items-center justify-center gap-1.5" style={{
            height: 42, background: C.ink, color: C.cream,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5,
          }}>
            <Calendar size={14}/> Schedule
          </button>
          <button onClick={() => onMessage(mom)} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <MessageCircle size={16}/>
          </button>
          <button onClick={() => onProfile(mom)} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <User size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify the file compiles**

Run: `npm run build`
Expected: build succeeds. (The component isn't imported anywhere yet, so build won't actually render it — but Vite still type-validates the syntax.)

- [ ] **Step 3: Commit**

```bash
git add src/components/MatchCardFull.jsx
git commit -m "feat(components): add MatchCardFull — full-screen mom card with photo hero"
```

---

## Task 4: Create `GroupCardFull` component

**Files:**
- Create: `src/components/GroupCardFull.jsx`

- [ ] **Step 1: Create the file**

Write `src/components/GroupCardFull.jsx`:

```jsx
import { Plus, Check, MessageCircle, Info } from 'lucide-react';
import { C } from '../theme';
import { DAYS_SHORT_BY_DOW, MONTH_NAMES } from '../data/taxonomy';
import { SAMPLE_MOMS } from '../data/moms';

export const GroupCardFull = ({ event, joined, onJoin, onChat, onDetails }) => {
  // Date label like "SAT · MAY 11" — compute the next occurrence of event.day in this month.
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const dowToIdx = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:0 };
  const target = dowToIdx[event.day];
  let dateNum = today.getDate();
  // Walk forward up to 7 days to find target weekday
  for (let i = 0; i < 7; i++) {
    const d = new Date(year, month, today.getDate() + i);
    if (d.getDay() === target) { dateNum = d.getDate(); break; }
  }
  const dateLabel = `${(DAYS_SHORT_BY_DOW[event.day] || event.day).toUpperCase()} · ${MONTH_NAMES[month].slice(0,3).toUpperCase()} ${dateNum}`;

  // Overlap: SAMPLE_MOMS whose freeSlots contain `${event.day}-${event.bucket}`
  const slotKey = `${event.day}-${event.bucket}`;
  const matchedGoing = SAMPLE_MOMS.filter(m => (m.freeSlots || []).includes(slotKey));

  let overlapLabel;
  if (matchedGoing.length === 0) {
    overlapLabel = `${event.going} going`;
  } else if (matchedGoing.length <= 2) {
    overlapLabel = `${matchedGoing.map(m => m.name.split(' ')[0]).join(', ')} going`;
  } else {
    const names = matchedGoing.slice(0, 2).map(m => m.name.split(' ')[0]).join(', ');
    overlapLabel = `${names} +${matchedGoing.length - 2} more going`;
  }

  const tags = (event.tags || []).slice(0, 3);

  return (
    <div className="rounded-[28px] overflow-hidden h-full flex flex-col relative" style={{
      background: C.cream, border: `1px solid ${C.divider}`, boxShadow: '0 6px 24px rgba(42,30,34,.06)',
    }}>
      {/* Hero */}
      <div className="relative" style={{ flex: '0 0 55%', backgroundImage: `url('${event.photo}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,.6))' }}/>

        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full" style={{
          background: C.sageDark, color: '#fff',
          fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 10.5, letterSpacing: '.08em',
        }}>
          GROUP
        </div>

        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full" style={{
          background: 'rgba(255,255,255,.92)', color: C.ink,
          fontFamily: 'Albert Sans', fontWeight: 700, fontSize: 11, letterSpacing: '.04em',
        }}>
          {dateLabel}
        </div>

        <div className="absolute left-4 right-4 bottom-3 text-white">
          <div style={{ fontFamily: 'Fraunces', fontWeight: 500, fontSize: 24, letterSpacing: '-.02em', lineHeight: 1.1 }}>
            {event.name}
          </div>
          <div className="mt-0.5" style={{ fontFamily: 'Albert Sans', fontWeight: 500, fontSize: 12, opacity: .92 }}>
            {event.time} &nbsp;·&nbsp; {event.place} &nbsp;·&nbsp; {event.going} going
          </div>
        </div>
      </div>

      {/* Lower panel */}
      <div className="px-4 py-3" style={{ flex: '1 1 45%', background: C.paper }}>
        <div className="text-[10.5px] uppercase tracking-[.16em]" style={{
          fontFamily: 'Albert Sans', fontWeight: 600, color: C.sageDark,
        }}>
          From your matches
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          {matchedGoing.length > 0 ? (
            <div className="flex">
              {matchedGoing.slice(0, 3).map((m, i) => (
                <div key={m.id} className="rounded-full flex items-center justify-center" style={{
                  width: 28, height: 28, background: m.hue, color: '#fff',
                  fontFamily: 'Fraunces', fontWeight: 500, fontSize: 11,
                  border: `2px solid ${C.paper}`, marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i,
                }}>
                  {m.name.split(' ').map(s => s[0]).join('')}
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ fontFamily: 'Albert Sans', fontWeight: 500, fontSize: 12, color: C.inkSoft }}>
            {overlapLabel}
          </div>
        </div>

        {tags.length > 0 && (
          <>
            <div className="text-[10.5px] uppercase tracking-[.16em] mt-3" style={{
              fontFamily: 'Albert Sans', fontWeight: 600, color: C.sageDark,
            }}>
              Shared ground
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {tags.map((t, i) => (
                <span key={i} className="px-2.5 py-1 rounded-full" style={{
                  background: `${C.sage}30`, color: C.sageDark,
                  fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 11,
                }}>{t}</span>
              ))}
            </div>
          </>
        )}

        <div className="flex gap-2 mt-3">
          <button onClick={() => onJoin(event)} disabled={joined} className="flex-1 rounded-2xl flex items-center justify-center gap-1.5" style={{
            height: 42,
            background: joined ? `${C.sage}40` : C.sageDark,
            color: joined ? C.sageDark : '#fff',
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12.5,
          }}>
            {joined ? <><Check size={14}/> Going</> : <><Plus size={14}/> I'm in</>}
          </button>
          <button onClick={() => onChat(event)} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <MessageCircle size={16}/>
          </button>
          <button onClick={() => onDetails(event)} className="rounded-2xl flex items-center justify-center" style={{
            width: 44, height: 42, background: C.paper, border: `1px solid ${C.divider}`, color: C.ink,
          }}>
            <Info size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/GroupCardFull.jsx
git commit -m "feat(components): add GroupCardFull — full-screen event card with sage accent"
```

---

## Task 5: Rewrite `MatchesTab` with toggle and decks

**Files:**
- Modify: `src/screens/MainApp/MatchesTab.jsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Overwrite `src/screens/MainApp/MatchesTab.jsx`:

```jsx
import { useState } from 'react';
import { Heart, Users } from 'lucide-react';
import { C } from '../../theme';
import { SAMPLE_MOMS } from '../../data/moms';
import { SUGGESTED_EVENTS } from '../../data/events';
import { MatchCardFull } from '../../components/MatchCardFull';
import { GroupCardFull } from '../../components/GroupCardFull';

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
  const [view, setView] = useState('moms'); // 'moms' | 'groups'

  const momCount = SAMPLE_MOMS.length;
  const groupCount = SUGGESTED_EVENTS.length;

  const accent = view === 'moms' ? C.terracotta : C.sageDark;

  const handleJoin = (e) => {
    if ((joinedEvents || []).includes(e.id)) return;
    if (!account && requestAccount) {
      requestAccount({ type: 'group', event: e });
      return;
    }
    setJoinedEvents(j => [...j, e.id]);
    flash && flash(`✦ RSVP'd to ${e.name}`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top toggle */}
      <div className="px-5 pt-3 pb-2">
        <div className="rounded-full p-1 flex" style={{ background: C.creamSoft, border: `1px solid ${C.divider}` }}>
          <button onClick={() => setView('moms')} className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all" style={{
            height: 38,
            background: view === 'moms' ? C.terracotta : 'transparent',
            color: view === 'moms' ? '#fff' : C.inkMuted,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13,
            boxShadow: view === 'moms' ? '0 2px 8px rgba(200,85,61,.4)' : 'none',
          }}>
            <Heart size={13} fill={view === 'moms' ? 'currentColor' : 'none'}/> Moms · {momCount}
          </button>
          <button onClick={() => setView('groups')} className="flex-1 rounded-full flex items-center justify-center gap-1.5 transition-all" style={{
            height: 38,
            background: view === 'groups' ? C.sageDark : 'transparent',
            color: view === 'groups' ? '#fff' : C.inkMuted,
            fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13,
            boxShadow: view === 'groups' ? '0 2px 8px rgba(126,150,120,.45)' : 'none',
          }}>
            <Users size={13}/> Groups · {groupCount}
          </button>
        </div>
      </div>

      {/* Deck — vertical scroll-snap */}
      <div className="flex-1 overflow-y-auto" style={{
        scrollSnapType: 'y mandatory',
        scrollbarWidth: 'none',
      }}>
        {view === 'moms' && SAMPLE_MOMS.map(mom => (
          <div key={`mom-${mom.id}`} className="px-4 pb-3" style={{
            scrollSnapAlign: 'start',
            minHeight: '100%',
          }}>
            <MatchCardFull
              mom={mom}
              profile={profile}
              onSchedule={openSchedule}
              onMessage={openMessage}
              onProfile={openProfile}
            />
          </div>
        ))}

        {view === 'groups' && SUGGESTED_EVENTS.map(event => (
          <div key={`event-${event.id}`} className="px-4 pb-3" style={{
            scrollSnapAlign: 'start',
            minHeight: '100%',
          }}>
            <GroupCardFull
              event={event}
              joined={(joinedEvents || []).includes(event.id)}
              onJoin={handleJoin}
              onChat={() => flash && flash('Group chat coming soon')}
              onDetails={() => flash && flash(`${event.name} · details soon`)}
            />
          </div>
        ))}
      </div>

      {/* Suppress the unused-accent lint by referencing it (kept for future toggle indicator) */}
      <div style={{ display: 'none' }} data-accent={accent}/>
    </div>
  );
};
```

- [ ] **Step 2: Build to verify imports**

Run: `npm run build`
Expected: build succeeds. Any failure here is most likely a path typo — fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/screens/MainApp/MatchesTab.jsx
git commit -m "feat(matches): full-screen photo deck with Moms/Groups pill toggle

Replaces the mini-card scroll list with a vertical-snap deck. Toggle
state lives in MatchesTab; mom side renders MatchCardFull, group side
renders GroupCardFull. Existing schedule/message/profile sheets remain
the action surfaces."
```

---

## Task 6: Update `MainApp` — default tab, reorder, label size

**Files:**
- Modify: `src/screens/MainApp/index.jsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

Overwrite `src/screens/MainApp/index.jsx`:

```jsx
import { useState } from 'react';
import {
  Calendar as CalendarIcon, MapPin, Users, Heart, User,
} from 'lucide-react';
import { C } from '../../theme';
import { StatusBar } from '../../components/StatusBar';
import { CalendarTab } from './CalendarTab';
import { PlacesTab } from './PlacesTab';
import { EventsTab } from './EventsTab';
import { MatchesTab } from './MatchesTab';
import { YouTab } from './YouTab';

// ====================================================================
// MAIN APP — 5 tabs: Matches · Calendar · Places · Events · Profile
// ====================================================================
export const MainApp = ({ profile, prefs, setPrefs, location, distance, scheduled1to1, joinedEvents, setJoinedEvents, openSchedule, openProfile, openMessage, openPremium, account, requestAccount, restart, flash }) => {
  const [tab, setTab] = useState('matches');

  return (
    <div className="h-full flex flex-col" style={{ background: C.cream }}>
      <StatusBar/>

      {tab==='matches'  && <MatchesTab
        profile={profile}
        openSchedule={openSchedule} openProfile={openProfile} openMessage={openMessage}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        account={account} requestAccount={requestAccount} flash={flash}/>}
      {tab==='calendar' && <CalendarTab
        scheduled1to1={scheduled1to1} joinedEvents={joinedEvents}
        prefs={prefs} setPrefs={setPrefs}
        openSchedule={openSchedule}
        goToMatches={()=>setTab('matches')}
        flash={flash}/>}
      {tab==='places'   && <PlacesTab prefs={prefs} setPrefs={setPrefs} location={location} goToMatches={()=>setTab('matches')} flash={flash}/>}
      {tab==='events'   && <EventsTab joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents} account={account} requestAccount={requestAccount} openPremium={openPremium} flash={flash}/>}
      {tab==='profile'  && <YouTab profile={profile} prefs={prefs} location={location} distance={distance} restart={restart}/>}

      {/* Tab Bar — 5 buttons, Matches first */}
      <div className="px-3 pt-2 pb-6 border-t" style={{ borderColor: C.divider, background: C.creamSoft }}>
        <div className="flex justify-between items-center">
          {[
            { id:'matches',  icon: Heart,         label:'Matches'  },
            { id:'calendar', icon: CalendarIcon,  label:'Calendar' },
            { id:'places',   icon: MapPin,        label:'Places'   },
            { id:'events',   icon: Users,         label:'Events'   },
            { id:'profile',  icon: User,          label:'Profile'  },
          ].map(t => {
            const active = tab===t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} className="flex flex-col items-center gap-0.5 py-1.5 flex-1">
                <t.icon size={20} style={{ color: active ? C.terracotta : C.inkMuted, strokeWidth: active ? 2.2 : 1.7 }}/>
                <span className="text-[11.5px]" style={{ fontFamily:'Albert Sans', fontWeight: active?600:500, color: active ? C.ink : C.inkMuted }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
```

Changes vs prior version:
- `useState('matches')` (was `'calendar'`).
- Tab render order: matches → calendar → places → events → profile.
- Tab bar map order matches the same.
- `<MatchesTab>` now receives `profile`, `joinedEvents`, `setJoinedEvents`, `account`, `requestAccount`, `flash`.
- Icon size 20 (was 19), label `text-[11.5px]` (was `text-[10px]`).

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/screens/MainApp/index.jsx
git commit -m "feat(main-app): reorder tabs (Matches first), default to matches, larger labels

Match-me CTA on AccountScreen now lands users directly in the matches
deck. Tab labels bumped to 11.5px for readability. New tab order:
Matches · Calendar · Places · Events · Profile."
```

---

## Task 7: Delete unused `MiniMatchCard`

**Files:**
- Delete: `src/components/MiniMatchCard.jsx`

- [ ] **Step 1: Confirm no remaining importers**

Run: `grep -rn "MiniMatchCard" src/`
Expected output: only the file itself (`src/components/MiniMatchCard.jsx`) — no imports anywhere else. If anything else shows up, stop and inspect.

- [ ] **Step 2: Delete the file**

Run: `git rm src/components/MiniMatchCard.jsx`
Expected: file removed and staged for deletion.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(components): remove unused MiniMatchCard

Replaced by MatchCardFull in the redesigned Matches tab."
```

---

## Task 8: Manual end-to-end verification

**Files:**
- (no edits — verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Expected: Vite reports a local URL (usually `http://localhost:5173`). Open it in a browser.

- [ ] **Step 2: Walk the onboarding flow**

In the browser:
1. Click through Splash → Screen2 → Screen3 → Screen4 (pick at least one mom-type, value, interest so the shared-ground intersection is non-empty) → Screen5 → Screen6 → SummaryScreen → AccountScreen.
2. Fill in name, phone or email, password (≥ 8 chars), keep terms agreed. Click **Match me**.

Expected after Match me:
- App lands on the **Matches tab**, with the **Moms** half of the toggle active and the first mom's full-screen card visible.
- Photo loads in the hero. `87% match` pill visible top-right.
- Bottom panel shows `SHARED GROUND` chips. At least one chip should be a value/interest the user picked (not just `mom.tags`).

- [ ] **Step 3: Vertical scroll between mom cards**

Scroll down. Expected: the next mom snaps into view. Repeat to confirm all 4 moms render.

- [ ] **Step 4: Test mom card actions**

On a mom card:
- Tap **Schedule** → ScheduleSheet opens with that mom.
- Close, tap the chat icon → MessageSheet opens.
- Close, tap the profile icon → ProfileSheet opens.

Expected: each sheet opens correctly with the right mom.

- [ ] **Step 5: Switch to Groups**

Tap the **Groups · 8** half of the toggle.

Expected:
- Toggle highlight shifts to sage.
- Deck switches to event cards with sage accent.
- First event has its photo, "GROUP" pill top-left, date pill top-right (e.g., `MON · MAY 11`).
- "From your matches" eyebrow in sage. If any of the 4 SAMPLE_MOMS has `event.day-event.bucket` in their `freeSlots`, their initials appear in the avatar stack and the line reads "Sara, Aisha going" (or similar). For events with no overlap, the line reads "{N} going".

- [ ] **Step 6: Test group card actions**

On a group card:
- Tap **+ I'm in** → button flips to **✓ Going**, toast says `✦ RSVP'd to <event name>`.
- Tap chat icon → toast `Group chat coming soon`.
- Tap info icon → toast `<event name> · details soon`.

- [ ] **Step 7: Tab bar order + labels**

Visually confirm bottom tab order: Matches · Calendar · Places · Events · Profile.

Tap each. Expected:
- Each tab still renders correctly (no white screen, no console errors).
- Labels are noticeably larger / more legible than before.

- [ ] **Step 8: Browser console check**

Open dev tools console. Expected: no React warnings or errors during the walk-through. (Image 404s from Unsplash, if any, will surface here — replace the URL in `moms.js` or `events.js` with a working Unsplash photo if so.)

- [ ] **Step 9: Build check**

Stop the dev server. Run: `npm run build`
Expected: production build succeeds with no errors.

- [ ] **Step 10: Commit any photo-URL fixes (only if Step 8 surfaced 404s)**

```bash
git add src/data/moms.js src/data/events.js
git commit -m "data: replace broken Unsplash photo URLs surfaced during verification"
```

---

## Self-review checklist (already run by author)

- **Spec coverage:** §1 routing → Task 6. §2 reorder/labels → Task 6. §3 toggle → Task 5. §4 mom card → Task 3. §5 group card → Task 4. §6 mom data + §7 event data → Tasks 1–2. §8 file changes → Tasks 3–7. §9 routing reuses existing flow (no work). §10 token discipline applied throughout. §11 verification → Task 8.
- **Placeholders:** none — all code blocks contain final code, all paths are exact.
- **Type/name consistency:** `onSchedule`, `onMessage`, `onProfile` props on `MatchCardFull` map to `openSchedule`, `openMessage`, `openProfile` callbacks passed from `MainApp` via `MatchesTab`. `onJoin`/`onChat`/`onDetails` on `GroupCardFull` map to `handleJoin` / inline `flash` calls.
