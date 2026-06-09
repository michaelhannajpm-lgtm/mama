// GET /api/events — public. Visible events only, place-visibility-gated.
// Returns { recurring: [...SUGGESTED_EVENTS shape], thisWeek: [...dated upcoming] }.
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';
import { splitEvents } from './_lib/events-shape.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=120');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const select = 'id,slug,name,kind,event_type,day_of_week,bucket,time_label,starts_at,ends_at,' +
      'recurring,place_id,place_name,city,area,tags,kid_ages,indoor,hue,hero_photo,going_count,visible,' +
      'places(name,area,lat,lng,hero_photo,visible)';
    const url = `${creds.supabaseUrl}/rest/v1/events` +
      `?select=${select}&visible=eq.true&order=starts_at.asc.nullslast&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    const { recurring, thisWeek } = splitEvents(rows, { now: new Date(), windowDays: 14 });
    return json(res, 200, { ok: true, count: rows.length, recurring, thisWeek });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
