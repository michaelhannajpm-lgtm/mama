import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapEventType } from './map-event-type.js';

test('maps storytime keywords', () => {
  const r = mapEventType('Baby Storytime at the Library', 'free weekly reading for babies');
  assert.equal(r.type, 'storytime');
});

test('maps camps', () => {
  assert.equal(mapEventType('Summer STEM Camp', '').type, 'camp');
});

test('secondary categories captured', () => {
  const r = mapEventType('Kids Coding Workshop', 'robotics and stem for kids');
  assert.ok(['stem', 'workshop'].includes(r.type));
  assert.ok(r.categories.includes('stem'));
});

test('defaults to other (never null)', () => {
  const r = mapEventType('Quarterly Networking Mixer', 'adults only');
  assert.equal(r.type, 'other');
  assert.deepEqual(r.categories, ['other']);
});
