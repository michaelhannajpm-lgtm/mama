// GET /api/admin/places — returns all places for the admin dashboard.
// SECURITY: gated by requireAdmin — needs a valid admin bearer token (see _lib/admin-auth.js).
import { json, supabaseCreds, fetchAllRows } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const select = '*,place_photos(id,url,blob_url,google_ref,source,attribution,is_hero,sort_order,fetch_status,fetch_attempted_at,fetch_error),' +
      'place_categories(category_id)';
    const rows = await fetchAllRows(creds, 'places', `select=${select}&order=created_at.desc`);
    return json(res, 200, { ok: true, count: rows.length, rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
