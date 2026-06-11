import { test } from 'node:test';
import assert from 'node:assert/strict';
import { childList, buildAgeRail } from './age-rail.js';

test('childList uses names when present, else stage labels', () => {
  const withNames = childList({ settings: { kids: [
    { age: '1–3', name: 'Mia' }, { age: '12–18', name: '' },
  ] } });
  assert.deepEqual(withNames.map((c) => c.label), ['Mia', 'Teen']);
  assert.deepEqual(withNames.map((c) => c.bucket), ['1–3', '12–18']);
});

test('childList reconstructs from kidsAges counts when no rich list', () => {
  const list = childList({ kidsAges: { '1–3': 2 } });
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((c) => c.label), ['Toddler', 'Toddler']);
});

test('buildAgeRail mixes places + events and tags forChild', () => {
  const profile = { settings: { kids: [{ age: '1–3', name: 'Mia' }, { age: '12–18', name: 'Sam' }] } };
  const places = { fun: [
    { id: 'p1', name: 'Toddler Gym', kid_ages: ['1–3'], hero_photo: 'x' },
    { id: 'p2', name: 'Teen Lounge', kid_ages: ['12–18'] },
  ] };
  const events = { thisWeek: [
    { id: 'e1', name: 'Baby Music', kidAges: ['0–1','1–3'], photo: 'y', startsAt: '2026-06-12T10:00:00Z' },
  ], events: [] };

  const rail = buildAgeRail(profile, places, events, { limit: 10 });
  const ids = rail.map((i) => i.id);
  assert.ok(ids.includes('p1') && ids.includes('p2') && ids.includes('e1'));
  assert.deepEqual(rail.find((i) => i.id === 'p1').type, 'place');
  assert.deepEqual(rail.find((i) => i.id === 'e1').type, 'event');
  // Toddler Gym fits child 0 (Mia, 1–3), not child 1 (Sam, teen).
  assert.deepEqual(rail.find((i) => i.id === 'p1').forChild, [0]);
  assert.deepEqual(rail.find((i) => i.id === 'p2').forChild, [1]);
});

test('buildAgeRail returns [] when the profile has no kids', () => {
  assert.deepEqual(buildAgeRail({}, { fun: [{ id: 'p1', name: 'X' }] }, { thisWeek: [] }), []);
});
