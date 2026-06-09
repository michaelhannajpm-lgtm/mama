// POST /api/admin/places/ingest-events — admin-only. Scrapes events from one
// place's website (the place_website connector), scoped to { placeId }.
import { json, readJsonBody, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { runEventIngestion } from '../../_lib/ingestion/runEventIngestion.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const body = readJsonBody(req);
  if (body === null || !isUuid(body.placeId)) return json(res, 400, { error: 'placeId (uuid) required' });

  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const counts = await runEventIngestion({
      sourceId: 'place-websites', placeId: body.placeId, allPlaces: true,
      limit: 50, env, logger: console,
    });
    return json(res, 200, { ok: true, counts });
  } catch (e) {
    console.error('ingest-events threw', e);
    return json(res, 502, { error: e?.message || 'ingestion failed' });
  }
}
