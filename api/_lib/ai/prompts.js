// api/_lib/ai/prompts.js
// Pure prompt builders, schemas, and coercion helpers for the admin AI-assist
// feature. No network calls — fully unit-testable without mocks.
import { buildPrompt as buildPlaceEnrichPrompt } from '../ingestion/enrich.js';

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []));
const joined = (v) => list(v).join(', ') || 'none given';

// ------------------------------------------------------------------ describe

export const DESCRIBE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { description: { type: 'string' } },
  required: ['description'],
};

const describeEvent = (r) => `You are writing the public description for ONE family event in Tampa, FL for a mom-friendship app.

Event:
- Name: ${r.name || 'unknown'}
- Type: ${r.event_type || 'event'}
- When: ${r.starts_at || r.time_label || r.day_of_week || 'unspecified'}
- Where: ${r.place_name || r.area || 'a Tampa venue'}
- Tags: ${joined(r.tags)}

Write ONE warm, factual sentence (max ~22 words) telling a parent what they and their kids get from this event. Do NOT invent hours, prices, ages, or programs you can't infer from the fields above.`;

const describeMom = (r) => `You are writing a short first-person bio for a fictional mom persona in a mom-friendship app (this is a made-up character, not a real person).

Persona signals:
- Mom types: ${joined(r.mom_types)}
- Values: ${joined(r.values)}
- Interests: ${joined(r.interests)}
- Kids: ${joined(Object.keys(r.kids_ages || {}))}

Write a warm, first-person bio of 2 short sentences (max ~30 words) in a friendly, real voice. No hashtags, no emoji.`;

export const describePrompt = (kind, record = {}) => {
  if (kind === 'place') return buildPlaceEnrichPrompt(record);
  if (kind === 'event') return describeEvent(record);
  if (kind === 'mom') return describeMom(record);
  throw new Error(`unknown kind: ${kind}`);
};

export const toDescribePatch = (out) => ({ description: String(out?.description || '').trim() });

// ------------------------------------------------------------------- review

export const REVIEW_FIELDS = {
  place: ['name', 'description', 'category', 'tags', 'good_for', 'age_min', 'age_max'],
  event: ['name', 'description', 'event_type', 'tags', 'kid_ages', 'age_min', 'age_max', 'price_summary'],
  mom: ['bio', 'mom_types', 'values', 'interests'],
};

export const reviewSchema = (kind) => {
  if (!REVIEW_FIELDS[kind]) throw new Error(`unknown kind: ${kind}`);
  return {
  type: 'object',
  additionalProperties: false,
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          field: { type: 'string', enum: REVIEW_FIELDS[kind] },
          suggested: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['field', 'suggested', 'reason'],
      },
    },
  },
  required: ['suggestions'],
  };
};

const fieldLines = (kind, r) => REVIEW_FIELDS[kind]
  .map((f) => `- ${f}: ${Array.isArray(r[f]) ? joined(r[f]) : (r[f] ?? '(empty)')}`)
  .join('\n');

export const reviewPrompt = (kind, record = {}) => {
  if (!REVIEW_FIELDS[kind]) throw new Error(`unknown kind: ${kind}`);
  return `You are a careful editor reviewing ONE ${kind} record in a Tampa family/mom app admin tool.

Current fields:
${fieldLines(kind, record)}

Suggest improvements ONLY for fields that are genuinely wrong, empty, or clearly improvable. Skip fields that are already good (return them NOT at all). For each suggestion give: the field, the full replacement value (as a string), and a one-line reason. Do not invent facts. Only use these field names: ${REVIEW_FIELDS[kind].join(', ')}.`;
};

export const toReviewSuggestions = (kind, out) => {
  const allowed = new Set(REVIEW_FIELDS[kind] || []);
  return (out?.suggestions || [])
    .filter((s) => s && allowed.has(s.field) && String(s.suggested || '').trim())
    .map((s) => ({ field: s.field, suggested: String(s.suggested).trim(), reason: String(s.reason || '').trim() }));
};

// --------------------------------------------------------------- decodeDataUrl

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const decodeDataUrl = (dataUrl) => {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const bytes = Buffer.from(m[2], 'base64');
  if (!bytes.length) return null;
  return { contentType: m[1], ext: EXT[m[1]], bytes };
};

// ----------------------------------------------------------------- imagePrompt

export const imagePrompt = (kind, record = {}) => {
  if (kind === 'mom') return `A warm, natural portrait photo of a friendly mom for a fictional profile persona. Soft daylight, candid, no text. Persona vibe: ${joined(record.mom_types)}, ${joined(record.interests)}.`;
  const what = record.name || (kind === 'event' ? 'a family event' : 'a family-friendly place');
  return `A bright, inviting photo representing "${what}" in Tampa, Florida for a family activities app. Warm natural light, welcoming, no text, no logos.`;
};
