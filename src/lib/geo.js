// Small, framework-free geo helpers shared across events / places / moms.
// Pure functions so they can be unit-checked in isolation (geo.test.mjs).

const R_MILES = 3958.8; // Earth radius in miles
const toRad = (deg) => (deg * Math.PI) / 180;

const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);

// Great-circle distance in miles between two { lat, lng } points.
// Returns null if either point is missing usable coordinates.
export const haversineMiles = (a, b) => {
  if (!a || !b) return null;
  if (!isFiniteNum(a.lat) || !isFiniteNum(a.lng) || !isFiniteNum(b.lat) || !isFiniteNum(b.lng)) return null;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
};

// "1.2 mi away" — "Nearby" under 0.1, '' when unknown. Mirrors the existing
// distanceLabel in event-cards.js so both read identically.
export const formatMiles = (mi) => {
  if (!isFiniteNum(mi)) return '';
  if (mi < 0.1) return 'Nearby';
  return `${mi.toFixed(mi < 10 ? 1 : 0)} mi away`;
};

// A maps deep-link for "Get directions". Prefers exact coordinates; falls back
// to a freeform address/label search. Returns null when there's nothing to map.
export const mapsUrl = ({ lat, lng, address, label } = {}) => {
  // Exact coordinates → a precise pin (query=lat,lng).
  if (isFiniteNum(lat) && isFiniteNum(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  // Otherwise fall back to a freeform address / place-name search.
  const q = (address || label || '').trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
};
