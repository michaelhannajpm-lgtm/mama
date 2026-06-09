import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineMeters, classifyCandidate } from './dedupe.js';

test('haversine ~ 0 for same point', () => {
  assert.ok(haversineMeters(27.95, -82.46, 27.95, -82.46) < 1);
});

test('exact google_place_id match => update', () => {
  const existing = [{ id: 'x', google_place_id: 'G1', name: 'A', city: 'Tampa, FL', lat: 27.9, lng: -82.4 }];
  const cand = { googlePlaceId: 'G1', name: 'A', city: 'Tampa, FL', lat: 27.9, lng: -82.4 };
  assert.deepEqual(classifyCandidate(cand, existing), { action: 'update', matchId: 'x' });
});

test('near-duplicate by geo+name => review', () => {
  const existing = [{ id: 'y', google_place_id: null, name: 'Goldfish Swim School', city: 'Tampa, FL', lat: 27.9500, lng: -82.4600 }];
  const cand = { googlePlaceId: 'G9', name: 'Goldfish Swim', city: 'Tampa, FL', lat: 27.95005, lng: -82.46005 };
  assert.equal(classifyCandidate(cand, existing).action, 'review');
});

test('novel candidate => create', () => {
  const cand = { googlePlaceId: 'G2', name: 'Brand New Place', city: 'Tampa, FL', lat: 28.1, lng: -82.3 };
  assert.deepEqual(classifyCandidate(cand, []), { action: 'create', matchId: null });
});
