// POST /api/account/restore — undo a soft delete during the 30-day window.
// Requires: { access_token }. Valid only when account_status='deleted' AND
// deleted_at is within the last 30 days; otherwise 409 (the purge may have
// already run, or there's nothing to restore).
import { json, readJsonBody, supabaseCreds } from '../_lib/supabase.js';
import { loadOwnMomProfile, patchOwnMomProfile, withinRestoreWindow } from '../_lib/account.js';

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

  if (owned.row.account_status !== 'deleted') {
    return json(res, 409, { error: 'Account is not pending deletion' });
  }
  if (!withinRestoreWindow(owned.row.deleted_at)) {
    return json(res, 409, { error: 'Restore window has closed' });
  }

  const patched = await patchOwnMomProfile(creds, owned.user.id, {
    account_status: 'active',
    deleted_at: null,
  });
  if (patched.error) return json(res, patched.status, { error: patched.error });

  return json(res, 200, { ok: true, account_status: 'active' });
}
