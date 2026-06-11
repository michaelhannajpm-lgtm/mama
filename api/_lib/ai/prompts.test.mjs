// api/_lib/ai/prompts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describePrompt, DESCRIBE_SCHEMA, toDescribePatch } from './prompts.js';

test('describePrompt(place) reuses enrich voice and includes the name', () => {
  const p = describePrompt('place', { name: 'Glazer Children’s Museum', category: 'museum' });
  assert.match(p, /Glazer Children/);
  assert.match(p, /family|families|parents/i);
});
test('describePrompt(event) includes name, type, and where', () => {
  const p = describePrompt('event', { name: 'Toddler Storytime', event_type: 'story_time', place_name: 'Hyde Park Library', area: 'Hyde Park' });
  assert.match(p, /Toddler Storytime/);
  assert.match(p, /Hyde Park/);
});
test('describePrompt(mom) writes a first-person persona bio prompt', () => {
  const p = describePrompt('mom', { mom_types: ['sahm'], values: ['Outdoors'], interests: ['Playground visits'] });
  assert.match(p, /first[- ]person/i);
  assert.match(p, /Outdoors/);
});
test('DESCRIBE_SCHEMA is a strict single-string object', () => {
  assert.equal(DESCRIBE_SCHEMA.additionalProperties, false);
  assert.deepEqual(DESCRIBE_SCHEMA.required, ['description']);
  assert.equal(DESCRIBE_SCHEMA.properties.description.type, 'string');
});
test('toDescribePatch trims and coerces to a string', () => {
  assert.deepEqual(toDescribePatch({ description: '  hi  ' }), { description: 'hi' });
  assert.deepEqual(toDescribePatch({}), { description: '' });
});

// Task 2 — Review builders, per-kind schema, suggestion filtering
import { REVIEW_FIELDS, reviewSchema, reviewPrompt, toReviewSuggestions } from './prompts.js';

test('REVIEW_FIELDS lists suggestable fields per kind', () => {
  assert.ok(REVIEW_FIELDS.place.includes('description'));
  assert.ok(REVIEW_FIELDS.event.includes('event_type'));
  assert.ok(REVIEW_FIELDS.mom.includes('bio'));
  // mom review is bio-only: the taxonomy fields are controlled-vocab arrays,
  // unsafe to set from the AI's free-text string suggestions.
  assert.deepEqual(REVIEW_FIELDS.mom, ['bio']);
});
test('reviewSchema(kind) enum-constrains field to that kind', () => {
  const s = reviewSchema('place');
  const fieldEnum = s.properties.suggestions.items.properties.field.enum;
  assert.deepEqual(fieldEnum, REVIEW_FIELDS.place);
  assert.equal(s.properties.suggestions.items.additionalProperties, false);
});
test('reviewPrompt includes the current field values', () => {
  const p = reviewPrompt('place', { name: 'X', description: 'old desc', category: 'park' });
  assert.match(p, /old desc/);
});
test('toReviewSuggestions drops unknown fields and empty values', () => {
  const out = { suggestions: [
    { field: 'description', suggested: 'better', reason: 'clearer' },
    { field: 'not_a_field', suggested: 'x', reason: 'y' },
    { field: 'tags', suggested: '', reason: 'z' },
  ] };
  assert.deepEqual(toReviewSuggestions('place', out), [
    { field: 'description', suggested: 'better', reason: 'clearer' },
  ]);
});

test('reviewSchema throws on unknown kind', () => {
  assert.throws(() => reviewSchema('nope'), /unknown kind/);
});
test('reviewPrompt throws on unknown kind', () => {
  assert.throws(() => reviewPrompt('nope', {}), /unknown kind/);
});

// Task 3 — decodeDataUrl helper
import { decodeDataUrl } from './prompts.js';

test('decodeDataUrl accepts jpeg/png/webp and returns bytes + type', () => {
  const png = 'data:image/png;base64,' + Buffer.from('hi').toString('base64');
  const r = decodeDataUrl(png);
  assert.equal(r.contentType, 'image/png');
  assert.equal(r.ext, 'png');
  assert.equal(r.bytes.toString(), 'hi');
});
test('decodeDataUrl rejects non-image / malformed input', () => {
  assert.equal(decodeDataUrl('data:text/plain;base64,aGk='), null);
  assert.equal(decodeDataUrl('not a data url'), null);
});
