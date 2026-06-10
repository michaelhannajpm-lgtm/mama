// Pure recommendation scorer. No I/O. Given the requesting user's matching
// criteria and a candidate mom, returns a 0–100 compatibility score plus the
// human-readable list of what they actually share (top 3).

const asArray = (v) => (Array.isArray(v) ? v : []);

// jsonb kids_ages may store booleans or counts — treat any truthy value as
// "has a kid in this bucket".
const truthyKeys = (obj) =>
  obj && typeof obj === 'object' && !Array.isArray(obj)
    ? Object.keys(obj).filter((k) => obj[k])
    : [];

const jaccard = (a, b) => {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
};

const sharedItems = (a, b) => {
  const B = new Set(asArray(b));
  return asArray(a).filter((x) => B.has(x));
};

// Ordered kid-age buckets (mirrors KID_AGES in src/data/taxonomy.js). Order
// matters: adjacency in this list ≈ closeness in real age.
const KID_AGE_ORDER = ['0–1', '1–3', '3–5', '5–8', '8–12', '12–18'];

// Proximity between two age buckets: exact = 1, one bucket apart = 0.5, two
// apart = 0.15, further = 0. Unknown buckets only credit an exact string match.
const kidAgeProximity = (a, b) => {
  const ia = KID_AGE_ORDER.indexOf(a);
  const ib = KID_AGE_ORDER.indexOf(b);
  if (ia < 0 || ib < 0) return a === b ? 1 : 0;
  const d = Math.abs(ia - ib);
  return d === 0 ? 1 : d === 1 ? 0.5 : d === 2 ? 0.15 : 0;
};

// Soft kid-age similarity (0–1). Best-match averaged in both directions so a
// mom with near-age kids still scores well even when buckets don't line up
// exactly — brittle exact-bucket Jaccard would call those a total miss.
const kidAgeSimilarity = (a, b) => {
  if (!a.length || !b.length) return 0;
  const avgBest = (from, to) =>
    from.reduce((s, x) => s + Math.max(...to.map((y) => kidAgeProximity(x, y))), 0) / from.length;
  return (avgBest(a, b) + avgBest(b, a)) / 2;
};

export const WEIGHTS = { kids: 30, interests: 25, values: 15, places: 15, slots: 10, momTypes: 5 };

export const scoreMom = (user = {}, mom = {}) => {
  const uKids = truthyKeys(user.kids_ages);
  const mKids = truthyKeys(mom.kids_ages);

  const score =
    kidAgeSimilarity(uKids, mKids) * WEIGHTS.kids +
    jaccard(asArray(user.interests), asArray(mom.interests)) * WEIGHTS.interests +
    jaccard(asArray(user.values), asArray(mom.values)) * WEIGHTS.values +
    jaccard(asArray(user.places), asArray(mom.places)) * WEIGHTS.places +
    jaccard(asArray(user.free_slots), asArray(mom.free_slots)) * WEIGHTS.slots +
    jaccard(asArray(user.mom_types), asArray(mom.mom_types)) * WEIGHTS.momTypes;

  const sharedTags = [];
  if (sharedItems(uKids, mKids).length) sharedTags.push('Same kid ages');
  else if (kidAgeSimilarity(uKids, mKids) > 0) sharedTags.push('Similar-age kids');
  sharedTags.push(...sharedItems(user.interests, mom.interests));
  sharedTags.push(...sharedItems(user.values, mom.values));

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    sharedTags: sharedTags.slice(0, 3),
  };
};
