// POST /api/admin/ingestion/enqueue — admin. Body { kind, sourceId, params? }.
// Enqueues a job and kicks the worker in the background (waitUntil).
import { waitUntil } from '@vercel/functions';
import { json, readJsonBody } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { getSource, getEventSource } from '../../_lib/ingestion/sources.js';
import { makeJobClient, enqueueJob } from '../../_lib/ingestion/jobs.js';
import { processNextJob } from '../../_lib/ingestion/process-jobs.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  const kind = body.kind;
  if (kind !== 'places' && kind !== 'events') return json(res, 400, { error: "kind must be 'places' or 'events'" });
  const sourceId = typeof body.sourceId === 'string' ? body.sourceId : '';
  const known = kind === 'places' ? getSource(sourceId) : getEventSource(sourceId);
  if (!known) return json(res, 400, { error: `unknown ${kind} source: ${sourceId}` });
  const params = (body.params && typeof body.params === 'object') ? body.params : {};

  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    EVENTBRITE_API_TOKEN: process.env.EVENTBRITE_API_TOKEN, BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  };
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const sb = makeJobClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const job = await enqueueJob(sb, { kind, sourceId, params });
    // Run it in the background so the request returns immediately.
    waitUntil(processNextJob(env, { logger: console }).catch(e => console.error('processNextJob:', e.message)));
    return json(res, 200, { ok: true, job });
  } catch (e) { return json(res, 502, { error: e?.message || 'enqueue failed' }); }
}
