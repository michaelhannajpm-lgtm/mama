import {
  json, cleanText, isUuid, readJsonBody, supabaseCreds, sbHeaders,
  usernameBase, randomHex,
} from '../_lib/supabase.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const phoneDigits = (raw) => (typeof raw === 'string' ? raw.replace(/\D/g, '') : '');

const ensureRowExists = async (creds, sessionId) => {
  const response = await fetch(
    `${creds.supabaseUrl}/rest/v1/onboarding_profiles?on_conflict=session_id`,
    {
      method: 'POST',
      headers: sbHeaders(creds.serviceRoleKey, {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify({ session_id: sessionId, current_step: 6 }),
    },
  );

  if (response.ok) return true;

  const text = await response.text().catch(() => '');
  console.error('onboarding/signup ensure row failed', response.status, text);
  return false;
};

// Try to attach the auth user to the row, retrying username on conflict.
const attachWithUsernameRetry = async (creds, sessionId, baseRow) => {
  const base = usernameBase(baseRow.first_name);
  const candidates = [base, `${base}${randomHex(4)}`, `${base}${randomHex(4)}`, `mama-${randomHex(8)}`];

  for (const username of candidates) {
    const response = await fetch(
      `${creds.supabaseUrl}/rest/v1/onboarding_profiles?session_id=eq.${sessionId}`,
      {
        method: 'PATCH',
        headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
        body: JSON.stringify({ ...baseRow, username }),
      },
    );

    if (response.ok) {
      const rows = await response.json().catch(() => []);
      return { row: rows[0] || null, username };
    }

    const text = await response.text().catch(() => '');
    // 23505 = unique_violation; if it's about username, retry.
    if (response.status === 409 || /username/i.test(text)) continue;

    console.error('onboarding/signup attach failed', response.status, text);
    return { row: null, error: 'Could not attach signup to profile' };
  }

  return { row: null, error: 'Could not pick a unique username' };
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

  const firstName = cleanText(body.firstName, 80);
  const method = body.method === 'phone' || body.method === 'email' ? body.method : null;
  const password = typeof body.password === 'string' ? body.password : '';
  const agreedTerms = body.agreedTerms === true;

  if (!firstName || firstName.length < 2) return json(res, 400, { error: 'First name required' });
  if (!method) return json(res, 400, { error: 'method must be "phone" or "email"' });
  if (password.length < 8) return json(res, 400, { error: 'Password must be at least 8 characters' });
  if (!agreedTerms) return json(res, 400, { error: 'Please accept the Terms and Community Pact' });

  let phone = null;
  let email = null;
  if (method === 'phone') {
    const digits = phoneDigits(body.phone);
    if (digits.length !== 10) return json(res, 400, { error: 'Valid 10-digit phone required' });
    phone = `+1${digits}`;
  } else {
    email = cleanText(body.email, 254)?.toLowerCase();
    if (!email || !EMAIL_RE.test(email)) return json(res, 400, { error: 'Valid email required' });
  }

  const rowReady = await ensureRowExists(creds, session_id);
  if (!rowReady) return json(res, 502, { error: 'Could not prepare profile' });

  // 1. Create the auth user via Supabase Auth REST.
  let authUserId;
  try {
    const authPayload = method === 'phone' ? { phone, password } : { email, password };
    const authRes = await fetch(`${creds.supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: sbHeaders(creds.serviceRoleKey),
      body: JSON.stringify(authPayload),
    });
    const authBody = await authRes.json().catch(() => ({}));
    if (!authRes.ok) {
      const message = authBody?.msg || authBody?.error_description || authBody?.error || 'Could not create account';
      const status = authRes.status === 422 ? 409 : authRes.status;
      return json(res, status, { error: message });
    }
    authUserId = authBody.id || authBody.user?.id;
    if (!authUserId) return json(res, 502, { error: 'Auth response missing user id' });
  } catch (e) {
    console.error('onboarding/signup auth call failed', e);
    return json(res, 502, { error: 'Could not reach auth service' });
  }

  // 2. Promote the onboarding row.
  const baseRow = {
    auth_user_id: authUserId,
    first_name: firstName,
    contact_method: method,
    phone,
    email,
    agreed_terms: agreedTerms,
    auth_provider: method,
    completed_at: new Date().toISOString(),
    current_step: 7,
  };

  const { row, username, error } = await attachWithUsernameRetry(creds, session_id, baseRow);
  if (!row) return json(res, 500, { error: error || 'Could not save profile' });

  return json(res, 200, {
    ok: true,
    auth_user_id: authUserId,
    username,
    first_name: firstName,
  });
}
