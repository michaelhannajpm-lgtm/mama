import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupPlaces } from './places-shape.js';

test('groups visible rows by primary category into PLACES shape', () => {
  const rows = [
    { id: '1', slug: 'a', name: 'A', category: 'fun', area: 'Hyde Park', tags: [], hero_photo: null },
    { id: '2', slug: 'b', name: 'B', category: 'sports', area: 'Westshore', tags: ['Swim'], hero_photo: 'x' },
    { id: '3', slug: 'c', name: 'C', category: 'fun', area: 'Downtown', tags: [], hero_photo: null },
  ];
  const out = groupPlaces(rows);
  assert.equal(out.fun.length, 2);
  assert.equal(out.sports.length, 1);
  assert.equal(out.fun[0].id, '1');
});

test('derives TOP_PICKS from highest-rated rows with a rating', () => {
  const rows = [
    { id: '1', slug: 'a', name: 'A', category: 'fun', rating: 4.9, review_count: 10, badge: 'Mom favorite' },
    { id: '2', slug: 'b', name: 'B', category: 'fun', rating: null, review_count: 0 },
  ];
  const { topPicks } = groupPlaces(rows, { withTopPicks: true });
  assert.equal(topPicks.length, 1);
  assert.equal(topPicks[0].placeId, 'a');
});
