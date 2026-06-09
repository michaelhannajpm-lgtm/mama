// Durable Vercel Blob copies for place photos.
//
// Google Places photos are stored only as a `google_ref` (resource name like
// `places/XXX/photos/YYY`) and served live through /api/places/photo, which
// burns Google Places Photo quota on every render. This module downloads the
// image bytes once (rate-limited by the caller), uploads them to the public
// Vercel Blob `places/` folder, and persists the resulting public URL on the
// `place_photos` row so the app renders from Blob instead of Google.
//
// It is shared by the backfill CLI (scripts/backfill-place-photos.mjs) and the
// lazy hook in the photo proxy (api/places/photo.js). DB writes go through the
// Supabase REST API so the module works unchanged in both serverless and CLI.
import { put } from '@vercel/blob';

// places/XXX/photos/YYY — the only shape the proxy + Google media endpoint accept.
export const GOOGLE_REF_RE = /^places\/[\w-]+\/photos\/[\w-]+$/;

export const isGoogleRef = (ref) => typeof ref === 'string' && GOOGLE_REF_RE.test(ref);

// Google Places (New) photo media endpoint. Returns the raw bytes (it 302s to a
// CDN URL; fetch follows the redirect by default).
export const googleMediaUrl = (googleRef, { width = 1200, key }) =>
  `https://places.googleapis.com/v1/${googleRef}/media?maxWidthPx=${width}&key=${key}`;

const EXT_BY_MIME = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'image/gif': 'gif',
};

export const extForContentType = (ct) => EXT_BY_MIME[(ct || '').split(';')[0].trim().toLowerCase()] || 'jpg';

// Lowercase, URL-safe path segment.
export const slugSegment = (s) =>
  (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'place';

// Stable, collision-free pathname inside the places/ folder. Keyed by photo id
// so re-running the backfill overwrites the same object instead of duplicating.
export const blobPathnameFor = ({ slug, photoId, ext = 'jpg' }) =>
  `places/${slugSegment(slug)}/${photoId}.${ext}`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Download the Google photo bytes. Bounded retry/backoff on 429 (quota) and 5xx,
// honoring Retry-After — Google's photo quota is per-minute, so a transient 429
// should wait it out rather than fail the photo. Throws on terminal failure so
// the caller can record a failed attempt.
export const downloadGooglePhoto = async ({ googleRef, key, width = 1200, maxRetries = 4 }) => {
  if (!isGoogleRef(googleRef)) throw new Error(`invalid google ref: ${googleRef}`);
  if (!key) throw new Error('GOOGLE_PLACES_API_KEY not set');
  let attempt = 0;
  while (true) {
    attempt++;
    const r = await fetch(googleMediaUrl(googleRef, { width, key }), { redirect: 'follow' });
    if (r.ok) {
      const contentType = r.headers.get('content-type') || 'image/jpeg';
      if (!contentType.startsWith('image/')) throw new Error(`unexpected content-type: ${contentType}`);
      const buffer = Buffer.from(await r.arrayBuffer());
      if (!buffer.length) throw new Error('empty image body');
      return { buffer, contentType, ext: extForContentType(contentType) };
    }
    const t = await r.text().catch(() => '');
    if ((r.status === 429 || r.status >= 500) && attempt <= maxRetries) {
      // Retry-After is seconds; otherwise exponential backoff (1s,2s,4s,8s…).
      const wait = Number(r.headers.get('Retry-After')) * 1000 || Math.min(2 ** (attempt - 1) * 1000, 16000);
      await sleep(wait);
      continue;
    }
    throw new Error(`google media ${r.status}: ${t.slice(0, 150)}`);
  }
};

// Upload bytes to the public places/ folder. Deterministic path (overwrite) so
// the operation is idempotent.
export const uploadPhotoBlob = async ({ pathname, buffer, contentType, token }) => {
  const blob = await put(pathname, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    token: token || process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { url: blob.url, pathname: blob.pathname };
};

// --- Supabase REST helpers (service-role; server-side only) ---------------

const restHeaders = (key) => ({
  apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
});

const patchPhotoRow = async ({ supabaseUrl, serviceRoleKey }, photoId, patch) => {
  const r = await fetch(
    `${supabaseUrl}/rest/v1/place_photos?id=eq.${photoId}`,
    { method: 'PATCH', headers: { ...restHeaders(serviceRoleKey), Prefer: 'return=minimal' }, body: JSON.stringify(patch) },
  );
  if (!r.ok) throw new Error(`place_photos patch ${r.status}: ${(await r.text().catch(() => '')).slice(0, 150)}`);
};

// Point a place's hero_photo at the blob, but only when it is unset or still a
// Google proxy path — never clobber a curator-chosen hero or another blob.
const maybeSetHero = async ({ supabaseUrl, serviceRoleKey }, placeId, blobUrl) => {
  const sel = await fetch(
    `${supabaseUrl}/rest/v1/places?id=eq.${placeId}&select=hero_photo`,
    { headers: restHeaders(serviceRoleKey) },
  );
  if (!sel.ok) return;
  const [row] = await sel.json().catch(() => []);
  const cur = row?.hero_photo;
  const replaceable = !cur || cur.startsWith('/api/places/photo');
  if (!replaceable) return;
  await fetch(
    `${supabaseUrl}/rest/v1/places?id=eq.${placeId}`,
    { method: 'PATCH', headers: { ...restHeaders(serviceRoleKey), Prefer: 'return=minimal' }, body: JSON.stringify({ hero_photo: blobUrl }) },
  );
};

// Orchestrate one photo: download → upload → persist. Records the attempt
// timestamp + status on the row whether it succeeds or fails, so the run is
// auditable and resumable. `creds` = { supabaseUrl, serviceRoleKey }.
// Returns { status: 'success'|'failed', blobUrl?, error? }.
export const ensurePhotoBlob = async ({ creds, photo, slug, key, width = 1200, blobToken }) => {
  const attemptedAt = new Date().toISOString();
  try {
    const { buffer, contentType, ext } = await downloadGooglePhoto({ googleRef: photo.google_ref, key, width });
    const pathname = blobPathnameFor({ slug: slug || photo.place_id, photoId: photo.id, ext });
    const { url, pathname: storedPath } = await uploadPhotoBlob({ pathname, buffer, contentType, token: blobToken });
    await patchPhotoRow(creds, photo.id, {
      blob_url: url, blob_pathname: storedPath, url, // mirror to `url` for legacy readers
      fetch_status: 'success', fetch_attempted_at: attemptedAt, fetch_error: null,
    });
    if (photo.is_hero) await maybeSetHero(creds, photo.place_id, url);
    return { status: 'success', blobUrl: url };
  } catch (e) {
    const msg = (e?.message || String(e)).slice(0, 300);
    // Best-effort: record the failed attempt so we can see what was tried & when.
    try {
      await patchPhotoRow(creds, photo.id, {
        fetch_status: 'failed', fetch_attempted_at: attemptedAt, fetch_error: msg,
      });
    } catch { /* swallow — surface the original error */ }
    return { status: 'failed', error: msg };
  }
};
