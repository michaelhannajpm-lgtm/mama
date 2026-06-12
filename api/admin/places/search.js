// POST /api/admin/places/search — admin-only Google Places lookup.
// SECURITY: requireAdmin bearer token.
// Body: { query: string, city?: string }
// Returns: { ok, configured, results: [{ id, name, address, lat, lng, mapsUri,
//            rating, ratingCount }] }
//
// Used by the event editor to search a real-world place and populate the
// event's lat/lng/address. Degrades gracefully when GOOGLE_PLACES_API_KEY is
// absent (200 { configured:false }) so the modal can show a setup hint instead
// of erroring. Reuses the ingestion Google Places connector (fetchRaw) so the
// field mask / retry / endpoint stay in one place.
import { json, readJsonBody } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { fetchRaw } from '../../_lib/ingestion/connectors/google-places.js';

const normalize = (p) => ({
  id: p.id || null,
  name: p.displayName?.text || p.displayName || '',
  address: p.formattedAddress || '',
  lat: p.location?.latitude ?? null,
  lng: p.location?.longitude ?? null,
  mapsUri: p.googleMapsUri || null,
  rating: p.rating ?? null,
  ratingCount: p.userRatingCount ?? null,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return json(res, 200, { ok: true, configured: false, results: [] });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  const query = (body.query || '').trim();
  if (!query) return json(res, 400, { error: 'query is required' });
  const city = (body.city || 'Tampa, FL').trim() || 'Tampa, FL';

  try {
    const raw = await fetchRaw({ query, city, limit: 8, apiKey });
    return json(res, 200, { ok: true, configured: true, results: raw.map(normalize).filter(r => r.lat != null && r.lng != null) });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Google Places lookup failed' });
  }
}
