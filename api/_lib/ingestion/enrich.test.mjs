import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveArea, buildHeroPhoto, buildPrompt, toEnrichPatch, ENRICH_SCHEMA } from './enrich.js';

test('deriveArea maps coordinates to the nearest Tampa area label', () => {
  // Hyde Park sits at 27.94, -82.47 in the area table.
  assert.equal(deriveArea(27.94, -82.47), 'Hyde Park');
  assert.equal(deriveArea(null, null), null);
});

test('buildHeroPhoto: google_ref → proxy URL, url → passthrough, none → null', () => {
  assert.equal(
    buildHeroPhoto([{ is_hero: true, google_ref: 'places/abc/photos/xyz' }]),
    '/api/places/photo?ref=places%2Fabc%2Fphotos%2Fxyz',
  );
  assert.equal(buildHeroPhoto([{ is_hero: true, url: 'https://x/y.png' }]), 'https://x/y.png');
  assert.equal(buildHeroPhoto([{ is_hero: false, google_ref: 'places/a/photos/b' }]), '/api/places/photo?ref=places%2Fa%2Fphotos%2Fb'); // falls back to first
  assert.equal(buildHeroPhoto([]), null);
  assert.equal(buildHeroPhoto(null), null);
});

test('buildPrompt includes the place name and category', () => {
  const p = buildPrompt({ name: 'Goldfish Swim School', category: 'sports' });
  assert.ok(p.includes('Goldfish Swim School'));
  assert.ok(p.includes('sports'));
});

test('toEnrichPatch coerces + clamps model output', () => {
  const out = toEnrichPatch({
    description: '  A fun spot.  ',
    tags: ['Indoor', '', '  Classes  ', 'a', 'b', 'c', 'd', 'e'],
    good_for: ['toddlers'],
    age_min: -3, age_max: 99,
    amenities: { parking: true },
  });
  assert.equal(out.description, 'A fun spot.');
  assert.deepEqual(out.tags, ['Indoor', 'Classes', 'a', 'b', 'c', 'd']); // trimmed, empties dropped, capped at 6
  assert.equal(out.age_min, 0);   // clamped to [0,18]
  assert.equal(out.age_max, 18);
  assert.deepEqual(out.amenities, { parking: true });
});

test('toEnrichPatch tolerates a malformed/empty object', () => {
  const out = toEnrichPatch({});
  assert.equal(out.description, null);
  assert.deepEqual(out.tags, []);
  assert.equal(out.age_min, null);
  assert.deepEqual(out.amenities, {});
});

test('ENRICH_SCHEMA is structured-outputs safe (additionalProperties:false on every object)', () => {
  assert.equal(ENRICH_SCHEMA.additionalProperties, false);
  assert.equal(ENRICH_SCHEMA.properties.amenities.additionalProperties, false);
});
