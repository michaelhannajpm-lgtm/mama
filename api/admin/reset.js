// POST /api/admin/reset — truncates the two admin-visible tables.
// SECURITY: NO authentication. Anyone with the URL + a network can wipe
// the database. Add auth before exposing publicly.
import { json, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

// Order matters: events FK references places, so wipe events first.
// mom_profiles is independent at this stage.
const TABLES = ['events', 'mom_profiles', 'onboarding_profiles', 'waitlist_signups', 'places'];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const result = {};
  for (const table of TABLES) {
    try {
      // Supabase PostgREST requires a filter on DELETE; "id=not.is.null"
      // matches every row that has an id (i.e. all of them).
      const r = await fetch(
        `${creds.supabaseUrl}/rest/v1/${table}?id=not.is.null`,
        {
          method: 'DELETE',
          headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
        },
      );
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        result[table] = { ok: false, status: r.status, error: text.slice(0, 200) };
        continue;
      }
      const rows = await r.json().catch(() => []);
      result[table] = { ok: true, deleted: rows.length };
    } catch (e) {
      result[table] = { ok: false, error: e?.message || 'Network error' };
    }
  }

  const allOk = Object.values(result).every(v => v.ok);
  return json(res, allOk ? 200 : 502, { ok: allOk, result });
}
