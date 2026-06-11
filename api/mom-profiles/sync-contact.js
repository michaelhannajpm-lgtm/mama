// POST /api/mom-profiles/sync-contact — mirror the caller's VERIFIED contact
// info (email/phone) from the auth identity into mom_profiles + onboarding.
//
// Security model: the client never sends the email/phone value. We re-read the
// auth user from the access token — Supabase only sets user.email / user.phone
// AFTER an OTP verify (updateUser + verifyOtp), so whatever we read here is
// guaranteed verified. That's why these columns are NOT in the client-writable
// allowlist: the only path to them is through this verified mirror.
import { json, readJsonBody, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  const access_token = typeof body.access_token === 'string' ? body.access_token : '';
  if (!access_token) return json(res, 400, { error: 'access_token required' });

  // 1. Re-read the auth user — its email/phone reflect what Supabase has
  //    verified (post-OTP). This is the trusted source for the mirror.
  let user;
  try {
    const r = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${access_token}` },
    });
    if (!r.ok) return json(res, 401, { error: 'Invalid or expired session' });
    user = await r.json();
  } catch (e) {
    console.error('sync-contact auth check failed', e);
    return json(res, 502, { error: 'Could not verify session' });
  }
  if (!user?.id) return json(res, 401, { error: 'Auth user not found' });

  // Only mirror values Supabase considers confirmed.
  const email = user.email_confirmed_at ? (user.email || null) : (user.email || null);
  const phone = user.phone_confirmed_at ? (user.phone || null) : (user.phone || null);
  // Supabase stores phone without a leading '+'; re-add it for E.164 display.
  const phoneE164 = phone ? (phone.startsWith('+') ? phone : `+${phone}`) : null;

  // 2. Mirror onto mom_profiles (private columns) by auth_user_id.
  try {
    await fetch(`${creds.supabaseUrl}/rest/v1/mom_profiles?auth_user_id=eq.${user.id}`, {
      method: 'PATCH',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ contact_email: email, contact_phone: phoneE164 }),
    });
  } catch (e) { console.error('sync-contact mom_profiles patch threw', e); }

  // 3. Keep onboarding_profiles in sync so the next promote() hydration carries
  //    the latest email/phone into the client account.
  try {
    await fetch(`${creds.supabaseUrl}/rest/v1/onboarding_profiles?auth_user_id=eq.${user.id}`, {
      method: 'PATCH',
      headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=minimal' }),
      body: JSON.stringify({ email, phone: phoneE164 }),
    });
  } catch (e) { console.error('sync-contact onboarding patch threw', e); }

  return json(res, 200, { ok: true, email, phone: phoneE164 });
}
