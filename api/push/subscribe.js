// POST /api/push/subscribe — store a browser's web-push subscription for the
// signed-in mom. Keyed by endpoint (unique) so re-subscribing is idempotent.
// The sending side (deferred to the push-delivery work) reads push_subscriptions
// to target pushes. Service-role only; soft-fails without erroring the UI.
import { json, readJsonBody, supabaseCreds, sbHeaders, cleanText } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  const access_token = typeof body.access_token === 'string' ? body.access_token : '';
  const sub = body.subscription;
  if (!access_token) return json(res, 400, { error: 'access_token required' });
  const endpoint = cleanText(sub?.endpoint, 1000);
  const p256dh = cleanText(sub?.keys?.p256dh, 300);
  const auth = cleanText(sub?.keys?.auth, 300);
  if (!endpoint || !p256dh || !auth) {
    return json(res, 400, { error: 'subscription { endpoint, keys.p256dh, keys.auth } required' });
  }

  // Verify the JWT → auth user id.
  let user;
  try {
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${access_token}` },
    });
    if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
    user = await r.json();
  } catch (e) {
    console.error('push/subscribe auth check failed', e);
    return json(res, 502, { error: 'Could not verify session' });
  }
  if (!user?.id) return json(res, 401, { error: 'Auth user not found' });

  const payload = {
    auth_user_id: user.id,
    endpoint,
    p256dh,
    auth,
    user_agent: cleanText(req.headers['user-agent'], 300),
  };

  try {
    // Upsert on the unique endpoint so re-subscribing the same browser updates
    // (keys can rotate) rather than erroring on the unique constraint.
    const r = await fetch(
      `${creds.supabaseUrl}/rest/v1/push_subscriptions?on_conflict=endpoint`,
      {
        method: 'POST',
        headers: sbHeaders(creds.serviceRoleKey, {
          Prefer: 'resolution=merge-duplicates,return=minimal',
        }),
        body: JSON.stringify(payload),
      },
    );
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('push/subscribe upsert failed', r.status, text);
      return json(res, 502, { error: `Supabase ${r.status}` });
    }
    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('push/subscribe threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
