// POST /api/internal/purge-deleted — hard-delete accounts past their 30-day
// soft-delete window. SECURITY: Bearer CRON_SECRET (or Vercel cron), same as
// the other api/internal/* workers.
//
// For each mom_profiles row with account_status='deleted' and
// deleted_at < now-30d:
//   1) scrub PII on the matching onboarding_profiles row (keep the shell)
//   2) best-effort delete the user's chat rows (messages / participants /
//      reactions) by auth user id
//   3) delete the mom_profiles row
//   4) delete the Supabase auth user via the admin API
// account_deletion_feedback is intentionally retained (it holds no PII).
import { timingSafeEqual } from 'node:crypto';
import { json, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { purgeCutoffIso } from '../_lib/account.js';

const authed = (req) => {
  const secret = process.env.CRON_SECRET || '';
  const hdr = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secret || !hdr || hdr.length !== secret.length) return false;
  try { return timingSafeEqual(Buffer.from(hdr), Buffer.from(secret)); } catch { return false; }
};

const del = (creds, path) =>
  fetch(`${creds.supabaseUrl}/rest/v1/${path}`, {
    method: 'DELETE',
    headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }),
  }).catch(() => null);

// Null out every PII-bearing column on the onboarding row but keep the shell so
// any referral / history FK stays intact. auth_user_id is cleared so the row
// can no longer be tied back to a person.
const scrubOnboarding = (creds, authUserId) =>
  fetch(`${creds.supabaseUrl}/rest/v1/onboarding_profiles?auth_user_id=eq.${authUserId}`, {
    method: 'PATCH',
    headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }),
    body: JSON.stringify({
      auth_user_id: null, first_name: null, email: null, phone: null,
      location: null, location_city: null, location_neighborhood: null,
      location_county: null, location_lat: null, location_lng: null,
      kids_ages: null, mom_types: null, values: null, interests: null,
    }),
  }).catch(() => null);

const deleteAuthUser = (creds, authUserId) =>
  fetch(`${creds.supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
    method: 'DELETE',
    headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${creds.serviceRoleKey}` },
  }).catch(() => null);

const purgeOne = async (creds, row) => {
  const authId = row.auth_user_id;
  if (authId) {
    await scrubOnboarding(creds, authId);
    // Best-effort chat cleanup (orphaned conversations are harmless).
    await del(creds, `message_reactions?user_id=eq.${authId}`);
    await del(creds, `messages?author_id=eq.${authId}`);
    await del(creds, `conversation_participants?user_id=eq.${authId}`);
  }
  await del(creds, `mom_profiles?id=eq.${row.id}`);
  if (authId) await deleteAuthUser(creds, authId);
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  if (!authed(req)) return json(res, 401, { error: 'unauthorized' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const cutoff = purgeCutoffIso();
  const r = await fetch(
    `${creds.supabaseUrl}/rest/v1/mom_profiles`
    + `?account_status=eq.deleted&deleted_at=lt.${encodeURIComponent(cutoff)}`
    + `&select=id,auth_user_id&limit=200`,
    { headers: sbHeaders(creds.serviceRoleKey) },
  );
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    console.error('purge-deleted select failed', r.status, text);
    return json(res, 502, { error: `Supabase ${r.status}` });
  }
  const rows = await r.json().catch(() => []);

  let purged = 0;
  for (const row of rows) {
    try { await purgeOne(creds, row); purged += 1; }
    catch (e) { console.error('purge-deleted row failed', row.id, e?.message); }
  }

  return json(res, 200, { ok: true, cutoff, eligible: rows.length, purged });
}
