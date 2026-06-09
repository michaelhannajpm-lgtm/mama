# Ingestion Control + Eventbrite Personal + Blob Images — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.
> Extends the shipped events slice (`2026-06-09-family-data-ingestion-events.md`). Image work MUST follow the `store-image` skill (`.claude/skills/store-image/SKILL.md`): upload to Vercel Blob first, persist `blob.url`, keep the source URL only as provenance.

**Goal:** (A) Pull events from the user's **personal Eventbrite account** via the private token; (B) extract event/place **images to Vercel Blob** and store the blob URL on the record; (C) run **both place and event ingestion from the admin screen** via a **background-job queue** (admin launches, polls status — no request timeout), staging everything for review before publish.

**Decisions (from the user, 2026-06-09):**
- Eventbrite: use the **personal account / private token** (no OAuth — it adds no capability; Eventbrite removed public search and this account has no orgs, so it returns 0 until the user organizes events; the connector is correct + future-proof).
- Admin runs: **full background-job infra** (async, unbounded via chunked continuation), not bounded sync runs.
- Images: reuse the in-progress `api/_lib/place-photo-blob.js` Blob helpers; extend to an `events/` folder.

**Env (already set):** `EVENTBRITE_API_TOKEN` (private token), `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`. Deps added: `@vercel/functions` (waitUntil). `@vercel/blob` already present.

**Provenance vs. image rule (store-image):** the external image URL (Eventbrite `logo.url`, JSON-LD `image`, Google `google_ref`) is **provenance**; the Vercel Blob URL is the app-renderable image. Store them separately.

---

# Phase 8 — Eventbrite personal connector + Blob image pipeline

### Task 8.1: DB — event image provenance + jobs prerequisites

**Files:** Create `supabase/_apply_phase5_ingestion_control.sql`; apply via Supabase MCP.

- [ ] Add the event image-source column (provenance) — `hero_photo` will hold the Blob URL:

```sql
alter table public.events
  add column if not exists image_source_url text;
```
Apply via MCP. Verify the column exists. Commit the sql file.

### Task 8.2: Blob image module — `image-blob.js` (TDD)

**Files:** Create `api/_lib/ingestion/image-blob.js`, `api/_lib/ingestion/image-blob.test.mjs`

Reuse the existing `api/_lib/place-photo-blob.js` helpers (`slugSegment`, `extForContentType`, `uploadPhotoBlob`). This module adds a generic remote-image downloader + an `events/` pathname + magic-byte validation.

- [ ] **Test** (`image-blob.test.mjs`) — pure helpers only (no network):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventImagePathname, sniffImageExt, isProbablyImage } from './image-blob.js';

test('eventImagePathname is url-safe under events/', () => {
  assert.match(eventImagePathname({ slug: 'Glazer Storytime!', hash: 'abc123', ext: 'jpg' }),
    /^events\/glazer-storytime\/hero-abc123\.jpg$/);
});

test('sniffImageExt detects png/jpeg/webp/gif from magic bytes', () => {
  assert.equal(sniffImageExt(Buffer.from([0x89,0x50,0x4e,0x47])), 'png');
  assert.equal(sniffImageExt(Buffer.from([0xff,0xd8,0xff,0xe0])), 'jpg');
  assert.equal(sniffImageExt(Buffer.from([0x47,0x49,0x46,0x38])), 'gif');
  // RIFF....WEBP
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0,0,0,0]), Buffer.from('WEBP')]);
  assert.equal(sniffImageExt(webp), 'webp');
});

test('isProbablyImage rejects html/empty', () => {
  assert.equal(isProbablyImage(Buffer.from('<html>')), false);
  assert.equal(isProbablyImage(Buffer.alloc(0)), false);
  assert.equal(isProbablyImage(Buffer.from([0x89,0x50,0x4e,0x47])), true);
});
```

- [ ] **Implement** `image-blob.js`:

```js
// Download a remote image and store a durable copy in the Vercel Blob events/
// folder (store-image skill). Pure helpers are fixture-testable; the network +
// upload live in storeEventImage.
import { put } from '@vercel/blob';
import { slugSegment } from '../place-photo-blob.js';

const MAGIC = [
  { ext: 'png',  bytes: [0x89, 0x50, 0x4e, 0x47] },
  { ext: 'jpg',  bytes: [0xff, 0xd8, 0xff] },
  { ext: 'gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
];
const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b);

export const sniffImageExt = (buf) => {
  if (!buf || buf.length < 4) return null;
  for (const m of MAGIC) if (startsWith(buf, m.bytes)) return m.ext;
  // RIFF????WEBP
  if (buf.length >= 12 && buf.slice(0, 4).toString('latin1') === 'RIFF' &&
      buf.slice(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
};

export const isProbablyImage = (buf) => sniffImageExt(buf) !== null;

export const eventImagePathname = ({ slug, hash, ext = 'jpg' }) =>
  `events/${slugSegment(slug)}/hero-${hash}.${ext}`;

const hashUrl = (url) => {
  let h = 0; for (let i = 0; i < (url || '').length; i++) h = (h * 31 + url.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
};

// Download an image URL, validate it's really an image, upload to Blob, return
// { url } (the durable blob URL) or null on any failure (non-fatal for ingest).
export async function storeEventImage({ imageUrl, slug, token = process.env.BLOB_READ_WRITE_TOKEN, logger = console }) {
  if (!imageUrl || !token) return null;
  try {
    const r = await fetch(imageUrl, { redirect: 'follow' });
    if (!r.ok) return null;
    const buffer = Buffer.from(await r.arrayBuffer());
    const ext = sniffImageExt(buffer);
    if (!ext) { logger.warn?.(`not an image: ${imageUrl}`); return null; }
    const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const pathname = eventImagePathname({ slug, hash: hashUrl(imageUrl), ext });
    const blob = await put(pathname, buffer, { access: 'public', contentType, addRandomSuffix: true, token });
    return { url: blob.url, pathname: blob.pathname };
  } catch (e) { logger.warn?.(`storeEventImage failed for ${imageUrl}: ${e.message}`); return null; }
}
```

- [ ] Run `node --test api/_lib/ingestion/image-blob.test.mjs` → 3 pass. Commit.

### Task 8.3: Connectors extract `imageUrl`; normalizer carries it (TDD)

**Files:** Modify `connectors/eventbrite.js`, `connectors/json-ld.js`, `connectors/place-website.js` (via json-ld), `normalize-event.js`, and their tests/fixtures.

- [ ] **Eventbrite connector rework** (`connectors/eventbrite.js`): replace the dead `events/search/` path. `fetchRaw` now: GET `/users/me/organizations/` → for each org GET `/organizations/{id}/events/?expand=venue,logo&status=live,started,ended,completed&order_by=start_asc`, page-bounded. `parseEventbrite(body)` stays pure; add `imageUrl: ev.logo?.original?.url || ev.logo?.url || null`. Update fixture `eventbrite-search.json` → `eventbrite-org-events.json` with a `logo` block, and update the test to assert `imageUrl`. Keep retry/backoff.
- [ ] **JSON-LD** (`connectors/json-ld.js`): in `parseJsonLd`, extract `imageUrl` from schema.org `image` (string | {url} | array → first). Add an assertion to its test using the existing fixture (add an `image` to `jsonld-event.html`).
- [ ] **normalize-event.js**: carry `imageUrl: i.imageUrl || null` onto the candidate. Add a test asserting it passes through.
- [ ] Run the connector + normalize tests → green. Commit.

### Task 8.4: Orchestrator stores event images to Blob

**Files:** Modify `api/_lib/ingestion/runEventIngestion.js`, `writer.js`.

- [ ] In `runEventIngestion`, after `createEvent` returns `eventId` (create branch), if `cand.imageUrl`: call `storeEventImage({ imageUrl: cand.imageUrl, slug: cand.slug })`; if it returns a blob `{url}`, update the event: `hero_photo = url`, `image_source_url = cand.imageUrl`. Non-fatal. (Import `storeEventImage` from `./image-blob.js`.) On the `update`/refresh branch, only set the image if `hero_photo` is currently null (never clobber a curated/admin image).
- [ ] Add a tiny writer helper `setEventImage(sb, eventId, { heroPhoto, imageSourceUrl })` that updates only those two columns. Use it from the orchestrator.
- [ ] `node --check` both; commit. (No live network in unit tests; the Blob path is exercised in the Phase-8 live run.)

### Task 8.5: Live verification (controller)

- [ ] Re-run `place-websites` live (`npm run ingest -- --source place-websites --limit 10`). Confirm: events with a JSON-LD `image` now have `hero_photo` = a `blob.vercel-storage.com` URL and `image_source_url` = the source. Confirm a blob URL loads publicly. Verify in DB.
- [ ] Eventbrite dry-run (`--source eventbrite-tampa-family --dry-run --limit 5`) → expect `fetched=0` cleanly (no 404; empty orgs), errors=0.

---

# Phase 9 — Background-job ingestion + admin launcher

Async job queue: admin enqueues → returns immediately → a CRON_SECRET-gated processor runs jobs in **chunks**, self-continuing across fresh invocations via `waitUntil(fetch(self))` so long runs never hit the request timeout. Admin polls job status.

### Task 9.1: DB — `ingestion_jobs` table

**Files:** Modify `supabase/_apply_phase5_ingestion_control.sql`; apply via MCP.

```sql
create table if not exists public.ingestion_jobs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('places','events')),
  source_id   text not null,
  params      jsonb not null default '{}'::jsonb,   -- { limit, since, allPlaces, venueLimit }
  status      text not null default 'queued' check (status in ('queued','running','succeeded','failed','partial','canceled')),
  cursor      integer not null default 0,           -- continuation offset into the work list
  total       integer,                              -- work-list size (queries/places), when known
  counts      jsonb not null default '{}'::jsonb,   -- accumulated run counts
  error       text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  updated_at  timestamptz not null default now()
);
create index if not exists ingestion_jobs_status_idx on public.ingestion_jobs (status, created_at);
```
Apply via MCP, verify, commit.

### Task 9.2: Orchestrators accept a work-slice (offset/limit) + report continuation

**Files:** Modify `runIngestion.js` (places) and `runEventIngestion.js` (events).

- [ ] Add optional `offset = 0` and `sliceSize` params. Each orchestrator iterates its **work list** (places: `source.queries`; events: queries for eventbrite, or the place list for place_website) starting at `offset`, processes up to `sliceSize` items, and returns `{ ...counts, processedItems, totalItems, nextOffset, hasMore }`. Accumulate counts into the passed-in job when chunking. Keep the existing full-run behavior when `sliceSize` is omitted (default = whole list). Preserve idempotency (existing dedupe).
- [ ] `node --check` both; existing tests still pass. Commit.

### Task 9.3: Job store helpers

**Files:** Create `api/_lib/ingestion/jobs.js`

- [ ] `enqueueJob(sb, { kind, sourceId, params })` → insert queued, return row. `claimNextJob(sb)` → atomically set the oldest `queued` (or `running` with stale `updated_at`) to `running`, return it (use a conditional update on status to avoid double-claim). `saveJobProgress(sb, id, { cursor, total, counts, status })`. `finishJob(sb, id, { status, counts, error })`. `listJobs(sb, { limit })`. `getJob(sb, id)`. All via supabase-js. `node --check`; commit.

### Task 9.4: Processor endpoint (CRON_SECRET-gated, chunked, self-continuing)

**Files:** Create `api/internal/process-ingestion.js`

- [ ] Auth: require `Authorization: Bearer ${CRON_SECRET}` (constant-time compare) OR Vercel cron header. Claim the next job (`claimNextJob`). If none, return `{ ok: true, idle: true }`. Else dispatch by `kind` to `runIngestion`/`runEventIngestion` with `{ offset: job.cursor, sliceSize: <e.g. 10>, env }`, merging returned counts into the job. Persist progress. If `hasMore`: set status back to `queued` (continuation) with the new `cursor`, then `waitUntil(fetch(selfUrl, { headers: { Authorization: Bearer CRON_SECRET } }))` to kick a fresh invocation; return. Else `finishJob(status: errors? 'partial' : 'succeeded')`. Self URL from `VERCEL_URL` (`https://${process.env.VERCEL_URL}/api/internal/process-ingestion`) falling back to a configured base. `node --check`; commit.

### Task 9.5: Admin enqueue + jobs-list routes

**Files:** Create `api/admin/ingestion/enqueue.js`, `api/admin/ingestion/jobs.js`

- [ ] `POST /api/admin/ingestion/enqueue` (requireAdmin): body `{ kind, sourceId, params }` validated (`kind` in places|events; `sourceId` a known source via `getSource`/`getEventSource`); `enqueueJob`; then `waitUntil(fetch(process-endpoint, Bearer CRON_SECRET))` to start it immediately; return the job row. 
- [ ] `GET /api/admin/ingestion/jobs` (requireAdmin): `listJobs` (most recent 50). `node --check` both; commit.

### Task 9.6: Admin launcher UI — `IngestionManager.jsx` + tab

**Files:** Create `src/admin/IngestionManager.jsx`; modify `src/AdminPage.jsx`

- [ ] `IngestionManager`: a launcher (select kind → source from the known source ids; `place` Google source + event sources `eventbrite-tampa-family`/`place-websites`; a `limit` input) that POSTs `/api/admin/ingestion/enqueue`; and a **jobs table** that polls `GET /api/admin/ingestion/jobs` every ~4s showing status, cursor/total progress, counts, error, timestamps. Sage accent, `C` tokens, lucide icons. Add an "Ingestion" tab to `AdminPage` (mirror the events-tab wiring: import, tab entry, render line; no new load() endpoint needed — the component self-polls).
- [ ] `npm run build`; commit.

### Task 9.7: Live verification (controller)

- [ ] Locally (or on a preview deploy), enqueue a small events job (`place-websites`, limit 5) via the admin route and confirm it transitions `queued → running → succeeded` with counts, processing in the background. Confirm a places job (`google-places-tampa`, small limit) chunks across continuations. Confirm staged rows are `needs_review`/hidden.

---

## Notes / follow-ups
- **Cron hardening (optional):** add a `crons` entry in `vercel.json` hitting `/api/internal/process-ingestion` every few minutes as a safety net for jobs whose `waitUntil` chain died. Deferred (the working tree has unrelated uncommitted `vercel.json` edits; add this in a dedicated commit when convenient). `CRON_SECRET` is already set.
- **Eventbrite returns 0** until the user organizes events on their personal account (auto-creates an org the connector then reads). Public Tampa discovery is not available via Eventbrite's API.
- **Venue place images** already become durable via the existing `place-photo-blob.js` backfill (Google → Blob); event images are the new Blob path here.
