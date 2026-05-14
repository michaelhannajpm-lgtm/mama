// Auth helpers for builder endpoints.
// - verifyJwt: calls Supabase /auth/v1/user with the caller's JWT; returns the user or null.
// - parseAllowlist / isAllowlisted: env-var-driven email allowlist (pure, tested).
// - requireBuilder: convenience wrapper used by API routes.
import { json } from './supabase.js';

export const parseAllowlist = (raw) =>
  (typeof raw === 'string' ? raw : '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const isAllowlisted = (email, list) => {
  if (!email || !Array.isArray(list) || list.length === 0) return false;
  return list.includes(String(email).toLowerCase());
};

const extractJwt = (req) => {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

export const verifyJwt = async (req) => {
  const jwt = extractJwt(req);
  if (!jwt) return null;
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${jwt}` },
  }).catch(() => null);
  if (!r || !r.ok) return null;
  const user = await r.json().catch(() => null);
  if (!user?.email) return null;
  return user;
};

// One-shot guard. Returns the user, or null after responding with an error.
export const requireBuilder = async (req, res) => {
  const user = await verifyJwt(req);
  if (!user) { json(res, 401, { error: 'Not signed in' }); return null; }
  const allowlist = parseAllowlist(process.env.BUILDER_ALLOWED_EMAILS);
  if (!isAllowlisted(user.email, allowlist)) {
    json(res, 403, { error: 'Email not on builder allowlist' });
    return null;
  }
  return user;
};
