import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferPlaceCategory, resolveEventPlace } from './resolve-place.js';

test('inferPlaceCategory maps event types to place taxonomy', () => {
  assert.equal(inferPlaceCategory('swim'), 'sports');
  assert.equal(inferPlaceCategory('storytime'), 'fun');
  assert.equal(inferPlaceCategory('camp'), 'camps');
  assert.equal(inferPlaceCategory('prenatal-class'), 'wellness');
});

test('no venue => null placeId, no API calls', async () => {
  let calls = 0;
  const out = await resolveEventPlace(
    { placeName: null, city: 'Tampa, FL' },
    { existingPlaces: [], venueCache: new Map(), googleSearch: async () => { calls++; return []; } });
  assert.equal(out.placeId, null);
  assert.equal(calls, 0);
});

test('local dedupe match links without Google', async () => {
  let calls = 0;
  const existingPlaces = [{ id: 'p1', google_place_id: null, name: 'Glazer Museum', city: 'Tampa, FL', lat: 27.95, lng: -82.46 }];
  const out = await resolveEventPlace(
    { placeName: 'Glazer Museum', city: 'Tampa, FL', eventType: 'museum-program' },
    { existingPlaces, venueCache: new Map(), googleSearch: async () => { calls++; return []; } });
  assert.equal(out.placeId, 'p1');
  assert.equal(out.action, 'link');
  assert.equal(calls, 0);
});

test('miss => Google create path (dryRun reports, no writes)', async () => {
  const google = async () => ([{ id: 'G1', displayName: { text: 'New Play Cafe' }, location: { latitude: 28.0, longitude: -82.5 }, formattedAddress: '1 Main St, Tampa, FL' }]);
  const out = await resolveEventPlace(
    { placeName: 'New Play Cafe', city: 'Tampa, FL', eventType: 'open-play' },
    { existingPlaces: [], venueCache: new Map(), googleSearch: google, apiKey: 'test-key', dryRun: true });
  assert.equal(out.action, 'create');
  assert.equal(out.placeId, null); // dryRun: nothing written
});

test('venue cache returns the same placeId for repeat venue', async () => {
  const cache = new Map([['glazer museum|tampa, fl', 'p1']]);
  const out = await resolveEventPlace(
    { placeName: 'Glazer Museum', city: 'Tampa, FL', eventType: 'museum-program' },
    { existingPlaces: [], venueCache: cache, googleSearch: async () => { throw new Error('should not call'); } });
  assert.equal(out.placeId, 'p1');
  assert.equal(out.action, 'cached');
});
