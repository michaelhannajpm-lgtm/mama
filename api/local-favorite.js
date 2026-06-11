// GET /api/local-favorite?city=Tampa — public. Returns the current week's
// featured place. On a miss, auto-selects a high-rated place not featured in the
// last 8 weeks, persists it (source:'auto'), and returns it. Shape:
//   { ok: true, favorite: { place_id, week_start, source, name, hero_photo,
//                           rating, review_count, area, city } | null }
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';
import { weekStart, pickAuto } from './_lib/weekly-favorite.js';

const COOLDOWN_WEEKS = 8;
const PLACE_COLS = 'id,name,hero_photo,rating,review_count,area,city';

const toFavorite = (row) => {
  if (!row || !row.places) return null;
  const p = row.places;
  return {
    place_id: p.id, week_start: row.week_start, source: row.source,
    name: p.name, hero_photo: p.hero_photo, rating: p.rating,
    review_count: p.review_count, area: p.area, city: p.city,
  };
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const city = (new URL(req.url, 'http://x').searchParams.get('city') || 'Tampa').slice(0, 80);
  const ws = weekStart(new Date());
  const base = creds.supabaseUrl;
  const H = sbHeaders(creds.serviceRoleKey);
  const sel = `select=week_start,source,places(${PLACE_COLS})`;
  const weekFilter = `week_start=eq.${ws}&city=eq.${encodeURIComponent(city)}`;

  try {
    // 1. Already chosen for this week?
    const hit = await fetch(`${base}/rest/v1/weekly_favorites?${weekFilter}&${sel}`, { headers: H });
    if (hit.ok) {
      const rows = await hit.json();
      if (rows[0]) return json(res, 200, { ok: true, favorite: toFavorite(rows[0]) });
    }

    // 2. Last 8 weeks' place_ids → cooldown set.
    const recentR = await fetch(
      `${base}/rest/v1/weekly_favorites?city=eq.${encodeURIComponent(city)}` +
      `&order=week_start.desc&limit=${COOLDOWN_WEEKS}&select=place_id`, { headers: H });
    const recentIds = recentR.ok ? (await recentR.json()).map((r) => r.place_id) : [];

    // 3. Candidate places (visible + approved).
    const placesR = await fetch(
      `${base}/rest/v1/places?visible=eq.true&review_status=eq.approved` +
      `&select=${PLACE_COLS}&limit=1000`, { headers: H });
    const places = placesR.ok ? await placesR.json() : [];

    let pick = pickAuto(places, recentIds);
    if (!pick) pick = pickAuto(places, []); // relax cooldown if everything's blocked
    if (!pick) return json(res, 200, { ok: true, favorite: null });

    // 4. Persist (ignore-duplicates → race-safe), then re-read the canonical row.
    await fetch(`${base}/rest/v1/weekly_favorites?on_conflict=week_start,city`, {
      method: 'POST',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'resolution=ignore-duplicates' }),
      body: JSON.stringify({ week_start: ws, city, place_id: pick.id, source: 'auto' }),
    });
    const finalR = await fetch(`${base}/rest/v1/weekly_favorites?${weekFilter}&${sel}`, { headers: H });
    const finalRows = finalR.ok ? await finalR.json() : [];
    return json(res, 200, { ok: true, favorite: toFavorite(finalRows[0]) });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not load local favorite' });
  }
}
