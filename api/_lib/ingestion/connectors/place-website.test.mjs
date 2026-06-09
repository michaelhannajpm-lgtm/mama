import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { discoverEventPage, extractPlaceEvents } from './place-website.js';

test('discoverEventPage finds the calendar link (absolute URL)', async () => {
  const html = await readFile(new URL('../../../../scripts/ingestion/fixtures/place-home.html', import.meta.url), 'utf8');
  assert.equal(discoverEventPage(html, 'https://tampakidsgym.com'), 'https://tampakidsgym.com/calendar');
});

test('discoverEventPage returns null when no event-ish link exists', () => {
  assert.equal(discoverEventPage('<a href="/menu">Menu</a>', 'https://x.com'), null);
});

test('extractPlaceEvents prefers JSON-LD then ICS', async () => {
  const jsonld = await readFile(new URL('../../../../scripts/ingestion/fixtures/jsonld-event.html', import.meta.url), 'utf8');
  const out = extractPlaceEvents({ html: jsonld, place: { id: 'p1', city: 'Tampa, FL' } });
  assert.equal(out.length, 1);
  assert.equal(out[0].placeId, 'p1');
  assert.equal(out[0].name, 'Family Art Day');
});
