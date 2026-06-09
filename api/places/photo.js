// GET /api/places/photo?ref=<google photo resource name>&w=800
// 302-redirects to the Google Places (New) photo media URL with the key applied
// server-side, so the key never reaches the browser and we don't rehost Google
// imagery on the request path.
//
// Lazy-backfill hook: this endpoint is only hit for photos that don't yet have a
// durable Vercel Blob copy (once blob_url exists, the app renders the blob URL
// directly and never reaches here). So a hit is a reliable signal that the photo
// still needs a blob — we fire a throttled, deduped background download+upload,
// then redirect as usual. The batch backfill (scripts/backfill-place-photos.mjs)
// remains the primary mechanism; this just catches stragglers + newly ingested
// photos between runs.
import { waitUntil } from '@vercel/functions';
import { json, supabaseCreds } from '../_lib/supabase.js';
import { isGoogleRef, ensurePhotoBlob } from '../_lib/place-photo-blob.js';

// Per-instance throttle so a page rendering many uncached images can't fan out
// into a burst of Google downloads. Tune via PHOTO_BLOB_HOOK_RATE_PER_MIN.
const HOOK_RATE = Number(process.env.PHOTO_BLOB_HOOK_RATE_PER_MIN || 30);
const MIN_INTERVAL_MS = Math.round(60000 / Math.max(1, HOOK_RATE));
const inFlight = new Set();
let lastFireAt = 0;

const maybeBackfill = async (ref, key) => {
  if (inFlight.has(ref)) return;
  const now = Date.now();
  if (now - lastFireAt < MIN_INTERVAL_MS) return; // throttled; next render / batch gets it
  const creds = supabaseCreds();
  if (!creds) return;
  lastFireAt = now;
  inFlight.add(ref);
  try {
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/place_photos` +
        `?select=id,place_id,is_hero,blob_url,places(slug)` +
        `&google_ref=eq.${encodeURIComponent(ref)}&blob_url=is.null&limit=1`,
      { headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${creds.serviceRoleKey}` } },
    );
    if (!r.ok) return;
    const [photo] = await r.json();
    if (!photo) return; // already backfilled or unknown ref
    const res = await ensurePhotoBlob({
      creds: { supabaseUrl: creds.supabaseUrl, serviceRoleKey: creds.serviceRoleKey },
      photo: { ...photo, google_ref: ref }, slug: photo.places?.slug, key,
    });
    if (res.status === 'success') console.log(`[photo-hook] backfilled ${ref} → ${res.blobUrl}`);
    else console.warn(`[photo-hook] failed ${ref}: ${res.error}`);
  } catch (e) {
    console.warn(`[photo-hook] error ${ref}: ${e?.message || e}`);
  } finally {
    inFlight.delete(ref);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return json(res, 500, { error: 'GOOGLE_PLACES_API_KEY not configured' });

  const ref = typeof req.query?.ref === 'string' ? req.query.ref : '';
  // resource name looks like: places/XXX/photos/YYY — allow only that shape.
  if (!isGoogleRef(ref)) {
    return json(res, 400, { error: 'invalid photo ref' });
  }
  const w = Math.max(1, Math.min(parseInt(req.query?.w, 10) || 800, 1600));

  // Fire the lazy blob backfill as post-response background work — waitUntil
  // keeps the function alive until it settles without delaying the redirect.
  waitUntil(maybeBackfill(ref, key));

  const target = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${w}&key=${key}`;
  res.statusCode = 302;
  res.setHeader('Location', target);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end();
}
