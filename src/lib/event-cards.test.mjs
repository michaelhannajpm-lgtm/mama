import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sourceOf, whenLabel, distanceLabel, nextOccurrence,
  eventToExploreCard, eventToMeetupCard, rankEvents, EVENT_FALLBACK_PHOTO,
} from './event-cards.js';

// Fixed reference instant: Tuesday 2026-06-09 12:00 local.
const NOW = new Date(2026, 5, 9, 12, 0, 0);

const DATED = {
  id: 'd1', kind: 'dated', name: 'Splash Pad Meetup', place: 'Curtis Hixon Park',
  going: 12, mi: 1.2, eventType: 'meetup', tags: ['Outdoors'], kidAges: ['1–3'],
  startsAt: '2026-06-13T09:30:00', photo: 'https://img/x.jpg',
};
const RECURRING = {
  id: 'r1', kind: 'Weekly', name: 'Mom Coffee Hour', place: 'Buddy Brew',
  going: 5, mi: 0.8, eventType: 'class', day: 'Tue', time: '9:00 AM',
  tags: ['Coffee'], kidAges: ['0–1'], photo: null,
};

test('sourceOf splits meetups from other event types', () => {
  assert.equal(sourceOf(DATED), 'meetup');
  assert.equal(sourceOf(RECURRING), 'event');
  assert.equal(sourceOf({}), 'event');
});

test('whenLabel: dated from startsAt, recurring from day+time', () => {
  assert.equal(whenLabel(DATED, NOW), 'Sat · 9:30 AM'); // 2026-06-13 is a Saturday
  assert.equal(whenLabel(RECURRING, NOW), 'Tue · 9:00 AM');
  assert.equal(whenLabel({ day: 'Mon' }, NOW), 'Mon');
});

test('distanceLabel formats miles, Nearby, and unknown', () => {
  assert.equal(distanceLabel({ mi: 1.2 }), '1.2 mi away');
  assert.equal(distanceLabel({ mi: 0.05 }), 'Nearby');
  assert.equal(distanceLabel({ mi: 12 }), '12 mi away');
  assert.equal(distanceLabel({}), '');
});

test('nextOccurrence finds the next matching weekday (today counts)', () => {
  // NOW is Tue Jun 9. Next Tue = today (Jun 9); next Sat = Jun 13.
  assert.deepEqual(nextOccurrence('Tue', NOW), { dow: 'TUE', day: 9, dateLabel: 'Tue, Jun 9' });
  assert.deepEqual(nextOccurrence('Sat', NOW), { dow: 'SAT', day: 13, dateLabel: 'Sat, Jun 13' });
});

test('eventToExploreCard maps to the EventCard shape + falls back photo', () => {
  const c = eventToExploreCard(RECURRING, NOW);
  assert.equal(c.id, 'r1');
  assert.equal(c.title, 'Mom Coffee Hour');
  assert.equal(c.when, 'Tue · 9:00 AM');
  assert.equal(c.going, 5);
  assert.equal(c.distance, '0.8 mi away');
  assert.equal(c.place, 'Buddy Brew');
  assert.equal(c._source, 'event');
  assert.equal(c.photo, EVENT_FALLBACK_PHOTO); // null hero → placeholder
  assert.equal(c._live, RECURRING);
});

test('eventToMeetupCard: dated uses startsAt badge; recurring uses next occurrence', () => {
  const dated = eventToMeetupCard(DATED, NOW);
  assert.equal(dated.dow, 'SAT');
  assert.equal(dated.day, 13);
  assert.equal(dated.meta, 'Sat, Jun 13 · 9:30 AM');
  assert.equal(dated.going, 12);

  const rec = eventToMeetupCard(RECURRING, NOW);
  assert.equal(rec.dow, 'TUE');
  assert.equal(rec.day, 9);
  assert.equal(rec.meta, 'Tue, Jun 9 · 9:00 AM');
  assert.equal(rec.photo, EVENT_FALLBACK_PHOTO);
});

test('rankEvents delegates to the engine and does not mutate input', () => {
  const list = [
    { id: 'late', kind: 'dated', startsAt: '2026-06-09T20:00:00' },
    { id: 'promo', promoted: true, kind: 'dated', startsAt: '2026-06-09T23:00:00' },
    { id: 'early', kind: 'dated', startsAt: '2026-06-09T08:00:00' },
  ];
  const snap = list.map(x => x.id);
  const out = rankEvents(list, null); // no profile → plain promoted→soonest sort
  assert.equal(out[0].id, 'promo');
  assert.deepEqual(list.map(x => x.id), snap);
});
