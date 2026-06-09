// GET /api/config — public. Returns app-level configuration as a flat map,
// e.g. { defaultPlacesRadiusMiles: 50 }. Backed by the app_config key/value
// table so values are editable without a deploy.
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';

// app_config.key (snake) → response key (camel) + coercion.
const KEYS = {
  default_places_radius_miles: { out: 'defaultPlacesRadiusMiles', num: true },
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/app_config?select=key,value`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    const config = {};
    for (const row of rows) {
      const meta = KEYS[row.key];
      if (!meta) continue;
      config[meta.out] = meta.num ? Number(row.value) : row.value;
    }
    return json(res, 200, { ok: true, config });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
