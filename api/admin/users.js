// GET /api/admin/users — lists Supabase Auth users for the admin console.
// SECURITY: gated by requireAdmin (admin bearer token). Uses the GoTrue Admin
// API with the service-role key — this NEVER touches the browser.
//
// Returns a slimmed, paginated view of auth.users. Pages the GoTrue admin
// endpoint (per_page=200) up to a sane cap so an early-stage app shows everyone
// without an unbounded crawl.
import { json, supabaseCreds, sbHeaders } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';

const PER_PAGE = 200;
const MAX_PAGES = 25; // 5,000 users cap — plenty for now, avoids runaway loops.

// Map a GoTrue user into the slim shape the console renders.
const toUi = (u) => {
  const meta = u.app_metadata || {};
  const confirmedAt = u.email_confirmed_at || u.phone_confirmed_at || u.confirmed_at || null;
  return {
    id: u.id,
    email: u.email || null,
    phone: u.phone || null,
    provider: meta.provider || (u.is_anonymous ? 'anonymous' : null),
    providers: Array.isArray(meta.providers) ? meta.providers : (meta.provider ? [meta.provider] : []),
    displayName: u.user_metadata?.full_name || u.user_metadata?.name || null,
    createdAt: u.created_at || null,
    lastSignInAt: u.last_sign_in_at || null,
    confirmed: !!confirmedAt,
    isAnonymous: !!u.is_anonymous,
    banned: !!(u.banned_until && new Date(u.banned_until) > new Date()),
  };
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const all = [];
    let page = 1;
    for (; page <= MAX_PAGES; page++) {
      const url = `${creds.supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${PER_PAGE}`;
      const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        return json(res, 502, { error: `GoTrue ${r.status}: ${text.slice(0, 200)}` });
      }
      const body = await r.json();
      const batch = Array.isArray(body?.users) ? body.users : [];
      all.push(...batch);
      if (batch.length < PER_PAGE) break; // last page
    }

    const users = all.map(toUi);
    // Aggregate provider + status counts for the section's stat tiles.
    const byProvider = {};
    let anonymous = 0; let confirmed = 0;
    for (const u of users) {
      const key = u.provider || 'unknown';
      byProvider[key] = (byProvider[key] || 0) + 1;
      if (u.isAnonymous) anonymous++;
      if (u.confirmed) confirmed++;
    }

    return json(res, 200, {
      ok: true,
      count: users.length,
      truncated: page > MAX_PAGES,
      stats: { total: users.length, anonymous, confirmed, byProvider },
      users,
    });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase auth' });
  }
}
