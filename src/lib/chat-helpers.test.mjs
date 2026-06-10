import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dmPairKey, dmFreeState, buildThread } from './chat-helpers.js';

test('dmPairKey is order-independent and colon-joined sorted', () => {
  assert.equal(dmPairKey('b', 'a'), 'a:b');
  assert.equal(dmPairKey('a', 'b'), 'a:b');
});

test('dmPairKey returns null for missing or identical ids', () => {
  assert.equal(dmPairKey('a', 'a'), null);
  assert.equal(dmPairKey('a', null), null);
  assert.equal(dmPairKey(undefined, 'b'), null);
});

test('dmFreeState counts only my own messages against the 3-cap', () => {
  const msgs = [
    { author_id: 'me' }, { author_id: 'her' }, { author_id: 'me' },
  ];
  const s = dmFreeState(msgs, 'me', false);
  assert.equal(s.used, 2);
  assert.equal(s.remaining, 1);
  assert.equal(s.limitReached, false);
});

test('dmFreeState locks at 3 sent and premium bypasses entirely', () => {
  const mine = [{ author_id: 'me' }, { author_id: 'me' }, { author_id: 'me' }];
  assert.equal(dmFreeState(mine, 'me', false).limitReached, true);
  const premium = dmFreeState(mine, 'me', true);
  assert.equal(premium.limitReached, false);
  assert.equal(premium.remaining, Infinity);
});

test('buildThread nests comments under their parent post, drops deleted', () => {
  const rows = [
    { id: 'p1', parent_id: null, body: 'post', created_at: '2026-06-09T10:00:00Z' },
    { id: 'c1', parent_id: 'p1', body: 'reply', created_at: '2026-06-09T10:01:00Z' },
    { id: 'p2', parent_id: null, body: 'gone', created_at: '2026-06-09T09:00:00Z', deleted_at: 'x' },
  ];
  const tree = buildThread(rows);
  assert.equal(tree.length, 1);                 // p2 dropped (deleted)
  assert.equal(tree[0].id, 'p1');
  assert.equal(tree[0].comments.length, 1);
  assert.equal(tree[0].comments[0].id, 'c1');
});
