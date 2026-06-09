// GET /api/dev/mom-profiles
// Seeded-mom login helper. Returns only source='seed' rows (fake demo
// profiles, no real PII). Open in all environments so the "Pick seeded mom"
// shortcut works for everyone, including production.
import { json, sbHeaders, supabaseCreds } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const requestedLimit = Number(req.query?.limit);
  const limit = Number.isFinite(requestedLimit)
    ? Math.max(1, Math.min(1000, Math.floor(requestedLimit)))
    : 1000;

  const select = [
    'id', 'auth_user_id', 'display_name', 'username', 'age', 'bio', 'photos',
    'kids_ages', 'mom_types', 'values', 'interests', 'free_slots', 'places',
    'preferred_event_ids', 'city', 'neighborhood', 'county', 'place_id',
    'home_lat', 'home_lng', 'distance_miles', 'visible', 'verified',
    'blocked_global', 'social_links', 'source', 'last_active_at', 'created_at',
  ].join(',');
  const url =
    `${creds.supabaseUrl}/rest/v1/mom_profiles` +
    `?source=eq.seed&order=display_name.asc&limit=${limit}&select=${encodeURIComponent(select)}`;

  try {
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    const text = await r.text();
    if (!r.ok) {
      console.error('dev/mom-profiles failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = JSON.parse(text || '[]');
    return json(res, 200, { rows });
  } catch (e) {
    console.error('dev/mom-profiles threw', e);
    return json(res, 500, { error: e?.message || 'Could not load seeded moms' });
  }
}
