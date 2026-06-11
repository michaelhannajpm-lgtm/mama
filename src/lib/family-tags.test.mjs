import test from 'node:test';
import assert from 'node:assert';
import { extractFamilyTags } from './family-tags.js';

test('extracts the brief example: church + playgrounds + weekends outside', () => {
  const tags = extractFamilyTags('We love church, playgrounds, and spending weekends outside.');
  assert.ok(tags.includes('Faith-based'), 'faith');
  assert.ok(tags.includes('Outdoors'), 'outdoors');
  assert.ok(tags.includes('Active weekends'), 'active weekends');
});

test('empty / too-short text yields no tags', () => {
  assert.deepEqual(extractFamilyTags(''), []);
  assert.deepEqual(extractFamilyTags('hi'), []);
});

test('word-boundary matching avoids substring false positives', () => {
  // "start" must not trigger Creative via "art"; "weekend" should still work.
  const tags = extractFamilyTags('We start most weekends at the farmers market.');
  assert.ok(!tags.includes('Creative'), 'no false Creative from "start"');
  assert.ok(tags.includes('Active weekends'));
  assert.ok(tags.includes('Foodies'), 'farmers market → foodies');
});

test('covers kid stages and activities', () => {
  assert.ok(extractFamilyTags('chasing our toddler around all day').includes('Toddler life'));
  assert.ok(extractFamilyTags('up all night with a newborn').includes('Newborn days'));
  assert.ok(extractFamilyTags('soccer and gymnastics every weekend').includes('Little athletes'));
  assert.ok(extractFamilyTags('we homeschool with a montessori approach').includes('Homeschool'));
  assert.ok(extractFamilyTags('a bilingual home, we speak spanish').includes('Bilingual home'));
});

test('detects special needs respectfully and is never capped out', () => {
  assert.ok(extractFamilyTags('my son has autism').includes('Special needs'));
  assert.ok(extractFamilyTags('our daughter was diagnosed with ADHD').includes('Special needs'));
  assert.ok(extractFamilyTags('he is autistic and nonverbal').includes('Special needs'));
  // Even with many other signals, it stays in (listed first).
  const busy = extractFamilyTags('church beach art music soccer autism', 3);
  assert.ok(busy.includes('Special needs'));
});

test('the everyday word "add" does not trigger Special needs', () => {
  assert.ok(!extractFamilyTags('we love to add new playdates to our week').includes('Special needs'));
});

test('caps the number of tags', () => {
  const tags = extractFamilyTags('church beach art music friends school cook soccer coffee travel', 4);
  assert.equal(tags.length, 4);
});
