import {
  json, isUuid, supabaseCreds, sbHeaders, devWritesAllowed,
} from './_lib/supabase.js';
import { loadReferralFriends } from './_lib/referrals.js';

// GET /api/referrals — the current mom's referral summary:
//   { ok, code, count, verifiedCount, friends: [{ id, name, photo, joinedAt, status }] }
//
// `verifiedCount` drives the reward tiers (see `src/lib/referral-rewards.js`):
// only verified invitees count toward a perk. Auth: a real session via
// `Authorization: Bearer <jwt>`, or the dev seeded-mom login via
// `?seedMomId=<uuid>` (only when dev writes are allowed). Read-only; all access
// uses the service role (referrals is service-role-only, RLS-on).

// Resolve the caller's mom_profiles row ({ id, username }) from auth.
const resolveCaller = async (creds, { token, seedMomId }) => {
  if (token) {
    const ur = await fetch(`${creds.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: creds.serviceRoleKey, Authorization: `Bearer ${token}` },
    });
    if (!ur.ok) return { error: 401 };
    const user = await ur.json().catch(() => null);
    if (!user?.id) return { error: 401 };
    const mr = await fetch(
      `${creds.supabaseUrl}/rest/v1/mom_profiles?auth_user_id=eq.${user.id}&select=id,username`,
      { headers: sbHeaders(creds.serviceRoleKey) },
    );
    const rows = mr.ok ? await mr.json().catch(() => []) : [];
    return { me: rows[0] || null };
  }
  if (seedMomId && isUuid(seedMomId) && devWritesAllowed()) {
    const mr = await fetch(
      `${creds.supabaseUrl}/rest/v1/mom_profiles?id=eq.${seedMomId}&select=id,username`,
      { headers: sbHeaders(creds.serviceRoleKey) },
    );
    const rows = mr.ok ? await mr.json().catch(() => []) : [];
    return { me: rows[0] || null };
  }
  return { error: 401 };
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Backend not configured' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const url = new URL(req.url, 'http://localhost');
  const seedMomId = url.searchParams.get('seedMomId');

  const { me, error } = await resolveCaller(creds, { token, seedMomId });
  if (error) return json(res, error, { error: 'Auth required' });
  // No profile yet (anonymous / not promoted) — nothing to show, not an error.
  if (!me) return json(res, 200, { ok: true, code: null, count: 0, verifiedCount: 0, friends: [] });

  const { count, verifiedCount, friends } = await loadReferralFriends(creds, me.id);
  return json(res, 200, { ok: true, code: me.username || null, count, verifiedCount, friends });
}
