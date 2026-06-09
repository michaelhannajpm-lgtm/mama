import { test } from 'node:test';
import assert from 'node:assert/strict';
import { momCardFromRow, kidsLabel, formatSlot, firstNameOf } from './mom-card.js';

test('kidsLabel joins up to two truthy buckets, else fallback', () => {
  assert.equal(kidsLabel({ '1–3': true, '3–5': true }), '1–3 · 3–5 yrs');
  assert.equal(kidsLabel({ '1–3': false }), 'Kids');
  assert.equal(kidsLabel(null), 'Kids');
});

test('formatSlot turns a slot key into a friendly label', () => {
  assert.equal(formatSlot('Tue-morning'), 'Tue · Morning');
  assert.equal(formatSlot('Mon-night-owl'), 'Mon · Evening');
  assert.equal(formatSlot('garbage'), null);
});

test('firstNameOf strips trailing dot and takes first token', () => {
  assert.equal(firstNameOf({ display_name: 'Sara K.' }), 'Sara');
  assert.equal(firstNameOf({ username: 'mei_l' }), 'mei_l');
  assert.equal(firstNameOf({}), 'Mama');
});

test('momCardFromRow emits a privacy-safe card with abstract color keys', () => {
  const row = {
    id: 'uuid-1', auth_user_id: 'auth-1', display_name: 'Sara K.',
    age: 32, bio: 'hi', photos: ['http://x/p.jpg'],
    kids_ages: { '1–3': true }, mom_types: ['working'],
    values: ['Slow living'], interests: ['Coffee dates'],
    free_slots: ['Tue-morning'], places: ['p1'],
    home_lat: 27.9, home_lng: -82.4, verified: true,
  };
  const user = { kids_ages: { '1–3': true }, interests: ['Coffee dates'] };
  const card = momCardFromRow(row, user, 0.4);

  assert.equal(card.id, 'uuid-1');
  assert.equal(card.name, 'Sara K.');
  assert.equal(card.firstName, 'Sara');
  assert.equal(card.kids, '1–3 yrs');
  assert.equal(card.type, 'Working mom');
  assert.equal(card.tagBg, 'lilac');
  assert.equal(card.iconKey, 'working');
  assert.equal(card.distance, '0.4 mi away');
  assert.equal(card.distanceMi, 0.4);
  assert.equal(card.nextSlot, 'Tue · Morning');
  assert.equal(card.photo, 'http://x/p.jpg');
  assert.ok(card.overlap > 0);
  assert.ok(card.sharedTags.includes('Same kid ages'));
  assert.equal('home_lat' in card, false);
  assert.equal('home_lng' in card, false);
});

test('momCardFromRow falls back gracefully on sparse rows', () => {
  const card = momCardFromRow({ id: 'uuid-2', mom_types: [] }, {}, null);
  assert.equal(card.distance, null);
  assert.equal(card.photo, null);
  assert.equal(card.bio, null);
  assert.equal(card.type, 'Verified');
  assert.equal(card.nextSlot, null);
  assert.deepEqual(card.sharedTags, []);
});
