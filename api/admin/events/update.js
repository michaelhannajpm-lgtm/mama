// POST /api/admin/events/update — admin-only event review/CRUD.
// SECURITY: requireAdmin bearer token.
// Body is one of:
//   { id, patch: {<editable fields>} }                     -> edit one event
//   { ids: [uuid], patch: { review_status?, visible? } }   -> bulk status/visibility
//   { delete: uuid }                                        -> delete an event
//   { placeId, patch: { review_status?, visible? } }       -> cascade to a place's events
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';

const EDITABLE = new Set([
  'name','event_type','kind','description','place_id','place_name','area','city',
  'starts_at','ends_at','day_of_week','bucket','time_label','recurring','website','source_url',
  'tags','kid_ages','indoor','hue','age_min','age_max','price_summary','hero_photo','going_count',
  'review_status','visible',
]);

const sanitize = (patch) => {
  if (!patch || typeof patch !== 'object') return { error: 'patch object required' };
  const out = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!EDITABLE.has(k)) return { error: `unknown field: ${k}` };
    out[k] = v;
  }
  if (out.review_status && !['needs_review','approved','rejected','archived'].includes(out.review_status)) return { error: 'bad review_status' };
  if (out.kind && !['recurring','dated'].includes(out.kind)) return { error: 'bad kind' };
  if (out.place_id && !isUuid(out.place_id)) return { error: 'place_id must be a uuid' };
  if (Object.keys(out).length === 0) return { error: 'patch must include at least one field' };
  return { patch: out };
};

const patchRows = async (creds, filter, patch) => {
  const url = `${creds.supabaseUrl}/rest/v1/events?${filter}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text || '[]');
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

  try {
    if (body.delete) {
      if (!isUuid(body.delete)) return json(res, 400, { error: 'delete must be a uuid' });
      const r = await fetch(`${creds.supabaseUrl}/rest/v1/events?id=eq.${body.delete}`, { method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey) });
      if (!r.ok) return json(res, 502, { error: `delete failed ${r.status}` });
      return json(res, 200, { ok: true, deleted: body.delete });
    }

    // Bulk delete
    if (Array.isArray(body.deleteIds)) {
      if (!body.deleteIds.length || !body.deleteIds.every(isUuid)) {
        return json(res, 400, { error: 'deleteIds must be a non-empty array of uuids' });
      }
      const inList = body.deleteIds.map(id => `"${id}"`).join(',');
      const r = await fetch(`${creds.supabaseUrl}/rest/v1/events?id=in.(${inList})`, { method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey) });
      if (!r.ok) { const t = await r.text().catch(() => ''); return json(res, 502, { error: `bulk delete failed ${r.status}: ${t.slice(0, 200)}` }); }
      return json(res, 200, { ok: true, deleted: body.deleteIds.length });
    }

    // Cascade to all of a place's events (publish/hide).
    if (body.placeId) {
      if (!isUuid(body.placeId)) return json(res, 400, { error: 'placeId must be a uuid' });
      const s = sanitize(body.patch);
      if (s.error) return json(res, 400, { error: s.error });
      const rows = await patchRows(creds, `place_id=eq.${body.placeId}`, s.patch);
      return json(res, 200, { ok: true, count: rows.length, rows });
    }

    if (Array.isArray(body.ids)) {
      if (!body.ids.every(isUuid)) return json(res, 400, { error: 'ids must be uuids' });
      const s = sanitize(body.patch);
      if (s.error) return json(res, 400, { error: s.error });
      const inList = body.ids.map(id => `"${id}"`).join(',');
      const rows = await patchRows(creds, `id=in.(${inList})`, s.patch);
      return json(res, 200, { ok: true, count: rows.length, rows });
    }

    const id = typeof body.id === 'string' ? body.id : '';
    if (!isUuid(id)) return json(res, 400, { error: 'id must be a uuid' });
    const s = sanitize(body.patch);
    if (s.error) return json(res, 400, { error: s.error });
    const rows = await patchRows(creds, `id=eq.${id}`, s.patch);
    if (!rows.length) return json(res, 404, { error: 'No event with that id' });
    return json(res, 200, { ok: true, row: rows[0] });
  } catch (e) {
    console.error('admin/events/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
