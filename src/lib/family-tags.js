// ==========================================================================
// AI extraction layer (v1 — deterministic, on-device heuristic).
//
// Infers family-preference tags from a free-text family description so the
// matching layer can use them alongside the explicit selections. The call site
// (Interests & Preferences step 4) stores BOTH the original sentence (bio) and
// these extracted tags (settings.familyTags).
//
// Designed to be swapped for an LLM later WITHOUT touching callers: replace the
// body with a fetch to an extraction endpoint that returns the same string[].
// Keep it pure + synchronous here so it can run live as the user types.
// ==========================================================================

// tag → trigger stems. Single words match at a word boundary (so "art" hits
// "art"/"artist" but not "start"); phrases match as substrings.
// Tags that the UI should visually highlight — meaningful, sometimes-defining
// family characteristics worth surfacing (and strong matching signals), not
// just lifestyle flavor.
export const HIGHLIGHT_TAGS = ['Special needs'];

const RULES = [
  // Listed first so it is never dropped by the tag cap. Respectful, neutral
  // wording; it's a connection signal (families often want to meet others who
  // get it), never a judgment.
  { tag: 'Special needs',     kw: ['autism', 'autistic', 'asd', 'adhd', 'neurodiver', 'special needs', 'special-needs', 'down syndrome', 'disabilit', 'disabled', 'iep', 'sensory processing', 'spd', 'speech delay', 'speech therapy', 'occupational therapy', 'early intervention', 'nonverbal', 'non-verbal', 'cerebral palsy', 'wheelchair', 'additional needs'] },
  { tag: 'Faith-based',       kw: ['church', 'faith', 'temple', 'mosque', 'synagogue', 'worship', 'prayer', 'bible', 'christ'] },
  { tag: 'Outdoors',          kw: ['outside', 'outdoor', 'park', 'hike', 'hik', 'nature', 'trail', 'camp', 'garden'] },
  { tag: 'Water lovers',      kw: ['beach', 'ocean', 'surf', 'seaside', 'coast', 'pool', 'swimming', 'splash pad', 'water park', 'lake'] },
  { tag: 'Active weekends',   kw: ['weekend', 'adventure', 'active', 'explore', 'outing'] },
  { tag: 'Creative',          kw: ['art', 'craft', 'paint', 'draw', 'creativ', 'create'] },
  { tag: 'Music lovers',      kw: ['music', 'sing', 'instrument', 'dance', 'danc', 'concert'] },
  { tag: 'Social family',     kw: ['friend', 'meet', 'community', 'social', 'playdate', 'neighbor'] },
  { tag: 'Education-focused', kw: ['school', 'learn', 'read', 'book', 'library', 'education', 'montessori'] },
  { tag: 'Foodies',           kw: ['cook', 'bake', 'bak', 'restaurant', 'farmers market', 'foodie'] },
  { tag: 'Sporty',            kw: ['sport', 'soccer', 'run', 'bike', 'swim', 'fitness', 'gym', 'yoga'] },
  { tag: 'Coffee people',     kw: ['coffee', 'cafe', 'latte', 'brunch'] },
  { tag: 'Travelers',         kw: ['travel', 'road trip', 'vacation', 'abroad'] },

  // ── Kid stage & life ────────────────────────────────────────────────────
  { tag: 'Newborn days',      kw: ['newborn', 'baby', 'babi', 'infant', 'breastfeed', 'nursing', 'sleep regression'] },
  { tag: 'Toddler life',      kw: ['toddler', 'potty', 'tantrum', 'preschool', 'pre-k'] },
  { tag: 'Big kids',          kw: ['school-age', 'tween', 'teen', 'elementary'] },
  { tag: 'Multiples',         kw: ['twin', 'triplet', 'multiples'] },

  // ── Kid activities & approach ───────────────────────────────────────────
  { tag: 'Little athletes',   kw: ['soccer', 'gymnastic', 'karate', 'tee-ball', 'tball', 'baseball', 'swim lesson', 'dance class', 't-ball'] },
  { tag: 'Sensory play',      kw: ['sensory', 'messy play', 'blocks', 'lego', 'puzzle', 'pretend play'] },
  { tag: 'Storytime',         kw: ['storytime', 'story time', 'bedtime story', 'picture book'] },
  { tag: 'Homeschool',        kw: ['homeschool', 'unschool', 'montessori', 'waldorf'] },
  { tag: 'Screen-free',       kw: ['screen-free', 'screen free', 'no screens', 'limit screen', 'unplugged'] },
  { tag: 'Bilingual home',    kw: ['bilingual', 'spanish', 'french', 'mandarin', 'two languages', 'second language'] },

  // ── Family lifestyle ────────────────────────────────────────────────────
  { tag: 'Pet family',        kw: ['dog', 'puppy', 'kitten', 'our pet', 'pets'] },
  { tag: 'Game nights',       kw: ['board game', 'game night', 'family game'] },
  { tag: 'Movie family',      kw: ['movie', 'film night', 'cinema'] },
  { tag: 'Bakers',            kw: ['baking', 'cookies', 'cupcake', 'cupcakes'] },
  { tag: 'Crafty',            kw: ['diy', 'sewing', 'knit', 'pottery', 'crafty'] },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hit = (lowerText, kw) =>
  kw.includes(' ') ? lowerText.includes(kw) : new RegExp(`\\b${escapeRe(kw)}`).test(lowerText);

export const extractFamilyTags = (text = '', max = 6) => {
  const t = String(text || '').toLowerCase();
  if (t.trim().length < 3) return [];
  const out = [];
  for (const { tag, kw } of RULES) {
    if (kw.some(k => hit(t, k))) out.push(tag);
    if (out.length >= max) break;
  }
  return out;
};
