import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAdminPath, recordPath } from './adminRouter.js';

test('parseAdminPath: bare /admin → overview, no ref', () => {
  assert.deepEqual(parseAdminPath('/admin'), { section: 'overview', ref: null });
  assert.deepEqual(parseAdminPath('/admin/'), { section: 'overview', ref: null });
});

test('parseAdminPath: section only', () => {
  assert.deepEqual(parseAdminPath('/admin/events'), { section: 'events', ref: null });
  assert.deepEqual(parseAdminPath('/admin/events/'), { section: 'events', ref: null });
});

test('parseAdminPath: section + record ref (decoded)', () => {
  assert.deepEqual(parseAdminPath('/admin/events/abc-123'), { section: 'events', ref: 'abc-123' });
  assert.deepEqual(parseAdminPath('/admin/mom-profiles/%40sara'), { section: 'mom-profiles', ref: '@sara' });
});

test('parseAdminPath: non-admin path → overview', () => {
  assert.deepEqual(parseAdminPath('/'), { section: 'overview', ref: null });
});

test('recordPath: builds encoded paths, omits ref when null', () => {
  assert.equal(recordPath('events', 'abc 123'), '/admin/events/abc%20123');
  assert.equal(recordPath('events', null), '/admin/events');
  assert.equal(recordPath('overview', null), '/admin');
});
