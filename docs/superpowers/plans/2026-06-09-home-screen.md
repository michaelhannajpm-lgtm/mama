# Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `This Week` tab with a live, event-API-driven **Home** landing tab — an editorial feed with a `Today / This Week / This Month / Others` count-pill filter over the activities row, plus promo sections for places, moms, groups, and saved items, and a conditional "get verified" banner.

**Architecture:** A presentational `HomeTab.jsx` consumes data already flowing into `MainApp` (`thisWeek`, `events`, `places`, `nearbyMoms`, `savedItems`) plus `TOP_DISCUSSIONS`. All feed logic (bucketing dated events into the four time windows, ranking, picking trending places) lives in a pure, separately-verifiable `src/lib/home-feed.js`. Detail interactions reuse the existing `EventDetailSheet` / `PlaceDetailSheet` / `ShareSheet` / `SeeAllSheet`. The bottom tab bar reorders to `Home · Local Picks · Connect · My Hub`.

**Tech Stack:** Vite + React 18, Tailwind (inline styles + `C` design tokens), `lucide-react` icons. No test framework in this repo (per `CLAUDE.md`) — verification is `npm run build` + a one-off `node` assertion for pure helpers + a manual dev-server checklist.

**Spec:** `docs/superpowers/specs/2026-06-09-home-screen-design.md`

---

## File Structure

- **Create** `src/lib/home-feed.js` — pure feed logic: `rankActivities`, `bucketActivities`, `pickTrendingPlaces`. No React, no `theme` import — independently runnable under `node`.
- **Create** `src/screens/MainApp/HomeTab.jsx` — the Home screen. Presentational; delegates feed math to `home-feed.js`; reuses existing detail sheets.
- **Modify** `api/events.js` — widen the dated-event window `14 → 45` days so "This Month" has data.
- **Modify** `src/screens/MainApp/index.jsx` — import `HomeTab`, reorder `TABS`, default to `home`, time-aware greeting header for Home, thread navigation callbacks, render `HomeTab`, drop the `ThisWeekTab` route.
- **Leave on disk (unrouted)** `src/screens/MainApp/ThisWeekTab.jsx` — consistent with the repo's legacy-file convention (`Splash.jsx`, `Welcome.jsx`). Not deleted in this plan.

---

## Task 1: Pure feed logic (`home-feed.js`)

**Files:**
- Create: `src/lib/home-feed.js`

- [ ] **Step 1: Write the module**

```js
// src/lib/home-feed.js
// Pure feed logic for the Home tab. No React / no theme import so it can be
// unit-checked in isolation (see the node assertion in the plan).
//
// Event shape (from /api/events via events-shape.js):
//   { id, name, place, time, tags, mi, photo, hue, recurring,
//     kind: 'dated' | <recurring>, startsAt: ISO|null, promoted?: bool }

// Display sort: promoted first, then soonest startsAt, then nearest.
export const rankActivities = (list = []) =>
  [...list].sort((a, b) => {
    const pa = a.promoted ? 0 : 1;
    const pb = b.promoted ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const ta = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
    const tb = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
    if (ta !== tb) return ta - tb;
    return (a.mi ?? Infinity) - (b.mi ?? Infinity);
  });

const sameDay = (d, ref) =>
  d.getFullYear() === ref.getFullYear() &&
  d.getMonth() === ref.getMonth() &&
  d.getDate() === ref.getDate();

// Split dated + recurring events into the four Home filter buckets.
// Time buckets nest: today ⊆ week ⊆ month. `others` = recurring series.
// `thisWeek` = dated events from the API; `recurring` = the API's recurring list.
export const bucketActivities = (thisWeek = [], recurring = [], now = new Date()) => {
  const dated = (thisWeek || []).filter(e => e.kind === 'dated' && e.startsAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(startOfToday.getTime() + 7 * 86400000);      // next 7 days (exclusive)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);   // first of next month (exclusive)

  const inRange = (e, end) => {
    const t = new Date(e.startsAt);
    return t >= startOfToday && t < end;
  };

  return {
    today:  rankActivities(dated.filter(e => sameDay(new Date(e.startsAt), now))),
    week:   rankActivities(dated.filter(e => inRange(e, weekEnd))),
    month:  rankActivities(dated.filter(e => inRange(e, monthEnd))),
    others: rankActivities((recurring || []).filter(e => e.kind !== 'dated')),
  };
};

// Grouped /api/places payload → flat, de-duped, top-rated list.
// Mirrors LocalPicksTab's "top places" scoring: featured (by top_rank) first,
// then quality weighted by review volume.
const PLACE_CATEGORY_KEYS =
  ['fun', 'sports', 'wellness', 'schools', 'childcare', 'extracurricular', 'camps', 'health'];

const placeScore = (r) => (r.rating || 0) * Math.log10((r.review_count || 0) + 1);

export const pickTrendingPlaces = (places, limit = 8) => {
  if (!places || typeof places !== 'object') return [];
  const seen = new Set();
  const all = [];
  for (const k of PLACE_CATEGORY_KEYS) {
    for (const r of (Array.isArray(places[k]) ? places[k] : [])) {
      if (r?.id != null) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
      }
      all.push(r);
    }
  }
  const featured = all
    .filter(r => r.is_featured)
    .sort((a, b) => (a.top_rank ?? 1e9) - (b.top_rank ?? 1e9) || (b.rating || 0) - (a.rating || 0));
  const featuredIds = new Set(featured.map(r => r.id));
  const rest = all
    .filter(r => !featuredIds.has(r.id))
    .sort((a, b) => placeScore(b) - placeScore(a));
  return [...featured, ...rest].slice(0, limit);
};
```

- [ ] **Step 2: Verify the pure logic with a node assertion**

This repo has no test runner, so run the helpers directly under node with a fixed `now` (deterministic — no date mocking needed):

Run:
```bash
node --input-type=module -e '
import { bucketActivities, pickTrendingPlaces, rankActivities } from "./src/lib/home-feed.js";
import assert from "node:assert";

const now = new Date("2026-06-09T12:00:00");        // Tuesday
const dated = [
  { id:"a", kind:"dated", startsAt:"2026-06-09T15:00:00", mi:2 }, // today
  { id:"b", kind:"dated", startsAt:"2026-06-09T09:00:00", mi:5 }, // today (earlier)
  { id:"c", kind:"dated", startsAt:"2026-06-13T10:00:00", mi:1 }, // this week
  { id:"d", kind:"dated", startsAt:"2026-06-25T10:00:00", mi:1 }, // this month
  { id:"e", kind:"dated", startsAt:"2026-07-05T10:00:00", mi:1 }, // next month (excluded)
];
const recurring = [{ id:"r1", kind:"Weekly", startsAt:null }];

const b = bucketActivities(dated, recurring, now);
assert.deepStrictEqual(b.today.map(x=>x.id),  ["b","a"], "today sorted by time");
assert.deepStrictEqual(b.week.map(x=>x.id),   ["b","a","c"], "week = next 7 days");
assert.deepStrictEqual(b.month.map(x=>x.id),  ["b","a","c","d"], "month excludes July");
assert.deepStrictEqual(b.others.map(x=>x.id), ["r1"], "others = recurring");

const promoted = rankActivities([{id:"x",startsAt:"2026-06-09T08:00:00"},{id:"p",promoted:true,startsAt:"2026-06-09T20:00:00"}]);
assert.strictEqual(promoted[0].id, "p", "promoted floats to top");

const places = { fun:[{id:1,rating:4.9,review_count:200},{id:1,rating:4.9,review_count:200}], schools:[{id:2,is_featured:true,top_rank:1,rating:4.0}] };
const top = pickTrendingPlaces(places, 5);
assert.strictEqual(top[0].id, 2, "featured first");
assert.strictEqual(top.length, 2, "deduped by id");

console.log("home-feed OK");
'
```
Expected: prints `home-feed OK` and exits 0. (If it throws, the message names the failing assertion.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/home-feed.js
git commit -m "feat(home): pure feed logic — bucket/rank activities, pick trending places"
```

---

## Task 2: Widen the dated-event API window

**Files:**
- Modify: `api/events.js`

- [ ] **Step 1: Change the window from 14 to 45 days**

In `api/events.js`, find:

```js
    const { recurring, thisWeek } = splitEvents(rows, { now: new Date(), windowDays: 14 });
```

Replace with:

```js
    // 45-day window so the Home tab's "This Month" filter has data to bucket.
    const { recurring, thisWeek } = splitEvents(rows, { now: new Date(), windowDays: 45 });
```

- [ ] **Step 2: Verify the build still compiles**

Run: `npm run build`
Expected: build succeeds, no errors referencing `api/events.js`.

- [ ] **Step 3: Commit**

```bash
git add api/events.js
git commit -m "feat(events): widen dated-event window to 45 days for Home This Month filter"
```

---

## Task 3: Create `HomeTab.jsx`

**Files:**
- Create: `src/screens/MainApp/HomeTab.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/screens/MainApp/HomeTab.jsx
import { useState } from 'react';
import {
  MapPin, ChevronRight, Star, Clock, ShieldCheck, Users, Bookmark,
} from 'lucide-react';
import { C } from '../../theme';
import { bucketActivities, pickTrendingPlaces } from '../../lib/home-feed';
import { EventDetailSheet } from '../../sheets/EventDetailSheet';
import { PlaceDetailSheet } from '../../sheets/PlaceDetailSheet';
import { SeeAllSheet } from '../../sheets/SeeAllSheet';
import { ShareSheet } from '../../sheets/ShareSheet';

// ==========================================================================
// HomeTab — editorial landing feed (replaces ThisWeekTab in routing).
//
//   • Conditional "get verified" banner
//   • Count-pill time filter (Today / This Week / This Month / Others)
//     scoping ONLY the activities row below it
//   • Promo rows: Trending places · Moms near you · Groups for you
//   • Saved-spots summary (only when something is saved)
//   • "See all activities" CTA
//
// Activities come from the live event API (thisWeek + recurring). All feed
// math lives in src/lib/home-feed.js.
// ==========================================================================

const FILTERS = [
  { id: 'today',  label: 'Today'      },
  { id: 'week',   label: 'This Week'  },
  { id: 'month',  label: 'This Month' },
  { id: 'others', label: 'Others'     },
];

const SECTION_TITLES = {
  today:  'Happening today',
  week:   'This week',
  month:  'Later this month',
  others: 'Ongoing & weekly',
};

// Empty-state nudge per filter. `to` switches the filter when tapped.
const EMPTY_NUDGE = {
  today:  { text: 'Nothing scheduled today — peek at This Week', to: 'week'   },
  week:   { text: 'No dated events this week — browse ongoing',   to: 'others' },
  month:  { text: 'No dated events this month — browse ongoing',  to: 'others' },
  others: { text: 'No recurring groups yet.',                     to: null     },
};

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const whenLabel = (item, filter) => {
  if (filter === 'others') return item.recurring || 'Ongoing';
  if (filter === 'today')  return item.time || 'Today';
  if (item.startsAt) {
    const d = new Date(item.startsAt);
    return `${DOW[d.getDay()]} ${d.getDate()}${item.time ? ` · ${item.time}` : ''}`;
  }
  return item.time || '';
};

const placePhoto = (p) => p.hero_photo || p.blob_url || p.url || null;

// -------------------------- shared bits --------------------------

const CountPill = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className="active:scale-[.97] transition-transform"
    style={{
      flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 11px', borderRadius: 14,
      background: active ? `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})` : C.paper,
      color: active ? '#fff' : C.navySoft,
      border: `1px solid ${active ? C.coralDeep : C.divider}`,
      fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700,
      cursor: 'pointer',
    }}
  >
    {label}
    <span style={{
      fontFamily: 'Albert Sans', fontSize: 8.5, fontWeight: 800,
      padding: '1px 5px', borderRadius: 8,
      background: active ? 'rgba(255,255,255,.25)' : C.cream,
      color: active ? '#fff' : C.muted,
    }}>
      {count}
    </span>
  </button>
);

const SectionHead = ({ title, link = 'See all', onLink }) => (
  <div className="flex items-center justify-between" style={{ marginTop: 14, marginBottom: 8 }}>
    <div style={{ fontFamily: 'Fraunces', fontSize: 16, fontWeight: 700, color: C.navy, letterSpacing: '-.01em' }}>
      {title}
    </div>
    {onLink && (
      <button
        onClick={onLink}
        className="active:scale-[.98] transition-transform"
        style={{
          background: 'transparent', border: 'none', padding: 0,
          display: 'flex', alignItems: 'center', gap: 1,
          color: C.coralDeep, fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        }}
      >
        {link} <ChevronRight size={11}/>
      </button>
    )}
  </div>
);

const VerifyBanner = ({ onVerify }) => (
  <button
    onClick={onVerify}
    className="text-left active:scale-[.99] transition-transform"
    style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 12px', borderRadius: 14, marginBottom: 4,
      background: `linear-gradient(135deg, ${C.peach}, ${C.coralSoft})`,
      border: `1px solid ${C.coralSoft}`, cursor: 'pointer',
    }}
  >
    <div style={{
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <ShieldCheck size={17} color={C.coralDeep}/>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 800, color: C.navy }}>
        Get your verified badge
      </div>
      <div style={{ fontFamily: 'Albert Sans', fontSize: 10, color: C.inkSoft, marginTop: 1 }}>
        Connect Instagram + add a real photo
      </div>
    </div>
    <span style={{
      flexShrink: 0, fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 800,
      color: '#fff', background: C.coralDeep, padding: '5px 11px', borderRadius: 12,
    }}>
      Verify →
    </span>
  </button>
);

const ActivityCard = ({ item, filter, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    flexShrink: 0, width: 132, background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`, boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden', padding: 0, cursor: 'pointer',
  }}>
    <div style={{ position: 'relative', height: 76 }}>
      {item.photo
        ? <img src={item.photo} alt="" style={{ width: '100%', height: 76, objectFit: 'cover', display: 'block' }}/>
        : <div style={{ width: '100%', height: 76, background: item.hue || `linear-gradient(135deg, ${C.coral}, ${C.saffron})` }}/>}
      <div style={{
        position: 'absolute', top: 6, left: 6, background: 'rgba(255,255,255,.95)',
        padding: '3px 7px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 3,
        fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 800, color: C.coralDeep, letterSpacing: '.03em',
      }}>
        <Clock size={9}/> {whenLabel(item, filter)}
      </div>
    </div>
    <div style={{ padding: '6px 8px 9px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 26,
      }}>
        {item.name}
      </div>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 9, color: C.muted, marginTop: 4, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.place}
      </div>
      {item.mi != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4, fontFamily: 'Albert Sans', fontSize: 8.5, color: C.muted }}>
          <MapPin size={8}/> {item.mi} mi
        </div>
      )}
    </div>
  </button>
);

const PlaceCard = ({ item, onClick }) => (
  <button onClick={onClick} className="text-left active:scale-[.98] transition-transform" style={{
    flexShrink: 0, width: 124, background: '#fff', borderRadius: 12,
    border: `1px solid ${C.line}`, boxShadow: '0 3px 8px -6px rgba(27,42,78,.18)',
    overflow: 'hidden', padding: 0, cursor: 'pointer',
  }}>
    {placePhoto(item)
      ? <img src={placePhoto(item)} alt="" style={{ width: '100%', height: 66, objectFit: 'cover', display: 'block' }}/>
      : <div style={{ width: '100%', height: 66, background: C.lilac }}/>}
    <div style={{ padding: '6px 8px 9px' }}>
      <div style={{
        fontFamily: 'Albert Sans', fontSize: 10.5, fontWeight: 700, color: C.navy, lineHeight: 1.2,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 25,
      }}>
        {item.name}
      </div>
      {item.rating != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4, fontFamily: 'Albert Sans', fontSize: 9, fontWeight: 700, color: C.navy }}>
          <Star size={9} fill={C.saffron} color={C.saffron}/>
          {item.rating}
          {item.review_count != null && <span style={{ fontWeight: 500, color: C.muted }}>({item.review_count})</span>}
        </div>
      )}
    </div>
  </button>
);

const MomChip = ({ item, onClick }) => (
  <button onClick={onClick} className="active:scale-[.97] transition-transform" style={{
    flexShrink: 0, width: 78, background: 'transparent', border: 'none', padding: 0, textAlign: 'center', cursor: 'pointer',
  }}>
    <div className="rounded-full overflow-hidden flex items-center justify-center" style={{
      width: 54, height: 54, margin: '0 auto', background: C.coralSoft,
    }}>
      {item.photo
        ? <img src={item.photo} alt="" style={{ width: 54, height: 54, objectFit: 'cover' }}/>
        : <span style={{ fontFamily: 'Fraunces', fontSize: 18, fontWeight: 700, color: C.coralDeep }}>
            {(item.firstName || item.name || '?').charAt(0).toUpperCase()}
          </span>}
    </div>
    <div style={{ fontFamily: 'Albert Sans', fontSize: 9.5, fontWeight: 700, color: C.navy, marginTop: 5, lineHeight: 1.15 }}>
      {item.firstName || item.name}
    </div>
    <div style={{ fontFamily: 'Albert Sans', fontSize: 8.5, color: C.sageDark, fontWeight: 700, marginTop: 1 }}>
      {(item.sharedTags && item.sharedTags[0]) || item.kids || item.distance || ''}
    </div>
  </button>
);

const GroupRow = ({ item, onClick }) => {
  const Icon = item.Icon || Users;
  return (
    <button onClick={onClick} className="active:scale-[.99] transition-transform" style={{
      width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
      background: '#fff', border: `1px solid ${C.line}`, borderRadius: 11, padding: '9px 11px', cursor: 'pointer',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: item.bg || C.sage, color: item.fg || C.sageDark,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16}/>
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <div style={{
          fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 800, color: C.navy,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title}
        </div>
        <div style={{ fontFamily: 'Albert Sans', fontSize: 9.5, color: C.muted, marginTop: 1 }}>
          {item.members} moms{item.online ? ` · ${item.online} online` : ''}
        </div>
      </div>
      <span style={{
        flexShrink: 0, fontFamily: 'Albert Sans', fontSize: 10, fontWeight: 800,
        color: C.sageDark, background: C.sage, padding: '4px 11px', borderRadius: 10,
      }}>
        Join
      </span>
    </button>
  );
};

// -------------------------- screen --------------------------

export const HomeTab = ({
  thisWeek = [], events = [],         // events = recurring list from the API
  places = null, nearbyMoms = [], groups = [],
  savedItems = [], goingItems = [], setGoingItems,
  joinedEvents = [], setJoinedEvents, setSavedItems,
  profile, flash,
  goToPlaces, goToConnect, goToHub, onVerify, openVillage,
}) => {
  const [filter, setFilter] = useState('today');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [shareItem, setShareItem] = useState(null);
  const [seeAll, setSeeAll] = useState(false);

  const buckets = bucketActivities(thisWeek, events, new Date());
  const activities = buckets[filter] || [];
  const trending = pickTrendingPlaces(places, 8);
  const moms = nearbyMoms.slice(0, 8);
  const topGroups = groups.slice(0, 3);

  const v = profile?.verified || {};
  const isVerified = !!(v.photo && (v.instagram || v.facebook));

  const isSaved      = (id) => savedItems.includes(id);
  const isGoing      = (id) => goingItems.includes(id);
  const isJoined     = (id) => joinedEvents.includes(id);
  const toggleSave   = (id) => setSavedItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleGoing  = (id) => setGoingItems?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleJoined = (id) => setJoinedEvents?.(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openActivity = (item) => setSelectedEvent({
    id: item.id, title: item.name, photo: item.photo,
    when: whenLabel(item, filter), place: item.place,
    distance: item.mi != null ? `${item.mi} mi` : 'Near you',
    tags: item.tags || [], kind: filter === 'others' ? 'Recurring' : 'Activity',
  });
  const openPlace = (p) => setSelectedPlace({
    id: p.id, title: p.name, photo: placePhoto(p),
    rating: p.rating, reviews: p.review_count,
    tag: p.area || p.city, distance: 'Near you', kind: 'Place',
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-5" style={{ scrollbarWidth: 'none', paddingTop: 2, paddingBottom: 16 }}>

        {/* Verify banner — only when not yet verified */}
        {!isVerified && <VerifyBanner onVerify={onVerify}/>}

        {/* Time filter — count pills */}
        <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingTop: 8, paddingBottom: 2 }}>
          {FILTERS.map(f => (
            <CountPill
              key={f.id}
              label={f.label}
              count={(buckets[f.id] || []).length}
              active={filter === f.id}
              onClick={() => setFilter(f.id)}
            />
          ))}
        </div>

        {/* Activities row (scoped by filter) */}
        <SectionHead title={SECTION_TITLES[filter]} onLink={activities.length ? () => setSeeAll(true) : null}/>
        {activities.length ? (
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
            {activities.map(item => (
              <ActivityCard key={item.id} item={item} filter={filter} onClick={() => openActivity(item)}/>
            ))}
          </div>
        ) : (
          <button
            onClick={() => EMPTY_NUDGE[filter].to && setFilter(EMPTY_NUDGE[filter].to)}
            className="text-left active:scale-[.99] transition-transform"
            style={{
              width: '100%', padding: '16px 14px', borderRadius: 12,
              background: C.blush, border: `1px dashed ${C.coralSoft}`, cursor: 'pointer',
              fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 600, color: C.inkSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}
          >
            {EMPTY_NUDGE[filter].text}
            {EMPTY_NUDGE[filter].to && <ChevronRight size={14} color={C.coralDeep}/>}
          </button>
        )}

        {/* Trending places near you */}
        {trending.length > 0 && (
          <>
            <SectionHead title="Trending places near you" onLink={goToPlaces}/>
            <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
              {trending.map(p => <PlaceCard key={p.id} item={p} onClick={() => openPlace(p)}/>)}
            </div>
          </>
        )}

        {/* Moms near you */}
        {moms.length > 0 && (
          <>
            <SectionHead title="Moms near you" onLink={goToConnect}/>
            <div className="flex gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none', paddingBottom: 2 }}>
              {moms.map(m => <MomChip key={m.id} item={m} onClick={goToConnect}/>)}
            </div>
          </>
        )}

        {/* Groups for you */}
        {topGroups.length > 0 && (
          <>
            <SectionHead title="Groups for you" onLink={goToHub}/>
            {topGroups.map(g => <GroupRow key={g.id} item={g} onClick={goToHub}/>)}
          </>
        )}

        {/* Saved-spots summary — only when something is saved */}
        {savedItems.length > 0 && (
          <>
            <SectionHead title="Your saved spots" link="My Village" onLink={openVillage}/>
            <button
              onClick={openVillage}
              className="active:scale-[.99] transition-transform"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff', border: `1px solid ${C.line}`, borderRadius: 11, padding: '11px 12px', cursor: 'pointer',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: C.coralSoft,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bookmark size={16} color={C.coralDeep}/>
              </div>
              <div style={{ flex: 1, textAlign: 'left', fontFamily: 'Albert Sans', fontSize: 11.5, fontWeight: 700, color: C.navy }}>
                {savedItems.length} saved {savedItems.length === 1 ? 'item' : 'items'}
                <div style={{ fontSize: 9.5, fontWeight: 600, color: C.muted, marginTop: 1 }}>Open My Village to view them all</div>
              </div>
              <ChevronRight size={16} color={C.muted}/>
            </button>
          </>
        )}

        {/* See all activities CTA */}
        <button
          onClick={() => activities.length && setSeeAll(true)}
          style={{
            marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '12px 14px', borderRadius: 24,
            background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`,
            border: 'none', color: '#fff', fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 700,
            boxShadow: '0 6px 16px -6px rgba(214,68,106,.55)', cursor: 'pointer',
          }}
        >
          See all activities <ChevronRight size={14}/>
        </button>
      </div>

      {seeAll && (
        <SeeAllSheet
          title={SECTION_TITLES[filter]}
          subtitle={`${activities.length} ${activities.length === 1 ? 'idea' : 'ideas'} for you`}
          items={activities}
          renderItem={(item) => (
            <ActivityCard key={item.id} item={item} filter={filter} onClick={() => openActivity(item)}/>
          )}
          columns={2}
          onClose={() => setSeeAll(false)}
        />
      )}

      {selectedEvent && (
        <EventDetailSheet
          event={selectedEvent}
          saved={isSaved(selectedEvent.id)}
          joined={isJoined(selectedEvent.id)}
          interested={isGoing(selectedEvent.id)}
          onJoin={() => {
            toggleJoined(selectedEvent.id);
            flash?.(isJoined(selectedEvent.id) ? `Removed RSVP · ${selectedEvent.title}` : `✦ You're going · ${selectedEvent.title}`);
          }}
          onInterested={() => {
            toggleGoing(selectedEvent.id);
            flash?.(isGoing(selectedEvent.id) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onSave={() => {
            toggleSave(selectedEvent.id);
            flash?.(isSaved(selectedEvent.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onShare={() => setShareItem({
            title: selectedEvent.title, kind: selectedEvent.kind || 'Event',
            when: selectedEvent.when, place: selectedEvent.place, photo: selectedEvent.photo,
          })}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {selectedPlace && (
        <PlaceDetailSheet
          place={selectedPlace}
          saved={isSaved(selectedPlace.id)}
          interested={isGoing(selectedPlace.id)}
          onSave={() => {
            toggleSave(selectedPlace.id);
            flash?.(isSaved(selectedPlace.id) ? 'Removed from saved' : '✦ Saved');
          }}
          onInterested={() => {
            toggleGoing(selectedPlace.id);
            flash?.(isGoing(selectedPlace.id) ? 'Removed interest' : '✦ Marked as interested');
          }}
          onShare={() => setShareItem({
            title: selectedPlace.title, kind: selectedPlace.kind || 'Place',
            place: selectedPlace.distance, photo: selectedPlace.photo,
          })}
          onDirections={() => flash?.('Opening directions…')}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      {shareItem && (
        <ShareSheet item={shareItem} flash={flash} onClose={() => setShareItem(null)}/>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds. (HomeTab isn't routed yet — this only checks the file's imports/JSX are valid.)

- [ ] **Step 3: Commit**

```bash
git add src/screens/MainApp/HomeTab.jsx
git commit -m "feat(home): HomeTab editorial feed — count-pill filter, activities, promos"
```

---

## Task 4: Wire HomeTab into the MainApp shell

**Files:**
- Modify: `src/screens/MainApp/index.jsx`

- [ ] **Step 1: Update imports**

In `src/screens/MainApp/index.jsx`, change the icon import line (line 2) to add `Home`:

```jsx
import { CalendarDays, Users, MapPin, User, LayoutGrid, Home } from 'lucide-react';
```

Replace the `ThisWeekTab` import (line 5):

```jsx
import { HomeTab } from './HomeTab';
```

Add to the discussions import (line 12) so Home can show top groups:

```jsx
import { GROUP_DISCUSSIONS, TOP_DISCUSSIONS } from '../../data/discussions';
```

- [ ] **Step 2: Reorder the tab bar and default tab**

Replace the `TABS` array (lines 25–30) with:

```jsx
const TABS = [
  { id: 'home',       icon: Home,    label: 'Home',        headerLabel: 'Home'        },
  { id: 'localpicks', icon: MapPin,  label: 'Local Picks', headerLabel: 'Local Picks' },
  { id: 'connect',    icon: Users,   label: 'Connect',     headerLabel: 'Connect'     },
  { id: 'hub',        icon: LayoutGrid, label: 'My Hub',   headerLabel: 'My Hub'      },
];
```

Replace the `HEADER_SUBTITLES` object (lines 32–38) with:

```jsx
const HEADER_SUBTITLES = {
  home:       'Things to do, near you',
  connect:    'Meet moms who get it',
  localpicks: 'The best places, programs, schools, and resources near you.',
  hub:        'Your village, all in one place',
  profile:    'Everything for you and your family',
};
```

Replace the `HEADER_LABELS` object (lines 42–45) with:

```jsx
const HEADER_LABELS = {
  home: 'Home', connect: 'Connect', localpicks: 'Local Picks',
  hub: 'My Hub', profile: 'My Profile',
};
```

Change the default tab (line 64) from `'thisweek'` to `'home'`:

```jsx
  const [tab, setTab] = useState('home');
```

- [ ] **Step 3: Time-aware greeting header for Home**

The shared header renders `activeLabel` (from `HEADER_LABELS`). For Home, swap in a greeting. Just above the `return (` statement in the `MainApp` component (after `const isProfile = tab === 'profile';`, line 80), add:

```jsx
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const headerTitle = tab === 'home'
    ? `${greeting}${account?.firstName ? `, ${account.firstName}` : ''}`
    : activeLabel;
```

Then in the header JSX, replace `{activeLabel}` (line 94) with `{headerTitle}`.

- [ ] **Step 4: Render HomeTab and remove the ThisWeek route**

Replace the `{tab === 'thisweek' && <ThisWeekTab .../>}` block (lines 139–145) with:

```jsx
      {tab === 'home' && <HomeTab
        thisWeek={thisWeek} events={events}
        places={places} nearbyMoms={nearbyMoms} groups={TOP_DISCUSSIONS}
        savedItems={savedItems} setSavedItems={setSavedItems}
        goingItems={goingItems} setGoingItems={setGoingItems}
        joinedEvents={joinedEvents} setJoinedEvents={setJoinedEvents}
        profile={profile} flash={flash}
        goToPlaces={() => setTab('localpicks')}
        goToConnect={() => setTab('connect')}
        goToHub={() => setTab('hub')}
        onVerify={() => setTab('profile')}
        openVillage={() => setVillageOpen(true)}/>}
```

- [ ] **Step 5: Remove the now-unused This Week filter state**

`HomeTab` doesn't use the advanced filter sheet, so the `thisWeekFilterOpen` state is dead. Remove its declaration (line 74):

```jsx
  const [thisWeekFilterOpen,   setThisWeekFilterOpen]   = useState(false);
```

(Leave `connectFilterOpen` and `localPicksFilterOpen` — those tabs still use them.)

- [ ] **Step 6: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no unused-import or undefined-variable errors. If the build flags `ThisWeekTab` or `setThisWeekFilterOpen` as unused/undefined, confirm Steps 1 and 5 were applied.

- [ ] **Step 7: Commit**

```bash
git add src/screens/MainApp/index.jsx
git commit -m "feat(mainapp): route Home tab, reorder to Home·Local Picks·Connect·My Hub"
```

---

## Task 5: Manual verification & wrap-up

**Files:** none (verification only)

- [ ] **Step 1: Run the dev server**

Run: `npm run dev`
Then open the prototype route (`/prototype`) and complete onboarding into MainApp (or use a returning OAuth session that hydrates straight to MainApp).

- [ ] **Step 2: Verify the Home screen against this checklist**

- [ ] Home is the **first/default** tab; bottom bar order is **Home · Local Picks · Connect · My Hub**.
- [ ] Header shows a time-aware greeting ("Good morning, …"); other tabs still show their normal titles.
- [ ] If the profile is **not** verified, the coral "Get your verified badge" banner shows; tapping it switches to the Profile tab. (Toggle verification in Profile, return to Home — banner is gone.)
- [ ] Four count pills render with counts; tapping a pill swaps the activities row and its heading (Happening today / This week / Later this month / Ongoing & weekly). Active pill is coral.
- [ ] Tapping an activity opens the `EventDetailSheet`; save / interested / RSVP toggles work and toasts fire.
- [ ] A filter with no events shows the dashed empty-state nudge; tapping it switches to the suggested filter.
- [ ] "Trending places near you" shows place cards; tapping one opens `PlaceDetailSheet`; "See all" jumps to Local Picks.
- [ ] "Moms near you" shows mom chips; tapping any chip (or "See all") jumps to Connect.
- [ ] "Groups for you" lists up to 3 groups; tapping any (or "See all") jumps to My Hub.
- [ ] "Your saved spots" is hidden when nothing is saved; after saving an item it appears with the correct count and opens My Village.
- [ ] "See all activities" CTA opens the `SeeAllSheet` for the current filter.

- [ ] **Step 3: Confirm production build is clean**

Run: `npm run build`
Expected: succeeds with no errors or new warnings tied to `HomeTab.jsx`, `home-feed.js`, or `MainApp/index.jsx`.

- [ ] **Step 4: Final commit (only if Steps 1–3 surfaced fixes)**

```bash
git add -A
git commit -m "fix(home): address manual-verification findings"
```

---

## Notes for the executor

- **No test framework** in this repo — do **not** add Jest/Vitest. Verify with `npm run build`, the Task 1 `node` assertion, and the Task 5 manual checklist.
- **Design tokens only** — every color is a `C.*` token; no raw hex. Coral = activities/CTAs/verify (1:1 intimacy), sage = moms/groups (community), saffron = ratings/highlight.
- **`ThisWeekTab.jsx` stays on disk**, unrouted — matching the repo's legacy-file convention. Do not delete it in this plan.
- **Future seam:** the relevance/matching algorithm and promoted-event weighting plug into `rankActivities` in `home-feed.js` without touching `HomeTab`. The `promoted` flag is already honored by the sort.
