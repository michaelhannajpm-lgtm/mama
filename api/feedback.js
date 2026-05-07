// POST /api/feedback — receives feedback submissions from the /promo
// landing page's 6-question form. Inserts into Supabase
// `feedback_submissions` via service-role REST.
//
// Mirrors api/waitlist.js: no auth, JSON body, fire-and-forget.

const EMAIL_SAFE_USEFUL = new Set([
  'schedule', 'kid_age', 'match_pct', 'places', 'groups', 'verified',
]);

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const cleanText = (value, maxLength) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

// Accept arrays or comma-separated strings; whitelist against the
// known enum values. Drops anything we don't recognize.
const cleanUseful = (value) => {
  const arr = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(',') : []);
  const out = [];
  for (const v of arr) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (EMAIL_SAFE_USEFUL.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Feedback backend is not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const ratingRaw = body.rating;
  const ratingNum = typeof ratingRaw === 'number'
    ? ratingRaw
    : (typeof ratingRaw === 'string' ? Number(ratingRaw) : NaN);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 10) {
    return json(res, 400, { error: 'rating must be an integer 1-10' });
  }

  const name = cleanText(body.name, 80);
  if (!name) return json(res, 400, { error: 'name required' });

  const describe = cleanText(body.describe, 1000);
  if (!describe) return json(res, 400, { error: 'describe required' });

  const payload = {
    rating: ratingNum,
    describe,
    useful: cleanUseful(body.useful),
    confusing: cleanText(body.confusing, 2000),
    use_when: cleanText(body.use_when, 2000),
    missing: cleanText(body.missing, 2000),
    name,
    source: cleanText(body.source, 80) || 'promo',
    user_agent: cleanText(req.headers['user-agent'], 300),
    referrer: cleanText(req.headers.referer, 500),
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/feedback_submissions`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[feedback] supabase insert failed', response.status, text);
      return json(res, 502, { error: `Supabase ${response.status}: ${text.slice(0, 200)}` });
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('[feedback] threw', e);
    return json(res, 500, { error: 'Could not save feedback' });
  }
}
