// ==========================================================================
// Shared matching vocabulary — the SINGLE source of truth for family "values"
// and "activities". Used by the profile editor (Interests & Preferences), the
// onboarding flow, the seeded-mom generator (api/_lib/seed.js, via taxonomy),
// and the mom filter sheets. Keeping one list means a user's selections and a
// seeded mom's data share the exact same strings, so Jaccard matching is real.
// ==========================================================================

export const FAMILY_VALUES = [
  { label: 'Gentle parenting',      emoji: '🌱' },
  { label: 'Outdoors',              emoji: '🌳' },
  { label: 'Education-focused',     emoji: '📚' },
  { label: 'Faith-based',           emoji: '🙏' },
  { label: 'Multilingual home',     emoji: '💬' },
  { label: 'Adventure',             emoji: '🧭' },
  { label: 'Creativity',            emoji: '🎨' },
  { label: 'Honest communication',  emoji: '🗣️' },
  { label: 'Play-based learning',   emoji: '🧩' },
  { label: 'Community involvement', emoji: '🤝' },
];

// Curated to 14 distinct activities so the picker is a clean 2-up grid (an
// even count → no orphan card on the last row). Trimmed redundant pairs
// (museums/aquariums, splash pads, nature walks, book clubs, picnics, sports
// games, travel, indoor play). This is the shared matching source of truth,
// so the list is trimmed here, not just in the UI.
export const ACTIVITIES = [
  { label: 'Coffee meetups',      emoji: '☕' },
  { label: 'Playground visits',   emoji: '🛝' },
  { label: 'Stroller walks',      emoji: '🚶' },
  { label: 'Arts & crafts',       emoji: '🎨' },
  { label: 'Library visits',      emoji: '📚' },
  { label: 'Music activities',    emoji: '🎵' },
  { label: 'Beach days',          emoji: '🏖️' },
  { label: 'Pool & swim',         emoji: '🏊' },
  { label: 'Zoo trips',           emoji: '🦁' },
  { label: 'Farmers markets',     emoji: '🧺' },
  { label: 'Bike rides',          emoji: '🚲' },
  { label: 'Theme parks',         emoji: '🎡' },
  { label: 'Fitness',             emoji: '🏋️' },
  { label: 'Weekend outings',     emoji: '🗓️' },
];

// Plain label arrays for matching / seeding / storage.
export const VALUE_LABELS = FAMILY_VALUES.map(v => v.label);
export const ACTIVITY_LABELS = ACTIVITIES.map(a => a.label);
