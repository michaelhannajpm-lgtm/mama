// GET /api/builder/sessions             → list caller's sessions (recent first, limit 50)
// GET /api/builder/sessions?id=<uuid>   → that session + its events for hydration
import { json, supabaseCreds, sbHeaders, isUuid } from '../_lib/supabase.js';
import { requireBuilder } from '../_lib/builderAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireBuilder(req, res);
  if (!user) return; // requireBuilder already responded

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const url = new URL(req.url, 'http://x');
  const id = url.searchParams.get('id');

  if (id) {
    if (!isUuid(id)) return json(res, 400, { error: 'Bad id' });
    // Fetch session
    const sUrl = `${creds.supabaseUrl}/rest/v1/builder_sessions?id=eq.${id}&created_by_email=eq.${encodeURIComponent(user.email)}&select=*`;
    const sr = await fetch(sUrl, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!sr.ok) return json(res, 502, { error: 'Supabase session fetch failed' });
    const sessions = await sr.json();
    if (!sessions.length) return json(res, 404, { error: 'Not found' });
    // Fetch events for this session, oldest first
    const eUrl = `${creds.supabaseUrl}/rest/v1/builder_events?session_id=eq.${id}&order=ts.asc&select=*&limit=2000`;
    const er = await fetch(eUrl, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!er.ok) return json(res, 502, { error: 'Supabase events fetch failed' });
    const events = await er.json();
    return json(res, 200, { session: sessions[0], events });
  }

  // List sessions
  const listUrl = `${creds.supabaseUrl}/rest/v1/builder_sessions?created_by_email=eq.${encodeURIComponent(user.email)}&order=updated_at.desc&select=*&limit=50`;
  const r = await fetch(listUrl, { headers: sbHeaders(creds.serviceRoleKey) });
  if (!r.ok) return json(res, 502, { error: 'Supabase list failed' });
  const sessions = await r.json();
  return json(res, 200, { sessions });
}
