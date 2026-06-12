// POST /api/admin/otp/verify — exchange an email + code for a session token.
//
// Body: { email, code }
// Verifies the code with Supabase Auth (/auth/v1/verify, type 'email'); we
// discard the Supabase session and, if the email is still on the allowlist,
// mint our own HMAC admin token (carrying role/modules + 30-day expiry).
// 200 { token, admin: { email, role, modules } }  on success
// 400 { error }   bad/expired code   ·   401 not (or no longer) an admin
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../../_lib/supabase.js';
import { findAdmin, signToken } from '../../_lib/admin-auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds || !process.env.ADMIN_SESSION_SECRET) {
    return json(res, 503, { error: 'Admin auth not configured' });
  }

  const body = readJsonBody(req);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!email || !code) return json(res, 400, { error: 'Email and code are required' });

  try {
    // Supabase validates the one-time code. A non-200 means wrong/expired code.
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: sbHeaders(creds.serviceRoleKey),
      body: JSON.stringify({ type: 'email', email, token: code }),
    });
    if (!r.ok) {
      return json(res, 400, { error: 'Invalid or expired code. Request a new one.' });
    }

    // Code is valid. Re-check the allowlist (it may have changed since start)
    // and mint our own admin token. The Supabase session is intentionally unused.
    const admin = await findAdmin(email);
    if (!admin) return json(res, 401, { error: 'This email is not an admin.' });

    const token = signToken(admin);
    if (!token) return json(res, 503, { error: 'Admin auth not configured' });
    return json(res, 200, {
      token,
      admin: { email: admin.email, role: admin.role, modules: admin.modules },
    });
  } catch (e) {
    console.error('[otp/verify] error', e?.message);
    return json(res, 502, { error: 'Could not verify code' });
  }
}
