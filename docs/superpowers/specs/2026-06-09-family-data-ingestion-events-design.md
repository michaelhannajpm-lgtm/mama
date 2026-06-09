# Family Data Ingestion — Events Vertical Slice — Design

**Status:** Approved design, ready for implementation plan.
**Date:** 2026-06-09
**Predecessor:** `2026-06-08-family-data-ingestion-places-design.md` (places slice — shipped). This slice reuses its provenance tables, `images.js`, dedupe/connector idioms, `App.jsx` loader pattern, and admin-CRUD shape.

## Goal

Replace Go Mama's hardcoded event directory (`SUGGESTED_EVENTS`) with a live pipeline: ingest real Tampa family **events** from Eventbrite, official calendars (ICS / JSON-LD / RSS), and (built-but-disabled) Meta Graph; link each event to an existing place where possible; preserve source provenance; dedupe; stage new events for admin review; approve/edit them in a full-CRUD admin tool; and serve approved (`visible`) events to the app via a server API route — with the hardcoded data kept as a fallback so the app never renders blank.

## Decisions (from brainstorming)

- **Event model — Approach A (dated events first-class).** Extend the existing `events` table with dated fields + a `kind` discriminator (`'recurring' | 'dated'`). For dated events the normalizer always derives `day_of_week`/`bucket`/`time_label` from `starts_at` (in `America/New_York`) so every existing card renders unchanged. A dormant "This week" surface in `ActivitiesTab` is lit up with real upcoming dated events.
- **Connectors:** Eventbrite (live — `EVENTBRITE_API_TOKEN` available), official calendars via ICS + JSON-LD (runnable against public feeds + checked-in fixtures), Meta Graph **built but its source config `enabled: false`** with notes (no token yet).
- **Scope:** Full end-to-end, like the places slice (DB → ingestion → public `/api/events` → app UI with fallback → full-CRUD admin).
- **Place creation deferred:** ingestion links events to *existing* places by venue name/geo; it does **not** auto-create place rows from event venues. Unmatched events keep their raw `place_name` for an admin to resolve via a place picker.
- **One plan** covering all phases.

## Architecture

Additive DB schema on `events` (dated + provenance + review fields) + `event_categories` join + `kind='event'` rows in `categories` → reuse existing `ingestion_sources`/`ingestion_runs`/`source_records` provenance tables (already have `record_type='event'` + `event_id`) → public service-role read route `/api/events` → `App.jsx` central loader drills live events to screens (hardcoded `SUGGESTED_EVENTS` kept as fallback) → config-driven event connectors under `api/_lib/ingestion/connectors/` reusing the `fetchRaw`/`parseX` shape → event orchestrator + extended CLI → full-CRUD admin `EventsManager` in `AdminPage.jsx`.

## Constraints inherited from the codebase

- Named exports only; one component per file. State lives in `App.jsx`; prop-drill, no Context/store.
- Always reference `C.tokenName` (from `src/theme.js`). **Sage = community/groups** — events use the sage palette (consistent with `GroupCardFull`). Coral = 1:1; saffron = premium.
- All data access via `/api/*`; admin routes gated by `requireAdmin`. New rows: `visible=false`, `review_status='needs_review'`.
- `city` stored as `'Tampa, FL'` (with state). Generated event slugs are namespaced by source id and must never collide with curated short ids (`e-coffee-mom`).
- DDL applied via Supabase MCP (`execute_sql`/`apply_migration`, project `jsclxwvgeirbdovsjbnv`); collect all SQL into a versioned `supabase/_apply_phase4_events.sql`. The on-disk `.sql` files are stale — verify the live constraint first.
- No test framework; use `node:test` for fixtures, `node --check` for syntax, `npm run build` for `src/` changes.

## Live `events` table (verified 2026-06-09)

`id uuid, slug text, name text, place_id uuid (FK→places), city text, day_of_week text, bucket text, time_label text, recurring text default 'Weekly', tags text[], hero_photo text, going_count int default 0, visible bool default true, created_at, updated_at`. CHECK constraints on `bucket` (`morning|noon|afternoon|night-owl`) and `day_of_week` (`Mon..Sun`). NOT-NULL: `slug,name,city,day_of_week,bucket,time_label,tags,going_count,visible`.

## 1. Schema (`supabase/_apply_phase4_events.sql`, idempotent)

Additive columns on `events`:

```sql
alter table public.events
  add column if not exists kind            text not null default 'recurring',
  add column if not exists event_type      text,
  add column if not exists starts_at       timestamptz,
  add column if not exists ends_at         timestamptz,
  add column if not exists timezone        text not null default 'America/New_York',
  add column if not exists description     text,
  add column if not exists place_name      text,
  add column if not exists area            text,
  add column if not exists website         text,
  add column if not exists source_url      text,
  add column if not exists external_id     text,
  add column if not exists age_min         smallint,
  add column if not exists age_max         smallint,
  add column if not exists price_summary   text,
  add column if not exists kid_ages        text[] not null default '{}',
  add column if not exists indoor          boolean,
  add column if not exists hue             text,
  add column if not exists going_label     text,
  add column if not exists review_status   text not null default 'needs_review',
  add column if not exists last_seen_at    timestamptz,
  add column if not exists source_confidence numeric(4,3);

alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check check (kind in ('recurring','dated'));
alter table public.events drop constraint if exists events_review_status_check;
alter table public.events add constraint events_review_status_check
  check (review_status in ('needs_review','approved','rejected','archived'));

create unique index if not exists events_external_id_key
  on public.events (external_id) where external_id is not null;
create index if not exists events_review_status_idx on public.events (review_status);
create index if not exists events_starts_at_idx on public.events (starts_at);
create index if not exists events_kind_idx on public.events (kind);
```

Backfill curated rows: `update public.events set kind='recurring', review_status='approved' where review_status='needs_review' and visible=true;`

`day_of_week`/`bucket`/`time_label` stay NOT-NULL. The normalizer **always** derives them from `starts_at` for dated events, so the constraints hold.

### Event types in `categories` + `event_categories` join

```sql
insert into public.categories (id, label, icon, kind, sort_order) values
  ('storytime','Storytime','BookOpen','event',1),
  ('class','Class','Palette','event',2),
  ('camp','Camp','Tent','event',3),
  ('festival','Festival','PartyPopper','event',4),
  ('playgroup','Playgroup','Users','event',5),
  ('workshop','Workshop','Wrench','event',6),
  ('performance','Performance','Drama','event',7),
  ('sports-event','Sports Event','Trophy','event',8),
  ('seasonal','Seasonal','Sparkles','event',9),
  ('support-group','Support Group','Heart','event',10)
on conflict (id) do nothing;

create table if not exists public.event_categories (
  event_id    uuid not null references public.events(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  primary key (event_id, category_id)
);
create index if not exists event_categories_cat_idx on public.event_categories (category_id);
```

`events.event_type` is the PRIMARY type (fast path); `event_categories` allows multi-type. `categories.kind='event'` keeps event types separate from place categories. **`categories.id` is a shared PK across both kinds**, so any event-type id that already exists as a place category must be distinct — the place category `sports` already exists (`kind='place'`), so the event type uses `sports-event`. All other event-type ids above are unique to events.

Provenance: **reuse** `ingestion_sources`, `ingestion_runs`, `source_records` from the places slice — `source_records.record_type='event'` and `source_records.event_id` already exist. No new provenance tables.

## 2. Source registry (extend `api/_lib/ingestion/sources.js`)

Add an `EVENT_SOURCES` array; keep the existing Google `SOURCES`. Each event source: `{ id, name, type, city, county, enabled, cadenceHours, parserVersion, url?, queries?|defaultType, notes? }`.

- `eventbrite-tampa-family` — `type:'eventbrite'`, enabled, cadence 24h, query list mapping search terms → `event_type`.
- `glazer-museum-ics`, `hcplc-library-ics` — `type:'ics'`, enabled, `url` to public `.ics`, `defaultType`.
- `<venue>-jsonld` — `type:'json_ld'`, enabled, `url` to a public event page.
- `fb-graph-tampa-venues` — `type:'facebook_graph'`, `enabled:false`, `notes:'Needs approved Meta app + page tokens; run when META_GRAPH_TOKEN present.'`

`getEventSource(id)` helper. Adding a source must not require touching control flow.

## 3. Connectors (`api/_lib/ingestion/connectors/`)

Same shape as `google-places.js`: a pure `parseX(body|text)` (fixture-tested, never hits network) + a `fetchRaw({...})` with bounded retry/backoff respecting `Retry-After`.

- **`eventbrite.js`** — live. `EVENTBRITE_API_TOKEN` bearer; paginated public search bounded by `since`/`limit`; external id = Eventbrite event id; `source_url` = ticket URL; preserves venue object for place-linking. `parseEventbrite(body)` pure.
- **`ics.js`** — uses `node-ical` (new dependency, justified: ICS parsing is fiddly and error-prone by hand). `parseIcs(text)` → array of `{ uid, summary, description, start, end, location, url }`. `fetchRaw` GETs the feed (honors `ETag`/`Last-Modified` when present).
- **`json-ld.js`** — `cheerio` (already justified in skill) to read `<script type="application/ld+json">`, collect schema.org `Event` nodes (handle `@graph` + arrays). `parseJsonLd(html)` pure.
- **`facebook-graph.js`** — built; source disabled. `parseGraphEvents(body)` pure + fixture-tested; `fetchRaw` throws a clear error if no `META_GRAPH_TOKEN`.

## 4. Normalization, place-linking, dedupe

- **`normalizeEvent(raw, { source, fetchedAt })`** (in `normalize.js`) → `eventCandidate`:
  - `name, description, startsAt, endsAt, timezone:'America/New_York', placeName, website, sourceUrl, externalId, eventType, ageMin, ageMax, priceSummary, kidAges, indoor, tags, confidence`.
  - Derived UI fields from `startsAt` in `America/New_York`: `dayOfWeek` (`Mon..Sun`), `bucket` (`morning` 5–10:59, `noon` 11–13:59, `afternoon` 14–17:59, `night-owl` 18–4:59), `timeLabel` (e.g. `10:30 AM`).
  - `kind='dated'`; `recurring` from source recurrence text or `'One-time'`.
  - `hue` gradient fallback via `images.js` `gradientForName` when no photo.
  - **slug** = `<sourcePrefix>-<normalized name>-<local YYYY-MM-DD>`, namespaced by source id so it can never collide with curated `e-*` ids.
  - `eventType` mapped from source category/query via a `mapEventType()` table (data-contract category mapping).
- **`linkEventToPlace(candidate, existingPlaces)`** (new, in `dedupe.js` or a `place-link.js`): match `placeName`/geo against `places` — exact normalized name + same city → match; geo ~75 m + name-similar → match (reuse `haversineMeters`). On match set `placeId`. On miss leave `placeId` null, keep `placeName`. **Never auto-creates a place.**
- **`classifyEventCandidate(cand, existingEvents)`** (in `dedupe.js`), per data-contract:
  1. exact `source_records(source_id, external_id, 'event')` → `update`.
  2. same normalized name + same `starts_at` + same `place_id` → `review`.
  3. same `source_url` + same start date → `review`.
  4. else `create`. Never duplicate on description/image change alone.

## 5. Public read API — `GET /api/events`

Public, `visible=true` only, embeds matched place. One query, two shapes via `api/_lib/events-shape.js`:
- **`recurring`** (`kind='recurring'`): reshaped into the `SUGGESTED_EVENTS` object shape (`{ id, day, bucket, time, name, place, going, recurring, tags, indoor, mi, kidAges, hue, photo }`) by `reshapeEvents(rows)`.
- **`thisWeek`** (`kind='dated'`, `starts_at` ∈ [now, now+14d], ordered asc): dated cards with `startsAt`, derived date label, place.

`reshapeEvents` and the payload normalizer are TDD-tested. Place embed: `place_id → places(name,area,lat,lng,hero_photo)`.

## 6. App wiring (Approach A, fallback like places)

- `src/lib/events-api.js` — `fetchEvents()`, `normalizeEventsPayload(payload)` (TDD) with empty fallback.
- `App.jsx` — `liveEvents` state + effect; `eventsData = liveEvents?.recurring?.length ? liveEvents.recurring : SUGGESTED_EVENTS`; pass `events` + `thisWeek` to `MainApp`.
- Screens read props with `SUGGESTED_EVENTS` fallback (minimal `const SUGGESTED_EVENTS = events || FALLBACK`): `MatchesTab`, `ActivitiesTab`, `FavoritesTab`, `CalendarTab`. Sheets (`MyPlansSheet`, `MyVillageSheet`) resolve a joined event id across live + fallback via a `findEventIn(list, id)` helper.
- **Light up "This week"** in `ActivitiesTab`: the dormant `'this-week'` filter renders `thisWeek` dated events (date label from `starts_at`), past events excluded.

## 7. Orchestration & CLI

- `api/_lib/ingestion/runEventIngestion.js` — per source → `fetchRaw` → `normalizeEvent` → `linkEventToPlace` → `classifyEventCandidate` → writer. Per-source failures isolated + logged in the run summary (`ingestion_runs`). `dryRun` ⇒ no writes, counts only.
- `writer.js` gains: `createEvent`, `refreshEvent` (never clobbers curator fields; refreshes facts + `last_seen_at`), `linkEventCategory`, `recordSource({record_type:'event', event_id})`, `loadExistingEvents`.
- `scripts/ingest-family-data.mjs` — dispatch by source `type`: `google_places` → place pipeline; `eventbrite|ics|json_ld|facebook_graph` → event pipeline. Same `--source --dry-run --limit --since` flags. Dry-run prints fetched/normalized/deduped/would-create/would-update/skipped/errors.

## 8. Admin CRUD

- `POST /api/admin/events/update` — modeled on `api/admin/places/update.js`: single edit / bulk status+visibility / delete. Editable set includes `place_id` (admin links an event to a place), `event_type`, dated fields, `kid_ages`, `tags`, `visible`, `review_status`.
- `GET /api/admin/events` — extend select to embed `place_name`, matched place (`place_id(...)`), and `event_categories(category_id)`.
- `src/admin/EventsManager.jsx` + `EventEditModal.jsx` — list with filters (status, type, kind, has-place, date range, search), row + bulk approve/reject/hide, edit modal with a **place picker** (search existing places → set `place_id`), event-type selector, dated fields, hero/hue. New `events` tab in `AdminPage.jsx` (sage accent).

## 9. Validation

- `node:test` fixtures: `parseEventbrite`, `parseIcs`, `parseJsonLd`, `parseGraphEvents` (checked-in raw samples under `scripts/ingestion/fixtures/`); `normalizeEvent` (derived day/bucket/time + tz correctness, slug namespacing); `linkEventToPlace`; `classifyEventCandidate`; `reshapeEvents`; `normalizeEventsPayload`. No test hits a live network.
- `node --check` on every new `.mjs`/`.js`; `npm run build` for `src/` changes.
- Live: `npm run ingest -- --source eventbrite-tampa-family --dry-run --limit 5`, then a bounded live run; verify rows land `visible=false`/`needs_review` with provenance; approve a batch in `/admin` → Events; confirm they appear in `/prototype` "This week"; toggling `visible=false` removes them on next load; offline → app still renders `SUGGESTED_EVENTS` fallback.

## Done criteria

- New/changed event sources are config-only — no control-flow edits.
- Every imported event has provenance (`source_records`) + `review_status`.
- Idempotent: re-running a source does not duplicate events (external-id update path).
- One source failing does not stop the run; it is logged in the run summary.
- Approved dated events surface in the app's "This week"; recurring events render through existing cards unchanged; fallback keeps the app non-blank.

## Out of scope (this slice)

- Auto-creating place rows from event venues (admin links manually).
- Live Meta Graph ingestion (connector built; source disabled until a token exists).
- RSS connector (registry supports the `rss` type; an RSS connector can be added later with no control-flow change — ICS + JSON-LD cover the official-calendar need now).
- Recommendation engine matching events ↔ moms (event types + `kid_ages` are captured to enable it later).
