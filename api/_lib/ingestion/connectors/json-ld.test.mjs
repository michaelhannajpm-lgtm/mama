import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseJsonLd } from './json-ld.js';

test('parseJsonLd extracts schema.org Event nodes', async () => {
  const html = await readFile(new URL('../../../../scripts/ingestion/fixtures/jsonld-event.html', import.meta.url), 'utf8');
  const [e] = parseJsonLd(html, { sourceCategory: 'museum' });
  assert.equal(e.name, 'Family Art Day');
  assert.equal(e.placeName, "Glazer Children's Museum");
  assert.equal(e.city, 'Tampa, FL');
  assert.equal(e.lat, 27.9487);
  assert.equal(e.sourceUrl, 'https://glazermuseum.org/events/family-art-day');
});

test('parseJsonLd tolerates pages with no JSON-LD', () => {
  assert.deepEqual(parseJsonLd('<html></html>'), []);
});
