// POST /api/account/reactivate — undo a deactivation.
// Requires: { access_token }. Sets account_status='active', clears
// deactivated_at. Discovery visibility is governed by the user's own
// settings.privacy.discoverable, so we deliberately do NOT force it back on
// here — reactivating shouldn't silently re-expose someone who was hidden.
import { json, readJsonBody, supabaseCreds } from '../_lib/supabase.js';
import { loadOwnMomProfile, patchOwnMomProfile } from '../_lib/account.js';

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

  // Only a deactivated account reactivates here. A 'deleted' account must use
  // /api/account/restore (which enforces the 30-day window).
  if (owned.row.account_status === 'deleted') {
    return json(res, 409, { error: 'Account is pending deletion — use restore' });
  }

  const patched = await patchOwnMomProfile(creds, owned.user.id, {
    account_status: 'active',
    deactivated_at: null,
  });
  if (patched.error) return json(res, patched.status, { error: patched.error });

  return json(res, 200, { ok: true, account_status: 'active' });
}
