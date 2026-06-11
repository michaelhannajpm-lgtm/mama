import { test } from 'node:test';
import assert from 'node:assert/strict';
import { notifyAllowed } from './push-send.js';

test('notifyAllowed: master must be explicitly on', () => {
  assert.equal(notifyAllowed(undefined, 'messages'), false);
  assert.equal(notifyAllowed({}, 'messages'), false);
  assert.equal(notifyAllowed({ enabled: false }, 'messages'), false);
  assert.equal(notifyAllowed({ enabled: true }, 'messages'), true);
});

test('notifyAllowed: an unset category defaults to on, explicit false blocks', () => {
  assert.equal(notifyAllowed({ enabled: true }, 'messages'), true);            // category unset → on
  assert.equal(notifyAllowed({ enabled: true, messages: true }, 'messages'), true);
  assert.equal(notifyAllowed({ enabled: true, messages: false }, 'messages'), false);
  // a different category being off doesn't block this one
  assert.equal(notifyAllowed({ enabled: true, groups: false }, 'messages'), true);
});

test('notifyAllowed: no category given only checks the master switch', () => {
  assert.equal(notifyAllowed({ enabled: true }, undefined), true);
  assert.equal(notifyAllowed({ enabled: false }, undefined), false);
});
