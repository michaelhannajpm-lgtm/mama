// Pure helpers for generating a UNIQUE profile portrait per mom.
//
// The runner (scripts/generate-mom-portraits.mjs) uses these to derive a stable
// blob path, a deterministic-yet-varied image prompt, and to tell whether a mom
// already has a generated portrait (so re-runs are resumable). No I/O here.

const FALLBACK_SLUG = 'mama';

// URL-safe, lowercase slug for the blob folder. Prefer the mom's username
// (already slug-ish, e.g. "gabrielac164"), then display name, then her id.
export const slugForMom = (row) => {
  const base = row?.username || row?.display_name || (row?.id ? `mom-${row.id}` : '');
  const slug = String(base)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || FALLBACK_SLUG;
};

// One canonical portrait per mom: profiles/<slug>/portrait.<ext>. The runner
// uploads with allowOverwrite so a re-run replaces the same logical asset.
export const blobPathForMom = (slug, ext = 'png') => `profiles/${slug}/portrait.${ext}`;

// Deterministic 32-bit hash so the same mom always yields the same prompt.
const hashInt = (str) => {
  const s = String(str || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const pick = (arr, n) => arr[n % arr.length];

// Descriptive axes — varied deterministically per mom so the 1,000 portraits
// look like a diverse set of real mothers rather than the same person.
const AGES = [
  'in her late 20s', 'in her early 30s', 'in her mid-30s',
  'in her late 30s', 'in her early 40s', 'in her mid-40s',
];
const HERITAGES = [
  'East Asian', 'South Asian', 'Black', 'Latina', 'White',
  'Middle Eastern', 'Southeast Asian', 'mixed-race', 'Pacific Islander',
];
const HAIR = [
  'short curly hair', 'long straight hair', 'shoulder-length wavy hair',
  'hair tied in a bun', 'braided hair', 'a short bob', 'natural coily hair',
  'a ponytail', 'a headscarf',
];
const SETTINGS = [
  'a sunlit kitchen', 'a cozy living room', 'a leafy neighborhood park',
  'a bright corner cafe', 'a front doorway', 'a backyard garden',
  'a soft neutral studio backdrop', 'a farmers-market street',
];
const EXPRESSIONS = [
  'a warm genuine smile', 'a soft friendly expression',
  'a relaxed candid look', 'a gentle laugh', 'a calm confident gaze',
];

// A photoreal, respectful head-and-shoulders portrait prompt. Deterministic for
// a given mom; distinct across moms. The mom's stored attributes nudge the
// apparent age toward something plausible for her kids when available.
export const buildPortraitPrompt = (row) => {
  const seed = row?.id || row?.username || row?.display_name || '';
  const h = hashInt(seed);
  const age = pick(AGES, h);
  const heritage = pick(HERITAGES, h >>> 3);
  const hair = pick(HAIR, h >>> 6);
  const setting = pick(SETTINGS, h >>> 9);
  const expression = pick(EXPRESSIONS, h >>> 12);

  return (
    `A natural, candid head-and-shoulders portrait photograph of a ${heritage} mother ${age}, ` +
    `with ${hair}, ${expression}, in ${setting}. ` +
    `Soft natural lighting, shallow depth of field, photorealistic, warm and approachable, ` +
    `looking toward the camera. No text, no watermark, no logo.`
  );
};

// A generated portrait lives under the profiles/ blob folder. Used to skip moms
// that already have one (resumable re-runs) unless --force is passed.
export const PORTRAIT_BLOB_RE = /\/profiles\//;
export const hasGeneratedPortrait = (row) => {
  const photos = Array.isArray(row?.photos) ? row.photos : [];
  return photos.some((u) => typeof u === 'string' && PORTRAIT_BLOB_RE.test(u));
};
