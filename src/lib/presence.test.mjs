import { test } from 'node:test';
import assert from 'node:assert/strict';
import { derivePresence } from './presence.js';

const NOW = Date.parse('2026-06-10T12:00:00Z');
const ago = (s) => new Date(NOW - s * 1000).toISOString();

test('online within the online window (boundary inclusive)', () => {
  assert.equal(derivePresence(ago(0), 300, 1800, NOW), 'online');
  assert.equal(derivePresence(ago(60), 300, 1800, NOW), 'online');
  assert.equal(derivePresence(ago(300), 300, 1800, NOW), 'online');
});

test('away between the online and away windows (boundary inclusive)', () => {
  assert.equal(derivePresence(ago(301), 300, 1800, NOW), 'away');
  assert.equal(derivePresence(ago(1800), 300, 1800, NOW), 'away');
});

test('offline beyond the away window, or when never seen / invalid', () => {
  assert.equal(derivePresence(ago(1801), 300, 1800, NOW), 'offline');
  assert.equal(derivePresence(null, 300, 1800, NOW), 'offline');
  assert.equal(derivePresence(undefined, 300, 1800, NOW), 'offline');
  assert.equal(derivePresence('not-a-date', 300, 1800, NOW), 'offline');
});

test('a future timestamp (clock skew) counts as online', () => {
  assert.equal(derivePresence(ago(-30), 300, 1800, NOW), 'online');
});

test('respects custom thresholds', () => {
  // snappy: online<=120, away<=900
  assert.equal(derivePresence(ago(150), 120, 900, NOW), 'away');
  assert.equal(derivePresence(ago(100), 120, 900, NOW), 'online');
  assert.equal(derivePresence(ago(1000), 120, 900, NOW), 'offline');
});
