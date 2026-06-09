import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseGraphEvents } from './facebook-graph.js';

test('parseGraphEvents → intermediate[]', async () => {
  const raw = JSON.parse(await readFile(new URL('../../../../scripts/ingestion/fixtures/fb-graph-events.json', import.meta.url)));
  const [e] = parseGraphEvents(raw);
  assert.equal(e.name, 'Preschool Play Date');
  assert.equal(e.placeName, 'Riverfront Park');
  assert.equal(e.city, 'Tampa, FL');
  assert.equal(e.externalId, '999');
});

test('parseGraphEvents tolerates empty body', () => {
  assert.deepEqual(parseGraphEvents({}), []);
});
