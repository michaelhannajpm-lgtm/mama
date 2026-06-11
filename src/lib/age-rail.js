// Pure builder for the "Based On Your Child's Age" rail. No React/theme imports.
// Scores places + events against EACH of the user's kids (single-bucket profile)
// using the shared content-score scorers, then ranks by best cross-kid fit.

import { scorePlace, scoreEvent } from './content-score.js';

const PLACE_CATEGORY_KEYS =
  ['fun', 'sports', 'wellness', 'schools', 'childcare', 'extracurricular', 'camps', 'health'];

const STAGE_LABEL = {
  '0–1': 'Baby', '1–3': 'Toddler', '3–5': 'Preschooler',
  '5–8': 'Big kid', '8–12': 'Tween', '12–18': 'Teen',
};

const FIT_THRESHOLD = 35; // a child must score at least this for an item to count "for" them.

// Normalize the user's children into { name?, bucket, label }.
export const childList = (profile = {}) => {
  const rich = profile?.settings?.kids;
  if (Array.isArray(rich) && rich.length) {
    return rich.map((c) => {
      const bucket = c.age || '1–3';
      const name = (c.name || '').trim();
      return { name: name || undefined, bucket, label: name || STAGE_LABEL[bucket] || 'Kid' };
    });
  }
  const out = [];
  Object.entries(profile?.kidsAges || {}).forEach(([bucket, n]) => {
    for (let i = 0; i < (Number(n) || 0); i++) {
      out.push({ bucket, label: STAGE_LABEL[bucket] || 'Kid' });
    }
  });
  return out;
};

const flattenPlaces = (places) => {
  if (!places || typeof places !== 'object') return [];
  const seen = new Set();
  const out = [];
  for (const k of PLACE_CATEGORY_KEYS) {
    for (const r of (Array.isArray(places[k]) ? places[k] : [])) {
      if (r?.id != null && seen.has(r.id)) continue;
      if (r?.id != null) seen.add(r.id);
      out.push(r);
    }
  }
  return out;
};

const placePhoto = (p) => p.hero_photo || p.blob_url || p.url || null;
const ageLabelForBuckets = (buckets) =>
  buckets && buckets.length ? `${buckets[0]}${buckets.length > 1 ? '+' : ''} yrs` : '';

// Build a one-bucket profile so a scorer judges fit for a single child.
const childProfile = (profile, bucket) => ({ ...profile, kidsAges: { [bucket]: 1 } });

export const buildAgeRail = (profile = {}, places = {}, events = {}, { limit = 12 } = {}) => {
  const kids = childList(profile);
  if (!kids.length) return [];

  const eventList = [
    ...(Array.isArray(events?.thisWeek) ? events.thisWeek : []),
    ...(Array.isArray(events?.events) ? events.events : []),
    ...(Array.isArray(events?.recurring) ? events.recurring : []),
  ];

  const scoreFor = (item, scorer) => {
    let best = 0; const forChild = [];
    kids.forEach((kid, idx) => {
      const s = scorer(childProfile(profile, kid.bucket), item).score;
      if (s > best) best = s;
      if (s >= FIT_THRESHOLD) forChild.push(idx);
    });
    return { best, forChild };
  };

  const items = [];
  const seen = new Set();

  for (const p of flattenPlaces(places)) {
    const key = `place:${p.id}`;
    if (seen.has(key)) continue; seen.add(key);
    const { best, forChild } = scoreFor(p, scorePlace);
    if (best <= 0) continue;
    items.push({
      id: p.id, type: 'place', name: p.name, photo: placePhoto(p),
      ageLabel: ageLabelForBuckets(p.kid_ages || p.kidAges),
      reason: scorePlace(childProfile(profile, kids[forChild[0] ?? 0].bucket), p).reasons[0] || '',
      distance: p.distance || (p.area ? p.area : 'Near you'),
      score: best, forChild,
    });
  }

  for (const e of eventList) {
    const key = `event:${e.id}`;
    if (seen.has(key)) continue; seen.add(key);
    const { best, forChild } = scoreFor(e, scoreEvent);
    if (best <= 0) continue;
    items.push({
      id: e.id, type: 'event', name: e.name, photo: e.photo || null,
      ageLabel: ageLabelForBuckets(e.kidAges || e.kid_ages),
      reason: scoreEvent(childProfile(profile, kids[forChild[0] ?? 0].bucket), e).reasons[0] || '',
      when: e.recurring || e.time || 'Upcoming',
      score: best, forChild,
    });
  }

  return items.sort((a, b) => b.score - a.score).slice(0, limit);
};
