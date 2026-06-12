import { test } from 'node:test';
import assert from 'node:assert/strict';
import { haversineMiles, formatMiles, mapsUrl } from './geo.js';

test('haversineMiles: zero distance for identical points', () => {
  const p = { lat: 27.95, lng: -82.46 };
  assert.equal(haversineMiles(p, p), 0);
});

test('haversineMiles: known Tampa→St. Pete distance (~16-19 mi)', () => {
  const tampa = { lat: 27.9506, lng: -82.4572 };
  const stpete = { lat: 27.7676, lng: -82.6403 };
  const mi = haversineMiles(tampa, stpete);
  assert.ok(mi > 14 && mi < 20, `expected ~16-19 mi, got ${mi}`);
});

test('haversineMiles: null when coordinates missing/invalid', () => {
  assert.equal(haversineMiles(null, { lat: 1, lng: 1 }), null);
  assert.equal(haversineMiles({ lat: 1, lng: 1 }, { lat: 'x', lng: 1 }), null);
  assert.equal(haversineMiles({ lat: NaN, lng: 1 }, { lat: 1, lng: 1 }), null);
});

test('formatMiles: buckets and rounding', () => {
  assert.equal(formatMiles(0.05), 'Nearby');
  assert.equal(formatMiles(1.24), '1.2 mi away');
  assert.equal(formatMiles(12.6), '13 mi away');
  assert.equal(formatMiles(undefined), '');
  assert.equal(formatMiles(NaN), '');
});

test('mapsUrl: coordinates take precedence', () => {
  const url = mapsUrl({ lat: 27.95, lng: -82.46, address: 'somewhere' });
  assert.match(url, /query=27\.95%2C-82\.46/);
});

test('mapsUrl: address fallback when no coords', () => {
  const url = mapsUrl({ address: 'Armature Works, Tampa' });
  assert.match(url, /query=Armature%20Works%2C%20Tampa/);
});

test('mapsUrl: null when nothing to map', () => {
  assert.equal(mapsUrl({}), null);
  assert.equal(mapsUrl({ address: '   ' }), null);
});
