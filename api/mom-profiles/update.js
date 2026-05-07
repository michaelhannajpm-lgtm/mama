// POST /api/mom-profiles/update — update the signed-in mom's profile.
// Requires: { access_token, patch }.  Patches the row whose auth_user_id
// matches the access token's subject. Only allowlisted fields land in
// the database.
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

const ALLOWED_FIELDS = new Set([
  'bio', 'photos',
  'kids_ages', 'mom_types', 'values', 'interests',
  'free_slots', 'places', 'preferred_event_ids',
  'social_links', 'display_name', 'age',
  'neighborhood', 'home_lat', 'home_lng', 'distance_miles', 'city',
]);

const sanitizePatch = (patch) => {
  if (!patch || typeof patch !== 'object') return null;
  const out = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out;
};

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
  if (!access_token) return json(res, 400, { error: 'access_token required' });

  const patch = sanitizePatch(body.patch);
  if (!patch || Object.keys(patch).length === 0) {
    return json(res, 400, { error: 'patch with at least one allowed field required' });
  }

  // 1. Verify the JWT, get the auth user's id.
  let user;
  try {
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: creds.serviceRoleKey,
        Authorization: `Bearer ${access_token}`,
      },
    });
    if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
    user = await r.json();
  } catch (e) {
    console.error('mom-profiles/update auth check failed', e);
    return json(res, 502, { error: 'Could not verify session' });
  }

  if (!user?.id) return json(res, 401, { error: 'Auth user not found' });

  // 2. Patch the mom_profiles row by auth_user_id. last_active_at is bumped
  //    server-side so the directory's "recently active" sorting stays honest.
  const updatePayload = { ...patch, last_active_at: new Date().toISOString() };
  try {
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/mom_profiles?auth_user_id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
        body: JSON.stringify(updatePayload),
      },
    );
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('mom-profiles/update patch failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json().catch(() => []);
    if (!rows.length) {
      // No mom_profile row exists for this auth user yet (e.g. signup happened
      // before the linkage was deployed). Return 404 — caller should call
      // /api/onboarding/promote to create the row.
      return json(res, 404, { error: 'No mom_profile found for this user' });
    }
    return json(res, 200, { ok: true, profile: rows[0] });
  } catch (e) {
    console.error('mom-profiles/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
