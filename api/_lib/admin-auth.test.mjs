import { test } from 'node:test';
import assert from 'node:assert/strict';

// The auth helpers read ADMIN_SESSION_SECRET at call time — set it before use.
process.env.ADMIN_SESSION_SECRET = 'test-secret-do-not-use-in-prod';

const { signToken, verifyToken } = await import('./admin-auth.js');

const ADMIN = { email: 'a@b.com', role: 'full', modules: ['*'] };
const DAY = 24 * 60 * 60 * 1000;

test('signToken → verifyToken round-trips the payload', () => {
  const token = signToken(ADMIN);
  const payload = verifyToken(token);
  assert.ok(payload, 'token should verify');
  assert.equal(payload.email, 'a@b.com');
  assert.equal(payload.role, 'full');
  assert.deepEqual(payload.modules, ['*']);
  assert.equal(typeof payload.exp, 'number');
});

test('signToken defaults role/modules when omitted', () => {
  const payload = verifyToken(signToken({ email: 'x@y.com' }));
  assert.equal(payload.role, 'full');
  assert.deepEqual(payload.modules, ['*']);
});

test('verifyToken rejects an expired token', () => {
  const token = signToken(ADMIN); // exp ≈ now + 30d
  // Verify as if 31 days have passed.
  assert.equal(verifyToken(token, Date.now() + 31 * DAY), null);
});

test('verifyToken rejects a tampered payload', () => {
  const token = signToken(ADMIN);
  const dot = token.indexOf('.');
  const flipped = (token[0] === 'A' ? 'B' : 'A') + token.slice(1, dot) + token.slice(dot);
  assert.equal(verifyToken(flipped), null);
});

test('verifyToken rejects a tampered signature', () => {
  const token = signToken(ADMIN);
  assert.equal(verifyToken(token.slice(0, -2) + (token.endsWith('A') ? 'BB' : 'AA')), null);
});

test('verifyToken rejects garbage', () => {
  assert.equal(verifyToken('not-a-token'), null);
  assert.equal(verifyToken(''), null);
  assert.equal(verifyToken(null), null);
});
