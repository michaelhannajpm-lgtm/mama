// api/_lib/ai/generate.js
// Injectable network layer for the admin AI-assist feature.
// Takes an OpenAI client (and a `put` blob-upload function) so both can be
// replaced with fakes in tests — no live network calls needed.
import {
  describePrompt, DESCRIBE_SCHEMA, toDescribePatch,
  reviewPrompt, reviewSchema, toReviewSuggestions,
  imagePrompt,
} from './prompts.js';

export const TEXT_MODEL = 'gpt-4o-mini';
export const IMAGE_MODEL = 'gpt-image-1';

const KIND_FOLDER = { place: 'places', event: 'events', mom: 'profiles' };
const suffix = () => Date.now().toString(36) + process.hrtime.bigint().toString(36).slice(-4);

// Low-level helper: one structured-JSON chat completion.
const chatJson = async (openai, model, prompt, schema, name) => {
  const res = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
  });
  const msg = res.choices?.[0]?.message;
  if (msg?.refusal) throw new Error(`model refused: ${msg.refusal}`);
  return JSON.parse(msg?.content || '{}');
};

// Generate a description for a single record. Returns { description: string }.
export const describeOne = async (openai, kind, record, model = TEXT_MODEL) =>
  toDescribePatch(await chatJson(openai, model, describePrompt(kind, record), DESCRIBE_SCHEMA, 'description'));

// Review a record and return an array of { field, suggested, reason } suggestions.
export const reviewOne = async (openai, kind, record, model = TEXT_MODEL) =>
  toReviewSuggestions(kind, await chatJson(openai, model, reviewPrompt(kind, record), reviewSchema(kind), 'review'));

// Generate an image for a record, upload it via `put`, and return { url, generated }.
// `put` signature: (path: string, bytes: Buffer, opts: { access, contentType }) => Promise<{ url: string }>
// Matches the @vercel/blob `put` API so the production caller can pass it directly.
export const generateImage = async ({ openai, put }, kind, record, { quality = 'low', size = '1024x1024' } = {}) => {
  const res = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt: imagePrompt(kind, record),
    n: 1,
    size,
    quality,
  });
  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error('image model returned no b64_json');
  const bytes = Buffer.from(b64, 'base64');
  const id = String(record?.id || 'new').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'new';
  const path = `${KIND_FOLDER[kind] || 'misc'}/ai-${id}-${suffix()}.png`;
  const blob = await put(path, bytes, { access: 'public', contentType: 'image/png', token: process.env.BLOB_READ_WRITE_TOKEN });
  return { url: blob.url, generated: true };
};
