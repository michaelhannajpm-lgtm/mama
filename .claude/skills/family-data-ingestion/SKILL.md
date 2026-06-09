---
name: family-data-ingestion
description: Use when implementing or modifying Go Mama background jobs that discover, import, normalize, dedupe, and stage family-friendly places or events from Google Places, Eventbrite, public Facebook/Instagram pages via official APIs, local news/event calendars, county/city sites, libraries, museums, attractions, parks, YMCA, kids gyms, and other Tampa-area sources.
---

# Family Data Ingestion

Build background ingestion for Go Mama's local family database. The job should find kid-friendly places and events, preserve source provenance, dedupe aggressively, and stage new records for admin review.

## First Read

- `CLAUDE.md`
- `supabase/places_schema.sql`
- `supabase/events_schema.sql`
- `api/_lib/supabase.js`
- `api/_lib/seed.js`
- `src/data/places.js`
- `src/data/events.js`

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

The current app is a Vite/Supabase project with service-role server routes and seed data. Keep ingestion server-side:

- Reusable ingestion modules: `api/_lib/ingestion/`
- CLI runner: `scripts/ingest-family-data.mjs`
- Optional scheduled Vercel endpoint: `api/cron/ingest-family-data.js`, gated by `CRON_SECRET`
- Source configs: `api/_lib/ingestion/sources.js` or `scripts/ingestion/sources/*.json`
- Parser fixtures and tests: `scripts/ingestion/fixtures/`

Use Node's built-in `fetch` first. Add dependencies only when they materially reduce risk, such as `cheerio` for HTML parsing or an iCalendar parser for `.ics` feeds.

## Work Order

1. Reconcile the data model first. The DB `places.category` check constraint is older than `src/data/places.js`; do not import into the wrong taxonomy. See `references/data-contract.md`.
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
9. Update admin read/review surfaces if new `review_status` or source fields need to be visible.

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

- Use fixture tests for parsers; do not make tests depend on live websites.
- Run `npm run build` after code changes.
- For live ingestion, run one source with `--dry-run --limit 5` before any write.
- Verify writes against Supabase with service-role credentials only from server-side code.

## Done Criteria

- New or changed sources can be configured without editing core ingestion flow.
- Every imported record has provenance and review status.
- The job can run as a CLI and, if requested, as a cron endpoint.
- The importer is idempotent: re-running the same source does not duplicate places/events.
- Failures in one source do not stop the entire run; they are logged in the run summary.
