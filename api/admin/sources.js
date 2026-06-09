// GET /api/admin/sources — admin. All ingestion sources (with config) for management.
import { json } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';
import { makeSourceClient, loadSources } from '../_lib/ingestion/source-store.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { error: 'Supabase env not configured' });
  try {
    const sb = makeSourceClient(url, key);
    return json(res, 200, { ok: true, rows: await loadSources(sb, {}) });
  } catch (e) { return json(res, 502, { error: e?.message || 'list failed' }); }
}
