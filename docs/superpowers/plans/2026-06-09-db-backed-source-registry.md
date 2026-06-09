# DB-Backed Ingestion Source Registry — Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Extends the ingestion slices.

**Goal:** Move ingestion source configuration out of `api/_lib/ingestion/sources.js` into the `ingestion_sources` DB table (with all per-type config), and add **admin CRUD** so the user can create/edit/enable/delete sources — places and events — from the Ingestion area with fully structured per-type forms. DB is canonical; the JS registry seeds it once and is a fallback.

**Decisions:** Fully structured per-type forms. DB canonical, JS seed + fallback.

## Config shape (the `config jsonb` per source type)

Common columns on `ingestion_sources`: `id, name, source_type, kind('places'|'events'), city, county, enabled, cadence_hours, parser_version, notes, url`. Type-specific lives in `config jsonb`:

- `google_places`: `{ bias: { lat, lng, radiusM }, queries: [{ q, category }], limit }`
- `eventbrite`: `{}` (personal-account org events; no query config)
- `ics`: `{ url, defaultType }`
- `json_ld`: `{ url, defaultType }`
- `facebook_graph`: `{ pageId }`
- `place_website`: `{}`

The loader merges row + config into the shape the orchestrators already expect: `{ id, name, type, kind, city, county, enabled, cadenceHours, parserVersion, notes, bias, queries, url, defaultType, pageId }`.

---

### Task 1 — Schema (controller, Supabase MCP)

```sql
alter table public.ingestion_sources
  add column if not exists kind   text not null default 'places',
  add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.ingestion_sources drop constraint if exists ingestion_sources_kind_check;
alter table public.ingestion_sources add constraint ingestion_sources_kind_check check (kind in ('places','events'));
```
Add to `supabase/_apply_phase6_sources.sql`; apply + verify; commit.

### Task 2 — `source-store.js` (loader + seed + shape mappers, TDD on mappers)

**Files:** Create `api/_lib/ingestion/source-store.js`, `api/_lib/ingestion/source-store.test.mjs`

Pure mappers (TDD): `dbRowToSource(row)` (row → orchestrator shape, lifting `config`), `sourceToRow(source, kind)` (registry/admin object → DB row incl. `config`). Plus DB helpers (not unit-tested): `loadSource(sb, id, { fallback })`, `loadSources(sb, { kind, enabledOnly })`, `ensureSource(sb, source, kind)` (insert if missing, NEVER overwrite — preserves admin edits), `seedSourcesFromRegistry(sb)` (upsert JS `SOURCES`/`EVENT_SOURCES` via `sourceToRow`, `onConflict id` — seed only, the admin owns edits afterward so use insert-if-missing semantics).

Test the round-trip: `dbRowToSource(sourceToRow(jsSource,'places'))` reproduces the orchestrator-relevant fields (type, bias, queries, city). Test fallback shape for ics/json_ld (url/defaultType) and facebook (pageId).

`loadSource` with no DB row → returns `getSource(id) || getEventSource(id)` from `sources.js` (fallback). `node --test` green. Commit.

### Task 3 — Refactor orchestrators + CLI + enqueue to load from DB (controller)

- `runIngestion`/`runEventIngestion`: replace `getSource(sourceId)`/`getEventSource(sourceId)` with `await loadSource(sb, sourceId, { fallback: true })` (build a client for the load even in dryRun, or pass through fallback when sb null → use JS registry). Keep all downstream logic. Replace `upsertSource(sb, source)` with `ensureSource(sb, source, kind)` (insert-if-missing; never clobber admin edits).
- CLI `scripts/ingest-family-data.mjs`: dispatch by querying the DB source's `kind` (load via a service-role client) with JS fallback; keep `getEventSource` fallback only.
- `api/admin/ingestion/enqueue.js`: validate `sourceId` against `loadSource(sb, sourceId)` (DB OR JS fallback) instead of `getSource`/`getEventSource`; confirm the loaded source's `kind` matches the requested `kind`.
- `node --check` all; `npm test` green; the existing live place-websites run still works. Commit.

### Task 4 — Seed existing sources into DB (controller)

Run `seedSourcesFromRegistry(sb)` once (inline node script). Verify `ingestion_sources` now has the google-places-tampa row WITH `config.queries` (~400) + `config.bias`, and the event sources with their config. Commit nothing (data only) — note in summary.

### Task 5 — Admin CRUD routes

**Files:** Create `api/admin/sources.js` (GET list), `api/admin/sources/update.js` (POST create/update/delete/toggle).

- `GET /api/admin/sources` (requireAdmin): all sources with config, ordered by kind, name.
- `POST /api/admin/sources/update` (requireAdmin), body one of:
  - `{ create: { id, kind, source_type, name, ...common, config } }` — insert (id must be unique slug; validate type ∈ allowed, kind ∈ places|events, config shape per type).
  - `{ id, patch: {...} }` — update common fields + config.
  - `{ id, toggle: true }` — flip enabled.
  - `{ delete: id }` — delete (block if referenced by runs? allow; runs.source_id is `on delete set null`).
  - Validate config per type (google_places needs bias+queries arrays; ics/json_ld need url; facebook needs pageId). `node --check`; commit.

### Task 6 — `SourcesManager` admin UI + per-type forms + tab

**Files:** Create `src/admin/SourcesManager.jsx`, `src/admin/SourceEditModal.jsx`; modify `src/AdminPage.jsx` (new "Sources" tab + load `/api/admin/sources`).

- `SourcesManager`: list grouped by kind, enable/disable toggle, edit, delete, "+ New source".
- `SourceEditModal`: common fields (id [create-only], name, kind, source_type, city, county, cadence_hours, notes, enabled) + **per-type sections**:
  - google_places / eventbrite: a **queries row-editor** (rows of `q` text + `category` dropdown from the place taxonomy; add/remove). google_places also: bias `lat`/`lng`/`radiusM` number inputs.
  - ics / json_ld: `url` + `defaultType` (event-type dropdown).
  - facebook_graph: `pageId`.
  - place_website: none.
  - Save POSTs `/api/admin/sources/update`. Build the `config` object from the active type's fields.
- AdminPage: import, add `Database` lucide icon, tab `{ id: 'sources', icon: Database, label: 'Sources' }` after Ingestion, render `<SourcesManager .../>`, and load `/api/admin/sources` into a `sources` state in `load()`.
- `npm run build`; commit.

### Task 7 — IngestionManager reads sources from DB

**Files:** Modify `src/admin/IngestionManager.jsx`

- Replace the hardcoded `SOURCES` const with a fetch of `/api/admin/sources` (enabled only), grouped by `kind` into `{ places: [...], events: [...] }` of `{ id, label: name }`. Default the selected kind/source from the loaded list. Keep the launcher + jobs polling. `npm run build`; commit.

### Task 8 — Verify (controller)

- Build + `npm test` green.
- Via the admin source-update route (or a node script using the store), create a small test source, confirm it appears in `GET /api/admin/sources` and in the IngestionManager dropdown; enqueue a job against it; delete it.
- Confirm an admin edit to a source's config survives a subsequent ingestion run (ensureSource never clobbers).

## Notes
- The orchestrator no longer overwrites source config on each run (`ensureSource` = insert-if-missing), so admin edits are durable.
- Event-type/place-category dropdowns reuse the taxonomies already in the codebase.
