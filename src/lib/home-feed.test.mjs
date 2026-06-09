import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankActivities, bucketActivities, pickTrendingPlaces } from './home-feed.js';

// Fixed reference instant: Tuesday 2026-06-09 12:00 local.
const NOW = new Date(2026, 5, 9, 12, 0, 0);

const DATED = [
  { id: 'a', kind: 'dated', startsAt: '2026-06-09T15:00:00', mi: 2 }, // today, later
  { id: 'b', kind: 'dated', startsAt: '2026-06-09T09:00:00', mi: 5 }, // today, earlier
  { id: 'c', kind: 'dated', startsAt: '2026-06-13T10:00:00', mi: 1 }, // within 7 days
  { id: 'd', kind: 'dated', startsAt: '2026-06-25T10:00:00', mi: 1 }, // later this month
  { id: 'e', kind: 'dated', startsAt: '2026-07-05T10:00:00', mi: 1 }, // next month
];

test('rankActivities: promoted first, then soonest, then nearest; no mutation', () => {
  const input = [
    { id: 'late', startsAt: '2026-06-09T20:00:00' },
    { id: 'promo', promoted: true, startsAt: '2026-06-09T23:00:00' },
    { id: 'early', startsAt: '2026-06-09T08:00:00' },
  ];
  const snapshot = input.map(x => x.id);
  const out = rankActivities(input);
  assert.deepEqual(out.map(x => x.id), ['promo', 'early', 'late']);
  // input array order is untouched (new array returned)
  assert.deepEqual(input.map(x => x.id), snapshot);
});

test('rankActivities: same time falls back to nearest mi; missing fields sort last', () => {
  const out = rankActivities([
    { id: 'far', startsAt: '2026-06-09T10:00:00', mi: 9 },
    { id: 'near', startsAt: '2026-06-09T10:00:00', mi: 1 },
    { id: 'nodate' },
  ]);
  assert.deepEqual(out.map(x => x.id), ['near', 'far', 'nodate']);
});

test('bucketActivities: today bucket is same-day only, sorted by time', () => {
  const b = bucketActivities(DATED, [], NOW);
  assert.deepEqual(b.today.map(x => x.id), ['b', 'a']);
});

test('bucketActivities: week = next 7 days, month = through end of month, both nest today', () => {
  const b = bucketActivities(DATED, [], NOW);
  assert.deepEqual(b.week.map(x => x.id), ['b', 'a', 'c']);   // excludes d (Jun 25) and e (Jul)
  assert.deepEqual(b.month.map(x => x.id), ['b', 'a', 'c', 'd']); // excludes e (next month)
});

test('bucketActivities: others = recurring list (kind !== dated), incl. fallback rows w/o kind', () => {
  const recurring = [
    { id: 'r1', kind: 'recurring' },
    { id: 'r2' },                 // SUGGESTED_EVENTS fallback shape (no kind)
    { id: 'r3', kind: 'dated', startsAt: '2026-06-10T10:00:00' }, // a dated row leaked in
  ];
  const b = bucketActivities(DATED, recurring, NOW);
  assert.deepEqual(b.others.map(x => x.id), ['r1', 'r2']); // r3 excluded (kind === dated)
});

test('bucketActivities: tolerates empty/omitted inputs', () => {
  const b = bucketActivities();
  assert.deepEqual(b, { today: [], week: [], month: [], others: [] });
});

test('pickTrendingPlaces: featured first (by top_rank), then by score; deduped; limited', () => {
  const places = {
    fun: [
      { id: 1, rating: 4.9, review_count: 200 },
      { id: 1, rating: 4.9, review_count: 200 }, // duplicate id
      { id: 3, rating: 4.5, review_count: 10 },
    ],
    schools: [
      { id: 2, is_featured: true, top_rank: 1, rating: 4.0 },
    ],
  };
  const out = pickTrendingPlaces(places, 5);
  assert.equal(out[0].id, 2);          // featured first
  assert.deepEqual(out.map(p => p.id), [2, 1, 3]); // then by score (id 1 outscores id 3)
  assert.equal(out.length, 3);          // duplicate id deduped
});

test('pickTrendingPlaces: respects the limit', () => {
  const places = { fun: [{ id: 1, rating: 5, review_count: 9 }, { id: 2, rating: 4, review_count: 9 }, { id: 3, rating: 3, review_count: 9 }] };
  assert.equal(pickTrendingPlaces(places, 2).length, 2);
});

test('pickTrendingPlaces: null / non-object input returns []', () => {
  assert.deepEqual(pickTrendingPlaces(null), []);
  assert.deepEqual(pickTrendingPlaces(undefined), []);
  assert.deepEqual(pickTrendingPlaces(42), []);
});
