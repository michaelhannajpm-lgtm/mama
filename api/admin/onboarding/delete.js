// POST /api/admin/onboarding/delete — delete one or many onboarding_profiles rows.
// SECURITY: gated by requireAdmin — needs a valid admin bearer token (see _lib/admin-auth.js).
//
// Body modes:
//   { id: uuid }            — delete a single onboarding profile
//   { ids: [uuid, ...] }    — bulk-delete many onboarding profiles
//
// Deleting an onboarding row does NOT touch Supabase Auth users or any linked
// mom_profiles row (auth_user_id is `on delete set null` on the profile side).
// This is the row the admin Onboarding grid manages, so a stray test / spam
// signup can be cleaned out of the funnel without side effects.
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';

const validIds = (ids) => Array.isArray(ids) && ids.length > 0 && ids.every(isUuid);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const singleId = typeof body.id === 'string' ? body.id : null;
  const bulkIds = Array.isArray(body.ids) ? body.ids : null;

  if (singleId && !isUuid(singleId)) return json(res, 400, { error: 'id must be a uuid' });
  if (bulkIds && !validIds(bulkIds)) return json(res, 400, { error: 'ids must be a non-empty array of uuids' });
  if (!singleId && !bulkIds) return json(res, 400, { error: 'id or ids required' });

  try {
    const filter = singleId
      ? `id=eq.${singleId}`
      : `id=in.(${bulkIds.join(',')})`;
    const url = `${creds.supabaseUrl}/rest/v1/onboarding_profiles?${filter}`;
    const r = await fetch(url, {
      method: 'DELETE',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('admin/onboarding/delete failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json().catch(() => []);
    return json(res, 200, { ok: true, deleted: rows.length });
  } catch (e) {
    console.error('admin/onboarding/delete threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
