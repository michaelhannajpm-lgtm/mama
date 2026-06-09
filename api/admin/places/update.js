// POST /api/admin/places/update — admin-only place review/CRUD.
// SECURITY: requireAdmin bearer token.
// Body is one of:
//   { id, patch: {<editable fields>} }                 -> edit one place
//   { ids: [uuid], patch: { review_status?, visible? } } -> bulk status/visibility
//   { delete: uuid }                                    -> delete a place
//   { merge: { keepId, dropId } }                       -> repoint source_records, delete dropId
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';

const EDITABLE = new Set([
  'name','category','area','city','address','description','tags','website','reference_url',
  'phone','amenities','good_for','age_min','age_max','hero_photo','rating','badge',
  'lat','lng','business_status','price_level',
  'review_status','visible',
]);

const sanitize = (patch) => {
  if (!patch || typeof patch !== 'object') return { error: 'patch object required' };
  const out = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!EDITABLE.has(k)) return { error: `unknown field: ${k}` };
    out[k] = v;
  }
  if (out.review_status && !['needs_review','approved','rejected','archived'].includes(out.review_status)) {
    return { error: 'bad review_status' };
  }
  if (Object.keys(out).length === 0) return { error: 'patch must include at least one field' };
  return { patch: out };
};

const patchRows = async (creds, filter, patch) => {
  const url = `${creds.supabaseUrl}/rest/v1/places?${filter}`;
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
    // Delete (single)
    if (body.delete) {
      if (!isUuid(body.delete)) return json(res, 400, { error: 'delete must be a uuid' });
      const r = await fetch(`${creds.supabaseUrl}/rest/v1/places?id=eq.${body.delete}`, {
        method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey),
      });
      if (!r.ok) return json(res, 502, { error: `delete failed ${r.status}` });
      return json(res, 200, { ok: true, deleted: body.delete });
    }

    // Bulk delete
    if (Array.isArray(body.deleteIds)) {
      if (!body.deleteIds.length || !body.deleteIds.every(isUuid)) {
        return json(res, 400, { error: 'deleteIds must be a non-empty array of uuids' });
      }
      const inList = body.deleteIds.map(id => `"${id}"`).join(',');
      const r = await fetch(`${creds.supabaseUrl}/rest/v1/places?id=in.(${inList})`, {
        method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey),
      });
      if (!r.ok) { const t = await r.text().catch(() => ''); return json(res, 502, { error: `bulk delete failed ${r.status}: ${t.slice(0, 200)}` }); }
      return json(res, 200, { ok: true, deleted: body.deleteIds.length });
    }

    // Merge dropId into keepId. These are independent REST calls (no cross-table
    // transaction), so every call is error-checked and ordered so a mid-way
    // failure surfaces (502) rather than silently corrupting/partial-merging.
    if (body.merge) {
      const { keepId, dropId } = body.merge;
      if (!isUuid(keepId) || !isUuid(dropId)) return json(res, 400, { error: 'merge needs keepId+dropId uuids' });
      if (keepId === dropId) return json(res, 400, { error: 'cannot merge a place into itself' });

      const base = `${creds.supabaseUrl}/rest/v1`;
      // Throw on any non-2xx so the outer catch returns 502 instead of a false ok.
      const must = async (label, r) => {
        if (!r.ok) throw new Error(`merge ${label} ${r.status}: ${(await r.text().catch(() => '')).slice(0, 160)}`);
        return r;
      };

      // 1. Provenance: repoint source_records (unique on source_id,external_id,
      //    record_type — keep/drop have distinct external_ids, so no collision).
      await must('source_records', await fetch(`${base}/source_records?place_id=eq.${dropId}`, {
        method: 'PATCH', headers: sbHeaders(creds.serviceRoleKey), body: JSON.stringify({ place_id: keepId }),
      }));

      // 2. Categories: keep gains drop's memberships. PATCHing place_id would hit
      //    the (place_id,category_id) PK when both share a category, so instead
      //    upsert drop's categories onto keep (ignore dupes); drop's own rows are
      //    removed by the cascade in step 4.
      const catRes = await must('read categories', await fetch(
        `${base}/place_categories?select=category_id&place_id=eq.${dropId}`,
        { headers: sbHeaders(creds.serviceRoleKey) }));
      const cats = await catRes.json().catch(() => []);
      if (Array.isArray(cats) && cats.length) {
        await must('upsert categories', await fetch(`${base}/place_categories`, {
          method: 'POST',
          headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'resolution=ignore-duplicates' }),
          body: JSON.stringify(cats.map(c => ({ place_id: keepId, category_id: c.category_id }))),
        }));
      }

      // 3. Photos: preserve drop's gallery by repointing its NON-hero photos to
      //    keep. Drop's hero would collide with keep's hero (place_photos_one_hero
      //    partial-unique index), so it's left to be cascade-removed in step 4.
      await must('photos', await fetch(`${base}/place_photos?place_id=eq.${dropId}&is_hero=eq.false`, {
        method: 'PATCH', headers: sbHeaders(creds.serviceRoleKey), body: JSON.stringify({ place_id: keepId }),
      }));

      // 4. Delete drop; FK cascades clean up any remaining children.
      await must('delete', await fetch(`${base}/places?id=eq.${dropId}`, {
        method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey),
      }));

      return json(res, 200, { ok: true, merged: { keepId, dropId } });
    }

    // Bulk status/visibility
    if (Array.isArray(body.ids)) {
      if (!body.ids.every(isUuid)) return json(res, 400, { error: 'ids must be uuids' });
      const s = sanitize(body.patch);
      if (s.error) return json(res, 400, { error: s.error });
      const inList = body.ids.map(id => `"${id}"`).join(',');
      const rows = await patchRows(creds, `id=in.(${inList})`, s.patch);
      return json(res, 200, { ok: true, count: rows.length, rows });
    }

    // Single edit
    const id = typeof body.id === 'string' ? body.id : '';
    if (!isUuid(id)) return json(res, 400, { error: 'id must be a uuid' });
    const s = sanitize(body.patch);
    if (s.error) return json(res, 400, { error: s.error });
    const rows = await patchRows(creds, `id=eq.${id}`, s.patch);
    if (!rows.length) return json(res, 404, { error: 'No place with that id' });
    return json(res, 200, { ok: true, row: rows[0] });
  } catch (e) {
    console.error('admin/places/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
