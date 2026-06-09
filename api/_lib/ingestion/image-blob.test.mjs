import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventImagePathname, sniffImageExt, isProbablyImage } from './image-blob.js';

test('eventImagePathname is url-safe under events/', () => {
  assert.match(eventImagePathname({ slug: 'Glazer Storytime!', hash: 'abc123', ext: 'jpg' }),
    /^events\/glazer-storytime\/hero-abc123\.jpg$/);
});

test('sniffImageExt detects png/jpeg/webp/gif from magic bytes', () => {
  assert.equal(sniffImageExt(Buffer.from([0x89,0x50,0x4e,0x47])), 'png');
  assert.equal(sniffImageExt(Buffer.from([0xff,0xd8,0xff,0xe0])), 'jpg');
  assert.equal(sniffImageExt(Buffer.from([0x47,0x49,0x46,0x38])), 'gif');
  // RIFF....WEBP
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0,0,0,0]), Buffer.from('WEBP')]);
  assert.equal(sniffImageExt(webp), 'webp');
});

test('isProbablyImage rejects html/empty', () => {
  assert.equal(isProbablyImage(Buffer.from('<html>')), false);
  assert.equal(isProbablyImage(Buffer.alloc(0)), false);
  assert.equal(isProbablyImage(Buffer.from([0x89,0x50,0x4e,0x47])), true);
});
