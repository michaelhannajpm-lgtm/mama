import { sbHeaders } from './supabase.js';

// Shared referral read path for both `/api/referrals` (the mom's own summary)
// and `/api/admin/referrals` (the console's per-mom tab). Service-role only —
// `referrals` is RLS-on and never browser-accessible.

// display_name is stored like "Sara." — show just the friendly first name.
const firstNameOf = (displayName) =>
  String(displayName || '').replace(/\.\s*$/, '').trim() || 'A mom';

// Build the list of moms a given referrer brought in, newest first. Each
// invitee's `status` is derived LIVE from her current `verified` flag
// (joined → verified) rather than a stored column, so a reward keyed on
// verification stays correct with no separate write path. Returns
// `{ count, verifiedCount, friends: [{ id, name, photo, joinedAt, status }] }`.
export const loadReferralFriends = async (creds, referrerMomId) => {
  const rr = await fetch(
    `${creds.supabaseUrl}/rest/v1/referrals?referrer_mom_id=eq.${referrerMomId}&select=referred_mom_id,created_at&order=created_at.desc`,
    { headers: sbHeaders(creds.serviceRoleKey) },
  );
  const refs = rr.ok ? await rr.json().catch(() => []) : [];
  if (!refs.length) return { count: 0, verifiedCount: 0, friends: [] };

  const ids = refs.map((r) => r.referred_mom_id).filter(Boolean);
  const pr = ids.length
    ? await fetch(
        `${creds.supabaseUrl}/rest/v1/mom_profiles?id=in.(${ids.join(',')})&select=id,display_name,photos,verified`,
        { headers: sbHeaders(creds.serviceRoleKey) },
      )
    : null;
  const profs = pr && pr.ok ? await pr.json().catch(() => []) : [];
  const byId = new Map(profs.map((p) => [p.id, p]));

  const friends = refs.map((r) => {
    const p = byId.get(r.referred_mom_id) || {};
    const verified = p.verified === true;
    return {
      id: r.referred_mom_id,
      name: firstNameOf(p.display_name),
      photo: Array.isArray(p.photos) ? (p.photos[0] || null) : null,
      joinedAt: r.created_at,
      status: verified ? 'verified' : 'joined',
    };
  });
  const verifiedCount = friends.reduce((n, f) => n + (f.status === 'verified' ? 1 : 0), 0);
  return { count: friends.length, verifiedCount, friends };
};
