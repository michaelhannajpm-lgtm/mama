// Google Places API (New) connector. Uses places:searchText with a field mask
// (cost control). Network calls live behind fetchRaw; parseSearchText is pure
// so it can be fixture-tested without hitting Google.
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.internationalPhoneNumber',
  'places.websiteUri', 'places.googleMapsUri', 'places.businessStatus',
  'places.priceLevel', 'places.photos',
].join(',');

export const parseSearchText = (body) => (body && Array.isArray(body.places) ? body.places : []);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// fetchRaw runs one query, returns raw Google place objects. Bounded retry/backoff.
export async function fetchRaw({ query, bias, limit = 20, apiKey, logger = console }) {
  const body = {
    textQuery: `${query} in Tampa, FL`,
    maxResultCount: Math.min(limit, 20),
    locationBias: bias ? { circle: { center: { latitude: bias.lat, longitude: bias.lng }, radius: bias.radiusM } } : undefined,
  };
  let attempt = 0;
  while (true) {
    attempt++;
    const r = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify(body),
    });
    if (r.ok) return parseSearchText(await r.json());
    if ((r.status === 429 || r.status >= 500) && attempt <= 3) {
      const wait = Number(r.headers.get('Retry-After')) * 1000 || attempt * 1000;
      logger.warn?.(`google-places ${r.status}, retry ${attempt} in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    const t = await r.text().catch(() => '');
    throw new Error(`google-places ${r.status}: ${t.slice(0, 200)}`);
  }
}
