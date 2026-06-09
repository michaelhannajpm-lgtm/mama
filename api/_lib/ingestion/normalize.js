const PRICE_MAP = {
  PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export const slugify = (name, city) => {
  const base = `${name} ${(city || '').split(',')[0]}`
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base;
};

// Confidence: more complete records score higher. Bounded (0,1].
const scoreConfidence = (p) => {
  let s = 0.4;
  if (p.formattedAddress) s += 0.2;
  if (p.location) s += 0.2;
  if (typeof p.rating === 'number') s += 0.1;
  if (p.websiteUri) s += 0.1;
  return Math.min(1, +s.toFixed(3));
};

export const normalizeGooglePlace = (p, { category, city }) => {
  const name = p.displayName?.text || 'Unknown place';
  return {
    name,
    slug: slugify(name, city),
    category,
    city,
    address: p.formattedAddress || null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    phone: p.internationalPhoneNumber || null,
    website: p.websiteUri || null,
    referenceUrl: p.googleMapsUri || null,
    googlePlaceId: p.id,
    googleMapsUrl: p.googleMapsUri || null,
    businessStatus: p.businessStatus || null,
    priceLevel: p.priceLevel != null ? (PRICE_MAP[p.priceLevel] ?? null) : null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : 0,
    tags: [],
    photos: (p.photos || []).slice(0, 5).map(ph => ({
      googleRef: ph.name,
      attribution: ph.authorAttributions?.[0]?.displayName || 'Google',
    })),
    sourceUrl: p.googleMapsUri || null,
    externalId: p.id,
    confidence: scoreConfidence(p),
  };
};
