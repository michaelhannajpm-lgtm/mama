const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sameInstant = (a, b) => a && b && new Date(a).getTime() === new Date(b).getTime();
const sameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
};

// Returns { action: 'create'|'update'|'review', matchId }. Never duplicates on
// description/image change (only name/time/place/url drive the decision).
export const classifyEventCandidate = (cand, existing) => {
  // 1. Exact external id.
  const byId = existing.find(e => e.external_id && e.external_id === cand.externalId);
  if (byId) return { action: 'update', matchId: byId.id };

  // 2. Same normalized name + same start instant + same place.
  const byTriple = existing.find(e =>
    norm(e.name) === norm(cand.name) &&
    sameInstant(e.starts_at, cand.startsAt) &&
    (e.place_id || null) === (cand.placeId || null));
  if (byTriple) return { action: 'review', matchId: byTriple.id };

  // 3. Same source url + same start date.
  const byUrl = existing.find(e =>
    e.source_url && cand.sourceUrl && e.source_url === cand.sourceUrl &&
    sameDay(e.starts_at, cand.startsAt));
  if (byUrl) return { action: 'review', matchId: byUrl.id };

  return { action: 'create', matchId: null };
};
