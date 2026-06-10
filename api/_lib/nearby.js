// Pure ranking/shaping for the nearby-moms endpoint. Given raw mom_profiles
// rows + the requesting user, computes geodistance (reusing the ingestion
// haversine helper), scores + shapes each into a privacy-safe card, excludes
// self, ranks by (overlap − location penalty + locality bonus), and slices to
// `limit`. Commonality (overlap, 0–100) always leads; location refines.
import { haversineMeters } from './ingestion/dedupe.js';
import { momCardFromRow } from './mom-card.js';

const METERS_PER_MILE = 1609.344;

// Distance penalty caps at 10 mi so a far-but-very-compatible mom is only
// modestly demoted (max −15 vs. up to +100 overlap).
const DISTANCE_PENALTY_PER_MILE = 1.5;
const MAX_PENALTY_MILES = 10;

const norm = (s) => String(s || '').trim().toLowerCase();
const sameNorm = (a, b) => !!a && norm(a) === norm(b);

// No coordinates? Fall back to administrative tiers so location still counts:
// same neighborhood ≫ same city ≫ same county ≫ elsewhere.
const adminPenalty = (user, row) => {
  if (sameNorm(user.neighborhood, row.neighborhood)) return 0;
  if (sameNorm(user.city, row.city)) return 3;
  if (sameNorm(user.county, row.county)) return 7;
  return 12;
};

// Small positive nudge for sharing the exact neighborhood/city — they'll
// actually cross paths. Kept below every commonality weight so it only breaks
// near-ties, never outranks a meaningfully better match.
const NEIGHBORHOOD_BONUS = 5;
const CITY_BONUS = 2;
const localityBonus = (user, row) => {
  if (sameNorm(user.neighborhood, row.neighborhood)) return NEIGHBORHOOD_BONUS;
  if (sameNorm(user.city, row.city)) return CITY_BONUS;
  return 0;
};

const rankValue = (card, user, row, distanceMi) => {
  const penalty = distanceMi == null
    ? adminPenalty(user, row)
    : Math.min(distanceMi, MAX_PENALTY_MILES) * DISTANCE_PENALTY_PER_MILE;
  return card.overlap - penalty + localityBonus(user, row);
};

export const rankAndShape = (rows, user = {}, { limit = 24 } = {}) => {
  const selfAuth = user.auth_user_id || null;
  const selfSeed = user.seed_mom_id || null;
  const hasGeo = Number.isFinite(user.lat) && Number.isFinite(user.lng);

  const scored = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (selfAuth && row.auth_user_id === selfAuth) continue;
    if (selfSeed && row.id === selfSeed) continue;

    let distanceMi = null;
    if (hasGeo && Number.isFinite(row.home_lat) && Number.isFinite(row.home_lng)) {
      const meters = haversineMeters(user.lat, user.lng, row.home_lat, row.home_lng);
      distanceMi = Math.round((meters / METERS_PER_MILE) * 10) / 10;
    }
    const card = momCardFromRow(row, user, distanceMi);
    scored.push({ card, rank: rankValue(card, user, row, distanceMi) });
  }

  scored.sort((a, b) => b.rank - a.rank);
  return { total: scored.length, moms: scored.slice(0, Math.max(1, limit)).map((s) => s.card) };
};
