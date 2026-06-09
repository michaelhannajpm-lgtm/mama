import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseIcs } from './ics.js';

test('parseIcs → intermediate[]', async () => {
  const text = await readFile(new URL('../../../../scripts/ingestion/fixtures/sample.ics', import.meta.url), 'utf8');
  const [e] = parseIcs(text, { defaultCity: 'Tampa, FL', sourceCategory: 'library' });
  assert.equal(e.name, 'Baby Storytime');
  assert.equal(e.externalId, 'evt-001@library.org');
  assert.equal(new Date(e.startsAt).toISOString(), '2026-06-10T14:30:00.000Z');
  assert.equal(e.placeName, 'John F. Germany Library, Tampa, FL');
  assert.equal(e.sourceUrl, 'https://hcplc.org/events/evt-001');
});

test('parseIcs tolerates empty text', () => {
  assert.deepEqual(parseIcs(''), []);
});
