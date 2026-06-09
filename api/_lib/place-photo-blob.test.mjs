import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isGoogleRef, googleMediaUrl, extForContentType, slugSegment, blobPathnameFor,
} from './place-photo-blob.js';

test('isGoogleRef accepts only the resource-name shape', () => {
  assert.equal(isGoogleRef('places/ChIJ_abc-123/photos/AeXyz-90'), true);
  assert.equal(isGoogleRef('places/abc/photos/def/extra'), false);
  assert.equal(isGoogleRef('https://evil.com/x'), false);
  assert.equal(isGoogleRef(''), false);
  assert.equal(isGoogleRef(null), false);
});

test('googleMediaUrl embeds ref, width and key', () => {
  const u = googleMediaUrl('places/A/photos/B', { width: 800, key: 'KEY123' });
  assert.equal(u, 'https://places.googleapis.com/v1/places/A/photos/B/media?maxWidthPx=800&key=KEY123');
});

test('extForContentType maps mime → extension with jpg fallback', () => {
  assert.equal(extForContentType('image/png'), 'png');
  assert.equal(extForContentType('image/webp'), 'webp');
  assert.equal(extForContentType('image/jpeg; charset=binary'), 'jpg');
  assert.equal(extForContentType('application/octet-stream'), 'jpg');
  assert.equal(extForContentType(undefined), 'jpg');
});

test('slugSegment lowercases and url-safes', () => {
  assert.equal(slugSegment('Glazer Children’s Museum'), 'glazer-children-s-museum');
  assert.equal(slugSegment('--Bayshore--'), 'bayshore');
  assert.equal(slugSegment(''), 'place');
});

test('blobPathnameFor builds a stable places/ path', () => {
  assert.equal(
    blobPathnameFor({ slug: 'Glazer Museum', photoId: 'uuid-1', ext: 'png' }),
    'places/glazer-museum/uuid-1.png',
  );
  assert.equal(
    blobPathnameFor({ slug: 'bayshore', photoId: 'uuid-2' }),
    'places/bayshore/uuid-2.jpg',
  );
});
