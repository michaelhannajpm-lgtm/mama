// GET /api/admin/feedback — returns all feedback_submissions for the admin dashboard.
// SECURITY: NO authentication. Add auth before exposing publicly.
import { json, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/feedback_submissions?select=*&order=created_at.desc&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    return json(res, 200, { ok: true, count: rows.length, rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
