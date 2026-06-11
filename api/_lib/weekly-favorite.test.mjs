import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekStart, placeScore, pickAuto } from './weekly-favorite.js';

test('weekStart returns the Monday of the week as YYYY-MM-DD', () => {
  // 2026-06-11 is a Thursday → Monday is 2026-06-08
  assert.equal(weekStart(new Date('2026-06-11T15:00:00')), '2026-06-08');
  // Monday maps to itself
  assert.equal(weekStart(new Date('2026-06-08T00:00:00')), '2026-06-08');
  // Sunday belongs to the week that started the previous Monday
  assert.equal(weekStart(new Date('2026-06-14T23:59:00')), '2026-06-08');
});

test('placeScore weights rating by review volume', () => {
  const hi = placeScore({ rating: 4.8, review_count: 999 });
  const lo = placeScore({ rating: 4.8, review_count: 0 });
  assert.ok(hi > lo);
  assert.equal(placeScore({ rating: null, review_count: null }), 0);
});

test('pickAuto picks the top-scoring place not on cooldown', () => {
  const rows = [
    { id: 1, rating: 4.9, review_count: 500 },
    { id: 2, rating: 4.7, review_count: 800 },
    { id: 3, rating: 4.5, review_count: 100 },
  ];
  // id 1 would win, but it's on cooldown → id 2 (higher reviews than 3).
  assert.equal(pickAuto(rows, [1]).id, 2);
  // Nothing on cooldown → highest score (id 1).
  assert.equal(pickAuto(rows, []).id, 1);
});

test('pickAuto is deterministic on score ties (review_count then id)', () => {
  const rows = [
    { id: 5, rating: 4.0, review_count: 10 },
    { id: 2, rating: 4.0, review_count: 10 },
  ];
  assert.equal(pickAuto(rows, []).id, 2); // equal score+reviews → lowest id
});

test('pickAuto returns null when every place is on cooldown', () => {
  const rows = [{ id: 1, rating: 4.9, review_count: 500 }];
  assert.equal(pickAuto(rows, [1]), null);
});
