const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    return json(res, 500, { error: 'Waitlist backend is not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const email = cleanText(body.email, 254)?.toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return json(res, 400, { error: 'Valid email required' });
  }

  const payload = {
    first_name: cleanText(body.firstName, 80),
    email,
    city: cleanText(body.city, 120),
    audience: cleanText(body.audience, 80),
    source: cleanText(body.source, 80) || 'marketing-waitlist',
    user_agent: cleanText(req.headers['user-agent'], 300),
    referrer: cleanText(req.headers.referer, 500),
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/waitlist_signups`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 409) {
      return json(res, 200, { ok: true, duplicate: true });
    }

    if (!response.ok) {
      return json(res, 502, { error: 'Could not save waitlist signup' });
    }

    return json(res, 200, { ok: true });
  } catch {
    return json(res, 500, { error: 'Could not save waitlist signup' });
  }
}
