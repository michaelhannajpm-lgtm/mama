# Family Data Ingestion — Events Vertical Slice — Design

**Status:** Approved design, ready for implementation plan.
**Date:** 2026-06-09
**Predecessor:** `2026-06-08-family-data-ingestion-places-design.md` (places slice — shipped). This slice reuses its provenance tables, `images.js`, dedupe/connector idioms, `App.jsx` loader pattern, and admin-CRUD shape.

## Goal

Replace Go Mama's hardcoded event directory (`SUGGESTED_EVENTS`) with a live pipeline: ingest real Tampa family **events** from Eventbrite, official calendars (ICS / JSON-LD / RSS), and (built-but-disabled) Meta Graph; link each event to an existing place where possible; preserve source provenance; dedupe; stage new events for admin review; approve/edit them in a full-CRUD admin tool; and serve approved (`visible`) events to the app via a server API route — with the hardcoded data kept as a fallback so the app never renders blank.

## Decisions (from brainstorming)

- **Event model — Approach A (dated events first-class).** Extend the existing `events` table with dated fields + a `kind` discriminator (`'recurring' | 'dated'`). For dated events the normalizer always derives `day_of_week`/`bucket`/`time_label` from `starts_at` (in `America/New_York`) so every existing card renders unchanged. A dormant "This week" surface in `ActivitiesTab` is lit up with real upcoming dated events.
- **Connectors:** Eventbrite (live — `EVENTBRITE_API_TOKEN` available), official calendars via ICS + JSON-LD (runnable against public feeds + checked-in fixtures), Meta Graph **built but its source config `enabled: false`** with notes (no token yet), and a **`place_website` crawler** that fans out over the places already in the DB and discovers each place's own events from its public website (§10).
- **Places are event sources.** Every place with a `website` is crawled for its own events; discovered events are linked to the place via `place_id`. Event visibility is gated by place visibility (§5.1): a place's events can only appear in the app once the place is active+visible and the events are approved. Events are viewable/manageable from the Place CRUD detail panel, which has a one-click "scrape events from website" that runs the per-place ingestion (§8.1).
- **Scope:** Full end-to-end, like the places slice (DB → ingestion → public `/api/events` → app UI with fallback → full-CRUD admin).
- **Place creation deferred:** ingestion links events to *existing* places by venue name/geo; it does **not** auto-create place rows from event venues. Unmatched events keep their raw `place_name` for an admin to resolve via a place picker.
- **One plan** covering all phases.

## Architecture

Additive DB schema on `events` (dated + provenance + review fields) + `event_categories` join + `kind='event'` rows in `categories` → reuse existing `ingestion_sources`/`ingestion_runs`/`source_records` provenance tables (already have `record_type='event'` + `event_id`) → public service-role read route `/api/events` (with a place-visibility gate, §5.1) → `App.jsx` central loader drills live events to screens (hardcoded `SUGGESTED_EVENTS` kept as fallback) → config-driven event connectors under `api/_lib/ingestion/connectors/` reusing the `fetchRaw`/`parseX` shape, including a `place_website` crawler that fans out over DB places (§10) → event orchestrator + extended CLI → full-CRUD admin `EventsManager` plus a per-place events panel with one-click scraping in the Place CRUD detail (§8.1).

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
  -- Learning & enrichment
  ('storytime','Storytime','BookOpen','event',1),
  ('class','Class','Palette','event',2),
  ('workshop','Workshop','Wrench','event',3),
  ('stem','STEM','FlaskConical','event',4),
  ('art-class','Art','Brush','event',5),
  ('music-class','Music','Music','event',6),
  ('dance-class','Dance','Music2','event',7),
  ('cooking-class','Cooking','ChefHat','event',8),
  ('language-class','Language','Languages','event',9),
  ('tutoring','Academic','GraduationCap','event',10),
  -- Active & sports
  ('sports-event','Sports','Trophy','event',11),
  ('swim','Swim','Waves','event',12),
  ('gymnastics','Gymnastics','PersonStanding','event',13),
  ('martial-arts','Martial Arts','Swords','event',14),
  ('kids-fitness','Kids Fitness','Dumbbell','event',15),
  ('family-yoga','Family Yoga','Flower2','event',16),
  -- Camps
  ('camp','Camp','Tent','event',17),
  ('break-camp','Break Camp','TreePalm','event',18),
  -- Play & social
  ('playgroup','Playgroup','Users','event',19),
  ('open-play','Open Play','Blocks','event',20),
  ('parent-meetup','Parent Meetup','Coffee','event',21),
  ('support-group','Support Group','Heart','event',22),
  -- Entertainment & culture
  ('performance','Performance','Drama','event',23),
  ('movie','Movie','Film','event',24),
  ('concert','Concert','Mic2','event',25),
  ('museum-program','Museum Program','Landmark','event',26),
  ('library-program','Library Program','Library','event',27),
  ('animal-encounter','Animal Encounter','PawPrint','event',28),
  -- Seasonal & community
  ('festival','Festival','PartyPopper','event',29),
  ('fair','Fair','FerrisWheel','event',30),
  ('seasonal','Seasonal','Sparkles','event',31),
  ('farmers-market','Farmers Market','ShoppingBasket','event',32),
  ('community-event','Community','Megaphone','event',33),
  ('outdoor-adventure','Outdoor','Mountain','event',34),
  -- Parent & baby
  ('prenatal-class','Prenatal','Baby','event',35),
  ('new-parent','New Parent','HeartHandshake','event',36),
  ('parenting-class','Parenting','UsersRound','event',37),
  ('breastfeeding','Lactation Support','Milk','event',38),
  -- Inclusive
  ('sensory-friendly','Sensory-Friendly','Sparkle','event',39),
  ('special-needs','Special Needs','Accessibility','event',40),
  -- Civic & faith
  ('fundraiser','Fundraiser','HandHeart','event',41),
  ('religious','Faith / VBS','Church','event',42),
  -- Catch-all (never leaves an event uncategorized)
  ('other','Other','CircleDot','event',99)
on conflict (id) do nothing;

create table if not exists public.event_categories (
  event_id    uuid not null references public.events(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  primary key (event_id, category_id)
);
create index if not exists event_categories_cat_idx on public.event_categories (category_id);
```

`events.event_type` is the PRIMARY type (fast path); `event_categories` allows multi-type (an event can be both `stem` and `camp`). `categories.kind='event'` keeps event types separate from place categories.

**Full coverage is guaranteed three ways, so no event is ever uncategorizable:**
1. **Comprehensive enumerated taxonomy** (42 types above) spanning learning/enrichment, active/sports, camps, play/social, entertainment/culture, seasonal/community, parent & baby, inclusive, and civic/faith.
2. **`other` catch-all** — `mapEventType()` falls back to `other` whenever no keyword matches, so `event_type` is always set (never null).
3. **Multi-type membership** — when an event fits several types, the best match becomes `event_type` and the rest are added to `event_categories`; ambiguous-but-low-confidence events get `event_type='other'`, explanatory `tags`, and stay `review_status='needs_review'` for an admin to retype (per the data-contract low-confidence rule).

This list is **extensible** — adding a type is a one-row `insert` (idempotent `on conflict do nothing`) plus a keyword entry in `mapEventType()`; no code-path change. Admins can also retype any event in `EventEditModal` (the type selector reads `categories where kind='event'`, so new types appear automatically).

**`categories.id` is a shared PK across both kinds**, so any event-type id that already exists as a place category must be distinct — the place category `sports` already exists (`kind='place'`), so the event type uses `sports-event` (and `camp` ≠ the place category `camps`). All other event-type ids above are unique to events.

Provenance: **reuse** `ingestion_sources`, `ingestion_runs`, `source_records` from the places slice — `source_records.record_type='event'` and `source_records.event_id` already exist. No new provenance tables.

## 2. Source registry (extend `api/_lib/ingestion/sources.js`)

Add an `EVENT_SOURCES` array; keep the existing Google `SOURCES`. Each event source: `{ id, name, type, city, county, enabled, cadenceHours, parserVersion, url?, queries?|defaultType, notes? }`.

- `eventbrite-tampa-family` — `type:'eventbrite'`, enabled, cadence 24h, query list mapping search terms → `event_type`.
- `glazer-museum-ics`, `hcplc-library-ics` — `type:'ics'`, enabled, `url` to public `.ics`, `defaultType`.
- `<venue>-jsonld` — `type:'json_ld'`, enabled, `url` to a public event page.
- `fb-graph-tampa-venues` — `type:'facebook_graph'`, `enabled:false`, `notes:'Needs approved Meta app + page tokens; run when META_GRAPH_TOKEN present.'`
- **`place-websites`** — `type:'place_website'`, enabled, cadence 72h. **Has no static `url`/`queries`** — it iterates over the *places already in the DB* that have a `website`, and discovers each place's own events from its own public site. This is the dynamic, fan-out source described in Section 10.

`getEventSource(id)` helper. Adding a source must not require touching control flow.

## 3. Connectors (`api/_lib/ingestion/connectors/`)

Same shape as `google-places.js`: a pure `parseX(body|text)` (fixture-tested, never hits network) + a `fetchRaw({...})` with bounded retry/backoff respecting `Retry-After`.

- **`eventbrite.js`** — live. `EVENTBRITE_API_TOKEN` bearer; paginated public search bounded by `since`/`limit`; external id = Eventbrite event id; `source_url` = ticket URL; preserves venue object for place-linking. `parseEventbrite(body)` pure.
- **`ics.js`** — uses `node-ical` (new dependency, justified: ICS parsing is fiddly and error-prone by hand). `parseIcs(text)` → array of `{ uid, summary, description, start, end, location, url }`. `fetchRaw` GETs the feed (honors `ETag`/`Last-Modified` when present).
- **`json-ld.js`** — `cheerio` (already justified in skill) to read `<script type="application/ld+json">`, collect schema.org `Event` nodes (handle `@graph` + arrays). `parseJsonLd(html)` pure.
- **`facebook-graph.js`** — built; source disabled. `parseGraphEvents(body)` pure + fixture-tested; `fetchRaw` throws a clear error if no `META_GRAPH_TOKEN`.
- **`place-website.js`** — discovery wrapper (Section 10). Given one place `{ website }`, it: (1) fetches the homepage politely (robots.txt check, `User-Agent`, bounded retry, `ETag`/`Last-Modified` cache via `source_records.content_hash`); (2) finds the events/calendar page by scanning links for `event|calendar|programs|classes|camps|schedule|things-to-do`; (3) extracts events **structured-data first** — reuse `parseJsonLd` (schema.org `Event`), then a discovered `.ics` via `parseIcs`, then RSS, then a last-resort HTML parse; (4) returns raw events tagged with the originating `placeId`. Pure helpers `discoverEventPage(html, baseUrl)` and `extractPlaceEvents({ html, ics, jsonld })` are fixture-tested; network lives in `fetchRaw`.

## 4. Normalization, place-linking, dedupe

- **`normalizeEvent(raw, { source, fetchedAt })`** (in `normalize.js`) → `eventCandidate`:
  - `name, description, startsAt, endsAt, timezone:'America/New_York', placeName, website, sourceUrl, externalId, eventType, ageMin, ageMax, priceSummary, kidAges, indoor, tags, confidence`.
  - Derived UI fields from `startsAt` in `America/New_York`: `dayOfWeek` (`Mon..Sun`), `bucket` (`morning` 5–10:59, `noon` 11–13:59, `afternoon` 14–17:59, `night-owl` 18–4:59), `timeLabel` (e.g. `10:30 AM`).
  - `kind='dated'`; `recurring` from source recurrence text or `'One-time'`.
  - `hue` gradient fallback via `images.js` `gradientForName` when no photo.
  - **slug** = `<sourcePrefix>-<normalized name>-<local YYYY-MM-DD>`, namespaced by source id so it can never collide with curated `e-*` ids.
  - `eventType` mapped from source category/query via a `mapEventType(keywords)` lookup over the full event taxonomy (matches source category + title/description keywords against per-type keyword lists); **always returns a value, defaulting to `'other'`** so `event_type` is never null. Secondary matches are emitted as `eventCategories[]` for the `event_categories` join. Low-confidence maps keep `review_status='needs_review'` + explanatory tags.
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

`reshapeEvents` and the payload normalizer are TDD-tested. Place embed: `place_id → places(name,area,lat,lng,hero_photo,visible)`.

### 5.1 Visibility cascade (place ↔ event)

An event that belongs to a place must never be more public than its place. Two layers enforce this:

- **Public-API gate (non-destructive safety net).** `/api/events` returns an event only when `events.visible=true` **AND** (`place_id IS NULL` **OR** the embedded `place.visible=true`). So hiding a place instantly removes its events from the app on the next load with no write to the events themselves. A place-less recurring meetup is unaffected. Implemented by embedding `places(visible)` and filtering in `events-shape.js`.
- **Admin cascade (explicit, convenient).** When an admin **approves + publishes a place**, the Place detail panel surfaces its `needs_review`/approved-but-hidden events and offers **"Publish N approved events"** (bulk `visible=true` on events already `review_status='approved'`). When a place is **hidden or rejected**, the per-place events are bulk-set `visible=false` (and may be set `review_status='archived'` on reject) so the DB state matches reality, not just the read-time gate.

Net effect (the user's rule): website-discovered events land hidden/`needs_review`; once their place is active+visible and the events are approved, the admin activates them — and they can never leak while the place is hidden.

## 6. App wiring (Approach A, fallback like places)

- `src/lib/events-api.js` — `fetchEvents()`, `normalizeEventsPayload(payload)` (TDD) with empty fallback.
- `App.jsx` — `liveEvents` state + effect; `eventsData = liveEvents?.recurring?.length ? liveEvents.recurring : SUGGESTED_EVENTS`; pass `events` + `thisWeek` to `MainApp`.
- Screens read props with `SUGGESTED_EVENTS` fallback (minimal `const SUGGESTED_EVENTS = events || FALLBACK`): `MatchesTab`, `ActivitiesTab`, `FavoritesTab`, `CalendarTab`. Sheets (`MyPlansSheet`, `MyVillageSheet`) resolve a joined event id across live + fallback via a `findEventIn(list, id)` helper.
- **Light up "This week"** in `ActivitiesTab`: the dormant `'this-week'` filter renders `thisWeek` dated events (date label from `starts_at`), past events excluded.

## 7. Orchestration & CLI

- `api/_lib/ingestion/runEventIngestion.js` — per source → `fetchRaw` → `normalizeEvent` → `linkEventToPlace` → `classifyEventCandidate` → writer. Per-source failures isolated + logged in the run summary (`ingestion_runs`). `dryRun` ⇒ no writes, counts only.
- `writer.js` gains: `createEvent`, `refreshEvent` (never clobbers curator fields; refreshes facts + `last_seen_at`), `linkEventCategory`, `recordSource({record_type:'event', event_id})`, `loadExistingEvents`.
- For `type:'place_website'`, `runEventIngestion` first calls `loadIngestablePlaces(sb, { onlyApproved, placeId })` then loops places, running `place-website.fetchRaw` per place with `place.id`/`place.name`/`place.city`/`place.area` pre-bound (no place-linking step needed — `place_id` is known). Per-place failures are isolated and counted; the run summary records `placesScanned`, `placesWithEvents`, `eventsCreated`.
- `scripts/ingest-family-data.mjs` — dispatch by source `type`: `google_places` → place pipeline; `eventbrite|ics|json_ld|facebook_graph|place_website` → event pipeline. Flags: `--source --dry-run --limit --since`, plus **`--place <uuid>`** (scope `place-websites` to one place) and **`--all-places`** (include non-approved places; default scans only `review_status='approved'` places that have a `website`). Dry-run prints fetched/normalized/deduped/would-create/would-update/skipped/errors (+ `placesScanned` for place-website runs).

## 8. Admin CRUD

- `POST /api/admin/events/update` — modeled on `api/admin/places/update.js`: single edit / bulk status+visibility / delete. Editable set includes `place_id` (admin links an event to a place), `event_type`, dated fields, `kid_ages`, `tags`, `visible`, `review_status`.
- `GET /api/admin/events` — extend select to embed `place_name`, matched place (`place_id(...)`), and `event_categories(category_id)`.
- `src/admin/EventsManager.jsx` + `EventEditModal.jsx` — list with filters (status, type, kind, has-place, date range, search), row + bulk approve/reject/hide, edit modal with a **place picker** (search existing places → set `place_id`), event-type selector, dated fields, hero/hue. New `events` tab in `AdminPage.jsx` (sage accent).

### 8.1 Place CRUD → events panel + per-place ingestion

The existing `PlaceEditModal` (places slice) gains an **Events** section so events are managed in the place's own context:

- **Linked-events list** — fetched via `GET /api/admin/places/events?placeId=<id>` (new read route, or embed `events(...)` in the existing admin places select). Shows each event's name/type/date/status with inline approve / hide / reject / edit (reusing the `EventEditModal`) and a **"Publish all approved"** button (the 5.1 cascade).
- **"Scrape events from website" button** — enabled when the place has a `website`. Calls **`POST /api/admin/places/ingest-events`** with `{ placeId }`, which runs the `place-website` connector for that single place synchronously (bounded `limit`, server-side service-role), writing new events `visible=false`/`needs_review` linked to the place. Returns counts; the panel reloads to show freshly discovered events. A disabled-with-tooltip state explains when no `website` is set.
- This is the UI parallel of `npm run ingest -- --source place-websites --place <id>` — same orchestrator path, invoked from the admin instead of the CLI.

## 9. Validation

- `node:test` fixtures: `parseEventbrite`, `parseIcs`, `parseJsonLd`, `parseGraphEvents`, `discoverEventPage` + `extractPlaceEvents` (checked-in raw samples — incl. a place homepage HTML with an events link + an event page — under `scripts/ingestion/fixtures/`); `normalizeEvent` (derived day/bucket/time + tz correctness, slug namespacing); `linkEventToPlace`; `classifyEventCandidate`; `reshapeEvents`; `normalizeEventsPayload`; the `events-shape.js` place-visibility gate (event with hidden place is filtered out). No test hits a live network.
- `node --check` on every new `.mjs`/`.js`; `npm run build` for `src/` changes.
- Live: `npm run ingest -- --source eventbrite-tampa-family --dry-run --limit 5`, then a bounded live run; verify rows land `visible=false`/`needs_review` with provenance; approve a batch in `/admin` → Events; confirm they appear in `/prototype` "This week"; toggling `visible=false` removes them on next load; offline → app still renders `SUGGESTED_EVENTS` fallback.

## 10. Places as event sources (website discovery)

Every place already in the DB that has a `website` is a potential recurring event feed. The `place-websites` source turns the place directory into a fan-out crawler.

**Flow (per eligible place):**
1. Eligibility: place has a non-null `website`. Batch runs default to `review_status='approved'` places (real, curated/approved venues); `--all-places` widens to any status; the admin per-place button works on any single place.
2. Politeness: check `robots.txt`, send a descriptive `User-Agent`, bound retries with backoff, honor `Retry-After`/`ETag`/`Last-Modified`, and cache the last `content_hash` in `source_records` to skip unchanged pages. One place's failure never stops the batch.
3. Discovery: fetch homepage → `discoverEventPage()` finds the events/calendar URL → fetch it.
4. Extraction, **structured-data first** (per source-strategy priority order): JSON-LD `Event` → discovered `.ics` → RSS → last-resort HTML parse. Keep parser fixtures because venue markup changes.
5. Normalize each raw event with `place_id`/`place_name`/`city`/`area` pre-bound from the place (the place-link step is skipped — the link is known and exact). `event_type` via `mapEventType()`; new rows `visible=false`/`review_status='needs_review'`; provenance in `source_records` (`record_type='event'`, `source_id='place-websites'`, `external_id` = event uid or `content_hash`).
6. Dedupe via `classifyEventCandidate` (idempotent re-runs; same place + same name + same start updates rather than duplicates).

**Lifecycle tie to the place (the user's rule):** discovered events stay hidden until (a) their place is `approved`+`visible` and (b) the event is `approved`. The 5.1 public-API gate guarantees they can never appear while the place is hidden; the admin cascade lets the admin publish a place's approved events in one click. Re-scraping (cron at 72h cadence, or the per-place button) keeps each place's events fresh.

**Two entry points, one code path:** the CLI batch (`--source place-websites [--place <id>] [--all-places]`) and the Place-detail **"Scrape events from website"** button (§8.1) both call `runEventIngestion` for the `place_website` source — the admin button just scopes it to one `placeId`.

## Done criteria

- New/changed event sources are config-only — no control-flow edits.
- Every imported event has provenance (`source_records`) + `review_status`.
- Idempotent: re-running a source does not duplicate events (external-id update path).
- One source failing does not stop the run; it is logged in the run summary.
- Approved dated events surface in the app's "This week"; recurring events render through existing cards unchanged; fallback keeps the app non-blank.
- Places with a `website` can be crawled for their own events (batch CLI or per-place admin button); discovered events are linked to the place and never appear in the app while the place is hidden (public-API place-visibility gate).
- A place's events are viewable and manageable from the Place CRUD detail panel, including a one-click "scrape events from this place's website".

## Out of scope (this slice)

- Auto-creating place rows from event venues (admin links manually).
- Live Meta Graph ingestion (connector built; source disabled until a token exists).
- RSS connector (registry supports the `rss` type; an RSS connector can be added later with no control-flow change — ICS + JSON-LD cover the official-calendar need now).
- Recommendation engine matching events ↔ moms (event types + `kid_ages` are captured to enable it later).
