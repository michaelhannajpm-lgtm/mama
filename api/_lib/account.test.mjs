import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  withinRestoreWindow, purgeCutoffIso, isPurgeable, hideFromDiscovery, RESTORE_WINDOW_MS,
} from './account.js';

const NOW = Date.parse('2026-06-11T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

test('withinRestoreWindow: inside vs outside the 30-day window', () => {
  assert.equal(withinRestoreWindow(daysAgo(1), NOW), true);
  assert.equal(withinRestoreWindow(daysAgo(29), NOW), true);
  assert.equal(withinRestoreWindow(daysAgo(31), NOW), false);
  // null / unparseable → not restorable
  assert.equal(withinRestoreWindow(null, NOW), false);
  assert.equal(withinRestoreWindow('not-a-date', NOW), false);
});

test('purgeCutoffIso is exactly 30 days before now', () => {
  assert.equal(purgeCutoffIso(NOW), new Date(NOW - RESTORE_WINDOW_MS).toISOString());
});

test('isPurgeable: only deleted accounts past the window', () => {
  assert.equal(isPurgeable({ account_status: 'deleted', deleted_at: daysAgo(31) }, NOW), true);
  // deleted but still in the restore window → keep
  assert.equal(isPurgeable({ account_status: 'deleted', deleted_at: daysAgo(10) }, NOW), false);
  // wrong status → never purge
  assert.equal(isPurgeable({ account_status: 'active', deleted_at: daysAgo(99) }, NOW), false);
  assert.equal(isPurgeable({ account_status: 'deactivated', deleted_at: daysAgo(99) }, NOW), false);
  assert.equal(isPurgeable(null, NOW), false);
});

test('hideFromDiscovery sets privacy.discoverable=false without clobbering other settings', () => {
  const next = hideFromDiscovery({ notifications: { dm: true }, privacy: { show_last_active: true } });
  assert.equal(next.privacy.discoverable, false);
  assert.equal(next.privacy.show_last_active, true);   // preserved
  assert.deepEqual(next.notifications, { dm: true });   // preserved
  // tolerates null / non-object
  assert.equal(hideFromDiscovery(null).privacy.discoverable, false);
  assert.equal(hideFromDiscovery(['x']).privacy.discoverable, false);
});
