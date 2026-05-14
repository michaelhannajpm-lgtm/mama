// POST /api/builder/webhook
// Receives progress events from the GitHub Action. HMAC-signed body.
// Inserts a row into builder_events. Idempotent on (session_id, payload.event_id) if event_id provided.
import { json, supabaseCreds, sbHeaders, isUuid } from '../_lib/supabase.js';
import { verify } from '../_lib/builderHmac.js';

const ALLOWED_KINDS = new Set([
  'prompt','log','file_edit','commit','tag','deploy','error','done','status',
]);

const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const secret = process.env.BUILDER_WEBHOOK_SECRET;
  if (!secret) return json(res, 500, { error: 'BUILDER_WEBHOOK_SECRET not set' });

  // We need the raw body for HMAC. Vercel parses JSON automatically only when
  // req.body is consumed; this endpoint reads the stream itself.
  const raw = await readRawBody(req).catch(() => '');
  const sig = req.headers['x-builder-signature'];
  if (!verify(raw, sig, secret)) return json(res, 401, { error: 'Bad signature' });

  let body;
  try { body = JSON.parse(raw); } catch { return json(res, 400, { error: 'Invalid JSON' }); }

  const { session_id, kind, payload } = body || {};
  if (!isUuid(session_id)) return json(res, 400, { error: 'Bad session_id' });
  if (!ALLOWED_KINDS.has(kind)) return json(res, 400, { error: 'Bad kind' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const insertUrl = `${creds.supabaseUrl}/rest/v1/builder_events`;
  const r = await fetch(insertUrl, {
    method: 'POST',
    headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=representation' },
    body: JSON.stringify({ session_id, kind, payload: payload ?? {} }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
  }
  const rows = await r.json().catch(() => []);
  return json(res, 201, { ok: true, event: rows?.[0] || null });
}
