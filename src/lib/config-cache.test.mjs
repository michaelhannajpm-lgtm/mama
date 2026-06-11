import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCacheFresh, getConfigLookup } from './config-cache.js';

const NOW = 1_000_000;

test('isCacheFresh: cache within the TTL window is fresh', () => {
  assert.equal(isCacheFresh(NOW - 10_000, NOW, 300, true), true); // 10s old, 300s TTL
});

test('isCacheFresh: cache older than the TTL window is stale', () => {
  assert.equal(isCacheFresh(NOW - 400_000, NOW, 300, true), false); // 400s old, 300s TTL
});

test('isCacheFresh: expires=false makes the cache permanently fresh', () => {
  assert.equal(isCacheFresh(NOW - 999_999_999, NOW, 300, false), true);
  assert.equal(isCacheFresh(null, NOW, 300, false), true);
});

test('isCacheFresh: a never-fetched (null) cache is never fresh when it can expire', () => {
  assert.equal(isCacheFresh(null, NOW, 300, true), false);
});

test('isCacheFresh: a non-positive TTL falls back to the 300s default window', () => {
  assert.equal(isCacheFresh(NOW - 200_000, NOW, 0, true), true);   // 200s < 300s default
  assert.equal(isCacheFresh(NOW - 400_000, NOW, 0, true), false);  // 400s > 300s default
});

test('getConfigLookup: returns the static fallback when no config has been fetched', () => {
  const fallback = [{ label: 'Gentle parenting', emoji: '🌱' }];
  // In node there is no localStorage and no fetch has run, so lookups are empty.
  assert.deepEqual(getConfigLookup('family_values', fallback), fallback);
});

test('getConfigLookup: an unknown key returns its fallback', () => {
  assert.equal(getConfigLookup('does_not_exist', 'x'), 'x');
});
