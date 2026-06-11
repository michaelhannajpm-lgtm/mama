// GET /api/config — public. Returns app-level configuration for the client:
//   {
//     config:  { defaultPlacesRadiusMiles: 50, ... },   // flat scalar knobs (camelCase)
//     lookups: { family_values: [...], ... },            // migrated JSON vocab
//     cache:   { expires: true, ttlSeconds: 300 },       // client runtime-cache policy
//   }
// Backed by the app_config key/value table so everything is editable without a
// deploy. The client (src/lib/config-cache.js) re-syncs on `cache.ttlSeconds`.
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';

// app_config.key (snake) → response key (camel) + coercion, for scalar knobs.
const KEYS = {
  default_places_radius_miles: { out: 'defaultPlacesRadiusMiles', num: true },
  presence_online_max_seconds: { out: 'presenceOnlineMaxSeconds', num: true },
  presence_away_max_seconds:   { out: 'presenceAwayMaxSeconds',   num: true },
  verified_requires_social:    { out: 'verifiedRequiresSocial',   bool: true },
  dm_free_message_limit:       { out: 'dmFreeMessageLimit',       num: true },
  plus_price_monthly:          { out: 'plusPriceMonthly',         num: true },
  plus_trial_days:             { out: 'plusTrialDays',            num: true },
  default_verified_only_discovery: { out: 'defaultVerifiedOnlyDiscovery', bool: true },
};

const asBool = (v) => v === true || v === 'true';

export default async function handler(req, res) {
  // Short max-age: the client-side runtime cache (TTL-driven) is the real
  // control point, so the HTTP cache must not mask admin edits for long.
  res.setHeader('Cache-Control', 'public, max-age=30');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/app_config?select=key,value,value_type,client_cacheable`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();

    const config = {};
    const lookups = {};
    const cache = { expires: true, ttlSeconds: 300 };

    for (const row of rows) {
      // Runtime-cache policy.
      if (row.key === 'runtime_cache_ttl_seconds') {
        const n = Number(row.value);
        if (Number.isFinite(n) && n > 0) cache.ttlSeconds = n;
        continue;
      }
      if (row.key === 'runtime_cache_expires') { cache.expires = asBool(row.value); continue; }

      // Scalar knobs (camelCased into `config`).
      const meta = KEYS[row.key];
      if (meta) {
        config[meta.out] = meta.num ? Number(row.value)
          : meta.bool ? asBool(row.value)
          : row.value;
        continue;
      }

      // JSON lookups (only those flagged client-cacheable are exposed).
      if (row.value_type === 'json' && row.client_cacheable !== false) {
        lookups[row.key] = row.value;
      }
    }

    return json(res, 200, { ok: true, config, lookups, cache });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
