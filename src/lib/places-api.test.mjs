import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlacesPayload, findPlaceIn } from './places-api.js';

test('passes through a well-formed payload', () => {
  const out = normalizePlacesPayload({ places: { fun: [{ id: '1' }] }, topPicks: [{ placeId: 'a' }] });
  assert.equal(out.places.fun.length, 1);
  assert.equal(out.topPicks.length, 1);
});

test('falls back to empty groups when payload is missing', () => {
  const out = normalizePlacesPayload(null);
  assert.deepEqual(out.topPicks, []);
  assert.ok(out.places && typeof out.places === 'object');
});

test('findPlaceIn matches by slug or id across groups and backfills category', () => {
  const grouped = {
    fun: [{ id: 'u1', slug: 'glazer', name: 'Glazer' }],
    sports: [{ id: 'u2', slug: 'goldfish', name: 'Goldfish', category: 'sports' }],
  };
  assert.equal(findPlaceIn(grouped, 'glazer').name, 'Glazer');
  assert.equal(findPlaceIn(grouped, 'glazer').category, 'fun'); // backfilled from group key
  assert.equal(findPlaceIn(grouped, 'u2').name, 'Goldfish');
  assert.equal(findPlaceIn(grouped, 'missing'), null);
  assert.equal(findPlaceIn(null, 'x'), null);
});
