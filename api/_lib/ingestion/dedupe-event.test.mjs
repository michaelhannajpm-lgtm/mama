import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyEventCandidate } from './dedupe-event.js';

test('exact external_id match => update', () => {
  const existing = [{ id: 'x', external_id: 'E1', name: 'A', starts_at: '2026-06-10T14:30:00Z', place_id: 'p1', source_url: null }];
  const cand = { externalId: 'E1', name: 'A', startsAt: '2026-06-10T14:30:00Z', placeId: 'p1' };
  assert.deepEqual(classifyEventCandidate(cand, existing), { action: 'update', matchId: 'x' });
});

test('same name + same start + same place => review', () => {
  const existing = [{ id: 'y', external_id: null, name: 'Toddler Storytime', starts_at: '2026-06-10T14:30:00Z', place_id: 'p1', source_url: null }];
  const cand = { externalId: 'E9', name: 'Toddler Storytime', startsAt: '2026-06-10T14:30:00Z', placeId: 'p1' };
  assert.equal(classifyEventCandidate(cand, existing).action, 'review');
});

test('same source_url + same start date => review', () => {
  const existing = [{ id: 'z', external_id: null, name: 'X', starts_at: '2026-06-10T18:00:00Z', place_id: null, source_url: 'https://e/1' }];
  const cand = { externalId: 'E8', name: 'Y', startsAt: '2026-06-10T22:00:00Z', sourceUrl: 'https://e/1' };
  assert.equal(classifyEventCandidate(cand, existing).action, 'review');
});

test('novel => create', () => {
  assert.deepEqual(classifyEventCandidate({ externalId: 'E2', name: 'New', startsAt: '2026-07-01T14:00:00Z' }, []), { action: 'create', matchId: null });
});
