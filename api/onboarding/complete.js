// POST /api/onboarding/complete — flip onboarding_completed = true on the
// caller's onboarding_profiles row, keyed by auth_user_id (NOT session_id).
//
// Why auth-keyed: a returning user's localStorage session_id can differ from
// their canonical auth-linked row (cleared cookies, new device). Writing the
// flag by session_id could flip a different row, leaving the canonical row
// false and looping the user back into onboarding. Matching on auth_user_id
// flips exactly the right row. Soft-fails (404/no row) without erroring.
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

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

  const access_token = typeof body.access_token === 'string' ? body.access_token : '';
  if (!access_token) return json(res, 400, { error: 'access_token required' });

  // Verify the JWT → auth user id.
  let user;
  try {
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${access_token}` },
    });
    if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
    user = await r.json();
  } catch (e) {
    console.error('onboarding/complete auth check failed', e);
    return json(res, 502, { error: 'Could not verify session' });
  }
  if (!user?.id) return json(res, 401, { error: 'Auth user not found' });
  // Anonymous sessions never "complete" onboarding.
  if (user.is_anonymous === true) return json(res, 200, { ok: true, anonymous: true });

  try {
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/onboarding_profiles?auth_user_id=eq.${user.id}`,
      {
        method: 'PATCH',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }),
        body: JSON.stringify({ onboarding_completed: true }),
      },
    );
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('onboarding/complete patch failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}` });
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('onboarding/complete threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
