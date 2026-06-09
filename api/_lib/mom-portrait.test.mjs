import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugForMom, blobPathForMom, buildPortraitPrompt, hasGeneratedPortrait,
} from './mom-portrait.js';

test('slugForMom prefers username, url-safe lowercased', () => {
  assert.equal(slugForMom({ username: 'GabrielaC164', display_name: 'Gabriela C.' }), 'gabrielac164');
  assert.equal(slugForMom({ display_name: 'Mei L.' }), 'mei-l');
  assert.equal(slugForMom({ id: 'uuid-9' }), 'mom-uuid-9');
  assert.equal(slugForMom({}), 'mama');
});

test('blobPathForMom builds a stable profiles/<slug>/ path', () => {
  assert.equal(blobPathForMom('gabrielac164'), 'profiles/gabrielac164/portrait.png');
  assert.equal(blobPathForMom('mei-l', 'webp'), 'profiles/mei-l/portrait.webp');
});

test('buildPortraitPrompt is deterministic for the same row', () => {
  const row = { id: 'uuid-1', username: 'sara', display_name: 'Sara K.', mom_types: ['working'], kids_ages: { '1–3': true } };
  assert.equal(buildPortraitPrompt(row), buildPortraitPrompt(row));
});

test('buildPortraitPrompt varies across different moms and is a non-trivial photo prompt', () => {
  const a = buildPortraitPrompt({ id: 'aaaa' });
  const b = buildPortraitPrompt({ id: 'zzzz9999' });
  assert.notEqual(a, b);
  for (const p of [a, b]) {
    assert.match(p, /portrait/i);
    assert.match(p, /mother|mom/i);
    assert.match(p, /photo/i);
    assert.match(p, /no text|no watermark/i);
  }
});

test('hasGeneratedPortrait detects a profiles/ blob url, ignores unsplash hotlinks', () => {
  assert.equal(hasGeneratedPortrait({ photos: ['https://abc.public.blob.vercel-storage.com/profiles/sara/portrait.png'] }), true);
  assert.equal(hasGeneratedPortrait({ photos: ['https://images.unsplash.com/photo-123?w=600'] }), false);
  assert.equal(hasGeneratedPortrait({ photos: [] }), false);
  assert.equal(hasGeneratedPortrait({}), false);
});
