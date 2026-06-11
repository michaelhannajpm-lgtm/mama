import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSkillCreated, dateInRange, matchesSource, eventComparator } from './eventFilters.js';

test('isSkillCreated: true only for metadata.skill === create-event', () => {
  assert.equal(isSkillCreated({ metadata: { skill: 'create-event' } }), true);
  assert.equal(isSkillCreated({ metadata: { skill: 'other' } }), false);
  assert.equal(isSkillCreated({ metadata: {} }), false);
  assert.equal(isSkillCreated({}), false);
  assert.equal(isSkillCreated(null), false);
});

test('dateInRange: any preset always passes (even null iso)', () => {
  assert.equal(dateInRange(null, { preset: 'any' }), true);
  assert.equal(dateInRange('2020-01-01T00:00:00Z', {}), true); // default preset = any
});

test('dateInRange: non-any preset with missing/invalid iso fails', () => {
  assert.equal(dateInRange(null, { preset: 'today' }), false);
  assert.equal(dateInRange('not-a-date', { preset: '7d' }), false);
});

test('dateInRange: today', () => {
  const now = new Date('2026-06-11T15:00:00');
  assert.equal(dateInRange('2026-06-11T08:00:00', { preset: 'today' }, now), true);
  assert.equal(dateInRange('2026-06-10T23:00:00', { preset: 'today' }, now), false);
});

test('dateInRange: 7d / 30d rolling windows', () => {
  const now = new Date('2026-06-11T12:00:00Z');
  assert.equal(dateInRange('2026-06-05T12:00:00Z', { preset: '7d' }, now), true);
  assert.equal(dateInRange('2026-06-01T12:00:00Z', { preset: '7d' }, now), false);
  assert.equal(dateInRange('2026-05-20T12:00:00Z', { preset: '30d' }, now), true);
  assert.equal(dateInRange('2026-04-01T12:00:00Z', { preset: '30d' }, now), false);
});

test('dateInRange: custom from/to inclusive', () => {
  const r = { preset: 'custom', from: '2026-06-01', to: '2026-06-10' };
  assert.equal(dateInRange('2026-06-01T00:00:00', r), true);
  assert.equal(dateInRange('2026-06-10T23:00:00', r), true);
  assert.equal(dateInRange('2026-05-31T23:00:00', r), false);
  assert.equal(dateInRange('2026-06-11T00:30:00', r), false);
});

test('dateInRange: custom with only one bound', () => {
  assert.equal(dateInRange('2026-06-15T00:00:00', { preset: 'custom', from: '2026-06-10' }), true);
  assert.equal(dateInRange('2026-06-05T00:00:00', { preset: 'custom', from: '2026-06-10' }), false);
  assert.equal(dateInRange('2026-06-05T00:00:00', { preset: 'custom', to: '2026-06-10' }), true);
  assert.equal(dateInRange('2026-06-15T00:00:00', { preset: 'custom', to: '2026-06-10' }), false);
});

test('matchesSource: any / skill / manual', () => {
  const skill = { metadata: { skill: 'create-event' } };
  const manual = { metadata: {} };
  assert.equal(matchesSource(skill, 'any'), true);
  assert.equal(matchesSource(manual, 'any'), true);
  assert.equal(matchesSource(skill, 'skill'), true);
  assert.equal(matchesSource(manual, 'skill'), false);
  assert.equal(matchesSource(skill, 'manual'), false);
  assert.equal(matchesSource(manual, 'manual'), true);
});

test('eventComparator: created/modified, asc/desc', () => {
  const a = { created_at: '2026-06-01T00:00:00Z', updated_at: '2026-06-09T00:00:00Z' };
  const b = { created_at: '2026-06-05T00:00:00Z', updated_at: '2026-06-02T00:00:00Z' };
  // created_desc → newest created first → b before a
  assert.deepEqual([a, b].sort(eventComparator('created_desc')), [b, a]);
  // created_asc → a before b
  assert.deepEqual([a, b].sort(eventComparator('created_asc')), [a, b]);
  // modified_desc → a (updated 06-09) before b (updated 06-02)
  assert.deepEqual([a, b].sort(eventComparator('modified_desc')), [a, b]);
});
