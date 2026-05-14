import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAllowlist, isAllowlisted } from './builderAuth.js';

test('parseAllowlist splits comma-separated emails and lowercases them', () => {
  assert.deepEqual(
    parseAllowlist('You@Example.com, analyst@example.com'),
    ['you@example.com', 'analyst@example.com']
  );
});

test('parseAllowlist drops empty entries and trims whitespace', () => {
  assert.deepEqual(parseAllowlist(' a@x.com ,, , b@y.com,'), ['a@x.com', 'b@y.com']);
});

test('parseAllowlist returns [] for empty/missing input', () => {
  assert.deepEqual(parseAllowlist(''), []);
  assert.deepEqual(parseAllowlist(undefined), []);
  assert.deepEqual(parseAllowlist(null), []);
});

test('isAllowlisted is case-insensitive on input email', () => {
  const list = parseAllowlist('a@x.com,b@y.com');
  assert.equal(isAllowlisted('A@X.COM', list), true);
  assert.equal(isAllowlisted('b@y.com', list), true);
  assert.equal(isAllowlisted('c@z.com', list), false);
});

test('isAllowlisted returns false for empty allowlist (fail-closed)', () => {
  assert.equal(isAllowlisted('a@x.com', []), false);
});
