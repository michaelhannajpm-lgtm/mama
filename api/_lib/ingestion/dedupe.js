export const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const nameSimilar = (a, b) => {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

// Returns { action: 'create'|'update'|'review', matchId }.
export const classifyCandidate = (cand, existing) => {
  // 1. Exact external id.
  const byId = existing.find(e => e.google_place_id && e.google_place_id === cand.googlePlaceId);
  if (byId) return { action: 'update', matchId: byId.id };

  // 2. Same normalized name + same city.
  const byName = existing.find(e => norm(e.name) === norm(cand.name) && norm(e.city) === norm(cand.city));
  if (byName) return { action: 'review', matchId: byName.id };

  // 3. Geo ~75m + similar name.
  if (cand.lat != null && cand.lng != null) {
    const near = existing.find(e =>
      e.lat != null && e.lng != null &&
      haversineMeters(cand.lat, cand.lng, e.lat, e.lng) <= 75 &&
      nameSimilar(cand.name, e.name));
    if (near) return { action: 'review', matchId: near.id };
  }
  return { action: 'create', matchId: null };
};
