// Shared helpers for Vercel API routes that talk to Supabase via REST + service role.

import { randomBytes } from 'node:crypto';

export const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  // Default to no-store, but don't clobber a caller-set caching policy
  // (public read routes like /api/places set their own public, max-age=...).
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

export const cleanText = (value, maxLength) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

export const isUuid = (v) =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const readJsonBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  return req.body;
};

export const supabaseCreds = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl, serviceRoleKey };
};

// True when service-role writes against seeded (source='seed') rows are allowed
// WITHOUT a real Supabase session — i.e. local dev / preview, or when explicitly
// opted in. Mirrors the gate on /api/dev/mom-profiles so the dev seeded-mom
// login can also edit those profiles. NEVER true in production.
export const devWritesAllowed = () =>
  process.env.ALLOW_SEEDED_MOM_LOGIN === 'true' ||
  process.env.NODE_ENV !== 'production' ||
  process.env.VERCEL_ENV === 'development' ||
  process.env.VERCEL_ENV === 'preview';

export const sbHeaders = (serviceRoleKey, extra = {}) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  ...extra,
});

// Fetch ALL rows from a PostgREST table in batches, bypassing the project's
// "Max rows" cap (Supabase default 1000). `query` is the querystring WITHOUT
// limit/offset (e.g. `select=*&order=created_at.desc`). Pages until a partial
// (or empty) batch is returned. `pageSize` should be <= the project max-rows.
export const fetchAllRows = async (creds, path, query, { pageSize = 1000, maxPages = 200 } = {}) => {
  const headers = sbHeaders(creds.serviceRoleKey);
  const all = [];
  for (let page = 0; page < maxPages; page++) {
    const url = `${creds.supabaseUrl}/rest/v1/${path}?${query}&limit=${pageSize}&offset=${page * pageSize}`;
    const r = await fetch(url, { headers });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`Supabase ${r.status}: ${t.slice(0, 200)}`); }
    const batch = await r.json();
    if (!Array.isArray(batch)) break;
    all.push(...batch);
    if (batch.length < pageSize) break; // last page
  }
  return all;
};

// Build a username base from a first name. Lowercased, alpha-num only, capped.
export const usernameBase = (firstName) => {
  const cleaned = (firstName || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
  return cleaned || 'mama';
};

export const randomHex = (len) => {
  if (!Number.isInteger(len) || len <= 0) return '';
  return randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
};
