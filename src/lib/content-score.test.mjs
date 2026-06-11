import test from 'node:test';
import assert from 'node:assert/strict';
import { scoreEvent, scorePlace, scoreDiscussion, rankByRelevance } from './content-score.js';

const parent = {
  kidsAges: { '1–3': 1 },
  interests: ['Stroller walks', 'Coffee meetups'],
  values: ['Outdoors'],
  settings: { familyTags: ['Outdoors', 'Coffee people'] },
};

test('scoreEvent rewards age fit + tag overlap', () => {
  const good = scoreEvent(parent, { name: 'Stroller walk in the park', tags: ['Stroller', 'Outdoors'], kidAges: ['1–3'] });
  const bad = scoreEvent(parent, { name: 'Teen coding club', tags: ['Coding'], kidAges: ['12–18'] });
  assert.ok(good.score > bad.score);
  assert.ok(good.score >= 50);
  assert.ok(good.reasons.length >= 1);
});

test('scorePlace uses age range + description tags', () => {
  const good = scorePlace(parent, { name: 'Bayshore Yoga', description: 'pre + postnatal yoga and outdoor stroller classes', age_min: 0, age_max: 3 });
  const bad = scorePlace(parent, { name: 'High school SAT prep', description: 'tutoring', age_min: 14, age_max: 18 });
  assert.ok(good.score > bad.score);
});

test('scoreDiscussion matches kid stage + topic tags', () => {
  const good = scoreDiscussion(parent, { title: 'Toddler park meetups', blurb: 'outdoor play', topics: ['outdoors'], kidAges: ['1–3'] });
  const bad = scoreDiscussion(parent, { title: 'Teen driving tips', blurb: '', topics: [], kidAges: ['12–18'] });
  assert.ok(good.score >= bad.score);
});

test('rankByRelevance sorts desc, stable, non-mutating', () => {
  const events = [
    { name: 'Teen coding', tags: [], kidAges: ['12–18'] },
    { name: 'Stroller walk', tags: ['Outdoors'], kidAges: ['1–3'] },
  ];
  const ranked = rankByRelevance(events, parent, scoreEvent);
  assert.equal(ranked[0].name, 'Stroller walk');
  assert.equal(events[0].name, 'Teen coding'); // original not mutated
});

test('empty profile never throws and produces a number', () => {
  const r = scoreEvent({}, { name: 'anything' });
  assert.equal(typeof r.score, 'number');
});
