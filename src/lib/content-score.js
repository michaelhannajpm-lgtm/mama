// ==========================================================================
// content-score — profile-aware relevance scoring for EVENTS, PLACES, and
// GROUP DISCUSSIONS, mirroring the mom matcher (api/_lib/match.js). Pure, no
// I/O, runs client-side against the profile already in React state.
//
// Two universal signals power every content type:
//   1. Kid-age fit  — the content's age range vs the user's kids' ages.
//   2. Tag overlap  — tags derived from the content's text (via the same
//                     extractFamilyTags vocabulary the profile uses) vs the
//                     user's familyTags + interests/values.
// Each scorer returns { score: 0–100, reasons: string[] }.
// ==========================================================================

import { extractFamilyTags } from './family-tags.js';

const KID_AGE_ORDER = ['0–1', '1–3', '3–5', '5–8', '8–12', '12–18'];
const BUCKET_YEARS = { '0–1': [0, 1], '1–3': [1, 3], '3–5': [3, 5], '5–8': [5, 8], '8–12': [8, 12], '12–18': [12, 18] };

const asArr = (v) => (Array.isArray(v) ? v : []);
const truthyKeys = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? Object.keys(o).filter(k => o[k]) : []);
const round = (n) => Math.round(Math.max(0, Math.min(100, n)));

const proximity = (a, b) => {
  const ia = KID_AGE_ORDER.indexOf(a), ib = KID_AGE_ORDER.indexOf(b);
  if (ia < 0 || ib < 0) return a === b ? 1 : 0;
  const d = Math.abs(ia - ib);
  return d === 0 ? 1 : d === 1 ? 0.5 : d === 2 ? 0.15 : 0;
};

// Best age-bucket fit (0..1) between the user's kids and a content age list.
const ageFitBuckets = (userBuckets, contentBuckets) => {
  if (!userBuckets.length || !contentBuckets.length) return 0;
  return Math.max(...userBuckets.map(u => Math.max(...contentBuckets.map(c => proximity(u, c)))));
};

// Fit (0..1) between user's kid buckets and a numeric [min,max] year range.
const ageFitRange = (userBuckets, min, max) => {
  if (!userBuckets.length || (min == null && max == null)) return 0;
  const lo = min ?? 0, hi = max ?? 18;
  return userBuckets.some(b => { const [a, z] = BUCKET_YEARS[b] || [0, 18]; return z >= lo && a <= hi; }) ? 1 : 0;
};

// The user's full tag set: explicit familyTags + tags inferred from their
// interests/values, so content tagged the same way can be matched.
export const userTagSet = (profile = {}) => {
  const explicit = asArr(profile.settings?.familyTags);
  const fromPrefs = extractFamilyTags(`${asArr(profile.interests).join(' ')} ${asArr(profile.values).join(' ')}`, 12);
  return new Set([...explicit, ...fromPrefs]);
};

// Overlap coefficient (rewards any overlap regardless of set sizes) + the
// shared tags themselves for explanation copy.
const overlap = (aSet, bArr) => {
  const shared = bArr.filter(x => aSet.has(x));
  const denom = Math.min(aSet.size, bArr.length) || 1;
  return { ratio: shared.length / denom, shared };
};

const tagsForText = (text) => extractFamilyTags(text, 12);

export const scoreEvent = (profile = {}, event = {}) => {
  const uB = truthyKeys(profile.kidsAges);
  const ageFit = ageFitBuckets(uB, asArr(event.kidAges || event.kid_ages));
  const tags = tagsForText(`${event.name || ''} ${asArr(event.tags).join(' ')}`);
  const { ratio, shared } = overlap(userTagSet(profile), tags);
  const score = round(100 * (0.55 * ageFit + 0.45 * ratio));
  const reasons = [];
  if (ageFit >= 1) reasons.push('Right age for your kids');
  else if (ageFit > 0) reasons.push('Close to your kids’ ages');
  if (shared.length) reasons.push(`Matches your ${shared[0].toLowerCase()}`);
  return { score, reasons };
};

export const scorePlace = (profile = {}, place = {}) => {
  const uB = truthyKeys(profile.kidsAges);
  const ageFit = (place.age_min != null || place.age_max != null)
    ? ageFitRange(uB, place.age_min, place.age_max)
    : ageFitBuckets(uB, asArr(place.kidAges || place.kid_ages));
  const tags = tagsForText(`${place.name || ''} ${place.desc || place.description || ''} ${asArr(place.tags).join(' ')}`);
  const { ratio, shared } = overlap(userTagSet(profile), tags);
  const score = round(100 * (0.45 * ageFit + 0.45 * ratio + 0.10)); // small base so untagged places aren't 0
  const reasons = [];
  if (ageFit >= 1) reasons.push('Good for your kids’ ages');
  if (shared.length) reasons.push(`Fits your ${shared[0].toLowerCase()}`);
  return { score, reasons };
};

export const scoreDiscussion = (profile = {}, group = {}) => {
  const uB = truthyKeys(profile.kidsAges);
  const ageFit = ageFitBuckets(uB, asArr(group.kidAges));
  const tags = tagsForText(`${group.title || ''} ${group.blurb || ''} ${asArr(group.topics).join(' ')}`);
  const { ratio, shared } = overlap(userTagSet(profile), tags);
  const score = round(100 * (0.4 * ageFit + 0.6 * ratio));
  const reasons = [];
  if (ageFit > 0) reasons.push('Parents at your stage');
  if (shared.length) reasons.push(`About ${shared[0].toLowerCase()}`);
  return { score, reasons };
};

// Sort a list by a scorer (desc), stable on ties, non-mutating.
export const rankByRelevance = (items, profile, scoreFn) =>
  asArr(items)
    .map((it, i) => ({ it, i, s: scoreFn(profile, it).score }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map(x => x.it);
