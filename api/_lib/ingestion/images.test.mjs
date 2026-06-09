import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradientForName, makeGradientPng } from './images.js';

test('gradient is deterministic per name', () => {
  assert.deepEqual(gradientForName('Glazer'), gradientForName('Glazer'));
});

test('produces a non-trivial PNG buffer', async () => {
  const buf = await makeGradientPng('Bayshore Boulevard');
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 1000);
  // PNG magic number.
  assert.equal(buf[0], 0x89); assert.equal(buf[1], 0x50);
});
