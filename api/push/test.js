// POST /api/push/test — send a test Web Push to the caller's OWN devices.
// Authed by the user's access_token (not the hook secret). Bypasses the
// per-category gate (it's an explicit "test my notifications" action), but
// still requires at least one saved subscription. Returns { sent, pruned }.
import { json, readJsonBody, supabaseCreds } from '../_lib/supabase.js';
import { sendToUser, pushConfigured } from '../_lib/push-send.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });
  if (!pushConfigured()) return json(res, 200, { ok: true, sent: 0, skipped: 'push-not-configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  const access_token = typeof body.access_token === 'string' ? body.access_token : '';
  if (!access_token) return json(res, 400, { error: 'access_token required' });

  // Verify the JWT → auth user id.
  let user;
  try {
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${access_token}` },
    });
    if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
    user = await r.json();
  } catch (e) {
    console.error('push/test auth check failed', e);
    return json(res, 502, { error: 'Could not verify session' });
  }
  if (!user?.id) return json(res, 401, { error: 'Auth user not found' });

  const { sent, pruned } = await sendToUser(creds, user.id, {
    title: 'Go Mama ✦',
    body: "It's working — this is a test notification.",
    url: '/prototype',
    tag: 'gomama-test',
  });
  return json(res, 200, { ok: true, sent, pruned });
}
