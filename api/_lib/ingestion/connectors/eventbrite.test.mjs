import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEventbrite } from './eventbrite.js';

test('parseEventbrite → intermediate[]', async () => {
  const raw = JSON.parse(await readFile(new URL('../../../../scripts/ingestion/fixtures/eventbrite-search.json', import.meta.url)));
  const [e] = parseEventbrite(raw);
  assert.equal(e.name, 'Toddler Storytime');
  assert.equal(e.startsAt, '2026-06-10T14:30:00Z');
  assert.equal(e.placeName, 'John F. Germany Library');
  assert.equal(e.city, 'Tampa, FL');
  assert.equal(e.lat, 27.9506);
  assert.equal(e.externalId, '111');
  assert.equal(e.priceSummary, 'Free');
});

test('parseEventbrite tolerates empty body', () => {
  assert.deepEqual(parseEventbrite({}), []);
});
