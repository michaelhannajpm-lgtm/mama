// Admin Weekly Favorite editor. SECURITY: requireAdmin bearer token.
//   GET  /api/admin/weekly-favorite?city=Tampa -> { current, history }
//   POST { place_id, city?, week_start? }       -> upsert this week's pick (place)
//   POST { event_id, city?, week_start? }       -> upsert this week's pick (event)
//
// The body must include exactly one of place_id / event_id. The
// weekly_favorites schema enforces the XOR at the DB level (see
// _apply_weekly_favorite_events.sql); we mirror it here for a clean 400.
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';
import { weekStart } from '../_lib/weekly-favorite.js';

const PLACE_COLS = 'id,name,hero_photo,rating,review_count,area,city';
const EVENT_COLS = 'id,name,hero_photo,event_type,kind,day_of_week,time_label,area,city,place_id,place_name';
const SEL = `select=id,week_start,city,source,place_id,event_id,places(${PLACE_COLS}),events(${EVENT_COLS})`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const base = creds.supabaseUrl;
  const url = new URL(req.url, 'http://x');
  const city = (url.searchParams.get('city') || 'Tampa').slice(0, 80);
  const ws = weekStart(new Date());

  try {
    if (req.method === 'GET') {
      const cityF = `city=eq.${encodeURIComponent(city)}`;
      const curR = await fetch(
        `${base}/rest/v1/weekly_favorites?${cityF}&week_start=eq.${ws}&${SEL}`,
        { headers: sbHeaders(creds.serviceRoleKey) });
      const histR = await fetch(
        `${base}/rest/v1/weekly_favorites?${cityF}&order=week_start.desc&limit=12&${SEL}`,
        { headers: sbHeaders(creds.serviceRoleKey) });
      if (!curR.ok || !histR.ok) return json(res, 502, { error: 'Supabase read failed' });
      const current = (await curR.json())[0] || null;
      const history = await histR.json();
      return json(res, 200, { current, history });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const placeId = typeof body?.place_id === 'string' ? body.place_id.trim() : '';
      const eventId = typeof body?.event_id === 'string' ? body.event_id.trim() : '';
      if (!placeId && !eventId) return json(res, 400, { error: 'place_id or event_id required' });
      if (placeId && eventId) return json(res, 400, { error: 'pass only one of place_id / event_id' });
      const postCity = (body?.city || 'Tampa').slice(0, 80);
      const week = body?.week_start || ws;

      // Validate the target row exists + is visible.
      if (placeId) {
        const pR = await fetch(
          `${base}/rest/v1/places?id=eq.${encodeURIComponent(placeId)}&visible=eq.true&select=id`,
          { headers: sbHeaders(creds.serviceRoleKey) });
        if (!pR.ok || !(await pR.json()).length) {
          return json(res, 400, { error: 'unknown or hidden place_id' });
        }
      } else {
        const eR = await fetch(
          `${base}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}&visible=eq.true&select=id`,
          { headers: sbHeaders(creds.serviceRoleKey) });
        if (!eR.ok || !(await eR.json()).length) {
          return json(res, 400, { error: 'unknown or hidden event_id' });
        }
      }

      // The upsert must explicitly null the unused side so the XOR constraint
      // is satisfied even when the existing row referenced the other type.
      const row = {
        week_start: week,
        city: postCity,
        place_id: placeId || null,
        event_id: eventId || null,
        source: 'admin',
      };
      const r = await fetch(`${base}/rest/v1/weekly_favorites?on_conflict=week_start,city`, {
        method: 'POST',
        headers: sbHeaders(creds.serviceRoleKey, {
          Prefer: 'resolution=merge-duplicates,return=representation',
        }),
        body: JSON.stringify(row),
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
