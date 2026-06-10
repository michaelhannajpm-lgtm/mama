import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreMom, WEIGHTS } from './match.js';

test('WEIGHTS sum to 100 so max score is 100', () => {
  const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  assert.equal(total, 100);
});

test('identical profile scores 100 and surfaces shared tags', () => {
  const u = {
    kids_ages: { '1–3': true }, interests: ['Coffee dates', 'Park hangs'],
    values: ['Slow living'], places: ['p1'], free_slots: ['Tue-morning'], mom_types: ['working'],
  };
  const { score, sharedTags } = scoreMom(u, u);
  assert.equal(score, 100);
  assert.equal(sharedTags[0], 'Same kid ages');
  assert.ok(sharedTags.includes('Coffee dates'));
  assert.ok(sharedTags.length <= 3);
});

test('disjoint profiles score 0 with no shared tags', () => {
  const u = { kids_ages: { '0–1': true }, interests: ['Yoga / fitness'], values: ['Bookworm'], places: ['pa'], free_slots: ['Mon-morning'], mom_types: ['new'] };
  const m = { kids_ages: { '12–18': true }, interests: ['Markets'], values: ['Faith-based'], places: ['pb'], free_slots: ['Sat-noon'], mom_types: ['solo'] };
  const { score, sharedTags } = scoreMom(u, m);
  assert.equal(score, 0);
  assert.deepEqual(sharedTags, []);
});

test('empty user criteria never throws and scores 0', () => {
  const { score, sharedTags } = scoreMom({}, { interests: ['Coffee dates'] });
  assert.equal(score, 0);
  assert.deepEqual(sharedTags, []);
});

test('sharedTags lead with kid ages then interests, capped at 3', () => {
  const u = { kids_ages: { '3–5': true }, interests: ['A', 'B', 'C', 'D'] };
  const m = { kids_ages: { '3–5': true }, interests: ['A', 'B', 'C', 'D'] };
  const { sharedTags } = scoreMom(u, m);
  assert.deepEqual(sharedTags, ['Same kid ages', 'A', 'B']);
});

test('score is clamped into [0,100] and integer', () => {
  const u = { interests: ['A', 'B'], values: ['X'] };
  const m = { interests: ['A'], values: ['X'] };
  const { score } = scoreMom(u, m);
  assert.ok(Number.isInteger(score));
  assert.ok(score >= 0 && score <= 100);
});

test('adjacent kid-age buckets earn partial credit and a Similar-age tag', () => {
  const u = { kids_ages: { '1–3': true } };
  const m = { kids_ages: { '3–5': true } }; // one bucket apart
  const { score, sharedTags } = scoreMom(u, m);
  assert.equal(score, 15);                 // 0.5 * WEIGHTS.kids(30)
  assert.deepEqual(sharedTags, ['Similar-age kids']);
});

test('far-apart kid-age buckets still score 0 on kids', () => {
  const u = { kids_ages: { '0–1': true } };
  const m = { kids_ages: { '12–18': true } }; // 5 buckets apart
  const { score, sharedTags } = scoreMom(u, m);
  assert.equal(score, 0);
  assert.deepEqual(sharedTags, []);
});

test('exact kid-age match still wins the "Same kid ages" tag, not "Similar"', () => {
  const u = { kids_ages: { '3–5': true } };
  const m = { kids_ages: { '3–5': true } };
  const { sharedTags } = scoreMom(u, m);
  assert.equal(sharedTags[0], 'Same kid ages');
});
