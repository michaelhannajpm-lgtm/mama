// POST /api/internal/process-ingestion — runs one queued ingestion job.
// SECURITY: Bearer CRON_SECRET (or Vercel cron). For the queue worker + cron.
import { timingSafeEqual } from 'node:crypto';
import { json } from '../_lib/supabase.js';
import { processNextJob } from '../_lib/ingestion/process-jobs.js';

const authed = (req) => {
  const secret = process.env.CRON_SECRET || '';
  const hdr = (req.headers?.authorization || '').replace(/^Bearer\s+/i, '');
  if (!secret || !hdr || hdr.length !== secret.length) return false;
  try { return timingSafeEqual(Buffer.from(hdr), Buffer.from(secret)); } catch { return false; }
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST' && req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  if (!authed(req)) return json(res, 401, { error: 'unauthorized' });
  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    EVENTBRITE_API_TOKEN: process.env.EVENTBRITE_API_TOKEN, BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  };
  try { return json(res, 200, await processNextJob(env, { logger: console })); }
  catch (e) { return json(res, 502, { error: e?.message || 'process failed' }); }
}
