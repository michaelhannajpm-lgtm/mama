---
name: family-data-ingestion
description: Use when implementing or modifying Go Mama background jobs that discover, import, normalize, dedupe, and stage family-friendly places or events from Google Places, Eventbrite, public Facebook/Instagram pages via official APIs, local news/event calendars, county/city sites, libraries, museums, attractions, parks, YMCA, kids gyms, and other Tampa-area sources.
---

# Family Data Ingestion

Build background ingestion for Go Mama's local family database. The job should find kid-friendly places and events, preserve source provenance, dedupe aggressively, and stage new records for admin review.

## First Read

Read these, and note what each actually is — the names are slightly misleading:

- `CLAUDE.md` — project guardrails (verified-only positioning, design tokens; ingestion is server-side and never touches UI tokens).
- `supabase/places_schema.sql`, `supabase/events_schema.sql` — table DDL. **Treat as a starting point, not ground truth — they are stale vs. the live DB** (see Repo Reality below).
- `api/_lib/seed.js` — **this is the canonical service-role write pattern to copy.** It creates the `@supabase/supabase-js` client via `createClient(url, serviceRoleKey, { auth: { persistSession: false } })`, builds payloads, and `upsert(rows, { onConflict: 'slug' })` in chunks of 100. Your ingestion writer should mirror it.
- `api/_lib/supabase.js` — **NOT a Supabase client.** It's PostgREST/`fetch` helpers (`supabaseCreds()`, `sbHeaders()`, `json()`, `isUuid()`, `cleanText()`) used by HTTP routes. Use these if you write a cron HTTP endpoint; use the `seed.js` client style for CLI/batch writes.
- `scripts/seed-supabase.mjs` + `scripts/seed-data/*` — **the repo's CLI-job precedent.** A thin `.mjs` wrapper around `api/_lib/seed.js`, plus support-data modules (`place-coords.js`, `name-pool.js`, `photo-pool.js`). Mirror this split for ingestion.
- `src/data/places.js`, `src/data/events.js` — the live taxonomy + the candidate field shapes you must produce.
- `package.json` — note `"seed": "node scripts/seed-supabase.mjs"`. Add an `"ingest"` script the same way. No test runner is configured (see Validation).

Then read:

- `references/data-contract.md` before changing schemas or upsert logic.
- `references/source-strategy.md` before adding source connectors or source configs.

## Guardrails

- Use official APIs, feeds, or public structured data where available. Use Google Places API, Eventbrite API, Facebook Graph API, and Instagram Graph API rather than logged-in scraping or browser automation.
- Do not scrape private Facebook groups, private Instagram content, personal profiles, or content behind login/session walls.
- Respect robots.txt, published terms, rate limits, `Retry-After`, `ETag`, and `Last-Modified`. Add bounded retries with backoff.
- Store source provenance for every imported record: source id, external id or URL, fetched timestamp, parser version, and confidence.
- Stage new records for human review. Default new imported places/events to `visible=false` and `review_status='needs_review'` unless the user explicitly asks for auto-publish.
- Do not overwrite curated admin fields unless the source is authoritative for that field or the user explicitly asks for automatic updates.
- Do not store unrelated personal data. For Facebook/Instagram/Eventbrite, import only event/place/business page metadata needed for Go Mama.

## Project Fit

The current app is a Vite/Supabase project with service-role server routes and seed data. Mirror the existing seed job's split — core logic shared between a CLI wrapper and (optionally) an HTTP route:

- Reusable ingestion modules (core logic + writer): `api/_lib/ingestion/` — the `seed.js` analog.
- CLI runner: `scripts/ingest-family-data.mjs` — thin wrapper, like `scripts/seed-supabase.mjs`. Add `"ingest": "node scripts/ingest-family-data.mjs"` to `package.json` alongside `"seed"`.
- Support/config data: `scripts/seed-data/*` is the precedent for static lookup modules (e.g. reuse `place-coords.js` for area→geo fallback).
- Source configs: `api/_lib/ingestion/sources.js` (JS, matching the rest of the codebase) over JSON.
- Parser fixtures: `scripts/ingestion/fixtures/` — checked-in raw samples + expected normalized output.
- Optional scheduled Vercel endpoint: `api/cron/ingest-family-data.js`, gated by `CRON_SECRET`. **None of this exists yet** — there is no `api/cron/`, no `CRON_SECRET`, and `vercel.json` has no `crons` array. Adding the endpoint means adding a `crons` entry to `vercel.json` and the `CRON_SECRET` env var. Default to the CLI; only add cron when the user asks.

Use Node's built-in `fetch` first. Add dependencies only when they materially reduce risk, such as `cheerio` for HTML parsing or an iCalendar parser for `.ics` feeds. The repo keeps its dependency list lean — justify any addition.

## Repo Reality

Concrete facts the schema files and examples don't tell you. Verify the live DB before trusting on-disk DDL.

- **The `.sql` files are stale.** `seed.js` already writes the *new* taxonomy (`schools`, `childcare`, … `fun`) into `places.category`, and seeding works — so the live DB's `category` CHECK constraint must already accept it, even though `supabase/places_schema.sql` still lists the *old* taxonomy (`cafes`, `parks`, …). Don't write a migration off the `.sql` file alone; inspect the deployed constraint first. See `references/data-contract.md`.
- **`city` is stored with state: `'Tampa, FL'`** (not `'Tampa'`). All seeded rows use this. Normalize ingested `city` to the same format or city-based dedupe and admin filters will silently miss matches.
- **Curated slugs are short, hand-authored ids** (`'bayshore'`, `'glazer'`, `e.id` like `'e-coffee-mom'`). Generate ingested slugs as `name + city` (data-contract rules) and ensure they can never collide with these curated ids — an upsert on a colliding slug would clobber a curated row. When in doubt, namespace ingested slugs (e.g. prefix with source).
- **Admin reads are free; admin writes are not.** `api/admin/places.js` and `events.js` are read-only `select=*`, so new columns (`review_status`, `source_url`, …) appear in the admin GET automatically. But there is **no places/events *update* endpoint** — only `mom-profiles` has one (`api/admin/mom-profiles/update.js`). A working review workflow (approve/reject) needs new write routes modeled on that file, plus admin UI in `AdminPage.jsx`.
- **`vercel.json` rewrites exclude `/api/`** (`"/((?!api/).*)"`), so any new `api/cron/*` route is reachable without rewrite changes.

## Work Order

1. Reconcile the data model first. Check the *live* `places.category` constraint against `src/data/places.js` (the on-disk `.sql` lists an old taxonomy but is likely stale — see Repo Reality). Never import into the wrong taxonomy. See `references/data-contract.md`.
2. Add ingestion-safe schema fields/tables for provenance, review status, source records, and run logs.
3. Add a config-driven source registry with enabled flags, source type, cadence, city/county, parser, and notes.
4. Implement connectors in this order:
   - Google Places for place discovery and geocoding.
   - Eventbrite for public events.
   - Official city/county/library/museum/attraction calendars using RSS, JSON-LD, ICS, or public HTML.
   - Facebook/Instagram only through approved Graph API access.
5. Normalize raw records into internal place/event candidates.
6. Dedupe before writing. Prefer exact source ids, then normalized name + address, then geo distance + name similarity.
7. Upsert in batches with service-role Supabase credentials.
8. Add dry-run output and parser fixtures before live writes.
9. Update admin surfaces. Reads are automatic (`api/admin/places.js`/`events.js` use `select=*`), but acting on `review_status` (approve/reject) needs **new write endpoints** — there is none for places/events today. Model them on `api/admin/mom-profiles/update.js` and add the controls in `AdminPage.jsx`. Defer this unless the user wants a usable review loop.

## Interfaces

Prefer small connector modules with the same shape:

```js
export async function fetchRaw({ source, since, limit, logger }) {}
export function normalizeRaw(rawRecord, { source, fetchedAt }) {}
```

Normalize into these candidate shapes before database writes:

```js
const placeCandidate = {
  name,
  category,
  city,
  area,
  description,
  tags,
  lat,
  lng,
  address,
  website,
  phone,
  sourceUrl,
  externalId,
  confidence,
};

const eventCandidate = {
  name,
  city,
  description,
  startsAt,
  endsAt,
  timezone: 'America/New_York',
  placeName,
  placeId,
  sourceUrl,
  externalId,
  tags,
  ageMin,
  ageMax,
  priceSummary,
  confidence,
};
```

Keep the current UI fields populated from normalized event times:

- `day_of_week`: `Mon` through `Sun`, derived in `America/New_York`.
- `bucket`: `morning`, `noon`, `afternoon`, or `night-owl`.
- `time_label`: user-facing local time such as `10:30 AM`.
- `recurring`: preserve source recurrence text when available; otherwise use `One-time`.

## CLI Behavior

The CLI should support dry runs and bounded source runs:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... GOOGLE_PLACES_API_KEY=... \
node scripts/ingest-family-data.mjs --dry-run --source google-places-tampa-kids --limit 25

SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... EVENTBRITE_API_TOKEN=... \
node scripts/ingest-family-data.mjs --source eventbrite-tampa-family --since 2026-06-01
```

Dry-run output must show counts for fetched, normalized, deduped, would-create, would-update, skipped, and errors.

## Validation

There is **no test framework** in this repo (`package.json` has no `test` script). Don't assume Jest/Vitest. Options, cheapest first:

- **Parser fixtures with `node:test`** (built-in, zero new deps): write `scripts/ingestion/fixtures/*.test.mjs` using `import { test } from 'node:test'` + `node:assert`, run with `node --test scripts/ingestion/`. Feed checked-in raw samples, assert on normalized output. Never let a test hit a live website.
- **`node --check <file>`** on changed `.mjs`/`.js` for a fast syntax gate (ingestion code is server-side and is *not* covered by `npm run build` — that only bundles the Vite frontend).
- **`npm run build`** still must pass if you touched anything under `src/` (e.g. taxonomy), but it does not exercise `api/` or `scripts/`.
- For live ingestion, run one source with `--dry-run --limit 5` before any write. Dry-run output must show counts for fetched, normalized, deduped, would-create, would-update, skipped, and errors.
- Verify writes against Supabase with service-role credentials only from server-side code. New imported rows must land `visible=false` / `review_status='needs_review'`.

## Done Criteria

- New or changed sources can be configured without editing core ingestion flow.
- Every imported record has provenance and review status.
- The job can run as a CLI and, if requested, as a cron endpoint.
- The importer is idempotent: re-running the same source does not duplicate places/events.
- Failures in one source do not stop the entire run; they are logged in the run summary.
