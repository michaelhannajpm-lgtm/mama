// POST /api/account/deactivate — reversible pause.
// Requires: { access_token }. Sets account_status='deactivated', stamps
// deactivated_at, and hides the mom from discovery. The user is signed out
// client-side; on next login the Reactivate gate blocks app access until she
// reactivates. See the design spec for the full flow.
import { json, readJsonBody, supabaseCreds } from '../_lib/supabase.js';
import { loadOwnMomProfile, patchOwnMomProfile, hideFromDiscovery } from '../_lib/account.js';

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
  if (!access_token) return json(res, 400, { error: 'access_token required' });

  const owned = await loadOwnMomProfile(creds, access_token);
  if (owned.error) return json(res, owned.status, { error: owned.error });

  const patched = await patchOwnMomProfile(creds, owned.user.id, {
    account_status: 'deactivated',
    deactivated_at: new Date().toISOString(),
    settings: hideFromDiscovery(owned.row.settings),
  });
  if (patched.error) return json(res, patched.status, { error: patched.error });

  return json(res, 200, { ok: true, account_status: 'deactivated' });
}
