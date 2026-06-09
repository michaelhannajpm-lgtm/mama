import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankAndShape } from './nearby.js';

const baseRow = (over) => ({
  id: 'x', auth_user_id: null, display_name: 'Mom', mom_types: ['working'],
  kids_ages: {}, interests: [], values: [], places: [], free_slots: [],
  home_lat: null, home_lng: null, verified: true, ...over,
});

test('excludes self by auth_user_id and by seed_mom_id', () => {
  const rows = [
    baseRow({ id: 'a', auth_user_id: 'me' }),
    baseRow({ id: 'seed-1' }),
    baseRow({ id: 'b', auth_user_id: 'other' }),
  ];
  const { moms } = rankAndShape(rows, { auth_user_id: 'me', seed_mom_id: 'seed-1' }, { limit: 10 });
  const ids = moms.map((m) => m.id);
  assert.deepEqual(ids.sort(), ['b']);
});

test('computes rounded distance when both sides have coords', () => {
  const rows = [baseRow({ id: 'a', home_lat: 27.95, home_lng: -82.46 })];
  const { moms } = rankAndShape(rows, { lat: 27.95, lng: -82.46 }, { limit: 10 });
  assert.equal(moms[0].distanceMi, 0);
  assert.equal(moms[0].distance, '0.0 mi away');
});

test('distance is null when the user has no coords', () => {
  const rows = [baseRow({ id: 'a', home_lat: 27.95, home_lng: -82.46 })];
  const { moms } = rankAndShape(rows, {}, { limit: 10 });
  assert.equal(moms[0].distanceMi, null);
  assert.equal(moms[0].distance, null);
});

test('ranks higher overlap first, then closer; returns total + sliced list', () => {
  const user = { lat: 0, lng: 0, interests: ['A'] };
  const rows = [
    baseRow({ id: 'far-match', interests: ['A'], home_lat: 0, home_lng: 1 }),
    baseRow({ id: 'near-nomatch', interests: ['Z'], home_lat: 0, home_lng: 0 }),
  ];
  const { moms, total } = rankAndShape(rows, user, { limit: 1 });
  assert.equal(total, 2);
  assert.equal(moms.length, 1);
  assert.equal(moms[0].id, 'far-match');
});

test('handles non-array rows without throwing', () => {
  const { moms, total } = rankAndShape(null, {}, {});
  assert.deepEqual(moms, []);
  assert.equal(total, 0);
});
