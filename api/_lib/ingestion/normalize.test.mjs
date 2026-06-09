import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, normalizeGooglePlace } from './normalize.js';

test('slugify includes city and is collision-safe', () => {
  assert.equal(slugify('Glazer Children’s Museum', 'Tampa, FL'), 'glazer-childrens-museum-tampa');
});

const SAMPLE = {
  id: 'ChIJabc123',
  displayName: { text: 'Goldfish Swim School' },
  formattedAddress: '123 Main St, Tampa, FL 33602',
  location: { latitude: 27.95, longitude: -82.46 },
  rating: 4.7,
  userRatingCount: 88,
  internationalPhoneNumber: '+1 813-555-0100',
  websiteUri: 'https://goldfishswimschool.com',
  googleMapsUri: 'https://maps.google.com/?cid=1',
  businessStatus: 'OPERATIONAL',
  priceLevel: 'PRICE_LEVEL_MODERATE',
  photos: [{ name: 'places/ChIJabc123/photos/AXYZ', authorAttributions: [{ displayName: 'Jane' }] }],
};

test('maps a Google place into a place candidate', () => {
  const c = normalizeGooglePlace(SAMPLE, { category: 'sports', city: 'Tampa, FL' });
  assert.equal(c.name, 'Goldfish Swim School');
  assert.equal(c.category, 'sports');
  assert.equal(c.city, 'Tampa, FL');
  assert.equal(c.googlePlaceId, 'ChIJabc123');
  assert.equal(c.rating, 4.7);
  assert.equal(c.reviewCount, 88);
  assert.equal(c.phone, '+1 813-555-0100');
  assert.equal(c.slug, 'goldfish-swim-school-tampa');
  assert.equal(c.priceLevel, 2);
  assert.equal(c.photos[0].googleRef, 'places/ChIJabc123/photos/AXYZ');
  assert.ok(c.confidence > 0 && c.confidence <= 1);
});
