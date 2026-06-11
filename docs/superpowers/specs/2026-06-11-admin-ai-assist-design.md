# Admin AI Assist — per-item description, image & review help in the edit modals

**Date:** 2026-06-11
**Status:** approved design (spec for review → implementation plan to follow)

## Problem

The admin already has OpenAI plumbing, but only for *batch* work:
`api/_lib/ingestion/enrich.js` writes place descriptions/tags/age-ranges during
ingestion, and `scripts/generate-mom-portraits.mjs` generates persona images via
`gpt-image-1` → Vercel Blob. Nothing does this **interactively, per item, inside
the admin UI** — when an operator is editing a single Place, Event, or Mom
Profile and wants help writing a description, getting an image, or sanity-checking
the fields.

The operator's ask: *"we have an OpenAI token — when I'm editing content on an
admin screen, let me auto-write a description, generate or upload an image, and
get recommendations to adjust fields."* This spec brings that capability into the
three edit modals, reusing the OpenAI/Blob plumbing that already exists.

## Goals

1. **Three powers, in-modal:** ✍️ **write a description**, 🖼️ **get an image**
   (generate *or* upload), 🔎 **review the record** (suggest field fixes).
2. **Three record types:** **Places, Events, Mom Profiles** (skip Weekly Favorite).
3. **Hybrid UI:** write + image affordances live **inline** next to their field;
   **review** is a single top-of-modal action that surfaces accept/dismiss chips.
4. **AI never writes the DB.** Every power fills *form state*; the admin reviews
   and saves through the existing save path. Preserves `enrich.js`'s
   "only fills, never clobbers" guarantee — now admin-controlled.
5. **Reuse, don't rebuild:** the same `openai` client, `OPENAI_API_KEY`,
   structured-output pattern, `gpt-image-1`→Blob pipeline, `requireAdmin` gate,
   `adminFetch`, and `AC` design system already in the codebase.

## Non-goals (YAGNI — possible fast-follows)

- Streaming responses; multi-image galleries; bulk "review all records";
  editing the prompt from the UI; a dedicated AI console section. (The earlier
  "create entities from a link" idea is a *different* feature — out of scope here.)

## Scope decisions (locked in brainstorm)

| Decision | Choice |
|---|---|
| Powers | A write description · B image (generate **or** upload) · C review record — **all three** |
| Record types | Place · Event · Mom Profile (**not** Weekly Favorite) |
| UI layout | **Hybrid** — write & image inline; review = top-of-modal chips |
| Generated images for real records (Place/Event) | **Photoreal, admin's call.** Stamp `generated:true` in metadata so they're distinguishable; admin decides when to use one. Mom profiles are fictional personas → AI portraits already fine. |
| DB writes by AI | **None.** AI fills form fields only; admin saves. |

## 1. Architecture — one shared layer, three endpoints

A new **`api/_lib/ai/`** module holds the brains; three thin admin endpoints
expose it. All gated by `requireAdmin` (bearer token, `api/_lib/admin-auth.js`),
same pattern as every other admin endpoint.

| Endpoint | Power | Body | Returns |
|---|---|---|---|
| `POST /api/admin/ai/describe` | ✍️ Write description | `{ kind, record }` | `{ description }` |
| `POST /api/admin/ai/image` | 🖼️ Generate image | `{ kind, record }` | `{ url, generated:true }` (already on Blob) |
| `POST /api/admin/ai/review` | 🔎 Review record | `{ kind, record }` | `{ suggestions: [{ field, suggested, reason }] }` |
| `POST /api/admin/upload-image` | 📤 Upload from machine (NOT AI) | `{ kind, id, dataUrl }` | `{ url }` (on Blob) |

`kind ∈ 'place' | 'event' | 'mom'`. `record` is the modal's current form object.

**The "Upload" path is new work.** There is no admin file→Blob endpoint today —
`api/profile-photo.js` does dataUrl→Blob but is **user-session-gated**, and the
admin's only photo surface (`AddPhotoRow` in `MomProfilesSection`) is **URL-paste
only**. So the Upload control needs a new `requireAdmin` endpoint that mirrors
`profile-photo.js` (validate base64 `dataUrl` → `@vercel/blob put` →
`<kind>/<id>-<hex>` → return URL). It is a plain upload, not an AI call — hence it
sits outside the `ai/` namespace, but the same `AiImageControl` drives it.

### `api/_lib/ai/` module layout

```
api/_lib/ai/
  client.js     new OpenAI({ apiKey: env.OPENAI_API_KEY }) factory (one place)
  prompts.js    per-kind prompt builders + JSON schemas:
                  describePrompt(kind, record)  / DESCRIBE_SCHEMA
                  reviewPrompt(kind, record)    / REVIEW_SCHEMA
                  imagePrompt(kind, record)
  describe.js   buildPrompt → chat.completions (gpt-4o-mini, strict json_schema)
  image.js      gpt-image-1 → bytes → @vercel/blob put() → public URL
  review.js     buildPrompt → chat.completions → suggestions[]
```

- **Text** (`describe`, `review`) → `gpt-4o-mini` + structured outputs, exactly
  as `enrich.js` does: `response_format: { type:'json_schema', json_schema:
  { strict:true, schema } }`, `additionalProperties:false`, no numeric/length
  constraints (clamp in code), handle `message.refusal`.
- **Image** → `openai.images.generate({ model:'gpt-image-1', … })` returns
  `b64_json` → decode → `put('<kind>/<id>-<n>', bytes, { access:'public' })`
  via `@vercel/blob` (reusing the `generate-mom-portraits.mjs` pattern and the
  `store-image` skill rule). Return the public Blob URL.

### Prompt reuse

The **place describe prompt reuses `enrich.js`'s `buildPrompt`** so interactive
descriptions read identically to batch-ingested ones. Event and Mom get sibling
builders in `prompts.js`:
- **Event** — name, type, when/where, tags → one warm factual sentence; no
  invented hours/prices.
- **Mom** — persona fields (types, values, interests, kid ages) → a short
  first-person-ish bio in the app's voice.

### Image-provenance stamp

Every generated image carries `generated:true` in metadata so generated vs. real
photos stay distinguishable later. Concretely: the `/image` response includes
`{ url, generated:true }`, and when the admin saves, that flag is recorded
alongside the image (e.g. in the row's photo/`metadata` JSON — exact column
confirmed during implementation per record type).

## 2. Frontend — small shared components

New files under `src/screens/admin/components/`, each self-contained and reused
across all three modals. **They import `adminFetch` directly from
`../lib/adminFetch.js`** rather than relying on prop-threading — important because
`MomProfileDetailModal` (defined inside `MomProfilesSection.jsx`) does **not**
currently receive an `adminFetch` prop, whereas `PlaceEditModal`/`EventEditModal`
do. Importing the helper keeps wiring uniform across all three.

- **`AiWriteButton.jsx`** — inline "✨ Write with AI" pill next to a textarea
  label. Props `{ kind, record, onWrite(text) }`. Calls `/describe`, drops the
  result into the editable field (admin reviews before saving). Local `busy`
  spinner; inline error.

- **`AiImageControl.jsx`** — the Generate / Upload pair next to a photo slot.
  Props `{ kind, record, onImage(url, meta) }`. **Generate** → `/api/admin/ai/image`
  (returns a Blob URL + `generated:true`). **Upload** → a `type="file"` input
  (new — the admin has none today) that reads the file to a base64 `dataUrl`
  client-side and posts it to the new `POST /api/admin/upload-image` endpoint,
  which returns a Blob URL. Both end by handing back a public URL via `onImage`;
  Generate also passes `{ generated:true }` so the modal can record provenance.

- **`AiReviewButton.jsx`** + **`SuggestionChips.jsx`** — "🔎 Review record" action
  calls `/review` and renders results as accept/dismiss chips
  (`{ field, suggested, reason }`). **Accept** applies the value to the modal's
  form state; **Dismiss** drops the chip. Chips stack near the top of the modal
  body. Empty result → a quiet "Looks good — no suggestions" line.

All four are styled with `AC` tokens + `primitives.jsx` (`Button`, `Badge`,
`Busy`), matching the existing in-modal async affordances (e.g. the
`scrapeEvents` busy state) so they feel native.

### Wiring into the three modals

| Modal (file) | Write | Image | Review |
|---|---|---|---|
| `PlaceEditModal.jsx` | on Description field | on hero photo | top-of-modal |
| `EventEditModal.jsx` | on Description field | on hero photo | top-of-modal |
| `MomProfileDetailModal` (in `MomProfilesSection.jsx`) | on `bio` | feeds the `photos` array | top-of-modal |

Each modal already owns a `form`/`setForm` state and a `busy` boolean for save;
the AI components hang off the same form object and own their *own* local busy so
they never block the save button.

## 3. Data flow, errors, chip behavior

- **Flow:** button → `adminFetch('/api/admin/ai/<power>', { method:'POST', body:{
  kind, record: form } })` → server builds the per-kind prompt → OpenAI → (image:
  Blob upload) → JSON back → component calls its `onWrite`/`onImage`/accept
  callback → modal `setForm(...)` updates → **admin saves as normal** through the
  existing `/api/admin/<entity>/update` path. The AI layer issues **no DB writes**.
- **Busy/error:** each component owns a local `busy` boolean (mirrors the existing
  `scraping` pattern) and disables itself while in flight. Errors surface as a
  small inline message under the control — no global toast, no thrown modal.
- **Review chips:** `/review` returns only *changed* suggestions (skips fields it
  judges already good). Accept is per-chip and idempotent; applying one doesn't
  re-fetch.

## What this reuses (no rebuild)

| Need | Reused from |
|---|---|
| OpenAI text client + structured output | `api/_lib/ingestion/enrich.js` |
| Place describe prompt | `enrich.js` `buildPrompt` (shared) |
| Image generation + Blob upload | `scripts/generate-mom-portraits.mjs` (`gpt-image-1`, `@vercel/blob put`), `store-image` skill |
| dataUrl→Blob upload pattern | `api/profile-photo.js` (copy the pattern into a **new** `requireAdmin` endpoint; today's admin photo surface is URL-paste only) |
| Admin auth | `api/_lib/admin-auth.js` `requireAdmin` |
| Client fetch | `src/screens/admin/lib/adminFetch.js` `adminFetch` |
| In-modal busy pattern | `EventEditModal` `scraping`/`busy` precedent |
| Design system | `AC` tokens + `primitives.jsx`, per `admin-design` skill |

## Risks & open questions

1. **Image cost/latency.** `gpt-image-1` is slow + costly vs. text. Mitigate with
   a clear busy state and a low default quality (the portraits script defaults
   `quality:'low'`); admin opts into higher quality later if we expose it.
2. **Generated-image provenance storage.** Where exactly the `generated:true`
   stamp lands differs per record (place hero vs. mom `photos[]` vs. event hero) —
   pin the exact column/JSON shape per type during implementation.
3. **Review schema discipline.** `/review` must only suggest fields that exist on
   that `kind` and use the controlled vocab where a field is enum-constrained
   (tags/age-ranges) — schema-enum the suggestable fields per kind so the model
   can't invent field names or tag strings.
4. **`adminFetch` import vs. prop.** Decided: components import the helper
   directly (uniform across modals, incl. the mom modal that lacks the prop). Flag
   if any modal renders outside the admin auth context (none do today).
5. **Mom bio voice.** The mom prompt must match the app's first-person persona
   voice, not the third-person factual place/event voice — separate builder.

## Future (cheap once the layer exists)

Streaming the description as it writes; "regenerate" / tone toggle on the write
button; multi-image generation; bulk review across a manager's rows; surfacing
the same `describe`/`review` endpoints to the ingestion job for consistency.
