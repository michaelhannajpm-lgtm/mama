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

test('excludes moms who turned OFF "Discoverable"; keeps default/true', () => {
  const rows = [
    baseRow({ id: 'hidden',  settings: { privacy: { discoverable: false } } }),
    baseRow({ id: 'shown',   settings: { privacy: { discoverable: true } } }),
    baseRow({ id: 'default' }), // no settings ⇒ discoverable by default
  ];
  const { moms } = rankAndShape(rows, {}, { limit: 10 });
  assert.deepEqual(moms.map((m) => m.id).sort(), ['default', 'shown']);
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

test('without coords, falls back to administrative tiers (city > county > elsewhere)', () => {
  const user = { city: 'Tampa', county: 'Hillsborough' }; // no lat/lng
  const rows = [
    baseRow({ id: 'elsewhere', city: 'Sarasota', county: 'Manatee' }),
    baseRow({ id: 'same-county', city: 'Brandon', county: 'Hillsborough' }),
    baseRow({ id: 'same-city', city: 'Tampa', county: 'Hillsborough' }),
  ];
  const { moms } = rankAndShape(rows, user, { limit: 3 });
  assert.deepEqual(moms.map((m) => m.id), ['same-city', 'same-county', 'elsewhere']);
});

test('same-neighborhood nudge breaks a tie between equally-compatible moms', () => {
  const user = { lat: 0, lng: 0, city: 'Tampa', neighborhood: 'Hyde Park' };
  const rows = [
    baseRow({ id: 'other-hood',  city: 'Tampa', neighborhood: 'Seminole Heights', home_lat: 0, home_lng: 0 }),
    baseRow({ id: 'same-hood',   city: 'Tampa', neighborhood: 'Hyde Park',         home_lat: 0, home_lng: 0 }),
  ];
  const { moms } = rankAndShape(rows, user, { limit: 1 });
  assert.equal(moms[0].id, 'same-hood');
});

test('strong commonality still outranks mere proximity', () => {
  const user = { lat: 0, lng: 0, interests: ['A', 'B', 'C'], neighborhood: 'Hyde Park' };
  const rows = [
    baseRow({ id: 'compatible-far', interests: ['A', 'B', 'C'], home_lat: 0, home_lng: 0.05 }),
    baseRow({ id: 'empty-samehood', interests: [], neighborhood: 'Hyde Park', home_lat: 0, home_lng: 0 }),
  ];
  const { moms } = rankAndShape(rows, user, { limit: 1 });
  assert.equal(moms[0].id, 'compatible-far');
});
