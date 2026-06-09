import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEventsPayload, findEventIn } from './events-api.js';

test('passes through a well-formed payload', () => {
  const out = normalizeEventsPayload({ recurring: [{ id: '1' }], thisWeek: [{ id: '2' }] });
  assert.equal(out.recurring.length, 1);
  assert.equal(out.thisWeek.length, 1);
});

test('falls back to empty arrays when missing', () => {
  const out = normalizeEventsPayload(null);
  assert.deepEqual(out.recurring, []);
  assert.deepEqual(out.thisWeek, []);
});

test('findEventIn matches by id or slug', () => {
  const list = [{ id: 'a', slug: 'sa' }, { id: 'b', slug: 'sb' }];
  assert.equal(findEventIn(list, 'sb').id, 'b');
  assert.equal(findEventIn(list, 'a').slug, 'sa');
  assert.equal(findEventIn(list, 'zzz'), null);
});
