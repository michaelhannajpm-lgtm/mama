// Enrich ingested places: fill the fields Google didn't give us.
//   - area       : derived deterministically from lat/lng (nearest Tampa area)
//   - hero_photo : the place's hero photo as a stable, app-renderable URL
//   - description / tags / good_for / age_min / age_max / amenities : via Claude
//
// Mirrors the seed.js service-role write pattern. Only fills EMPTY fields by
// default (never clobbers curated/admin edits) unless `overwrite` is set.
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { nearestArea } from '../../../src/lib/places.js';

// You chose Haiku in the enrichment prompt; bulk structured extraction is a
// good fit for it. Override with --model / ENRICH_MODEL if you want Opus/Sonnet.
export const DEFAULT_MODEL = 'claude-haiku-4-5';

// ---------------------------------------------------------------- deterministic

// Map coordinates to a Tampa Bay neighborhood label (e.g. "Hyde Park").
export const deriveArea = (lat, lng) => {
  if (lat == null || lng == null) return null;
  const a = nearestArea(Number(lat), Number(lng));
  return a?.label || null;
};

// Hero photo as a stable, width-agnostic URL the app renders directly. Google
// photos go through the server-side proxy (key stays server-side); generated
// photos already carry a public storage URL.
export const buildHeroPhoto = (photos) => {
  const list = Array.isArray(photos) ? photos : [];
  const hero = list.find(p => p.is_hero) || list[0];
  if (!hero) return null;
  if (hero.url) return hero.url;
  if (hero.google_ref) return `/api/places/photo?ref=${encodeURIComponent(hero.google_ref)}`;
  return null;
};

// ------------------------------------------------------------------------- AI

const AMENITY_KEYS = ['parking', 'restrooms', 'stroller_friendly', 'nursing_room', 'food', 'indoor', 'outdoor'];

// JSON-schema for structured outputs. No numeric/length constraints (not
// supported by structured outputs); additionalProperties:false on every object.
export const ENRICH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    good_for: { type: 'array', items: { type: 'string' } },
    age_min: { type: 'integer' },
    age_max: { type: 'integer' },
    amenities: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(AMENITY_KEYS.map(k => [k, { type: 'boolean' }])),
      required: AMENITY_KEYS,
    },
  },
  required: ['description', 'tags', 'good_for', 'age_min', 'age_max', 'amenities'],
};

export const buildPrompt = (place) => `You are enriching a directory of family-friendly places in Tampa, FL for a mom-friendship app.

Place:
- Name: ${place.name}
- Primary category: ${place.category}
- Address: ${place.address || 'unknown'}
- Google rating: ${place.rating ?? 'n/a'} (${place.review_count ?? 0} reviews)

Produce concise, factual metadata for parents. Rules:
- description: ONE sentence (max ~18 words), warm but factual, focused on what families/kids get here. Do NOT invent hours, prices, phone numbers, or specific programs you can't infer from the name + category.
- tags: 3-5 short Title-Case labels (e.g. "Indoor", "Classes", "Stroller-friendly", "Birthday parties").
- good_for: 2-3 lowercase use-cases (e.g. "after-school", "toddlers", "rainy day").
- age_min / age_max: the typical kid age range this place serves, between 0 and 18. If broad, use 0 and 12.
- amenities: best-guess booleans for each listed key based on the category — do not overclaim.`;

const clampInt = (v, lo, hi, fb) => (Number.isInteger(v) ? Math.min(hi, Math.max(lo, v)) : fb);

// Coerce the model output into a safe places-row patch.
export const toEnrichPatch = (out) => ({
  description: typeof out.description === 'string' ? out.description.trim() : null,
  tags: Array.isArray(out.tags) ? out.tags.map(String).map(s => s.trim()).filter(Boolean).slice(0, 6) : [],
  good_for: Array.isArray(out.good_for) ? out.good_for.map(String).map(s => s.trim()).filter(Boolean).slice(0, 4) : [],
  age_min: clampInt(out.age_min, 0, 18, null),
  age_max: clampInt(out.age_max, 0, 18, null),
  amenities: out.amenities && typeof out.amenities === 'object' ? out.amenities : {},
});

// One Claude call → enrichment fields (no DB write). Pure-ish: takes the client.
export const enrichOne = async (anthropic, place, model = DEFAULT_MODEL) => {
  const res = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    output_config: { format: { type: 'json_schema', schema: ENRICH_SCHEMA } },
    messages: [{ role: 'user', content: buildPrompt(place) }],
  });
  const text = res.content.find(b => b.type === 'text')?.text || '{}';
  return toEnrichPatch(JSON.parse(text));
};

// ----------------------------------------------------------------- orchestrator

export const makeClient = (supabaseUrl, serviceRoleKey) =>
  createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

// Ingested places (google_place_id set) + their photos, oldest first.
export const loadPlacesToEnrich = async (sb, limit) => {
  let q = sb.from('places')
    .select('id,name,category,address,rating,review_count,lat,lng,area,description,tags,good_for,age_min,age_max,amenities,hero_photo,place_photos(url,google_ref,is_hero)')
    .not('google_place_id', 'is', null)
    .order('created_at', { ascending: true });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw new Error(`load places failed: ${error.message}`);
  return data || [];
};

const isEmptyArr = (v) => !Array.isArray(v) || v.length === 0;
const isEmptyObj = (v) => !v || typeof v !== 'object' || Object.keys(v).length === 0;

// Run enrichment. dryRun => generate + report, no writes.
export async function runEnrich({ env, limit = null, dryRun = false, overwrite = false, model = DEFAULT_MODEL, logger = console }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set');
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE creds not set');

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const sb = makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const places = await loadPlacesToEnrich(sb, limit);
  const counts = { total: places.length, enriched: 0, skipped: 0, errors: 0, aiCalls: 0 };
  const samples = [];

  for (const p of places) {
    try {
      const patch = {};

      // Deterministic fields (fill when empty unless overwrite).
      if (overwrite || !p.area) { const a = deriveArea(p.lat, p.lng); if (a) patch.area = a; }
      if (overwrite || !p.hero_photo) { const h = buildHeroPhoto(p.place_photos); if (h) patch.hero_photo = h; }

      // AI fields (only call the model when a qualitative field is empty).
      const needsAI = overwrite || !p.description || isEmptyArr(p.tags) ||
        isEmptyArr(p.good_for) || p.age_min == null || p.age_max == null || isEmptyObj(p.amenities);
      if (needsAI) {
        const ai = await enrichOne(anthropic, p, model);
        counts.aiCalls++;
        if (overwrite || !p.description) patch.description = ai.description;
        if (overwrite || isEmptyArr(p.tags)) patch.tags = ai.tags;
        if (overwrite || isEmptyArr(p.good_for)) patch.good_for = ai.good_for;
        if (overwrite || p.age_min == null) patch.age_min = ai.age_min;
        if (overwrite || p.age_max == null) patch.age_max = ai.age_max;
        if (overwrite || isEmptyObj(p.amenities)) patch.amenities = ai.amenities;
      }

      if (Object.keys(patch).length === 0) { counts.skipped++; continue; }
      if (samples.length < 6) samples.push({ name: p.name, ...patch });

      if (!dryRun) {
        const { error } = await sb.from('places').update(patch).eq('id', p.id);
        if (error) throw new Error(error.message);
      }
      counts.enriched++;
    } catch (e) {
      counts.errors++;
      logger.error?.(`enrich "${p.name}" failed: ${e.message}`);
    }
  }
  return { ...counts, samples };
}
