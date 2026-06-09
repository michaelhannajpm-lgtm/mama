import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSearchText } from './google-places.js';

test('parseSearchText returns the places array', async () => {
  const raw = JSON.parse(await readFile(new URL('../../../../scripts/ingestion/fixtures/google-searchText.json', import.meta.url)));
  const places = parseSearchText(raw);
  assert.equal(places.length, 1);
  assert.equal(places[0].id, 'ChIJfixture1');
});

test('parseSearchText tolerates an empty body', () => {
  assert.deepEqual(parseSearchText({}), []);
});
