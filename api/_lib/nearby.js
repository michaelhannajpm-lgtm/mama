// Pure ranking/shaping for the nearby-moms endpoint. Given raw mom_profiles
// rows + the requesting user, computes geodistance (reusing the ingestion
// haversine helper), scores + shapes each into a privacy-safe card, excludes
// self, ranks by (overlap − distance penalty), and slices to `limit`.
import { haversineMeters } from './ingestion/dedupe.js';
import { momCardFromRow } from './mom-card.js';

const METERS_PER_MILE = 1609.344;

const rankValue = (card) => {
  const penalty = card.distanceMi == null ? 0 : Math.min(card.distanceMi, 10) * 1.5;
  return card.overlap - penalty;
};

export const rankAndShape = (rows, user = {}, { limit = 24 } = {}) => {
  const selfAuth = user.auth_user_id || null;
  const selfSeed = user.seed_mom_id || null;
  const hasGeo = Number.isFinite(user.lat) && Number.isFinite(user.lng);

  const cards = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (selfAuth && row.auth_user_id === selfAuth) continue;
    if (selfSeed && row.id === selfSeed) continue;

    let distanceMi = null;
    if (hasGeo && Number.isFinite(row.home_lat) && Number.isFinite(row.home_lng)) {
      const meters = haversineMeters(user.lat, user.lng, row.home_lat, row.home_lng);
      distanceMi = Math.round((meters / METERS_PER_MILE) * 10) / 10;
    }
    cards.push(momCardFromRow(row, user, distanceMi));
  }

  cards.sort((a, b) => rankValue(b) - rankValue(a));
  return { total: cards.length, moms: cards.slice(0, Math.max(1, limit)) };
};
