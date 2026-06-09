import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reshapeEvents, splitEvents } from './events-shape.js';

const ROW = (o) => ({ id: 'e1', slug: 's', name: 'N', kind: 'recurring', day_of_week: 'Sat', bucket: 'morning', time_label: '10:30 AM', place_name: 'Park', tags: [], going_count: 5, indoor: false, kid_ages: ['1–3'], hue: 'linear-gradient(135deg,#a,#b)', hero_photo: 'x', visible: true, places: null, ...o });

test('reshapeEvents maps a row into the SUGGESTED_EVENTS shape', () => {
  const [e] = reshapeEvents([ROW({})]);
  assert.equal(e.id, 'e1');
  assert.equal(e.day, 'Sat');
  assert.equal(e.time, '10:30 AM');
  assert.equal(e.going, 5);
  assert.equal(e.place, 'Park');
});

test('place-visibility gate: event with a hidden place is dropped', () => {
  const visible = ROW({ id: 'a', places: { visible: true } });
  const hidden  = ROW({ id: 'b', places: { visible: false } });
  const placeless = ROW({ id: 'c', places: null });
  const out = reshapeEvents([visible, hidden, placeless]);
  assert.deepEqual(out.map(e => e.id), ['a', 'c']);
});

test('splitEvents separates recurring vs upcoming dated within window', () => {
  const now = new Date('2026-06-09T00:00:00Z');
  const soon = ROW({ id: 'd', kind: 'dated', starts_at: '2026-06-12T14:00:00Z' });
  const past = ROW({ id: 'p', kind: 'dated', starts_at: '2026-06-01T14:00:00Z' });
  const far  = ROW({ id: 'f', kind: 'dated', starts_at: '2026-08-01T14:00:00Z' });
  const rec  = ROW({ id: 'r', kind: 'recurring' });
  const { recurring, thisWeek } = splitEvents([soon, past, far, rec], { now, windowDays: 14 });
  assert.deepEqual(recurring.map(e => e.id), ['r']);
  assert.deepEqual(thisWeek.map(e => e.id), ['d']);
});
