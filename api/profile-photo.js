// POST /api/profile-photo — upload one profile photo to Vercel Blob.
// Body: { access_token, dataUrl }. Verifies the Supabase session, uploads the
// (already client-compressed) image to the public `profiles/<auth_user_id>/`
// folder, and returns its public blob URL. The caller persists the photos
// array via /api/mom-profiles/update (so add/remove/reorder all flow through
// one place). This endpoint does NOT write the DB itself.
import { put } from '@vercel/blob';
import { json, readJsonBody, supabaseCreds, sbHeaders, randomHex, isUuid, devWritesAllowed } from './_lib/supabase.js';

const MAX_BYTES = 6 * 1024 * 1024; // decoded-size guard (client compresses well below this)
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 500, { error: 'Blob storage not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const access_token = typeof body.access_token === 'string' ? body.access_token : '';
  const seedMomId = typeof body.seed_mom_id === 'string' ? body.seed_mom_id : '';
  const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';

  // Validate + decode the data URL (jpeg/png/webp only).
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return json(res, 400, { error: 'dataUrl must be a base64 jpeg/png/webp image' });
  const contentType = m[1];
  const bytes = Buffer.from(m[2], 'base64');
  if (!bytes.length) return json(res, 400, { error: 'Empty image' });
  if (bytes.length > MAX_BYTES) return json(res, 413, { error: 'Image too large (max 6MB)' });

  // Resolve the folder owner id, two ways:
  //   • access_token → verify the Supabase session (real signed-in user)
  //   • seed_mom_id  → DEV-ONLY (devWritesAllowed) write for a seeded mom; the
  //     id must belong to a source='seed' row so it can't target a real user.
  let ownerId = null;
  if (access_token) {
    try {
      const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
        headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${access_token}` },
      });
      if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
      const user = await r.json();
      if (!user?.id) return json(res, 401, { error: 'Auth user not found' });
      ownerId = user.id;
    } catch (e) {
      console.error('profile-photo auth check failed', e);
      return json(res, 502, { error: 'Could not verify session' });
    }
  } else if (seedMomId && devWritesAllowed()) {
    if (!isUuid(seedMomId)) return json(res, 400, { error: 'valid seed_mom_id required' });
    try {
      const r = await fetch(
        `${creds.supabaseUrl}/rest/v1/mom_profiles?id=eq.${seedMomId}&source=eq.seed&select=id`,
        { headers: sbHeaders(creds.serviceRoleKey) },
      );
      const rows = await r.json().catch(() => []);
      if (!r.ok || !rows.length) return json(res, 404, { error: 'No seeded mom_profile with that id' });
      ownerId = seedMomId;
    } catch (e) {
      console.error('profile-photo seed lookup failed', e);
      return json(res, 502, { error: 'Could not verify seeded profile' });
    }
  } else {
    return json(res, 401, { error: 'access_token (or seed_mom_id in dev) required' });
  }

  const ext = EXT[contentType] || 'jpg';
  const pathname = `profiles/${ownerId}/${randomHex(10)}.${ext}`;
  try {
    const blob = await put(pathname, bytes, {
      access: 'public',
      contentType,
      addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return json(res, 200, { url: blob.url });
  } catch (e) {
    console.error('profile-photo upload failed', e);
    return json(res, 502, { error: e?.message || 'Upload failed' });
  }
}
