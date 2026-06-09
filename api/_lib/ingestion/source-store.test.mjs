import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dbRowToSource, sourceToRow } from './source-store.js';

test('sourceToRow packs google_places config', () => {
  const row = sourceToRow({ id: 'g', name: 'G', type: 'google_places', city: 'Tampa, FL', bias: { lat: 1, lng: 2, radiusM: 3 }, queries: [{ q: 'x', category: 'fun' }] }, 'places');
  assert.equal(row.source_type, 'google_places');
  assert.equal(row.kind, 'places');
  assert.deepEqual(row.config.bias, { lat: 1, lng: 2, radiusM: 3 });
  assert.equal(row.config.queries.length, 1);
});

test('dbRowToSource lifts config into the orchestrator shape', () => {
  const s = dbRowToSource({ id: 'g', name: 'G', source_type: 'google_places', kind: 'places', city: 'Tampa, FL', enabled: true, cadence_hours: 168, parser_version: 'v1', config: { bias: { lat: 1, lng: 2, radiusM: 3 }, queries: [{ q: 'x', category: 'fun' }] } });
  assert.equal(s.type, 'google_places');
  assert.equal(s.kind, 'places');
  assert.deepEqual(s.bias, { lat: 1, lng: 2, radiusM: 3 });
  assert.equal(s.queries.length, 1);
});

test('round-trips ics url + defaultType', () => {
  const s = dbRowToSource(sourceToRow({ id: 'i', name: 'I', type: 'ics', url: 'http://x/y.ics', defaultType: 'library-program' }, 'events'));
  assert.equal(s.url, 'http://x/y.ics');
  assert.equal(s.defaultType, 'library-program');
});

test('round-trips facebook pageId', () => {
  const s = dbRowToSource(sourceToRow({ id: 'f', name: 'F', type: 'facebook_graph', pageId: '123' }, 'events'));
  assert.equal(s.pageId, '123');
});
