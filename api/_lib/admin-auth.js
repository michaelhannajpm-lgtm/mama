// Shared admin authentication for /api/admin/* routes.
//
// Single shared password → exchanged once (via /api/admin/login) for an
// HMAC-signed token. The password is never stored client-side or replayed;
// only the token travels, in the `Authorization: Bearer <token>` header.
//
// Secrets (server-only, NOT VITE_-prefixed so they never reach the browser):
//   ADMIN_PASSWORD        — the shared login password
//   ADMIN_SESSION_SECRET  — HMAC signing key for session tokens
import { createHmac, timingSafeEqual } from 'node:crypto';
import { json } from './supabase.js';

const adminSecrets = () => {
  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !sessionSecret) return null;
  return { password, sessionSecret };
};

// Constant-time string compare that won't throw on length mismatch.
const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
};

const base64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sign = (payloadB64, sessionSecret) =>
  base64url(createHmac('sha256', sessionSecret).update(payloadB64).digest());

// Verify the submitted password against ADMIN_PASSWORD. Returns false (never
// throws) when secrets are unconfigured — callers surface 503 separately.
export const checkPassword = (candidate) => {
  const secrets = adminSecrets();
  if (!secrets || typeof candidate !== 'string') return false;
  return safeEqual(candidate, secrets.password);
};

// Mint a session token: "<payloadB64url>.<hmacB64url>". `iat` is informational;
// there is no expiry by design (session lasts until explicit sign-out).
export const signToken = (iatMs) => {
  const secrets = adminSecrets();
  if (!secrets) return null;
  const payloadB64 = base64url(JSON.stringify({ r: 'admin', iat: iatMs ?? 0 }));
  return `${payloadB64}.${sign(payloadB64, secrets.sessionSecret)}`;
};

// Validate a token by recomputing its HMAC (constant-time compare).
export const verifyToken = (token) => {
  const secrets = adminSecrets();
  if (!secrets || typeof token !== 'string') return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  return safeEqual(sig, sign(payloadB64, secrets.sessionSecret));
};

// Gate for every admin handler. Returns true when the request carries a valid
// bearer token. Otherwise writes the appropriate error response and returns
// false — callers do `if (!requireAdmin(req, res)) return;`.
export const requireAdmin = (req, res) => {
  if (!adminSecrets()) {
    json(res, 503, { error: 'Admin auth not configured' });
    return false;
  }
  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!verifyToken(token)) {
    json(res, 401, { error: 'Unauthorized' });
    return false;
  }
  return true;
};
