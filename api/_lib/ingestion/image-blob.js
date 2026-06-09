// Download a remote image and store a durable copy in the Vercel Blob events/
// folder (store-image skill). Pure helpers are fixture-testable; the network +
// upload live in storeEventImage.
import { put } from '@vercel/blob';
import { slugSegment } from '../place-photo-blob.js';

const MAGIC = [
  { ext: 'png',  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'jpg',  bytes: [0xff, 0xd8, 0xff] },
  { ext: 'gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
];
const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b);

export const sniffImageExt = (buf) => {
  if (!buf || buf.length < 4) return null;
  for (const m of MAGIC) if (startsWith(buf, m.bytes)) return m.ext;
  // RIFF????WEBP
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' &&
      buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
};

export const isProbablyImage = (buf) => sniffImageExt(buf) !== null;

export const eventImagePathname = ({ slug, hash, ext = 'jpg' }) =>
  `events/${slugSegment(slug)}/hero-${hash}.${ext}`;

const hashUrl = (url) => {
  let h = 0; for (let i = 0; i < (url || '').length; i++) h = (h * 31 + url.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

// Download an image URL, validate it's really an image, upload to Blob, return
// { url } (the durable blob URL) or null on any failure (non-fatal for ingest).
export async function storeEventImage({ imageUrl, slug, token = process.env.BLOB_READ_WRITE_TOKEN, logger = console }) {
  if (!imageUrl || !token) return null;
  try {
    const r = await fetch(imageUrl, { redirect: 'follow' });
    if (!r.ok) return null;
    const buffer = Buffer.from(await r.arrayBuffer());
    const ext = sniffImageExt(buffer);
    if (!ext) { logger.warn?.(`not an image: ${imageUrl}`); return null; }
    const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const pathname = eventImagePathname({ slug, hash: hashUrl(imageUrl), ext });
    const blob = await put(pathname, buffer, { access: 'public', contentType, addRandomSuffix: true, token });
    return { url: blob.url, pathname: blob.pathname };
  } catch (e) { logger.warn?.(`storeEventImage failed for ${imageUrl}: ${e.message}`); return null; }
}
