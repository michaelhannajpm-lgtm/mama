// POST /api/mom-profiles/nearby — discover visible, non-blocked moms ranked by
// the recommendation algorithm + geodistance. Body:
//   { user: { auth_user_id?, seed_mom_id?, kids_ages?, interests?, values?,
//             places?, free_slots?, mom_types?, lat?, lng? },
//     limit?: number, verifiedOnly?: boolean }
// Returns { moms: Card[], total: number, verifiedOnly }. Never returns raw
// coordinates (rankAndShape → momCardFromRow strips them).
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { rankAndShape } from '../_lib/nearby.js';

const SELECT = [
  'id', 'auth_user_id', 'display_name', 'username', 'age', 'bio', 'photos',
  'kids_ages', 'mom_types', 'values', 'interests', 'free_slots', 'places',
  'city', 'neighborhood', 'county', 'home_lat', 'home_lng', 'distance_miles', 'verified',
  'last_seen_at', 'settings',
].join(',');

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

  const user = body.user && typeof body.user === 'object' ? body.user : {};
  const limit = Number.isFinite(Number(body.limit))
    ? Math.max(1, Math.min(100, Math.floor(Number(body.limit))))
    : 24;
  const verifiedOnly = body.verifiedOnly !== false; // default true

  let filter = 'visible=eq.true&blocked_global=eq.false';
  if (verifiedOnly) filter += '&verified=eq.true';
  const url =
    `${creds.supabaseUrl}/rest/v1/mom_profiles?${filter}` +
    `&limit=1000&select=${encodeURIComponent(SELECT)}`;

  try {
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    const text = await r.text();
    if (!r.ok) {
      console.error('mom-profiles/nearby failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = JSON.parse(text || '[]');
    const { moms, total } = rankAndShape(rows, user, { limit });
    return json(res, 200, { moms, total, verifiedOnly });
  } catch (e) {
    console.error('mom-profiles/nearby threw', e);
    return json(res, 500, { error: e?.message || 'Could not load nearby moms' });
  }
}
