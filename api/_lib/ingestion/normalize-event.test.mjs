import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent, eventSlug } from './normalize-event.js';

const SOURCE = { id: 'eventbrite-tampa-family', city: 'Tampa, FL' };

test('eventSlug is source-namespaced + dated and collision-safe', () => {
  const s = eventSlug('Baby Storytime', { sourceId: 'eventbrite-tampa-family', startsAt: '2026-06-10T14:30:00Z' });
  assert.equal(s, 'eventbrite-tampa-family-baby-storytime-2026-06-10');
  assert.ok(!s.startsWith('e-')); // never collides with curated e-* ids
});

test('normalizes an intermediate into a dated event candidate', () => {
  const c = normalizeEvent({
    name: 'Toddler Storytime', description: 'songs and books for toddlers',
    startsAt: '2026-06-10T14:30:00Z', endsAt: '2026-06-10T15:15:00Z',
    placeName: 'John F. Germany Library', city: 'Tampa, FL',
    website: 'https://hcplc.org', sourceUrl: 'https://hcplc.org/e/1', externalId: 'lib-1',
    sourceCategory: 'library', ageMin: 1, ageMax: 3,
  }, { source: SOURCE, fetchedAt: '2026-06-09T00:00:00Z' });

  assert.equal(c.kind, 'dated');
  assert.equal(c.name, 'Toddler Storytime');
  assert.equal(c.dayOfWeek, 'Wed');
  assert.equal(c.bucket, 'morning');
  assert.equal(c.timeLabel, '10:30 AM');
  assert.equal(c.eventType, 'storytime');
  assert.equal(c.placeName, 'John F. Germany Library');
  assert.equal(c.city, 'Tampa, FL');
  assert.equal(c.externalId, 'lib-1');
  assert.equal(c.recurring, 'One-time');
  assert.ok(typeof c.hue === 'string' && c.hue.includes('gradient'));
  assert.ok(c.confidence > 0 && c.confidence <= 1);
});

test('carries imageUrl through', () => {
  const c = normalizeEvent({ name: 'X', city: 'Tampa, FL', imageUrl: 'https://x/y.jpg' }, { source: { id: 's' } });
  assert.equal(c.imageUrl, 'https://x/y.jpg');
});

test('missing startsAt yields null UI fields but still a candidate', () => {
  const c = normalizeEvent({ name: 'Mystery Event', city: 'Tampa, FL' }, { source: SOURCE });
  assert.equal(c.dayOfWeek, null);
  assert.equal(c.eventType, 'other');
});
