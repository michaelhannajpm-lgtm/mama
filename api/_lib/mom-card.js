// Pure mom_profiles row → privacy-safe display card. No I/O. Colors are emitted
// as ABSTRACT TOKEN NAMES (resolved to C.* client-side in src/lib/mom-card.js)
// so no hex crosses the wire. Raw home_lat/home_lng are never copied onto the
// card. distanceMi is precomputed by the caller (null if the user has no coords).
import { scoreMom } from './match.js';

const asArray = (v) => (Array.isArray(v) ? v : []);
const truthyKeys = (obj) =>
  obj && typeof obj === 'object' && !Array.isArray(obj)
    ? Object.keys(obj).filter((k) => obj[k])
    : [];

// mom_type id → { label, tagBg, tagFg, iconKey }. tagBg/tagFg are abstract keys.
export const MOM_TYPE_PRESENTATION = {
  working: { label: 'Working mom',  tagBg: 'lilac',     tagFg: 'plum',      iconKey: 'working' },
  sahm:    { label: 'Stay-at-home', tagBg: 'sage',      tagFg: 'sageDark',  iconKey: 'home' },
  solo:    { label: 'Solo mom',     tagBg: 'coralSoft', tagFg: 'coralDeep', iconKey: 'solo' },
  new:     { label: 'New mom',      tagBg: 'coralSoft', tagFg: 'coralDeep', iconKey: 'new' },
  multi:   { label: 'Multi-kid',    tagBg: 'lilac',     tagFg: 'plum',      iconKey: 'multi' },
  hybrid:  { label: 'Hybrid / WFH', tagBg: 'sage',      tagFg: 'sageDark',  iconKey: 'hybrid' },
};
const DEFAULT_PRESENTATION = { label: 'Verified', tagBg: 'lilac', tagFg: 'plum', iconKey: 'verified' };

// Decorative avatar gradients (used when a mom has no photo). Not semantic
// palette tokens — safe to send as literal gradient strings.
const HUES = [
  'linear-gradient(135deg,#E8B4A0,#C8553D)',
  'linear-gradient(135deg,#D9A441,#C8553D)',
  'linear-gradient(135deg,#7E9678,#5E7A5A)',
  'linear-gradient(135deg,#E8B4A0,#D9A441)',
  'linear-gradient(135deg,#C8553D,#B98EB6)',
  'linear-gradient(135deg,#B98EB6,#C8553D)',
];

const WINDOW_LABEL = { morning: 'Morning', noon: 'Midday', afternoon: 'Afternoon', 'night-owl': 'Evening' };

export const firstNameOf = (row) =>
  (row?.display_name || row?.username || 'Mama').replace(/\./g, '').trim().split(/\s+/)[0] || 'Mama';

export const kidsLabel = (kidsAges) => {
  const buckets = truthyKeys(kidsAges);
  if (!buckets.length) return 'Kids';
  return `${buckets.slice(0, 2).join(' · ')} yrs`;
};

export const formatSlot = (slot) => {
  if (typeof slot !== 'string' || !slot.includes('-')) return null;
  const i = slot.indexOf('-');
  const day = slot.slice(0, i);
  const win = slot.slice(i + 1);
  return `${day} · ${WINDOW_LABEL[win] || win}`;
};

const hueFor = (id) => {
  const s = String(id || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
};

const milesLabel = (mi) => (mi == null ? null : `${mi.toFixed(1)} mi away`);

export const momCardFromRow = (row, user = {}, distanceMi = null) => {
  const { score, sharedTags } = scoreMom(user, {
    kids_ages: row.kids_ages, interests: row.interests, values: row.values,
    places: row.places, free_slots: row.free_slots, mom_types: row.mom_types,
  });
  const primaryType = asArray(row.mom_types).find((t) => MOM_TYPE_PRESENTATION[t]);
  const pres = MOM_TYPE_PRESENTATION[primaryType] || DEFAULT_PRESENTATION;
  const nextSlot = asArray(row.free_slots).map(formatSlot).find(Boolean) || null;

  return {
    id: row.id,
    auth_user_id: row.auth_user_id || null,
    name: row.display_name || firstNameOf(row),
    firstName: firstNameOf(row),
    age: row.age ?? null,
    kids: kidsLabel(row.kids_ages),
    type: pres.label,
    tag: pres.label,
    tagBg: pres.tagBg,
    tagFg: pres.tagFg,
    iconKey: pres.iconKey,
    distance: milesLabel(distanceMi),
    distanceMi,
    overlap: score,
    tags: sharedTags,
    sharedTags,
    nextSlot,
    nextPlace: null,
    hue: hueFor(row.id),
    photo: asArray(row.photos)[0] || null,
    bio: row.bio || null,
    values: asArray(row.values),
    interests: asArray(row.interests),
    freeSlots: asArray(row.free_slots),
    places: asArray(row.places),
    verified: !!row.verified,
  };
};
