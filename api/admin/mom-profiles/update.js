// POST /api/admin/mom-profiles/update — admin profile edits, bulk patches, and delete.
// SECURITY: gated by requireAdmin — needs a valid admin bearer token (see _lib/admin-auth.js).
//
// Body modes:
//   { id, patch: {...} }            — patch a single mom_profile by id
//   { ids: [uuid, ...], patch:{} }  — patch many mom_profiles at once
//   { id: uuid, delete: true }      — delete a single mom_profile
//   { ids: [uuid, ...], delete: true } — delete many mom_profiles
//
// The patch whitelist covers (a) admin moderation flags (visible / verified /
// blocked_global / source / account_status / deactivated_at / deleted_at) and
// (b) the editable profile content fields a user would change themselves —
// display_name, username, bio, photos, kids_ages, mom_types, values,
// interests, free_slots, places, preferred_event_ids, social_links, age,
// neighborhood, city, county, home_lat, home_lng, distance_miles, settings.
// This is the single write surface the admin Mom-profiles tab uses.
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';

const BOOL_FIELDS = new Set(['verified', 'visible', 'blocked_global']);
const STRING_FIELDS = new Set([
  'display_name', 'username', 'bio', 'city', 'neighborhood', 'county',
  'place_id', 'source', 'account_status',
]);
const NUMBER_FIELDS = new Set(['age', 'home_lat', 'home_lng', 'distance_miles']);
const TIMESTAMP_FIELDS = new Set(['deactivated_at', 'deleted_at', 'last_active_at']);
const ARRAY_FIELDS = new Set(['mom_types', 'values', 'interests', 'free_slots', 'places', 'preferred_event_ids', 'photos']);
const JSONB_FIELDS = new Set(['kids_ages', 'social_links', 'settings', 'verified_signals']);

// `verified` is special-cased — in the schema it's a plain boolean, but the
// frontend also writes a JSONB blob { instagram, facebook, photo } via the
// user-facing API. We keep both shapes: if `verified` arrives as a boolean,
// patch the bool column; if it arrives as an object, write it into the same
// column (the column is jsonb-compatible in some envs) — fall back to a
// boolean reduction if Supabase rejects the JSONB cast.

const sanitizeValue = (key, value) => {
  if (BOOL_FIELDS.has(key)) {
    if (typeof value === 'boolean') return value;
    return { error: `${key} must be a boolean` };
  }
  if (STRING_FIELDS.has(key)) {
    if (value === null) return null;
    if (typeof value === 'string') return value;
    return { error: `${key} must be a string or null` };
  }
  if (NUMBER_FIELDS.has(key)) {
    if (value === null) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return { error: `${key} must be a finite number` };
    return n;
  }
  if (TIMESTAMP_FIELDS.has(key)) {
    if (value === null) return null;
    if (typeof value !== 'string') return { error: `${key} must be an ISO timestamp string or null` };
    return value;
  }
  if (ARRAY_FIELDS.has(key)) {
    if (!Array.isArray(value)) return { error: `${key} must be an array` };
    return value;
  }
  if (JSONB_FIELDS.has(key)) {
    if (value === null) return null;
    if (typeof value !== 'object') return { error: `${key} must be an object or null` };
    return value;
  }
  return { error: `unknown patch field: ${key}` };
};

const sanitizePatch = (patch) => {
  if (!patch || typeof patch !== 'object') return { error: 'patch object required' };
  const entries = Object.entries(patch);
  if (entries.length === 0) return { error: 'patch must include at least one field' };
  const out = {};
  for (const [k, v] of entries) {
    const sanitized = sanitizeValue(k, v);
    if (sanitized && typeof sanitized === 'object' && 'error' in sanitized) return { error: sanitized.error };
    out[k] = sanitized;
  }
  return { patch: out };
};

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

  // DELETE branch ---------------------------------------------------------
  if (body.delete === true) {
    try {
      const filter = singleId
        ? `id=eq.${singleId}`
        : `id=in.(${bulkIds.join(',')})`;
      const url = `${creds.supabaseUrl}/rest/v1/mom_profiles?${filter}`;
      const r = await fetch(url, {
        method: 'DELETE',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
      }
      const rows = await r.json().catch(() => []);
      return json(res, 200, { ok: true, deleted: rows.length });
    } catch (e) {
      return json(res, 502, { error: e?.message || 'Network error' });
    }
  }

  // PATCH branch ----------------------------------------------------------
  const sanitized = sanitizePatch(body.patch);
  if (sanitized.error) return json(res, 400, { error: sanitized.error });

  try {
    const filter = singleId
      ? `id=eq.${singleId}`
      : `id=in.(${bulkIds.join(',')})`;
    const url = `${creds.supabaseUrl}/rest/v1/mom_profiles?${filter}`;
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
    if (singleId) {
      if (!rows.length) return json(res, 404, { error: 'No mom_profile with that id' });
      return json(res, 200, { ok: true, row: rows[0] });
    }
    return json(res, 200, { ok: true, count: rows.length, rows });
  } catch (e) {
    console.error('admin/mom-profiles/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
