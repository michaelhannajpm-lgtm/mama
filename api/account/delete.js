// POST /api/account/delete — soft delete with a stored reason.
// Requires: { access_token, reason_code?, reason_note? }.
//
// Order matters: we INSERT the reason into account_deletion_feedback FIRST,
// then flip account_status='deleted'. If the status flip ever failed, we'd
// still have captured the reason rather than half-deleting silently. The
// feedback row survives the 30-day purge (it holds no PII).
//
// Soft delete = access removed immediately (the client signs out + the
// Reactivate/Deleted gate blocks re-entry), hidden from discovery now, real
// erasure handled later by api/internal/purge-deleted.
import { json, readJsonBody, supabaseCreds, sbHeaders, cleanText } from '../_lib/supabase.js';
import { loadOwnMomProfile, patchOwnMomProfile, hideFromDiscovery } from '../_lib/account.js';

// Allowlisted reason codes — mirrors the chips in DeleteAccountSheet. Anything
// off-list is coerced to 'other' so analytics stay clean.
const REASON_CODES = new Set([
  'found_my_people', 'not_enough_moms', 'too_many_notifications',
  'privacy', 'taking_a_break', 'other',
]);

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

  const reasonCode = REASON_CODES.has(body.reason_code) ? body.reason_code : 'other';
  const reasonNote = cleanText(body.reason_note, 280) || null;

  const owned = await loadOwnMomProfile(creds, access_token);
  if (owned.error) return json(res, owned.status, { error: owned.error });

  // Already deleted? Idempotent success — no duplicate feedback row.
  if (owned.row.account_status === 'deleted') {
    return json(res, 200, { ok: true, account_status: 'deleted' });
  }

  // 1) Capture the reason FIRST (best-effort INSERT). A failure here is logged
  //    but must not block the user's right to delete, so we proceed regardless.
  try {
    await fetch(`${creds.supabaseUrl}/rest/v1/account_deletion_feedback`, {
      method: 'POST',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }),
      body: JSON.stringify({
        auth_user_id: owned.user.id,
        username: owned.row.username || null,
        reason_code: reasonCode,
        reason_note: reasonNote,
      }),
    });
  } catch (e) {
    console.error('account/delete feedback insert failed', e);
  }

  // 2) Flip to deleted + stamp the purge clock + hide from discovery.
  const patched = await patchOwnMomProfile(creds, owned.user.id, {
    account_status: 'deleted',
    deleted_at: new Date().toISOString(),
    settings: hideFromDiscovery(owned.row.settings),
  });
  if (patched.error) return json(res, patched.status, { error: patched.error });

  return json(res, 200, { ok: true, account_status: 'deleted' });
}
