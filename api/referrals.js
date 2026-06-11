import {
  json, isUuid, supabaseCreds, sbHeaders, devWritesAllowed,
} from './_lib/supabase.js';

// GET /api/referrals — the current mom's referral summary:
//   { ok, code, count, friends: [{ name, photo, joinedAt, status }] }
//
// Auth: a real session via `Authorization: Bearer <jwt>`, or the dev seeded-mom
// login via `?seedMomId=<uuid>` (only when dev writes are allowed). Read-only;
// all access uses the service role (referrals is service-role-only, RLS-on).

// display_name is stored like "Sara." — show just the friendly first name.
const firstNameOf = (displayName) =>
  String(displayName || '').replace(/\.\s*$/, '').trim() || 'A mom';

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
  if (!me) return json(res, 200, { ok: true, code: null, count: 0, friends: [] });

  // Referrals where this mom is the referrer, newest first.
  const rr = await fetch(
    `${creds.supabaseUrl}/rest/v1/referrals?referrer_mom_id=eq.${me.id}&select=referred_mom_id,status,created_at&order=created_at.desc`,
    { headers: sbHeaders(creds.serviceRoleKey) },
  );
  const refs = rr.ok ? await rr.json().catch(() => []) : [];

  let friends = [];
  if (refs.length) {
    const ids = refs.map(r => r.referred_mom_id).filter(Boolean);
    const pr = await fetch(
      `${creds.supabaseUrl}/rest/v1/mom_profiles?id=in.(${ids.join(',')})&select=id,display_name,photos`,
      { headers: sbHeaders(creds.serviceRoleKey) },
    );
    const profs = pr.ok ? await pr.json().catch(() => []) : [];
    const byId = new Map(profs.map(p => [p.id, p]));
    friends = refs.map(r => {
      const p = byId.get(r.referred_mom_id) || {};
      return {
        name: firstNameOf(p.display_name),
        photo: Array.isArray(p.photos) ? (p.photos[0] || null) : null,
        joinedAt: r.created_at,
        status: r.status,
      };
    });
  }

  return json(res, 200, { ok: true, code: me.username || null, count: friends.length, friends });
}
