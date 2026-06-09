import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventTimeParts, localDateKey } from './time.js';

test('derives Mon..Sun, bucket, and 12h label in America/New_York', () => {
  // 2026-06-10T14:30:00Z == 10:30 AM EDT (UTC-4), a Wednesday.
  const p = eventTimeParts('2026-06-10T14:30:00Z', 'America/New_York');
  assert.equal(p.dayOfWeek, 'Wed');
  assert.equal(p.bucket, 'morning');
  assert.equal(p.timeLabel, '10:30 AM');
});

test('buckets evening into night-owl', () => {
  // 2026-06-11T23:00:00Z == 7:00 PM EDT.
  const p = eventTimeParts('2026-06-11T23:00:00Z', 'America/New_York');
  assert.equal(p.bucket, 'night-owl');
  assert.equal(p.timeLabel, '7:00 PM');
});

test('localDateKey is the YYYY-MM-DD in the event tz', () => {
  // 2026-01-01T02:00:00Z == 2025-12-31 21:00 EST.
  assert.equal(localDateKey('2026-01-01T02:00:00Z', 'America/New_York'), '2025-12-31');
});

test('invalid date yields nulls, not a throw', () => {
  assert.deepEqual(eventTimeParts('not-a-date'), { dayOfWeek: null, bucket: null, timeLabel: null });
});
