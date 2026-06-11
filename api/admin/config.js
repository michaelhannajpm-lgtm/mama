// Admin app-config editor. SECURITY: requireAdmin bearer token.
//   GET  /api/admin/config                     -> { rows: [{key,value,updated_at}] }
//   POST /api/admin/config { key, value }       -> upsert one allowed config key
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';

// Only these keys are editable, each with its own validation/coercion.
const VALIDATORS = {
  default_places_radius_miles: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1 || n > 500) return { error: 'radius must be 1–500 miles' };
    return { value: Math.round(n) };
  },
  // Presence recency windows (seconds). online window must be shorter than away.
  presence_online_max_seconds: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 30 || n > 3600) return { error: 'online window must be 30–3600 seconds' };
    return { value: Math.round(n) };
  },
  presence_away_max_seconds: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 60 || n > 86400) return { error: 'away window must be 60–86400 seconds' };
    return { value: Math.round(n) };
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    if (req.method === 'GET') {
      const url = `${creds.supabaseUrl}/rest/v1/app_config?select=key,value,updated_at&order=key.asc`;
      const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
      if (!r.ok) return json(res, 502, { error: `Supabase ${r.status}` });
      return json(res, 200, { rows: await r.json() });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const key = body?.key;
      const validate = VALIDATORS[key];
      if (!validate) return json(res, 400, { error: `unknown config key: ${key}` });
      const checked = validate(body?.value);
      if (checked.error) return json(res, 400, { error: checked.error });

      const r = await fetch(`${creds.supabaseUrl}/rest/v1/app_config?on_conflict=key`, {
        method: 'POST',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify({ key, value: checked.value }),
      });
      const text = await r.text();
      if (!r.ok) return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
      return json(res, 200, { ok: true, row: JSON.parse(text || '[]')[0] || null });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
