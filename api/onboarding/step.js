import {
  json, cleanText, isUuid, readJsonBody, supabaseCreds, sbHeaders,
} from '../_lib/supabase.js';

const ALLOWED_PATCH_KEYS = new Set([
  'location', 'distance_miles', 'places_radius_miles',
  'location_place_id', 'location_city', 'location_neighborhood', 'location_county',
  'location_lat', 'location_lng',
  'kids_ages', 'mom_types', 'values', 'interests',
  'slots', 'places',
  // AboutYou v2 (2026-06-10) — 4-step carousel taxonomy.
  'stage', 'looking_for', 'describes',
]);

const sanitizePatch = (raw) => {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED_PATCH_KEYS.has(k)) continue;
    if (v === null || v === undefined) continue;
    if (k === 'location') {
      const t = cleanText(v, 200);
      if (t) out[k] = t;
    } else if (k === 'location_place_id' || k === 'location_city'
            || k === 'location_neighborhood' || k === 'location_county') {
      const t = cleanText(v, 120);
      if (t) out[k] = t;
    } else if (k === 'location_lat' || k === 'location_lng') {
      const n = Number(v);
      // Clamp to plausible Florida bounds; round to 6 dp.
      const okLat = k === 'location_lat' && n >= 24 && n <= 31;
      const okLng = k === 'location_lng' && n >= -88 && n <= -79;
      if (Number.isFinite(n) && (okLat || okLng)) out[k] = Math.round(n * 1e6) / 1e6;
    } else if (k === 'distance_miles' || k === 'places_radius_miles') {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0 && n <= 500) out[k] = Math.round(n);
    } else if (k === 'kids_ages') {
      if (typeof v === 'object' && !Array.isArray(v)) out[k] = v;
    } else if (k === 'onboarding_completed') {
      // Only ever flip true from the client; never write false here (the
      // column defaults false and the authed /complete endpoint owns it too).
      if (v === true) out[k] = true;
    } else if (Array.isArray(v)) {
      out[k] = v.filter((x) => typeof x === 'string').slice(0, 200);
    }
  }
  return out;
};

const fetchCurrentStep = async (creds, sessionId) => {
  let response;
  try {
    response = await fetch(
      `${creds.supabaseUrl}/rest/v1/onboarding_profiles?session_id=eq.${sessionId}&select=current_step&limit=1`,
      { headers: sbHeaders(creds.serviceRoleKey) },
    );
  } catch (e) {
    console.error('onboarding/step current step lookup failed', e);
    return null;
  }

  if (!response.ok) return null;
  const rows = await response.json().catch(() => []);
  const current = Number(rows[0]?.current_step);
  return Number.isInteger(current) ? current : null;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Onboarding backend is not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const session_id = body.session_id;
  if (!isUuid(session_id)) return json(res, 400, { error: 'Valid session_id (uuid) required' });

  const step = Number(body.step);
  if (!Number.isInteger(step) || step < 0 || step > 6) {
    return json(res, 400, { error: 'step must be an integer 0..6' });
  }

  const patch = sanitizePatch(body.patch);
  const currentStep = await fetchCurrentStep(creds, session_id);

  const payload = {
    session_id,
    current_step: Math.max(currentStep ?? 0, step),
    user_agent: cleanText(req.headers['user-agent'], 300),
    referrer: cleanText(req.headers.referer, 500),
    ...patch,
  };

  try {
    // Upsert keyed by session_id; merge-duplicates lets us PATCH existing rows.
    const response = await fetch(
      `${creds.supabaseUrl}/rest/v1/onboarding_profiles?on_conflict=session_id`,
      {
        method: 'POST',
        headers: sbHeaders(creds.serviceRoleKey, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      console.error('onboarding/step upsert failed', response.status, errBody);
      return json(res, 502, { error: 'Could not save step' });
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('onboarding/step exception', e);
    return json(res, 500, { error: 'Could not save step' });
  }
}
