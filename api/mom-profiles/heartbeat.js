// POST /api/mom-profiles/heartbeat — presence ping. Sets the caller's
// mom_profiles.last_seen_at = now() (server clock, so it can't be spoofed).
// Identity, mirroring updateMomProfile:
//   { access_token }   → real signed-in mom, matched by auth_user_id
//   { seed_mom_id }    → DEV-only seeded mom (gated by devWritesAllowed)
// Fire-and-forget from the client; soft-fails (404/no row) without erroring.
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid, devWritesAllowed } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const now = new Date().toISOString();
  let filter;

  const access_token = typeof body.access_token === 'string' ? body.access_token : '';
  const seed_mom_id = typeof body.seed_mom_id === 'string' ? body.seed_mom_id : '';

  if (access_token) {
    // Verify the JWT → auth user id, then match the row by auth_user_id.
    try {
      const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
        headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${access_token}` },
      });
      if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
      const user = await r.json();
      if (!user?.id) return json(res, 401, { error: 'Auth user not found' });
      filter = `auth_user_id=eq.${user.id}`;
    } catch (e) {
      console.error('heartbeat auth check failed', e);
      return json(res, 502, { error: 'Could not verify session' });
    }
  } else if (seed_mom_id) {
    if (!devWritesAllowed()) return json(res, 404, { error: 'Not found' });
    if (!isUuid(seed_mom_id)) return json(res, 400, { error: 'valid seed_mom_id required' });
    filter = `id=eq.${seed_mom_id}&source=eq.seed`;
  } else {
    return json(res, 400, { error: 'access_token or seed_mom_id required' });
  }

  try {
    const r = await fetch(`${creds.supabaseUrl}/rest/v1/mom_profiles?${filter}`, {
      method: 'PATCH',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ last_seen_at: now }),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('heartbeat patch failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}` });
    }
    return json(res, 200, { ok: true, last_seen_at: now });
  } catch (e) {
    console.error('heartbeat threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
