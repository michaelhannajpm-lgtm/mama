// GET /api/places — public. Visible places only, grouped + top picks.
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';
import { groupPlaces } from './_lib/places-shape.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=120');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const select = 'id,slug,name,category,area,city,description,tags,hero_photo,badge,' +
      'rating,review_count,lat,lng,address,website,reference_url,phone,hours,amenities,' +
      'good_for,age_min,age_max,price_level';
    const url = `${creds.supabaseUrl}/rest/v1/places` +
      `?select=${select}&visible=eq.true&order=name.asc&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    const { topPicks, ...grouped } = groupPlaces(rows, { withTopPicks: true });
    return json(res, 200, { ok: true, count: rows.length, places: grouped, topPicks, flat: rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
