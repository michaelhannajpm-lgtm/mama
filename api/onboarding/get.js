import { json, isUuid, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Onboarding backend is not configured' });

  const url = new URL(req.url, 'http://localhost');
  const session_id = url.searchParams.get('session_id');
  if (!isUuid(session_id)) return json(res, 400, { error: 'Valid session_id (uuid) required' });

  try {
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/onboarding_profiles?session_id=eq.${session_id}&select=*`,
      { headers: sbHeaders(creds.serviceRoleKey) },
    );
    if (!r.ok) return json(res, 502, { error: 'Could not load profile' });
    const rows = await r.json().catch(() => []);
    return json(res, 200, { ok: true, row: rows[0] || null });
  } catch (e) {
    console.error('onboarding/get exception', e);
    return json(res, 500, { error: 'Could not load profile' });
  }
}
