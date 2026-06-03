// POST /api/admin/mom-profiles/update — admin-only flag toggles.
// SECURITY: gated by requireAdmin — needs a valid admin bearer token (see _lib/admin-auth.js).
//
// Body: { id: uuid, patch: { verified?: boolean, visible?: boolean, blocked_global?: boolean } }
// Whitelists those three boolean flags only — any other key is rejected 400
// so this endpoint can't double as a generic profile-edit gateway.
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';

const ALLOWED_FLAGS = new Set(['verified', 'visible', 'blocked_global']);

const sanitizePatch = (patch) => {
  if (!patch || typeof patch !== 'object') return { error: 'patch object required' };
  const entries = Object.entries(patch);
  if (entries.length === 0) return { error: 'patch must include at least one field' };
  const out = {};
  for (const [k, v] of entries) {
    if (!ALLOWED_FLAGS.has(k)) return { error: `unknown patch field: ${k}` };
    if (typeof v !== 'boolean') return { error: `${k} must be a boolean` };
    out[k] = v;
  }
  return { patch: out };
};

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

  const id = typeof body.id === 'string' ? body.id : '';
  if (!isUuid(id)) return json(res, 400, { error: 'id must be a uuid' });

  const sanitized = sanitizePatch(body.patch);
  if (sanitized.error) return json(res, 400, { error: sanitized.error });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/mom_profiles?id=eq.${id}`;
    const r = await fetch(url, {
      method: 'PATCH',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
      body: JSON.stringify(sanitized.patch),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('admin/mom-profiles/update patch failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json().catch(() => []);
    if (!rows.length) return json(res, 404, { error: 'No mom_profile with that id' });
    return json(res, 200, { ok: true, row: rows[0] });
  } catch (e) {
    console.error('admin/mom-profiles/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
