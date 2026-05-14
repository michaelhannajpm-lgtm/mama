import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from './builderHmac.js';

const SECRET = 'unit-test-secret-not-real';

test('sign produces a hex string of expected length (sha256 = 64 chars)', () => {
  const sig = sign('hello', SECRET);
  assert.equal(typeof sig, 'string');
  assert.equal(sig.length, 64);
  assert.match(sig, /^[0-9a-f]{64}$/);
});

test('verify returns true for a signature produced by sign', () => {
  const body = JSON.stringify({ kind: 'log', payload: { line: 'hi' } });
  const sig = sign(body, SECRET);
  assert.equal(verify(body, sig, SECRET), true);
});

test('verify returns false for a bad signature', () => {
  assert.equal(verify('hello', 'a'.repeat(64), SECRET), false);
});

test('verify returns false when the body is tampered with', () => {
  const body = '{"x":1}';
  const sig = sign(body, SECRET);
  assert.equal(verify('{"x":2}', sig, SECRET), false);
});

test('verify returns false on missing/invalid input', () => {
  assert.equal(verify('hello', '', SECRET), false);
  assert.equal(verify('hello', null, SECRET), false);
  assert.equal(verify('hello', 'abc', SECRET), false); // wrong length
});

test('verify uses constant-time comparison (length-mismatched sig returns false without throwing)', () => {
  // crypto.timingSafeEqual throws on length mismatch; verify() must guard against it.
  assert.doesNotThrow(() => verify('hello', 'abcd', SECRET));
});
