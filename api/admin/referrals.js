// GET /api/admin/referrals?momId=<uuid> — the referral list for one mom, for
// the console's mom-profile Referrals tab.
// SECURITY: gated by requireAdmin (admin bearer token). Service-role read only;
// `referrals` is RLS-on and never browser-accessible.
//
// Returns { ok, count, verifiedCount, friends: [{ id, name, photo, joinedAt, status }] }
// — the same shape as `/api/referrals`. `verifiedCount` feeds the reward-tier
// model (src/lib/referral-rewards.js); status is derived live from each
// invitee's `verified` flag.
import { json, isUuid, supabaseCreds } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';
import { loadReferralFriends } from '../_lib/referrals.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Backend not configured' });

  const url = new URL(req.url, 'http://localhost');
  const momId = url.searchParams.get('momId');
  if (!momId || !isUuid(momId)) return json(res, 400, { error: 'Valid momId required' });

  const { count, verifiedCount, friends } = await loadReferralFriends(creds, momId);
  return json(res, 200, { ok: true, count, verifiedCount, friends });
}
