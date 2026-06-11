// src/lib/event-cards.js
// Pure adapters: API event (the events-shape `toUi` shape) → the card shapes the
// Explore (LocalPicksTab) and Connect (ConnectTab) tabs render. No React / theme
// import so it can be unit-checked in isolation. Ranking is delegated to the
// existing recommendation engine (rankActivitiesForUser → scoreEvent) so live
// events surface in the same relevance order the Home tab uses.
//
// API event UI shape (api/_lib/events-shape.js#toUi):
//   { id, slug, day, bucket, time, name, place, going, recurring, tags, indoor,
//     mi, kidAges, hue, photo, kind: 'dated'|<recurring>, startsAt, eventType }

import { rankActivitiesForUser } from './home-feed.js';

// Neutral stock image used ONLY when an event has no hero photo. Not a data
// fallback — the event itself is always live; this is a missing-image placeholder.
export const EVENT_FALLBACK_PHOTO =
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&auto=format&fit=crop';

const DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'Tue' / 'tue' / 'TUE' → 0–6 (Sun=0). Returns null on an unknown label.
const dayIndex = (label) => {
  if (!label || typeof label !== 'string') return null;
  const key = label.slice(0, 3).toLowerCase();
  const i = DOW_SHORT.findIndex(d => d.toLowerCase() === key);
  return i < 0 ? null : i;
};

// Date → "9:30 AM" (no locale/timezone surprises — manual formatting).
const formatTime = (date) => {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

// 'meetup' when the row is a mom-led meetup, else 'event'. Drives the Meetups
// quick-filter chip + the meetup detail-sheet variant.
export const sourceOf = (ev) => (ev?.eventType === 'meetup' ? 'meetup' : 'event');

// "Sat · 9:30 AM" for dated rows (from startsAt); "Tue · 9:00 AM" for recurring
// (from the row's day + time labels).
export const whenLabel = (ev, now = new Date()) => {
  void now;
  if (ev?.kind === 'dated' && ev.startsAt) {
    const d = new Date(ev.startsAt);
    if (!Number.isNaN(d.getTime())) return `${DOW_SHORT[d.getDay()]} · ${formatTime(d)}`;
  }
  const day = ev?.day || '';
  const time = ev?.time || '';
  return [day, time].filter(Boolean).join(' · ');
};

// `mi` → "1.2 mi away" ("Nearby" under 0.1, '' when unknown).
export const distanceLabel = (ev) => {
  const mi = ev?.mi;
  if (typeof mi !== 'number') return '';
  if (mi < 0.1) return 'Nearby';
  return `${mi.toFixed(mi < 10 ? 1 : 0)} mi away`;
};

// Next calendar date matching a recurring event's day-of-week, relative to `now`
// (today counts). → { dow:'TUE', day:17, dateLabel:'Tue, Jun 17' }.
export const nextOccurrence = (dayOfWeek, now = new Date()) => {
  const target = dayIndex(dayOfWeek);
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (target == null) {
    return { dow: '', day: base.getDate(), dateLabel: `${MONTH_SHORT[base.getMonth()]} ${base.getDate()}` };
  }
  const delta = (target - base.getDay() + 7) % 7;
  const d = new Date(base.getTime() + delta * 86400000);
  return {
    dow: DOW_SHORT[d.getDay()].toUpperCase(),
    day: d.getDate(),
    dateLabel: `${DOW_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`,
  };
};

// API event → Explore EventCard shape. Carries `_live` so the detail sheet can
// read enriched fields, and `_source` for the meetup variant + quick filters.
export const eventToExploreCard = (ev, now = new Date()) => ({
  id: ev.id,
  title: ev.name,
  when: whenLabel(ev, now),
  going: ev.going || 0,
  distance: distanceLabel(ev),
  place: ev.place || '',
  photo: ev.photo || EVENT_FALLBACK_PHOTO,
  _source: sourceOf(ev),
  _live: ev,
});

// API event → Connect MeetupCard shape (date badge + "Sat, Jun 17 · 9:00 AM"
// meta). Dated rows use startsAt; recurring rows use the next occurrence of
// their day-of-week so the badge stays meaningful.
export const eventToMeetupCard = (ev, now = new Date()) => {
  let dow, day, dateLabel, timeLabel;
  if (ev.kind === 'dated' && ev.startsAt) {
    const d = new Date(ev.startsAt);
    dow = DOW_SHORT[d.getDay()].toUpperCase();
    day = d.getDate();
    dateLabel = `${DOW_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
    timeLabel = formatTime(d);
  } else {
    const occ = nextOccurrence(ev.day, now);
    dow = occ.dow; day = occ.day; dateLabel = occ.dateLabel;
    timeLabel = ev.time || '';
  }
  return {
    id: ev.id,
    dow, day,
    title: ev.name,
    place: ev.place || '',
    meta: [dateLabel, timeLabel].filter(Boolean).join(' · '),
    going: ev.going || 0,
    photo: ev.photo || EVENT_FALLBACK_PHOTO,
    _live: ev,
  };
};

// Rank raw API events through the existing engine (promoted → relevance →
// soonest → nearest). Rank BEFORE adapting so scoreEvent sees name/kidAges/tags.
export const rankEvents = (events = [], profile = null) =>
  rankActivitiesForUser(events, profile);
