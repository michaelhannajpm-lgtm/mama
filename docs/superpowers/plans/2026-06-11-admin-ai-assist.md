# Admin AI Assist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-item AI help — write a description, generate or upload an image, and review fields — inside the admin Place, Event, and Mom Profile edit modals.

**Architecture:** A new `api/_lib/ai/` module holds pure prompt builders + coercion (TDD'd, no network) and injectable network calls, mirroring `api/_lib/ingestion/enrich.js`. Three `requireAdmin` endpoints under `api/admin/ai/` expose describe/image/review; a fourth `api/admin/upload-image.js` does plain file→Blob. Four shared React components in `src/screens/admin/components/` drive the UI; they import `adminFetch` directly and only ever write *form state* — the admin saves through the existing update path. The AI layer never writes the DB.

**Tech Stack:** Node ESM, `node --test`, `openai` (`gpt-4o-mini` text + `gpt-image-1` image, strict JSON-schema structured outputs), `@vercel/blob`, React 18 + `AC` admin design tokens.

**Spec:** `docs/superpowers/specs/2026-06-11-admin-ai-assist-design.md`

---

## File structure

**Backend (new):**
- `api/_lib/ai/prompts.js` — pure: per-kind `describePrompt` / `reviewPrompt` / `imagePrompt`, `DESCRIBE_SCHEMA`, `reviewSchema(kind)`, `REVIEW_FIELDS`, `toDescribePatch`, `toReviewSuggestions`, `decodeDataUrl`.
- `api/_lib/ai/generate.js` — injectable network calls: `describeOne`, `reviewOne`, `generateImage`.
- `api/admin/ai/describe.js` · `api/admin/ai/review.js` · `api/admin/ai/image.js` — HTTP handlers (`requireAdmin`).
- `api/admin/upload-image.js` — HTTP handler (`requireAdmin`), dataUrl→Blob.

**Backend (tests):**
- `api/_lib/ai/prompts.test.mjs`
- `api/_lib/ai/generate.test.mjs`

**Frontend (new):**
- `src/screens/admin/components/AiWriteButton.jsx`
- `src/screens/admin/components/AiImageControl.jsx`
- `src/screens/admin/components/AiReviewButton.jsx`
- `src/screens/admin/components/SuggestionChips.jsx`

**Frontend (modified):**
- `src/screens/admin/managers/PlaceEditModal.jsx`
- `src/screens/admin/managers/EventEditModal.jsx`
- `src/screens/admin/sections/MomProfilesSection.jsx` (the inner `MomProfileDetailModal`)

> The repo has no React test harness (`node --test` over `*.test.mjs` only), so component tasks are **build + manual-verify in the dev server**. All testable logic lives in `api/_lib/ai/` and is TDD'd.

---

## Task 1: Describe prompt builders, schema, and coercion (pure)

**Files:**
- Create: `api/_lib/ai/prompts.js`
- Test: `api/_lib/ai/prompts.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// api/_lib/ai/prompts.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  describePrompt, DESCRIBE_SCHEMA, toDescribePatch,
} from './prompts.js';

test('describePrompt(place) reuses enrich voice and includes the name', () => {
  const p = describePrompt('place', { name: 'Glazer Children’s Museum', category: 'museum' });
  assert.match(p, /Glazer Children/);
  assert.match(p, /family|families|parents/i);
});

test('describePrompt(event) includes name, type, and where', () => {
  const p = describePrompt('event', { name: 'Toddler Storytime', event_type: 'story_time', place_name: 'Hyde Park Library', area: 'Hyde Park' });
  assert.match(p, /Toddler Storytime/);
  assert.match(p, /Hyde Park/);
});

test('describePrompt(mom) writes a first-person persona bio prompt', () => {
  const p = describePrompt('mom', { mom_types: ['sahm'], values: ['Outdoors'], interests: ['Playground visits'] });
  assert.match(p, /first[- ]person/i);
  assert.match(p, /Outdoors/);
});

test('DESCRIBE_SCHEMA is a strict single-string object', () => {
  assert.equal(DESCRIBE_SCHEMA.additionalProperties, false);
  assert.deepEqual(DESCRIBE_SCHEMA.required, ['description']);
  assert.equal(DESCRIBE_SCHEMA.properties.description.type, 'string');
});

test('toDescribePatch trims and coerces to a string', () => {
  assert.deepEqual(toDescribePatch({ description: '  hi  ' }), { description: 'hi' });
  assert.deepEqual(toDescribePatch({}), { description: '' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test api/_lib/ai/prompts.test.mjs`
Expected: FAIL — `Cannot find module './prompts.js'`.

- [ ] **Step 3: Write minimal implementation**

```js
// api/_lib/ai/prompts.js
// Pure prompt builders, schemas, and output coercion for the admin AI-assist
// layer. NO network here — mirrors api/_lib/ingestion/enrich.js's split so this
// file is fully unit-testable. generate.js does the OpenAI calls.
import { buildPrompt as buildPlaceEnrichPrompt } from '../ingestion/enrich.js';

const list = (v) => (Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []));
const joined = (v) => list(v).join(', ') || 'none given';

// ---------------------------------------------------------------- describe
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

export const toDescribePatch = (out) => ({
  description: String(out?.description || '').trim(),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test api/_lib/ai/prompts.test.mjs`
Expected: PASS (5 describe tests).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ai/prompts.js api/_lib/ai/prompts.test.mjs
git commit -m "feat(admin-ai): describe prompt builders + schema + coercion"
```

---

## Task 2: Review builders, per-kind schema, and suggestion filtering (pure)

**Files:**
- Modify: `api/_lib/ai/prompts.js`
- Test: `api/_lib/ai/prompts.test.mjs`

- [ ] **Step 1: Add failing tests**

```js
// append to api/_lib/ai/prompts.test.mjs
import { REVIEW_FIELDS, reviewSchema, reviewPrompt, toReviewSuggestions } from './prompts.js';

test('REVIEW_FIELDS lists suggestable fields per kind', () => {
  assert.ok(REVIEW_FIELDS.place.includes('description'));
  assert.ok(REVIEW_FIELDS.event.includes('event_type'));
  assert.ok(REVIEW_FIELDS.mom.includes('bio'));
});

test('reviewSchema(kind) enum-constrains field to that kind', () => {
  const s = reviewSchema('place');
  const fieldEnum = s.properties.suggestions.items.properties.field.enum;
  assert.deepEqual(fieldEnum, REVIEW_FIELDS.place);
  assert.equal(s.properties.suggestions.items.additionalProperties, false);
});

test('reviewPrompt includes the current field values', () => {
  const p = reviewPrompt('place', { name: 'X', description: 'old desc', category: 'park' });
  assert.match(p, /old desc/);
});

test('toReviewSuggestions drops unknown fields and empty values', () => {
  const out = { suggestions: [
    { field: 'description', suggested: 'better', reason: 'clearer' },
    { field: 'not_a_field', suggested: 'x', reason: 'y' },
    { field: 'tags', suggested: '', reason: 'z' },
  ] };
  assert.deepEqual(toReviewSuggestions('place', out), [
    { field: 'description', suggested: 'better', reason: 'clearer' },
  ]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test api/_lib/ai/prompts.test.mjs`
Expected: FAIL — `REVIEW_FIELDS` is not exported.

- [ ] **Step 3: Implement**

```js
// append to api/_lib/ai/prompts.js
// ------------------------------------------------------------------ review
// Only fields the model is allowed to suggest, per kind. A wrong/invented field
// name is dropped in toReviewSuggestions; the schema enum stops most at source.
export const REVIEW_FIELDS = {
  place: ['name', 'description', 'category', 'tags', 'good_for', 'age_min', 'age_max'],
  event: ['name', 'description', 'event_type', 'tags', 'kid_ages', 'age_min', 'age_max', 'price_summary'],
  mom: ['bio', 'mom_types', 'values', 'interests'],
};

export const reviewSchema = (kind) => ({
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
});

const fieldLines = (kind, r) => REVIEW_FIELDS[kind]
  .map((f) => `- ${f}: ${Array.isArray(r[f]) ? joined(r[f]) : (r[f] ?? '(empty)')}`)
  .join('\n');

export const reviewPrompt = (kind, record = {}) => `You are a careful editor reviewing ONE ${kind} record in a Tampa family/mom app admin tool.

Current fields:
${fieldLines(kind, record)}

Suggest improvements ONLY for fields that are genuinely wrong, empty, or clearly improvable. Skip fields that are already good (return them NOT at all). For each suggestion give: the field, the full replacement value (as a string), and a one-line reason. Do not invent facts. Only use these field names: ${REVIEW_FIELDS[kind].join(', ')}.`;

export const toReviewSuggestions = (kind, out) => {
  const allowed = new Set(REVIEW_FIELDS[kind] || []);
  return (out?.suggestions || [])
    .filter((s) => s && allowed.has(s.field) && String(s.suggested || '').trim())
    .map((s) => ({ field: s.field, suggested: String(s.suggested).trim(), reason: String(s.reason || '').trim() }));
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test api/_lib/ai/prompts.test.mjs`
Expected: PASS (9 tests total).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ai/prompts.js api/_lib/ai/prompts.test.mjs
git commit -m "feat(admin-ai): review prompt + per-kind enum schema + filtering"
```

---

## Task 3: `decodeDataUrl` helper for uploads (pure)

**Files:**
- Modify: `api/_lib/ai/prompts.js`
- Test: `api/_lib/ai/prompts.test.mjs`

- [ ] **Step 1: Add failing tests**

```js
// append to api/_lib/ai/prompts.test.mjs
import { decodeDataUrl } from './prompts.js';

test('decodeDataUrl accepts jpeg/png/webp and returns bytes + type', () => {
  const png = 'data:image/png;base64,' + Buffer.from('hi').toString('base64');
  const r = decodeDataUrl(png);
  assert.equal(r.contentType, 'image/png');
  assert.equal(r.ext, 'png');
  assert.equal(r.bytes.toString(), 'hi');
});

test('decodeDataUrl rejects non-image / malformed input', () => {
  assert.equal(decodeDataUrl('data:text/plain;base64,aGk='), null);
  assert.equal(decodeDataUrl('not a data url'), null);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test api/_lib/ai/prompts.test.mjs`
Expected: FAIL — `decodeDataUrl` is not exported.

- [ ] **Step 3: Implement**

```js
// append to api/_lib/ai/prompts.js
// ------------------------------------------------------------------ upload
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

// Validate + decode a base64 image data URL. Returns null on anything invalid.
export const decodeDataUrl = (dataUrl) => {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const bytes = Buffer.from(m[2], 'base64');
  if (!bytes.length) return null;
  return { contentType: m[1], ext: EXT[m[1]], bytes };
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test api/_lib/ai/prompts.test.mjs`
Expected: PASS (11 tests total).

- [ ] **Step 5: Commit**

```bash
git add api/_lib/ai/prompts.js api/_lib/ai/prompts.test.mjs
git commit -m "feat(admin-ai): decodeDataUrl upload helper"
```

---

## Task 4: Injectable network calls — describe, review, image

**Files:**
- Create: `api/_lib/ai/generate.js`
- Test: `api/_lib/ai/generate.test.mjs`

- [ ] **Step 1: Write the failing test (fake clients, no network)**

```js
// api/_lib/ai/generate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeOne, reviewOne, generateImage } from './generate.js';

const fakeChat = (payload) => ({
  chat: { completions: { create: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }) } },
});

test('describeOne returns the trimmed description', async () => {
  const out = await describeOne(fakeChat({ description: ' A nice park ' }), 'place', { name: 'P' });
  assert.deepEqual(out, { description: 'A nice park' });
});

test('reviewOne filters to allowed fields', async () => {
  const openai = fakeChat({ suggestions: [
    { field: 'description', suggested: 'x', reason: 'r' },
    { field: 'bogus', suggested: 'y', reason: 'r' },
  ] });
  const out = await reviewOne(openai, 'place', { name: 'P' });
  assert.deepEqual(out, [{ field: 'description', suggested: 'x', reason: 'r' }]);
});

test('describeOne surfaces a model refusal as an error', async () => {
  const openai = { chat: { completions: { create: async () => ({ choices: [{ message: { refusal: 'no' } }] }) } } };
  await assert.rejects(() => describeOne(openai, 'place', {}), /refus/i);
});

test('generateImage decodes b64, uploads via put, stamps generated', async () => {
  const openai = { images: { generate: async () => ({ data: [{ b64_json: Buffer.from('img').toString('base64') }] }) } };
  let putArgs = null;
  const put = async (path, bytes, opts) => { putArgs = { path, bytes, opts }; return { url: 'https://blob/' + path }; };
  const out = await generateImage({ openai, put }, 'place', { id: 'p1', name: 'P' });
  assert.equal(out.generated, true);
  assert.match(out.url, /^https:\/\/blob\/places\/ai-p1-/);
  assert.equal(putArgs.bytes.toString(), 'img');
  assert.equal(putArgs.opts.access, 'public');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test api/_lib/ai/generate.test.mjs`
Expected: FAIL — `Cannot find module './generate.js'`.

- [ ] **Step 3: Implement**

```js
// api/_lib/ai/generate.js
// Network layer for the admin AI-assist endpoints. Each fn takes its client(s)
// injected so prompts.js stays pure and these stay unit-testable with fakes.
import {
  describePrompt, DESCRIBE_SCHEMA, toDescribePatch,
  reviewPrompt, reviewSchema, toReviewSuggestions,
  imagePrompt,
} from './prompts.js';

export const TEXT_MODEL = 'gpt-4o-mini';
export const IMAGE_MODEL = 'gpt-image-1';

const KIND_FOLDER = { place: 'places', event: 'events', mom: 'profiles' };
// Deterministic-enough unique suffix without Math.random (blocked in some envs).
const suffix = () => Date.now().toString(36) + process.hrtime.bigint().toString(36).slice(-4);

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

export const describeOne = async (openai, kind, record, model = TEXT_MODEL) =>
  toDescribePatch(await chatJson(openai, model, describePrompt(kind, record), DESCRIBE_SCHEMA, 'description'));

export const reviewOne = async (openai, kind, record, model = TEXT_MODEL) =>
  toReviewSuggestions(kind, await chatJson(openai, model, reviewPrompt(kind, record), reviewSchema(kind), 'review'));

// put is @vercel/blob's put, injected. Returns { url, generated:true }.
export const generateImage = async ({ openai, put }, kind, record, { quality = 'low', size = '1024x1024' } = {}) => {
  const res = await openai.images.generate({ model: IMAGE_MODEL, prompt: imagePrompt(kind, record), n: 1, size, quality });
  const b64 = res?.data?.[0]?.b64_json;
  if (!b64) throw new Error('image model returned no b64_json');
  const bytes = Buffer.from(b64, 'base64');
  const id = record?.id || 'new';
  const path = `${KIND_FOLDER[kind] || 'misc'}/ai-${id}-${suffix()}.png`;
  const blob = await put(path, bytes, { access: 'public', contentType: 'image/png' });
  return { url: blob.url, generated: true };
};
```

- [ ] **Step 4: Add `imagePrompt` to prompts.js (referenced above)**

```js
// append to api/_lib/ai/prompts.js
export const imagePrompt = (kind, record = {}) => {
  if (kind === 'mom') return `A warm, natural portrait photo of a friendly mom for a fictional profile persona. Soft daylight, candid, no text. Persona vibe: ${joined(record.mom_types)}, ${joined(record.interests)}.`;
  const what = record.name || (kind === 'event' ? 'a family event' : 'a family-friendly place');
  return `A bright, inviting photo representing "${what}" in Tampa, Florida for a family activities app. Warm natural light, welcoming, no text, no logos.`;
};
```

- [ ] **Step 5: Run to verify it passes**

Run: `node --test api/_lib/ai/`
Expected: PASS (prompts + generate suites green).

- [ ] **Step 6: Commit**

```bash
git add api/_lib/ai/generate.js api/_lib/ai/generate.test.mjs api/_lib/ai/prompts.js
git commit -m "feat(admin-ai): injectable describe/review/image network layer"
```

---

## Task 5: HTTP handler — `POST /api/admin/ai/describe`

**Files:**
- Create: `api/admin/ai/describe.js`

> No unit test (thin glue over the TDD'd layer + network); verified by the manual curl in Step 3 and end-to-end in Tasks 10–12.

- [ ] **Step 1: Write the handler**

```js
// api/admin/ai/describe.js
// POST /api/admin/ai/describe — { kind, record } -> { description }. requireAdmin.
// AI fills form state only; never writes the DB.
import OpenAI from 'openai';
import { json, readJsonBody } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { describeOne } from '../../_lib/ai/generate.js';

const KINDS = new Set(['place', 'event', 'mom']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: 'OPENAI_API_KEY not set' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  if (!KINDS.has(body.kind)) return json(res, 400, { error: 'kind must be place|event|mom' });
  if (!body.record || typeof body.record !== 'object') return json(res, 400, { error: 'record required' });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const out = await describeOne(openai, body.kind, body.record);
    return json(res, 200, out);
  } catch (e) {
    console.error('ai/describe failed', e);
    return json(res, 502, { error: 'AI request failed' });
  }
}
```

- [ ] **Step 2: Confirm `readJsonBody` / `json` exist in `_lib/supabase.js`**

Run: `grep -n "export const json\|export const readJsonBody" api/_lib/supabase.js`
Expected: both found (they are imported the same way by `api/admin/onboarding/delete.js`).

- [ ] **Step 3: Manual smoke (needs `vercel dev` + an admin token)**

Run:
```bash
curl -s -X POST localhost:3000/api/admin/ai/describe \
  -H "authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"kind":"place","record":{"name":"Glazer Children’s Museum","category":"museum"}}'
```
Expected: `{"description":"..."}` (one sentence). Without the token: `401`.

- [ ] **Step 4: Commit**

```bash
git add api/admin/ai/describe.js
git commit -m "feat(admin-ai): POST /api/admin/ai/describe endpoint"
```

---

## Task 6: HTTP handlers — review + image

**Files:**
- Create: `api/admin/ai/review.js`
- Create: `api/admin/ai/image.js`

- [ ] **Step 1: Write `review.js`**

```js
// api/admin/ai/review.js
// POST /api/admin/ai/review — { kind, record } -> { suggestions: [...] }. requireAdmin.
import OpenAI from 'openai';
import { json, readJsonBody } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { reviewOne } from '../../_lib/ai/generate.js';

const KINDS = new Set(['place', 'event', 'mom']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: 'OPENAI_API_KEY not set' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  if (!KINDS.has(body.kind)) return json(res, 400, { error: 'kind must be place|event|mom' });
  if (!body.record || typeof body.record !== 'object') return json(res, 400, { error: 'record required' });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const suggestions = await reviewOne(openai, body.kind, body.record);
    return json(res, 200, { suggestions });
  } catch (e) {
    console.error('ai/review failed', e);
    return json(res, 502, { error: 'AI request failed' });
  }
}
```

- [ ] **Step 2: Write `image.js`**

```js
// api/admin/ai/image.js
// POST /api/admin/ai/image — { kind, record } -> { url, generated:true }. requireAdmin.
import OpenAI from 'openai';
import { put } from '@vercel/blob';
import { json, readJsonBody } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { generateImage } from '../../_lib/ai/generate.js';

const KINDS = new Set(['place', 'event', 'mom']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return json(res, 500, { error: 'OPENAI_API_KEY not set' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 500, { error: 'Blob storage not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  if (!KINDS.has(body.kind)) return json(res, 400, { error: 'kind must be place|event|mom' });
  if (!body.record || typeof body.record !== 'object') return json(res, 400, { error: 'record required' });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const out = await generateImage({ openai, put }, body.kind, body.record);
    return json(res, 200, out);
  } catch (e) {
    console.error('ai/image failed', e);
    return json(res, 502, { error: 'Image generation failed' });
  }
}
```

- [ ] **Step 3: Verify the existing suite still passes**

Run: `npm test`
Expected: PASS (no regressions; new files have no tests but don't break others).

- [ ] **Step 4: Commit**

```bash
git add api/admin/ai/review.js api/admin/ai/image.js
git commit -m "feat(admin-ai): review + image endpoints"
```

---

## Task 7: HTTP handler — `POST /api/admin/upload-image` (file→Blob)

**Files:**
- Create: `api/admin/upload-image.js`

- [ ] **Step 1: Write the handler (reuses the TDD'd `decodeDataUrl`)**

```js
// api/admin/upload-image.js
// POST /api/admin/upload-image — { kind, id, dataUrl } -> { url }. requireAdmin.
// Plain admin file upload (NOT AI): decode base64 image -> Vercel Blob -> URL.
// Mirrors api/profile-photo.js but admin-gated and kind-foldered.
import { put } from '@vercel/blob';
import { json, readJsonBody, randomHex } from '../_lib/supabase.js';
import { requireAdmin } from '../_lib/admin-auth.js';
import { decodeDataUrl } from '../_lib/ai/prompts.js';

const MAX_BYTES = 8 * 1024 * 1024;
const FOLDER = { place: 'places', event: 'events', mom: 'profiles' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return json(res, 500, { error: 'Blob storage not configured' });

  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });
  const folder = FOLDER[body.kind];
  if (!folder) return json(res, 400, { error: 'kind must be place|event|mom' });

  const decoded = decodeDataUrl(body.dataUrl);
  if (!decoded) return json(res, 400, { error: 'dataUrl must be a base64 jpeg/png/webp image' });
  if (decoded.bytes.length > MAX_BYTES) return json(res, 413, { error: 'Image too large (max 8MB)' });

  try {
    const id = String(body.id || 'new').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'new';
    const path = `${folder}/up-${id}-${randomHex(6)}.${decoded.ext}`;
    const blob = await put(path, decoded.bytes, { access: 'public', contentType: decoded.contentType });
    return json(res, 200, { url: blob.url });
  } catch (e) {
    console.error('upload-image failed', e);
    return json(res, 502, { error: 'Upload failed' });
  }
}
```

- [ ] **Step 2: Confirm `randomHex` is exported by `_lib/supabase.js`**

Run: `grep -n "randomHex" api/_lib/supabase.js`
Expected: an `export const randomHex` (already used by `api/profile-photo.js`). If absent, use `crypto.randomBytes(6).toString('hex')` with `import { randomBytes } from 'node:crypto'`.

- [ ] **Step 3: Commit**

```bash
git add api/admin/upload-image.js
git commit -m "feat(admin-ai): admin file->Blob upload endpoint"
```

---

## Task 8: `AiWriteButton.jsx`

**Files:**
- Create: `src/screens/admin/components/AiWriteButton.jsx`

> React — no unit test harness in repo. Build, then manually verify in Task 10.

- [ ] **Step 1: Write the component**

```jsx
// src/screens/admin/components/AiWriteButton.jsx
// Inline "Write with AI" pill. Calls /api/admin/ai/describe and hands the text
// back via onWrite — the parent drops it into the editable field. Never saves.
import { useState } from 'react';
import { adminFetch } from '../lib/adminFetch.js';
import { AC } from '../admin-theme.js';

export const AiWriteButton = ({ kind, record, onWrite }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setBusy(true); setErr('');
    try {
      const r = await adminFetch('/api/admin/ai/describe', {
        method: 'POST', body: JSON.stringify({ kind, record }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'failed');
      onWrite(data.description || '');
    } catch (e) {
      setErr(e.message || 'AI failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button type="button" onClick={run} disabled={busy}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: 'transparent', border: `1px solid ${AC.accent}`, color: AC.accent,
          borderRadius: 999, padding: '3px 10px', fontFamily: AC.font, fontSize: 12,
          fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
        }}>
        {busy ? 'Writing…' : '✨ Write with AI'}
      </button>
      {err && <span style={{ color: AC.danger, fontSize: 11, fontFamily: AC.font }}>{err}</span>}
    </span>
  );
};
```

- [ ] **Step 2: Confirm `adminFetch` signature + `AC` token names**

Run: `grep -n "export const adminFetch" src/screens/admin/lib/adminFetch.js; grep -n "accent\|danger\|font:" src/screens/admin/admin-theme.js | head`
Expected: `adminFetch(path, opts)` exists; `AC.accent`, `AC.danger`, `AC.font` exist. If `adminFetch` returns parsed JSON rather than a `Response`, adjust Step 1 to use the returned object directly (check the two existing call sites in `EventEditModal`/`PlaceEditModal`).

- [ ] **Step 3: Build to verify it compiles**

Run: `npm run build`
Expected: build succeeds (no import/syntax errors).

- [ ] **Step 4: Commit**

```bash
git add src/screens/admin/components/AiWriteButton.jsx
git commit -m "feat(admin-ai): AiWriteButton component"
```

---

## Task 9: `AiImageControl.jsx`

**Files:**
- Create: `src/screens/admin/components/AiImageControl.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/screens/admin/components/AiImageControl.jsx
// Generate (AI) OR Upload (from machine) -> a public Blob URL handed back via
// onImage(url, meta). Generate stamps { generated:true }; upload does not.
import { useRef, useState } from 'react';
import { adminFetch } from '../lib/adminFetch.js';
import { AC } from '../admin-theme.js';

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(fr.result);
  fr.onerror = reject;
  fr.readAsDataURL(file);
});

export const AiImageControl = ({ kind, record, onImage }) => {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const generate = async () => {
    setBusy('generate'); setErr('');
    try {
      const r = await adminFetch('/api/admin/ai/image', { method: 'POST', body: JSON.stringify({ kind, record }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'failed');
      onImage(data.url, { generated: true });
    } catch (e) { setErr(e.message || 'Generate failed'); } finally { setBusy(''); }
  };

  const upload = async (file) => {
    if (!file) return;
    setBusy('upload'); setErr('');
    try {
      const dataUrl = await fileToDataUrl(file);
      const r = await adminFetch('/api/admin/upload-image', {
        method: 'POST', body: JSON.stringify({ kind, id: record?.id, dataUrl }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'failed');
      onImage(data.url, { generated: false });
    } catch (e) { setErr(e.message || 'Upload failed'); } finally { setBusy(''); }
  };

  const pill = (label, on, active) => (
    <button type="button" onClick={on} disabled={!!busy}
      style={{
        background: 'transparent', border: `1px solid ${AC.border}`, color: AC.text,
        borderRadius: 999, padding: '3px 10px', fontFamily: AC.font, fontSize: 12,
        fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy && !active ? 0.5 : 1,
      }}>{active ? '…' : label}</button>
  );

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {pill('🖼️ Generate', generate, busy === 'generate')}
      {pill('📤 Upload', () => fileRef.current?.click(), busy === 'upload')}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden
        onChange={(e) => upload(e.target.files?.[0])} />
      {err && <span style={{ color: AC.danger, fontSize: 11, fontFamily: AC.font }}>{err}</span>}
    </span>
  );
};
```

- [ ] **Step 2: Confirm `AC.border` / `AC.text` exist**

Run: `grep -n "border:\|text:\|textMuted:" src/screens/admin/admin-theme.js | head`
Expected: `AC.border`, `AC.text` present (used widely by `primitives.jsx`). Substitute the nearest token if a name differs.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/screens/admin/components/AiImageControl.jsx
git commit -m "feat(admin-ai): AiImageControl (generate or upload)"
```

---

## Task 10: `AiReviewButton.jsx` + `SuggestionChips.jsx`

**Files:**
- Create: `src/screens/admin/components/SuggestionChips.jsx`
- Create: `src/screens/admin/components/AiReviewButton.jsx`

- [ ] **Step 1: Write `SuggestionChips.jsx`**

```jsx
// src/screens/admin/components/SuggestionChips.jsx
// Renders /review results as accept/dismiss chips. Accept applies to form state.
import { AC } from '../admin-theme.js';

export const SuggestionChips = ({ suggestions, onAccept, onDismiss }) => {
  if (!suggestions?.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
      {suggestions.map((s, i) => (
        <div key={`${s.field}-${i}`}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: AC.surfaceAlt || AC.surface,
            border: `1px solid ${AC.border}`, borderRadius: 8, padding: '6px 10px' }}>
          <span style={{ fontFamily: AC.mono || AC.font, fontSize: 11, fontWeight: 700, color: AC.accent }}>{s.field}</span>
          <span style={{ flex: 1, fontFamily: AC.font, fontSize: 12, color: AC.text }}>
            {s.suggested} <span style={{ color: AC.textMuted }}>— {s.reason}</span>
          </span>
          <button type="button" onClick={() => onAccept(s)}
            style={{ background: AC.success, color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px',
              fontFamily: AC.font, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Accept</button>
          <button type="button" onClick={() => onDismiss(s)}
            style={{ background: 'transparent', color: AC.textMuted, border: 'none', fontSize: 14, cursor: 'pointer' }}>×</button>
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Write `AiReviewButton.jsx`**

```jsx
// src/screens/admin/components/AiReviewButton.jsx
// Top-of-modal "Review record" action. Fetches suggestions and renders chips.
// Accept calls onApply(field, value); the parent maps that to its form setter.
import { useState } from 'react';
import { adminFetch } from '../lib/adminFetch.js';
import { AC } from '../admin-theme.js';
import { SuggestionChips } from './SuggestionChips.jsx';

export const AiReviewButton = ({ kind, record, onApply }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [result, setResult] = useState(null); // null = not run, [] = ran, none

  const run = async () => {
    setBusy(true); setErr('');
    try {
      const r = await adminFetch('/api/admin/ai/review', { method: 'POST', body: JSON.stringify({ kind, record }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'failed');
      setResult(data.suggestions || []);
    } catch (e) { setErr(e.message || 'Review failed'); } finally { setBusy(false); }
  };

  const accept = (s) => { onApply(s.field, s.suggested); setResult((rs) => rs.filter((x) => x !== s)); };
  const dismiss = (s) => setResult((rs) => rs.filter((x) => x !== s));

  return (
    <div>
      <button type="button" onClick={run} disabled={busy}
        style={{ background: 'transparent', border: `1px solid ${AC.border}`, color: AC.text, borderRadius: 999,
          padding: '4px 12px', fontFamily: AC.font, fontSize: 12, fontWeight: 600,
          cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'Reviewing…' : '🔎 Review record'}
      </button>
      {err && <span style={{ color: AC.danger, fontSize: 11, fontFamily: AC.font, marginLeft: 8 }}>{err}</span>}
      {result && result.length === 0 && (
        <span style={{ color: AC.textMuted, fontSize: 12, fontFamily: AC.font, marginLeft: 8 }}>Looks good — no suggestions.</span>
      )}
      <SuggestionChips suggestions={result} onAccept={accept} onDismiss={dismiss} />
    </div>
  );
};
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds. (If `AC.surfaceAlt`/`AC.mono` are undefined the `||` fallbacks cover them; verify token names with `grep -n "surface\|mono" src/screens/admin/admin-theme.js`.)

- [ ] **Step 4: Commit**

```bash
git add src/screens/admin/components/SuggestionChips.jsx src/screens/admin/components/AiReviewButton.jsx
git commit -m "feat(admin-ai): AiReviewButton + SuggestionChips"
```

---

## Task 11: Wire into `PlaceEditModal`

**Files:**
- Modify: `src/screens/admin/managers/PlaceEditModal.jsx`

- [ ] **Step 1: Import the components**

At the top of `PlaceEditModal.jsx`, after the existing imports, add:

```jsx
import { AiWriteButton } from '../components/AiWriteButton.jsx';
import { AiImageControl } from '../components/AiImageControl.jsx';
import { AiReviewButton } from '../components/AiReviewButton.jsx';
```

- [ ] **Step 2: Add the Review action near the top of the modal body**

Find the first form section (just inside the scrollable body, before the Name field). Insert:

```jsx
<AiReviewButton kind="place" record={form} onApply={(field, value) => set(field, value)} />
```

(`set(k, v)` is the existing setter at `PlaceEditModal.jsx:108`.)

- [ ] **Step 3: Add the Write button on the Description field**

Find the Description label/field. Render the button beside the label:

```jsx
<AiWriteButton kind="place" record={form} onWrite={(text) => set('description', text)} />
```

- [ ] **Step 4: Add the Image control on the hero photo**

Find the hero-photo block (around the `heroRef`/`blob_url` logic near line 249). Beside it add:

```jsx
<AiImageControl kind="place" record={form}
  onImage={(url) => set('hero_photo', url)} />
```

(Confirm the form's hero field name with `grep -n "hero_photo\|hero" src/screens/admin/managers/PlaceEditModal.jsx`; use the actual key.)

- [ ] **Step 5: Build, then manually verify**

Run: `npm run build` (expect success), then `vercel dev` and open `/admin/places`, edit a place:
- Click **✨ Write with AI** → Description fills, you can edit, then Save persists it.
- Click **🖼️ Generate** → a hero image URL appears; **📤 Upload** → pick a file, URL appears.
- Click **🔎 Review record** → chips appear; **Accept** updates a field; Save persists.

- [ ] **Step 6: Commit**

```bash
git add src/screens/admin/managers/PlaceEditModal.jsx
git commit -m "feat(admin-ai): wire AI assist into PlaceEditModal"
```

---

## Task 12: Wire into `EventEditModal`

**Files:**
- Modify: `src/screens/admin/managers/EventEditModal.jsx`

- [ ] **Step 1: Import the components** (after existing imports)

```jsx
import { AiWriteButton } from '../components/AiWriteButton.jsx';
import { AiImageControl } from '../components/AiImageControl.jsx';
import { AiReviewButton } from '../components/AiReviewButton.jsx';
```

- [ ] **Step 2: Review action near the top of the body**

```jsx
<AiReviewButton kind="event" record={form} onApply={(field, value) => setForm((f) => ({ ...f, [field]: value }))} />
```

(`form`/`setForm` exist at `EventEditModal.jsx:66`.)

- [ ] **Step 3: Write button on the Description field**

```jsx
<AiWriteButton kind="event" record={form} onWrite={(text) => setForm((f) => ({ ...f, description: text }))} />
```

- [ ] **Step 4: Image control on the hero photo**

Find the event hero/photo field (`grep -n "hero\|photo\|hue" src/screens/admin/managers/EventEditModal.jsx`). Beside it:

```jsx
<AiImageControl kind="event" record={form} onImage={(url) => setForm((f) => ({ ...f, hero_photo: url }))} />
```

(Use the actual hero field key from the grep — events store it as `hero_photo` in the DB.)

- [ ] **Step 5: Build + manual verify** at `/admin/events` (same three checks as Task 11, Step 5).

Run: `npm run build`
Expected: success, then verify in `vercel dev`.

- [ ] **Step 6: Commit**

```bash
git add src/screens/admin/managers/EventEditModal.jsx
git commit -m "feat(admin-ai): wire AI assist into EventEditModal"
```

---

## Task 13: Wire into `MomProfileDetailModal`

**Files:**
- Modify: `src/screens/admin/sections/MomProfilesSection.jsx` (inner `MomProfileDetailModal`, defined ~line 445)

> This modal uses `draft`/`setDraft` and edits `bio` + a `photos` array. It does **not** receive `adminFetch` — the components import it directly, so no prop threading is needed.

- [ ] **Step 1: Import the components** (top of `MomProfilesSection.jsx`)

```jsx
import { AiWriteButton } from '../components/AiWriteButton.jsx';
import { AiImageControl } from '../components/AiImageControl.jsx';
import { AiReviewButton } from '../components/AiReviewButton.jsx';
```

- [ ] **Step 2: Review action near the top of the modal body**

Inside `MomProfileDetailModal`'s edit view, add:

```jsx
<AiReviewButton kind="mom" record={draft} onApply={(field, value) => setDraft((d) => ({ ...d, [field]: value }))} />
```

- [ ] **Step 3: Write button on the `bio` textarea**

Beside the bio field label:

```jsx
<AiWriteButton kind="mom" record={draft} onWrite={(text) => setDraft((d) => ({ ...d, bio: text }))} />
```

(If the field the modal saves is `bio`, write there; confirm with `grep -n "bio" src/screens/admin/sections/MomProfilesSection.jsx`.)

- [ ] **Step 4: Image control feeding the `photos` array**

Near `AddPhotoRow` (the existing URL-paste add), add a generate/upload control that appends to `photos`:

```jsx
<AiImageControl kind="mom" record={draft}
  onImage={(url) => setDraft((d) => ({ ...d, photos: [...(d.photos || []), url].slice(0, 5) }))} />
```

(Caps at 5 to match the existing `(mom.photos || []).length < 5` rule.)

- [ ] **Step 5: Build + manual verify** at `/admin` → Mom profiles → open a profile → edit:

Run: `npm run build`
Expected: success. Then in `vercel dev`: Write fills bio; Generate adds an AI portrait to photos; Review suggests persona fixes; Save persists via the existing `onPatched` path.

- [ ] **Step 6: Commit**

```bash
git add src/screens/admin/sections/MomProfilesSection.jsx
git commit -m "feat(admin-ai): wire AI assist into MomProfileDetailModal"
```

---

## Task 14: Full-suite green + spec cross-check

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: PASS, including the new `api/_lib/ai/prompts.test.mjs` and `api/_lib/ai/generate.test.mjs`.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit any final fixes, then this feature branch is ready to merge.**

```bash
git commit -am "chore(admin-ai): suite green" --allow-empty
```

---

## Notes for the implementer

- **`adminFetch` shape:** the components assume `adminFetch(path, opts)` returns a `fetch` `Response` (so we call `.json()` and check `.ok`). Verify against the two existing call sites in `EventEditModal`/`PlaceEditModal` (Task 8, Step 2). If it returns already-parsed JSON or throws on non-2xx, adjust all four components' fetch blocks identically.
- **`AC` token names:** every component uses `AC.accent/danger/border/text/textMuted/success/font` plus optional `AC.mono/surface/surfaceAlt` (guarded with `||`). Confirm names in `admin-theme.js` before building; rename if the console uses different keys.
- **No DB writes from AI:** all four components only call their `on*` callback into form state. Saving stays the modals' existing responsibility — do not add a write call inside the AI components.
- **Provenance:** `onImage` passes `{ generated }`; wiring tasks currently ignore the meta for simplicity. If/when a `generated` flag column is added per record, thread it from the `onImage` second arg into the form (spec open question #2).
