// POST /api/admin/seed — runs the Phase 1 seed against the configured Supabase
// project. Same effect as `npm run seed` from the CLI, but driven from the
// admin dashboard.
// SECURITY: gated by requireAdmin — needs a valid admin bearer token (see _lib/admin-auth.js).
import { json, readJsonBody, supabaseCreds } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';
import { runSeed } from '../_lib/seed.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const body = readJsonBody(req) || {};
  const wantPlaces = Number.isFinite(body.places) ? Math.max(0, Math.min(500, body.places)) : 50;
  const wantEvents = Number.isFinite(body.events) ? Math.max(0, Math.min(500, body.events)) : 30;
  const wantMoms   = Number.isFinite(body.moms)   ? Math.max(0, Math.min(2000, body.moms))  : 200;
  const reset      = body.reset !== false; // default true

  try {
    const result = await runSeed({
      supabaseUrl: creds.supabaseUrl,
      serviceRoleKey: creds.serviceRoleKey,
      wantPlaces,
      wantEvents,
      wantMoms,
      reset,
    });
    return json(res, 200, { ok: true, result });
  } catch (e) {
    console.error('admin/seed failed', e);
    return json(res, 502, { error: e?.message || 'Seed failed' });
  }
}
