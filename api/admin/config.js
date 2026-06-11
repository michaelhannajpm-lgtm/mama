// Admin app-config editor. SECURITY: requireAdmin bearer token.
//   GET  /api/admin/config                     -> { rows: [{key,value,updated_at}] }
//   POST /api/admin/config { key, value }       -> upsert one allowed config key
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';

// Only these keys are editable, each with its own validation/coercion.
const VALIDATORS = {
  default_places_radius_miles: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1 || n > 500) return { error: 'radius must be 1–500 miles' };
    return { value: Math.round(n) };
  },
  // Presence recency windows (seconds). online window must be shorter than away.
  presence_online_max_seconds: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 30 || n > 3600) return { error: 'online window must be 30–3600 seconds' };
    return { value: Math.round(n) };
  },
  presence_away_max_seconds: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 60 || n > 86400) return { error: 'away window must be 60–86400 seconds' };
    return { value: Math.round(n) };
  },
  // Whether the Verified badge also requires a linked social account (the
  // documented verified-only moat). Off ⇒ full profile completion alone verifies.
  verified_requires_social: (v) => {
    if (v === true || v === 'true' || v === 1 || v === '1')   return { value: true };
    if (v === false || v === 'false' || v === 0 || v === '0') return { value: false };
    return { error: 'must be true or false' };
  },
  // 1:1 DM free-tier message limit. Protected monetization lever — default 3
  // (see CLAUDE.md / premium-model.md). Editable here, but raising it weakens
  // Plus conversion; change deliberately.
  dm_free_message_limit: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1 || n > 50) return { error: 'message limit must be 1–50' };
    return { value: Math.round(n) };
  },
  // Go Mama Plus monthly price in USD. Display only — no real billing yet.
  plus_price_monthly: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 999) return { error: 'price must be 0–999' };
    return { value: Math.round(n * 100) / 100 };
  },
  // Go Mama Plus free-trial length in days.
  plus_trial_days: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 90) return { error: 'trial must be 0–90 days' };
    return { value: Math.round(n) };
  },
  // Whether new users default to seeing only verified moms in discovery.
  default_verified_only_discovery: (v) => boolVal(v),

  // ── Runtime client-cache policy ──────────────────────────────────────────
  // How often (seconds) the client re-syncs config from the DB. Floor of 10s
  // so a typo can't hammer the API; ceiling of one day.
  runtime_cache_ttl_seconds: (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 10 || n > 86400) return { error: 'must be 10–86400 seconds' };
    return { value: Math.round(n) };
  },
  // Master switch — when false the client cache is sticky (no TTL re-sync).
  runtime_cache_expires: (v) => boolVal(v),

  // ── JSON lookups (migrated taxonomy/vocabulary) ──────────────────────────
  // Each accepts a JSON string or an already-parsed value; stored as jsonb.
  family_values: (v) => jsonArray(v),
  activities:    (v) => jsonArray(v),
  mom_describes: (v) => jsonArray(v),
  kid_ages:      (v) => jsonArray(v),
  time_windows:  (v) => jsonArray(v),
  kid_stage:     (v) => jsonObject(v),
};

// Shared boolean coercion (true/'true'/1/'1' ↔ false/'false'/0/'0').
function boolVal(v) {
  if (v === true || v === 'true' || v === 1 || v === '1')   return { value: true };
  if (v === false || v === 'false' || v === 0 || v === '0') return { value: false };
  return { error: 'must be true or false' };
}

// Parse-if-string, then require the result to be the expected JSON container.
// Keeps storage valid jsonb and rejects empties so a fat-fingered save can't
// blank out a live lookup.
function parseJson(v) {
  if (typeof v === 'string') {
    try { return { ok: JSON.parse(v) }; }
    catch (e) { return { error: `invalid JSON: ${e.message}` }; }
  }
  return { ok: v };
}
function jsonArray(v) {
  const p = parseJson(v);
  if (p.error) return { error: p.error };
  if (!Array.isArray(p.ok)) return { error: 'must be a JSON array' };
  if (p.ok.length === 0) return { error: 'array cannot be empty' };
  return { value: p.ok };
}
function jsonObject(v) {
  const p = parseJson(v);
  if (p.error) return { error: p.error };
  if (!p.ok || typeof p.ok !== 'object' || Array.isArray(p.ok)) return { error: 'must be a JSON object' };
  if (Object.keys(p.ok).length === 0) return { error: 'object cannot be empty' };
  return { value: p.ok };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    if (req.method === 'GET') {
      const url = `${creds.supabaseUrl}/rest/v1/app_config?select=key,value,category,description,value_type,client_cacheable,cache_ttl_seconds,updated_at&order=category.asc,key.asc`;
      const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
      if (!r.ok) return json(res, 502, { error: `Supabase ${r.status}` });
      return json(res, 200, { rows: await r.json() });
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const key = body?.key;
      const validate = VALIDATORS[key];
      if (!validate) return json(res, 400, { error: `unknown config key: ${key}` });
      const checked = validate(body?.value);
      if (checked.error) return json(res, 400, { error: checked.error });

      const r = await fetch(`${creds.supabaseUrl}/rest/v1/app_config?on_conflict=key`, {
        method: 'POST',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify({ key, value: checked.value }),
      });
      const text = await r.text();
      if (!r.ok) return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
      return json(res, 200, { ok: true, row: JSON.parse(text || '[]')[0] || null });
    }

    return json(res, 405, { error: 'Method not allowed' });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
