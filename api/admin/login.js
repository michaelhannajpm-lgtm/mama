// POST /api/admin/login — exchange the shared password for a signed session
// token. The token (not the password) is what the dashboard stores and sends
// on every subsequent /api/admin/* request.
//
// Body: { password: string }
// 200 { token }          on success
// 401 { error }          wrong password
// 503 { error }          ADMIN_PASSWORD / ADMIN_SESSION_SECRET not configured
import { json, readJsonBody } from '../_lib/supabase.js';
import { checkPassword, signToken } from '../_lib/admin-auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return json(res, 503, { error: 'Admin auth not configured' });
  }

  const body = readJsonBody(req);
  if (!body || typeof body.password !== 'string') {
    return json(res, 400, { error: 'password required' });
  }

  if (!checkPassword(body.password)) {
    return json(res, 401, { error: 'Incorrect password' });
  }

  return json(res, 200, { token: signToken(Date.now()) });
}
