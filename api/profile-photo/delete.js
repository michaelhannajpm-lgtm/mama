// POST /api/profile-photo/delete — remove one profile photo.
// Body: { access_token | seed_mom_id, url }. Server-authoritative: removes the
// URL from the owner's mom_profiles.photos AND deletes the blob from Vercel
// Blob, then returns the updated photos array. Ownership is enforced by
// requiring the URL to already be in the caller's own photos, so nobody can
// delete someone else's blob. Dual auth mirrors the upload endpoint (real
// session, or dev-gated seeded mom).
import { del } from '@vercel/blob';
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid, devWritesAllowed } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const access_token = typeof body.access_token === 'string' ? body.access_token : '';
  const seedMomId = typeof body.seed_mom_id === 'string' ? body.seed_mom_id : '';
  const photoUrl = typeof body.url === 'string' ? body.url : '';
  if (!photoUrl) return json(res, 400, { error: 'url required' });

  // Resolve the row selector (and confirm auth).
  let rowFilter = null;
  if (access_token) {
    try {
      const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
        headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${access_token}` },
      });
      if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
      const user = await r.json();
      if (!user?.id) return json(res, 401, { error: 'Auth user not found' });
      rowFilter = `auth_user_id=eq.${user.id}`;
    } catch (e) {
      console.error('profile-photo/delete auth check failed', e);
      return json(res, 502, { error: 'Could not verify session' });
    }
  } else if (seedMomId && devWritesAllowed()) {
    if (!isUuid(seedMomId)) return json(res, 400, { error: 'valid seed_mom_id required' });
    rowFilter = `id=eq.${seedMomId}&source=eq.seed`;
  } else {
    return json(res, 401, { error: 'access_token (or seed_mom_id in dev) required' });
  }

  try {
    // Load the row's photos and confirm the URL belongs to this profile.
    const sel = await fetch(
      `${creds.supabaseUrl}/rest/v1/mom_profiles?${rowFilter}&select=photos`,
      { headers: sbHeaders(creds.serviceRoleKey) },
    );
    if (!sel.ok) return json(res, 502, { error: `Supabase ${sel.status}` });
    const rows = await sel.json().catch(() => []);
    if (!rows.length) return json(res, 404, { error: 'Profile not found' });
    const photos = Array.isArray(rows[0].photos) ? rows[0].photos : [];
    if (!photos.includes(photoUrl)) return json(res, 404, { error: 'Photo not found on your profile' });

    const next = photos.filter((p) => p !== photoUrl);

    // Persist the shortened array first…
    const pr = await fetch(`${creds.supabaseUrl}/rest/v1/mom_profiles?${rowFilter}`, {
      method: 'PATCH',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ photos: next, last_active_at: new Date().toISOString() }),
    });
    if (!pr.ok) {
      const text = await pr.text().catch(() => '');
      console.error('profile-photo/delete patch failed', pr.status, text);
      return json(res, 502, { error: `Supabase ${pr.status}: ${text.slice(0, 200)}` });
    }

    // …then delete the blob. Best-effort: a failure here only orphans the blob
    // (the array is already correct), so we log and still report success.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try { await del(photoUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }); }
      catch (e) { console.error('profile-photo/delete orphan blob (del failed)', photoUrl, e?.message); }
    }

    return json(res, 200, { ok: true, photos: next });
  } catch (e) {
    console.error('profile-photo/delete threw', e);
    return json(res, 502, { error: e?.message || 'Could not remove photo' });
  }
}
