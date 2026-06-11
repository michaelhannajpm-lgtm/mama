// src/lib/home-feed.js
// Pure feed logic for the Home tab. No React / no theme import so it can be
// unit-checked in isolation (see the node assertion in the plan).
//
// Event shape (from /api/events via events-shape.js):
//   { id, name, place, time, tags, mi, photo, hue, recurring,
//     kind: 'dated' | <recurring>, startsAt: ISO|null, promoted?: bool }

import { scoreEvent, scorePlace } from './content-score.js';

// Display sort: promoted first, then soonest startsAt, then nearest.
export const rankActivities = (list = []) =>
  [...list].sort((a, b) => {
    const pa = a.promoted ? 0 : 1;
    const pb = b.promoted ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const ta = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
    const tb = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
    if (ta !== tb) return ta - tb;
    return (a.mi ?? Infinity) - (b.mi ?? Infinity);
  });

// Profile-aware display sort: promoted first, then by relevance to the user's
// kids/interests/familyTags, then soonest, then nearest. Falls back to the
// plain ranker when no profile is supplied.
export const rankActivitiesForUser = (list = [], profile = null) => {
  if (!profile) return rankActivities(list);
  return [...list].sort((a, b) => {
    const pa = a.promoted ? 0 : 1;
    const pb = b.promoted ? 0 : 1;
    if (pa !== pb) return pa - pb;
    const sb = scoreEvent(profile, b).score - scoreEvent(profile, a).score;
    if (sb !== 0) return sb;
    const ta = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
    const tb = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
    if (ta !== tb) return ta - tb;
    return (a.mi ?? Infinity) - (b.mi ?? Infinity);
  });
};

const sameDay = (d, ref) =>
  d.getFullYear() === ref.getFullYear() &&
  d.getMonth() === ref.getMonth() &&
  d.getDate() === ref.getDate();

// Split dated + recurring events into the four Home filter buckets.
// Time buckets nest: today ⊆ week ⊆ month. `others` = recurring series.
// `thisWeek` = dated events from the API; `recurring` = the API's recurring list.
export const bucketActivities = (thisWeek = [], recurring = [], now = new Date(), profile = null) => {
  const dated = (thisWeek || []).filter(e => e.kind === 'dated' && e.startsAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(startOfToday.getTime() + 7 * 86400000);      // next 7 days (exclusive)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);   // first of next month (exclusive)

  const inRange = (e, end) => {
    const t = new Date(e.startsAt);
    return t >= startOfToday && t < end;
  };
  const rank = (l) => rankActivitiesForUser(l, profile); // profile-aware when supplied

  return {
    today:  rank(dated.filter(e => sameDay(new Date(e.startsAt), startOfToday))),
    week:   rank(dated.filter(e => inRange(e, weekEnd))),
    month:  rank(dated.filter(e => inRange(e, monthEnd))),
    others: rank((recurring || []).filter(e => e.kind !== 'dated')),
  };
};

// Grouped /api/places payload → flat, de-duped, top-rated list.
// Mirrors LocalPicksTab's "top places" scoring: featured (by top_rank) first,
// then quality weighted by review volume.
const PLACE_CATEGORY_KEYS =
  ['fun', 'sports', 'wellness', 'schools', 'childcare', 'extracurricular', 'camps', 'health'];

const placeScore = (r) => (r.rating || 0) * Math.log10((r.review_count || 0) + 1);

export const pickTrendingPlaces = (places, limit = 8, profile = null) => {
  if (!places || typeof places !== 'object') return [];
  const seen = new Set();
  const all = [];
  for (const k of PLACE_CATEGORY_KEYS) {
    for (const r of (Array.isArray(places[k]) ? places[k] : [])) {
      if (r?.id != null) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
      }
      all.push(r);
    }
  }
  const featured = all
    .filter(r => r.is_featured)
    .sort((a, b) => (a.top_rank ?? 1e9) - (b.top_rank ?? 1e9) || (b.rating || 0) - (a.rating || 0));
  const featuredSet = new Set(featured);
  // Curated "featured" places stay pinned on top; the rest are ranked by
  // relevance to the user's kids/interests (when a profile is supplied),
  // falling back to quality×review-volume.
  const rest = all
    .filter(r => !featuredSet.has(r))
    .sort(profile
      ? (a, b) => (scorePlace(profile, b).score - scorePlace(profile, a).score) || (placeScore(b) - placeScore(a))
      : (a, b) => placeScore(b) - placeScore(a));
  return [...featured, ...rest].slice(0, limit);
};
