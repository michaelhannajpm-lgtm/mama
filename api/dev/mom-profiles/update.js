// POST /api/dev/mom-profiles/update — DEV-ONLY update of a seeded mom profile.
// Body: { seed_mom_id, patch }. Lets the dev "seeded mom" login (which has no
// real Supabase session) edit its own profile. Service-role write, gated by
// devWritesAllowed() and restricted to source='seed' rows so it can never touch
// a real onboarding user, and 404s entirely in production.
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid, devWritesAllowed } from '../../_lib/supabase.js';
import { sanitizeMomPatch } from '../../_lib/mom-profile-helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!devWritesAllowed()) return json(res, 404, { error: 'Not found' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const seedMomId = typeof body.seed_mom_id === 'string' ? body.seed_mom_id : '';
  if (!isUuid(seedMomId)) return json(res, 400, { error: 'valid seed_mom_id required' });

  const patch = sanitizeMomPatch(body.patch);
  if (!patch || Object.keys(patch).length === 0) {
    return json(res, 400, { error: 'patch with at least one allowed field required' });
  }

  const updatePayload = { ...patch, last_active_at: new Date().toISOString() };
  try {
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/mom_profiles?id=eq.${seedMomId}&source=eq.seed`,
      {
        method: 'PATCH',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
        body: JSON.stringify(updatePayload),
      },
    );
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      if (r.status === 409 || text.includes('23505') || text.includes('mom_profiles_username_key')) {
        return json(res, 409, { error: 'That handle is already taken' });
      }
      console.error('dev/mom-profiles/update patch failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json().catch(() => []);
    if (!rows.length) return json(res, 404, { error: 'No seeded mom_profile with that id' });
    return json(res, 200, { ok: true, profile: rows[0] });
  } catch (e) {
    console.error('dev/mom-profiles/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
