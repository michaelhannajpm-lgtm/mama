// GET /api/admin/ingestion/jobs — admin. Recent ingestion jobs for status polling.
import { json } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { makeJobClient, listJobs } from '../../_lib/ingestion/jobs.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { error: 'Supabase env not configured' });
  try {
    const sb = makeJobClient(url, key);
    return json(res, 200, { ok: true, rows: await listJobs(sb, { limit: 50 }) });
  } catch (e) { return json(res, 502, { error: e?.message || 'list failed' }); }
}
