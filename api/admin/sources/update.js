// POST /api/admin/sources/update — admin. Body one of:
//   { create: {<lifted source incl. config fields>} }
//   { id, patch: {<lifted fields>} }
//   { id, toggle: boolean }
//   { delete: id }
import { json, readJsonBody } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { makeSourceClient, validateSource, createSource, updateSource, setSourceEnabled, deleteSource, loadSource } from '../../_lib/ingestion/source-store.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json(res, 500, { error: 'Supabase env not configured' });
  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  try {
    const sb = makeSourceClient(url, key);

    if (body.delete) {
      await deleteSource(sb, String(body.delete));
      return json(res, 200, { ok: true, deleted: body.delete });
    }
    if (typeof body.toggle === 'boolean' && body.id) {
      await setSourceEnabled(sb, String(body.id), body.toggle);
      return json(res, 200, { ok: true });
    }
    if (body.create) {
      const err = validateSource(body.create);
      if (err) return json(res, 400, { error: err });
      await createSource(sb, body.create);
      return json(res, 200, { ok: true, row: await loadSource(sb, body.create.id, { fallback: false }) });
    }
    if (body.id && body.patch && typeof body.patch === 'object') {
      // validate the merged result by loading current + applying patch
      const current = await loadSource(sb, String(body.id), { fallback: false });
      if (!current) return json(res, 404, { error: 'No source with that id' });
      const merged = { ...current, ...body.patch, id: current.id };
      const err = validateSource(merged);
      if (err) return json(res, 400, { error: err });
      await updateSource(sb, String(body.id), body.patch);
      return json(res, 200, { ok: true, row: await loadSource(sb, String(body.id), { fallback: false }) });
    }
    return json(res, 400, { error: 'body must be one of: create / {id,patch} / {id,toggle} / {delete}' });
  } catch (e) {
    console.error('admin/sources/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
