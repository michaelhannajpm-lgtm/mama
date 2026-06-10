import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dmPairKey } from './chat-helpers.js';

test('dmPairKey is order-independent and colon-joined sorted', () => {
  assert.equal(dmPairKey('b', 'a'), 'a:b');
  assert.equal(dmPairKey('a', 'b'), 'a:b');
});

test('dmPairKey returns null for missing or identical ids', () => {
  assert.equal(dmPairKey('a', 'a'), null);
  assert.equal(dmPairKey('a', null), null);
  assert.equal(dmPairKey(undefined, 'b'), null);
});
