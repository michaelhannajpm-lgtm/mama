// GET /api/places/photo?ref=<google photo resource name>&w=800
// 302-redirects to the Google Places (New) photo media URL with the key applied
// server-side, so the key never reaches the browser and we don't rehost Google imagery.
import { json } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return json(res, 500, { error: 'GOOGLE_PLACES_API_KEY not configured' });

  const ref = typeof req.query?.ref === 'string' ? req.query.ref : '';
  // resource name looks like: places/XXX/photos/YYY  — allow only that shape.
  if (!/^places\/[\w-]+\/photos\/[\w-]+$/.test(ref)) {
    return json(res, 400, { error: 'invalid photo ref' });
  }
  const w = Math.min(parseInt(req.query?.w, 10) || 800, 1600);
  const target = `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${w}&key=${key}`;
  res.statusCode = 302;
  res.setHeader('Location', target);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end();
}
