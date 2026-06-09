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

export const WEIGHTS = { kids: 30, interests: 25, values: 15, places: 15, slots: 10, momTypes: 5 };

export const scoreMom = (user = {}, mom = {}) => {
  const uKids = truthyKeys(user.kids_ages);
  const mKids = truthyKeys(mom.kids_ages);

  const score =
    jaccard(uKids, mKids) * WEIGHTS.kids +
    jaccard(asArray(user.interests), asArray(mom.interests)) * WEIGHTS.interests +
    jaccard(asArray(user.values), asArray(mom.values)) * WEIGHTS.values +
    jaccard(asArray(user.places), asArray(mom.places)) * WEIGHTS.places +
    jaccard(asArray(user.free_slots), asArray(mom.free_slots)) * WEIGHTS.slots +
    jaccard(asArray(user.mom_types), asArray(mom.mom_types)) * WEIGHTS.momTypes;

  const sharedTags = [];
  if (sharedItems(uKids, mKids).length) sharedTags.push('Same kid ages');
  sharedTags.push(...sharedItems(user.interests, mom.interests));
  sharedTags.push(...sharedItems(user.values, mom.values));

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    sharedTags: sharedTags.slice(0, 3),
  };
};
