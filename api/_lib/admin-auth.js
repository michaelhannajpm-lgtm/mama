// Shared admin authentication for /api/admin/* routes.
//
// Admins sign in with a per-person email OTP delivered by Supabase Auth (see
// api/admin/otp/*). After Supabase validates the code, we mint our own
// HMAC-signed token carrying their identity + access:
//
//   token = "<payloadB64url>.<hmacB64url>"
//   payload = { email, role, modules, iat, exp }   (exp = iat + 30 days)
//
// Only the token travels, in `Authorization: Bearer <token>`. The allowlist of
// who may log in (and their role/modules) lives in app_config.admin_users.
//
// Secrets (server-only, NOT VITE_-prefixed so they never reach the browser):
//   ADMIN_SESSION_SECRET   — HMAC signing key for session tokens
//   ADMIN_BOOTSTRAP_EMAILS — optional comma-sep lockout-safety allowlist
import { createHmac, timingSafeEqual } from 'node:crypto';
import { json, supabaseCreds, sbHeaders } from './supabase.js';

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const sessionSecret = () => process.env.ADMIN_SESSION_SECRET || null;

// Constant-time string compare that won't throw on length mismatch.
const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
};

const base64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64url = (s) =>
  Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const sign = (payloadB64, secret) =>
  base64url(createHmac('sha256', secret).update(payloadB64).digest());

// ── Session tokens ──────────────────────────────────────────────────────────

// Mint a token for an admin: { email, role, modules } → signed, 30-day expiry.
export const signToken = (admin, nowMs = Date.now()) => {
  const secret = sessionSecret();
  if (!secret || !admin?.email) return null;
  const payload = {
    email: admin.email,
    role: admin.role || 'full',
    modules: Array.isArray(admin.modules) ? admin.modules : ['*'],
    iat: nowMs,
    exp: nowMs + TOKEN_TTL_MS,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
};

// Validate a token: recompute the HMAC (constant-time), check expiry, and
// return the decoded payload — or null if invalid/expired/tampered.
export const verifyToken = (token, nowMs = Date.now()) => {
  const secret = sessionSecret();
  if (!secret || typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payloadB64, secret))) return null;
  let payload;
  try { payload = JSON.parse(fromBase64url(payloadB64).toString('utf8')); } catch { return null; }
  if (!payload || typeof payload !== 'object' || typeof payload.email !== 'string') return null;
  if (typeof payload.exp === 'number' && nowMs > payload.exp) return null; // expired
  return payload;
};

// Gate for every admin handler. On success returns the admin payload object
// (truthy: { email, role, modules, ... }); otherwise writes the appropriate
// error response and returns false. Callers: `if (!requireAdmin(req,res)) return;`
// — and may capture the return value to read the current admin's identity.
export const requireAdmin = (req, res) => {
  if (!sessionSecret()) {
    json(res, 503, { error: 'Admin auth not configured' });
    return false;
  }
  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload) {
    json(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return payload;
};

// ── Allowlist (app_config.admin_users) ──────────────────────────────────────

const bootstrapAdmins = () =>
  (process.env.ADMIN_BOOTSTRAP_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    .map((email) => ({ email, role: 'full', modules: ['*'], addedBy: 'env' }));

const normalizeAdmin = (a) => ({
  email: String(a.email),
  role: a.role || 'full',
  modules: Array.isArray(a.modules) ? a.modules : ['*'],
  addedBy: a.addedBy || null,
  addedAt: a.addedAt || null,
});

// The full admin allowlist: the app_config.admin_users JSON merged with the
// optional ADMIN_BOOTSTRAP_EMAILS env (so a malformed/empty row can't lock
// everyone out). Returns [] only when both are empty/unreachable.
export const loadAllowlist = async () => {
  const creds = supabaseCreds();
  let rows = [];
  if (creds) {
    try {
      const url = `${creds.supabaseUrl}/rest/v1/app_config?key=eq.admin_users&select=value`;
      const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
      if (r.ok) {
        const body = await r.json();
        const v = body?.[0]?.value;
        if (Array.isArray(v)) rows = v.filter((a) => a && typeof a.email === 'string');
      }
    } catch { /* fall through to bootstrap */ }
  }
  const merged = rows.map(normalizeAdmin);
  const seen = new Set(merged.map((a) => a.email.toLowerCase()));
  for (const b of bootstrapAdmins()) if (!seen.has(b.email)) merged.push(normalizeAdmin(b));
  return merged;
};

// Case-insensitive allowlist lookup → { email, role, modules } or null.
export const findAdmin = async (email) => {
  if (typeof email !== 'string') return null;
  const target = email.trim().toLowerCase();
  if (!target) return null;
  const list = await loadAllowlist();
  return list.find((a) => a.email.toLowerCase() === target) || null;
};
