// Lookup seam over the bundled Tampa Bay dataset. Pure + synchronous today.
// FUTURE (Google Places): change ONLY this file — searchAreas/resolveArea call
// /api/places/* and map Place Details into the same AreaEntry shape; nearestArea
// can call a reverse-geocode proxy. No consumer changes required.
import { TAMPA_BAY_AREAS, POPULAR_AREA_IDS } from '../data/tampa-bay-areas.js';

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Full AreaEntry objects for the empty-state popular list.
export const POPULAR_AREAS = POPULAR_AREA_IDS
  .map((id) => TAMPA_BAY_AREAS.find((a) => a.id === id))
  .filter(Boolean);

// Up to `limit` entries matching `query` against label + city, ranked
// prefix-match first, then alphabetical. Empty query → [].
export const searchAreas = (query, limit = 8) => {
  const q = norm(query);
  if (!q) return [];
  const scored = [];
  for (const a of TAMPA_BAY_AREAS) {
    const hay = norm(`${a.label} ${a.city}`);
    const normLabel = norm(a.label);
    const idx = hay.indexOf(q);
    if (idx === -1) continue;
    // prefix of label = best (0), prefix elsewhere = 1, contained = 2
    // matchLen used as secondary: longer prefix overlap wins (more specific)
    const rank = normLabel.startsWith(q) ? 0 : idx === 0 ? 1 : 2;
    const matchLen = normLabel.startsWith(q) ? normLabel.length : 0;
    scored.push({ a, rank, matchLen });
  }
  // rank asc, then matchLen desc (longer prefix = more specific match wins), then alpha
  scored.sort((x, y) => x.rank - y.rank || y.matchLen - x.matchLen || x.a.label.localeCompare(y.a.label));
  return scored.slice(0, limit).map((s) => s.a);
};

// Resolve a stored id back to its full AreaEntry (hydration). null if unknown.
export const resolveArea = (id) =>
  TAMPA_BAY_AREAS.find((a) => a.id === id) || null;

// Nearest dataset entry to a GPS fix (squared-degree distance is fine at this
// scale). Always returns an entry (dataset is non-empty).
export const nearestArea = (lat, lng) => {
  let best = TAMPA_BAY_AREAS[0];
  let bestD = Infinity;
  for (const a of TAMPA_BAY_AREAS) {
    const d = (a.lat - lat) ** 2 + (a.lng - lng) ** 2;
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
};
