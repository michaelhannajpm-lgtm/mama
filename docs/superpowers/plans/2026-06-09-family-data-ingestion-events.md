# Family Data Ingestion — Events Vertical Slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Go Mama's hardcoded `SUGGESTED_EVENTS` with a live pipeline — ingest real Tampa family events from Eventbrite, official calendars (ICS/JSON-LD), and each place's own website; auto-resolve event venues to places (dedupe-or-create via the existing Google+OpenAI place pipeline); stage everything for admin review; gate event visibility on place visibility; and serve approved events to the app with a hardcoded fallback.

**Architecture:** Additive DB on `events` (dated + provenance + review fields, `kind` discriminator) + `event_categories` join + `kind='event'` rows in `categories` + `places.origin` marker → reuse existing `ingestion_sources`/`ingestion_runs`/`source_records` provenance → pure helpers (time-derivation, type-mapping, normalize, dedupe, venue-resolution) → connectors (`eventbrite`, `ics`, `json_ld`, `facebook_graph`, `place_website`) → event orchestrator + extended CLI → public `/api/events` (place-visibility-gated) → `App.jsx` loader drills live events to screens (fallback kept) → full-CRUD admin `EventsManager` + per-place events panel with one-click scraping.

**Tech Stack:** Vite/React 18, Supabase (Postgres + Storage, `@supabase/supabase-js` + PostgREST/fetch), Vercel functions, Node built-in `fetch`, `node:test` for fixtures, `cheerio` (HTML/JSON-LD parse), `node-ical` (ICS parse), `openai` + `sharp` (already installed — venue place enrichment/images), Google Places API (New), Eventbrite API.

**Spec:** `docs/superpowers/specs/2026-06-09-family-data-ingestion-events-design.md`

**Conventions that constrain this plan:**
- Named exports only, one component per file (except `MainApp/index.jsx`). State lives in `App.jsx`; prop-drill, no Context/store.
- Always reference `C.tokenName` (from `src/theme.js`). **Sage = community/groups** — events use sage. Coral = 1:1; saffron = premium.
- All data access via `/api/*`; admin routes gated by `requireAdmin`. New rows: `visible=false`, `review_status='needs_review'`.
- `city` stored as `'Tampa, FL'`. Generated event slugs are namespaced by source id and must never collide with curated short ids (`e-coffee-mom`).
- DDL applied via the **Supabase MCP** (project `jsclxwvgeirbdovsjbnv`) `execute_sql`/`apply_migration`; collect SQL into `supabase/_apply_phase4_events.sql`. On-disk `.sql` files are stale — verify live constraints first.
- Reuse the places-slice modules — do **not** fork the place pipeline: `api/_lib/ingestion/{normalize,dedupe,images,enrich,writer}.js`, `connectors/google-places.js`.

---

## Preconditions

- [ ] **Confirm env vars** (server-only): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PLACES_API_KEY`, `OPENAI_API_KEY` already present (places + enrich slices). Add `EVENTBRITE_API_TOKEN`.

```bash
grep -E 'SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|GOOGLE_PLACES_API_KEY|OPENAI_API_KEY|EVENTBRITE_API_TOKEN' .env | sed 's/=.*/=***/'
```
Expected: all five names present (add `EVENTBRITE_API_TOKEN` if missing).

- [ ] **Install parser deps:**

```bash
npm install cheerio node-ical
```
Expected: both added to `dependencies`. `npm`-scripts (`ingest`, `enrich`, `test`) already exist — no change.

- [ ] **Commit:** `git add package.json package-lock.json && git commit -m "chore: add cheerio + node-ical for event parsing"`

---

# Phase 1 — Database foundation

All Phase 1 SQL goes into one versioned file `supabase/_apply_phase4_events.sql` (idempotent, re-runnable), applied live via the Supabase MCP. Build it task-by-task.

### Task 1: Extend `events` with dated + provenance + review fields

**Files:** Create `supabase/_apply_phase4_events.sql`

- [ ] **Step 1: Verify the live `events` shape** via Supabase MCP `execute_sql`:

```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='events' order by ordinal_position;
```
Expected: `id,slug,name,place_id,city,day_of_week,bucket,time_label,recurring,tags,hero_photo,going_count,visible,created_at,updated_at` (no dated/provenance columns yet).

- [ ] **Step 2: Create `supabase/_apply_phase4_events.sql`** with the events columns:

```sql
-- Phase 4: Events ingestion foundation.
-- Apply via Supabase MCP execute_sql/apply_migration, or paste into the SQL editor.
-- Idempotent: safe to re-run.

-- 1. Dated + provenance + review columns on events (additive, safe).
alter table public.events
  add column if not exists kind              text not null default 'recurring',
  add column if not exists event_type        text,
  add column if not exists starts_at         timestamptz,
  add column if not exists ends_at           timestamptz,
  add column if not exists timezone          text not null default 'America/New_York',
  add column if not exists description       text,
  add column if not exists place_name        text,
  add column if not exists area              text,
  add column if not exists website           text,
  add column if not exists source_url        text,
  add column if not exists external_id       text,
  add column if not exists age_min           smallint,
  add column if not exists age_max           smallint,
  add column if not exists price_summary     text,
  add column if not exists kid_ages          text[] not null default '{}',
  add column if not exists indoor            boolean,
  add column if not exists hue               text,
  add column if not exists going_label       text,
  add column if not exists review_status     text not null default 'needs_review',
  add column if not exists last_seen_at      timestamptz,
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

- [ ] **Step 3: Apply this block** via MCP `execute_sql`. Expected: success, no rows.
- [ ] **Step 4: Backfill curated rows** (apply via MCP):

```sql
update public.events set kind='recurring', review_status='approved'
where review_status='needs_review' and visible=true;
```
Expected: `UPDATE <n>` where n = current curated event count.

- [ ] **Step 5: Verify** (MCP): `select column_name from information_schema.columns where table_name='events' and column_name in ('kind','starts_at','review_status','external_id','event_type');` Expected: 5 rows.
- [ ] **Step 6: Commit** `git add supabase/_apply_phase4_events.sql && git commit -m "feat(db): dated + provenance columns on events"`

### Task 2: Event-type categories + `event_categories` join

**Files:** Modify `supabase/_apply_phase4_events.sql`

- [ ] **Step 1: Append** to the migration file (note `sports-event`/`camp` ids avoid the existing place-category ids `sports`/`camps`):

```sql
-- 2. Event-type taxonomy (kind='event'). 'other' is the catch-all.
insert into public.categories (id, label, icon, kind, sort_order) values
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
  ('sports-event','Sports','Trophy','event',11),
  ('swim','Swim','Waves','event',12),
  ('gymnastics','Gymnastics','PersonStanding','event',13),
  ('martial-arts','Martial Arts','Swords','event',14),
  ('kids-fitness','Kids Fitness','Dumbbell','event',15),
  ('family-yoga','Family Yoga','Flower2','event',16),
  ('camp','Camp','Tent','event',17),
  ('break-camp','Break Camp','TreePalm','event',18),
  ('playgroup','Playgroup','Users','event',19),
  ('open-play','Open Play','Blocks','event',20),
  ('parent-meetup','Parent Meetup','Coffee','event',21),
  ('support-group','Support Group','Heart','event',22),
  ('performance','Performance','Drama','event',23),
  ('movie','Movie','Film','event',24),
  ('concert','Concert','Mic2','event',25),
  ('museum-program','Museum Program','Landmark','event',26),
  ('library-program','Library Program','Library','event',27),
  ('animal-encounter','Animal Encounter','PawPrint','event',28),
  ('festival','Festival','PartyPopper','event',29),
  ('fair','Fair','FerrisWheel','event',30),
  ('seasonal','Seasonal','Sparkles','event',31),
  ('farmers-market','Farmers Market','ShoppingBasket','event',32),
  ('community-event','Community','Megaphone','event',33),
  ('outdoor-adventure','Outdoor','Mountain','event',34),
  ('prenatal-class','Prenatal','Baby','event',35),
  ('new-parent','New Parent','HeartHandshake','event',36),
  ('parenting-class','Parenting','UsersRound','event',37),
  ('breastfeeding','Lactation Support','Milk','event',38),
  ('sensory-friendly','Sensory-Friendly','Sparkle','event',39),
  ('special-needs','Special Needs','Accessibility','event',40),
  ('fundraiser','Fundraiser','HandHeart','event',41),
  ('religious','Faith / VBS','Church','event',42),
  ('other','Other','CircleDot','event',99)
on conflict (id) do nothing;

create table if not exists public.event_categories (
  event_id    uuid not null references public.events(id) on delete cascade,
  category_id text not null references public.categories(id) on delete cascade,
  primary key (event_id, category_id)
);
create index if not exists event_categories_cat_idx on public.event_categories (category_id);
```

- [ ] **Step 2: Apply via MCP.** Expected: success.
- [ ] **Step 3: Verify** (MCP): `select count(*) from public.categories where kind='event';` Expected: `43`.
- [ ] **Step 4: Commit** `git add supabase/_apply_phase4_events.sql && git commit -m "feat(db): 43 event-type categories + event_categories join"`

### Task 3: `places.origin` provenance marker

**Files:** Modify `supabase/_apply_phase4_events.sql`

- [ ] **Step 1: Append + apply:**

```sql
-- 3. Provenance marker on places (this migration spans both tables).
alter table public.places
  add column if not exists origin                  text not null default 'curated',
  add column if not exists generated_from_event_id uuid references public.events(id) on delete set null;
alter table public.places drop constraint if exists places_origin_check;
alter table public.places add constraint places_origin_check
  check (origin in ('curated','google','event'));
create index if not exists places_origin_idx on public.places (origin);

-- Backfill: ingested-but-unpublished places (have a google_place_id) → 'google'.
update public.places set origin='google'
where origin='curated' and google_place_id is not null and visible=false;
```

- [ ] **Step 2: Verify** (MCP): `select origin, count(*) from public.places group by origin;` Expected: rows for `curated` and (if any ingested) `google`.
- [ ] **Step 3: Commit** `git add supabase/_apply_phase4_events.sql && git commit -m "feat(db): places.origin marker + generated_from_event_id"`

> **Provenance reuse:** `ingestion_sources`/`ingestion_runs`/`source_records` already exist (places slice); `source_records.record_type` already accepts `'event'` and `source_records.event_id` already exists. No new provenance tables. Verify once: `select column_name from information_schema.columns where table_name='source_records' and column_name in ('event_id','record_type');` Expected: 2 rows.

---

# Phase 2 — Pure helpers (TDD)

All pure, dependency-light, fixture-tested with `node:test`. No network.

### Task 4: Local-time derivation (`time.js`)

**Files:** Create `api/_lib/ingestion/time.js`, `api/_lib/ingestion/time.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/ingestion/time.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventTimeParts, localDateKey } from './time.js';

test('derives Mon..Sun, bucket, and 12h label in America/New_York', () => {
  // 2026-06-10T14:30:00Z == 10:30 AM EDT (UTC-4), a Wednesday.
  const p = eventTimeParts('2026-06-10T14:30:00Z', 'America/New_York');
  assert.equal(p.dayOfWeek, 'Wed');
  assert.equal(p.bucket, 'morning');
  assert.equal(p.timeLabel, '10:30 AM');
});

test('buckets evening into night-owl', () => {
  // 2026-06-11T23:00:00Z == 7:00 PM EDT.
  const p = eventTimeParts('2026-06-11T23:00:00Z', 'America/New_York');
  assert.equal(p.bucket, 'night-owl');
  assert.equal(p.timeLabel, '7:00 PM');
});

test('localDateKey is the YYYY-MM-DD in the event tz', () => {
  // 2026-01-01T02:00:00Z == 2025-12-31 21:00 EST.
  assert.equal(localDateKey('2026-01-01T02:00:00Z', 'America/New_York'), '2025-12-31');
});

test('invalid date yields nulls, not a throw', () => {
  assert.deepEqual(eventTimeParts('not-a-date'), { dayOfWeek: null, bucket: null, timeLabel: null });
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/ingestion/time.test.mjs` Expected: FAIL (module not found).

- [ ] **Step 3: Implement** `api/_lib/ingestion/time.js`:

```js
// Derive the app's recurring-UI fields from an absolute instant, in local tz.
// Uses Intl (built-in) — no tz dependency.

const hourIn = (d, timezone) => {
  const h = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
    .formatToParts(d).find(p => p.type === 'hour')?.value;
  return (parseInt(h, 10) || 0) % 24; // some envs emit '24' at midnight
};

const bucketFor = (h) =>
  h >= 5 && h < 11 ? 'morning' :
  h >= 11 && h < 14 ? 'noon' :
  h >= 14 && h < 18 ? 'afternoon' : 'night-owl';

export const eventTimeParts = (startsAt, timezone = 'America/New_York') => {
  const d = startsAt instanceof Date ? startsAt : new Date(startsAt);
  if (isNaN(d.getTime())) return { dayOfWeek: null, bucket: null, timeLabel: null };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  }).formatToParts(d);
  const get = (t) => parts.find(p => p.type === t)?.value;
  return {
    dayOfWeek: get('weekday'),                                  // 'Mon'..'Sun'
    bucket: bucketFor(hourIn(d, timezone)),
    timeLabel: `${get('hour')}:${get('minute')} ${get('dayPeriod')}`, // '10:30 AM'
  };
};

export const localDateKey = (startsAt, timezone = 'America/New_York') => {
  const d = startsAt instanceof Date ? startsAt : new Date(startsAt);
  if (isNaN(d.getTime())) return null;
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const g = (t) => p.find(x => x.type === t)?.value;
  return `${g('year')}-${g('month')}-${g('day')}`;
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/ingestion/time.test.mjs` Expected: PASS (4 tests).
- [ ] **Step 5: Commit** `git add api/_lib/ingestion/time.js api/_lib/ingestion/time.test.mjs && git commit -m "feat(ingestion): local-time derivation for events (TDD)"`

### Task 5: Event-type mapping (`map-event-type.js`)

**Files:** Create `api/_lib/ingestion/map-event-type.js`, `api/_lib/ingestion/map-event-type.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/ingestion/map-event-type.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapEventType } from './map-event-type.js';

test('maps storytime keywords', () => {
  const r = mapEventType('Baby Storytime at the Library', 'free weekly reading for babies');
  assert.equal(r.type, 'storytime');
});

test('maps camps', () => {
  assert.equal(mapEventType('Summer STEM Camp', '').type, 'camp');
});

test('secondary categories captured', () => {
  const r = mapEventType('Kids Coding Workshop', 'robotics and stem for kids');
  assert.ok(['stem', 'workshop'].includes(r.type));
  assert.ok(r.categories.includes('stem'));
});

test('defaults to other (never null)', () => {
  const r = mapEventType('Quarterly Networking Mixer', 'adults only');
  assert.equal(r.type, 'other');
  assert.deepEqual(r.categories, ['other']);
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/ingestion/map-event-type.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `api/_lib/ingestion/map-event-type.js`:

```js
// Map an event's title+description to a primary event_type + secondary categories.
// Ordered so the most specific keyword wins as the primary. Always returns a
// value (defaults to 'other') so event_type is never null.
const RULES = [
  ['storytime',        ['storytime', 'story time', 'story hour']],
  // Camp is a program FORMAT — a "STEM camp"/"soccer camp" is primarily a camp,
  // with the subject captured as a secondary category. Keep these above the
  // subject rules (stem/art/music/...) so format wins as the primary type.
  ['break-camp',       ['spring break camp', 'winter break camp', 'holiday camp', 'break camp']],
  ['camp',             ['camp']],
  ['stem',             ['stem', 'coding', 'robotics', 'science lab', 'engineering']],
  ['art-class',        ['art class', 'painting', 'pottery', 'ceramics', 'drawing', 'craft']],
  ['music-class',      ['music class', 'music together', 'sing', 'instrument', 'piano', 'violin']],
  ['dance-class',      ['dance', 'ballet', 'hip hop', 'tap class']],
  ['cooking-class',    ['cooking', 'baking', 'culinary']],
  ['language-class',   ['spanish', 'french', 'mandarin', 'language class', 'immersion']],
  ['tutoring',         ['tutoring', 'tutor', 'reading help', 'math help', 'homework']],
  ['swim',             ['swim', 'aquatic', 'water safety']],
  ['gymnastics',       ['gymnastics', 'tumbling']],
  ['martial-arts',     ['karate', 'taekwondo', 'jiu jitsu', 'martial arts', 'judo']],
  ['family-yoga',      ['yoga']],
  ['kids-fitness',     ['fitness', 'ninja', 'obstacle', 'workout']],
  ['playgroup',        ['playgroup', 'play group', 'mommy and me', 'baby group']],
  ['open-play',        ['open play', 'open gym', 'free play', 'drop-in play']],
  ['parent-meetup',    ['meetup', 'mom meet', 'parent social', 'coffee with', 'moms group']],
  ['support-group',    ['support group', 'postpartum support', 'grief']],
  ['breastfeeding',    ['breastfeeding', 'lactation', 'nursing']],
  ['prenatal-class',   ['prenatal', 'childbirth', 'birthing', 'lamaze']],
  ['new-parent',       ['new parent', 'newborn care', 'baby care basics']],
  ['parenting-class',  ['parenting class', 'positive discipline', 'parent education']],
  ['performance',      ['theater', 'theatre', 'puppet', 'play ', 'show', 'magician']],
  ['movie',            ['movie', 'film screening', 'cinema']],
  ['concert',          ['concert', 'live music', 'symphony']],
  ['museum-program',   ['museum', 'exhibit', 'gallery']],
  ['library-program',  ['library']],
  ['animal-encounter', ['zoo', 'aquarium', 'petting', 'animal encounter', 'wildlife']],
  ['festival',         ['festival', 'fest', 'celebration']],
  ['fair',             ['fair', 'carnival', 'expo']],
  ['farmers-market',   ['farmers market', "farmer's market", 'market day']],
  ['seasonal',         ['halloween', 'trick or treat', 'santa', 'holiday lights', 'easter', 'pumpkin']],
  ['outdoor-adventure',['hike', 'nature walk', 'kayak', 'trail', 'outdoor adventure', 'fishing']],
  ['community-event',  ['community', 'neighborhood', 'cleanup', 'parade']],
  ['sensory-friendly', ['sensory friendly', 'sensory-friendly', 'low sensory', 'autism friendly']],
  ['special-needs',    ['special needs', 'adaptive', 'inclusive', 'disabilities']],
  ['fundraiser',       ['fundraiser', 'charity', 'benefit', 'donation drive']],
  ['religious',        ['vbs', 'vacation bible', 'church', 'sunday school', 'faith']],
  ['workshop',         ['workshop', 'class', 'lesson', 'clinic']],
  ['sports-event',     ['soccer', 'baseball', 'basketball', 'tennis', 'sports', 'league', 'tournament']],
];

export const mapEventType = (title = '', description = '') => {
  const hay = `${title} ${description}`.toLowerCase();
  const matched = [];
  for (const [type, kws] of RULES) {
    if (kws.some(k => hay.includes(k))) matched.push(type);
  }
  if (matched.length === 0) return { type: 'other', categories: ['other'] };
  return { type: matched[0], categories: [...new Set(matched)].slice(0, 4) };
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/ingestion/map-event-type.test.mjs` Expected: PASS (4 tests).
- [ ] **Step 5: Commit** `git add api/_lib/ingestion/map-event-type.js api/_lib/ingestion/map-event-type.test.mjs && git commit -m "feat(ingestion): event-type keyword mapper (TDD)"`

### Task 6: Event normalizer (`normalize-event.js`)

> Connectors emit a common **intermediate** shape; `normalizeEvent` turns it into the DB-bound candidate. Intermediate: `{ name, description, startsAt, endsAt, placeName, address, lat, lng, city, website, sourceUrl, externalId, sourceCategory, priceSummary, ageMin, ageMax, recurringText }`.

**Files:** Create `api/_lib/ingestion/normalize-event.js`, `api/_lib/ingestion/normalize-event.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/ingestion/normalize-event.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEvent, eventSlug } from './normalize-event.js';

const SOURCE = { id: 'eventbrite-tampa-family', city: 'Tampa, FL' };

test('eventSlug is source-namespaced + dated and collision-safe', () => {
  const s = eventSlug('Baby Storytime', { sourceId: 'eventbrite-tampa-family', startsAt: '2026-06-10T14:30:00Z' });
  assert.equal(s, 'eventbrite-tampa-family-baby-storytime-2026-06-10');
  assert.ok(!s.startsWith('e-')); // never collides with curated e-* ids
});

test('normalizes an intermediate into a dated event candidate', () => {
  const c = normalizeEvent({
    name: 'Toddler Storytime', description: 'songs and books for toddlers',
    startsAt: '2026-06-10T14:30:00Z', endsAt: '2026-06-10T15:15:00Z',
    placeName: 'John F. Germany Library', city: 'Tampa, FL',
    website: 'https://hcplc.org', sourceUrl: 'https://hcplc.org/e/1', externalId: 'lib-1',
    sourceCategory: 'library', ageMin: 1, ageMax: 3,
  }, { source: SOURCE, fetchedAt: '2026-06-09T00:00:00Z' });

  assert.equal(c.kind, 'dated');
  assert.equal(c.name, 'Toddler Storytime');
  assert.equal(c.dayOfWeek, 'Wed');
  assert.equal(c.bucket, 'morning');
  assert.equal(c.timeLabel, '10:30 AM');
  assert.equal(c.eventType, 'storytime');
  assert.equal(c.placeName, 'John F. Germany Library');
  assert.equal(c.city, 'Tampa, FL');
  assert.equal(c.externalId, 'lib-1');
  assert.equal(c.recurring, 'One-time');
  assert.ok(typeof c.hue === 'string' && c.hue.includes('gradient'));
  assert.ok(c.confidence > 0 && c.confidence <= 1);
});

test('missing startsAt yields null UI fields but still a candidate', () => {
  const c = normalizeEvent({ name: 'Mystery Event', city: 'Tampa, FL' }, { source: SOURCE });
  assert.equal(c.dayOfWeek, null);
  assert.equal(c.eventType, 'other');
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/ingestion/normalize-event.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `api/_lib/ingestion/normalize-event.js`:

```js
import { eventTimeParts, localDateKey } from './time.js';
import { mapEventType } from './map-event-type.js';
import { gradientForName } from './images.js';

const slugBase = (s) => (s || '')
  .toLowerCase().replace(/[‘’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const eventSlug = (name, { sourceId, startsAt, timezone = 'America/New_York', recurringText } = {}) => {
  const date = startsAt ? localDateKey(startsAt, timezone) : null;
  const tail = date || (recurringText ? slugBase(recurringText) : 'recurring');
  return `${slugBase(sourceId)}-${slugBase(name)}-${tail}`.replace(/-+/g, '-');
};

// Confidence: more complete records score higher. Bounded (0,1].
const scoreConfidence = (i) => {
  let s = 0.4;
  if (i.startsAt) s += 0.2;
  if (i.placeName) s += 0.15;
  if (i.sourceUrl) s += 0.1;
  if (i.description) s += 0.1;
  if (i.externalId) s += 0.05;
  return Math.min(1, +s.toFixed(3));
};

export const normalizeEvent = (i, { source, fetchedAt } = {}) => {
  const timezone = i.timezone || 'America/New_York';
  const { dayOfWeek, bucket, timeLabel } = eventTimeParts(i.startsAt, timezone);
  const { type, categories } = mapEventType(i.name, i.description || i.sourceCategory || '');
  const city = i.city || source?.city || 'Tampa, FL';
  return {
    kind: 'dated',
    name: i.name || 'Untitled event',
    slug: eventSlug(i.name, { sourceId: source?.id, startsAt: i.startsAt, timezone, recurringText: i.recurringText }),
    description: i.description || null,
    startsAt: i.startsAt || null,
    endsAt: i.endsAt || null,
    timezone,
    dayOfWeek, bucket, timeLabel,
    recurring: i.recurringText || 'One-time',
    eventType: type,
    eventCategories: categories,
    city,
    placeName: i.placeName || null,
    address: i.address || null,
    lat: i.lat ?? null,
    lng: i.lng ?? null,
    website: i.website || null,
    sourceUrl: i.sourceUrl || null,
    externalId: i.externalId || null,
    ageMin: i.ageMin ?? null,
    ageMax: i.ageMax ?? null,
    priceSummary: i.priceSummary || null,
    kidAges: Array.isArray(i.kidAges) ? i.kidAges : [],
    tags: Array.isArray(i.tags) ? i.tags : [],
    hue: `linear-gradient(135deg, ${gradientForName(i.name || '')[0]} 0%, ${gradientForName(i.name || '')[1]} 100%)`,
    fetchedAt: fetchedAt || null,
    confidence: scoreConfidence(i),
  };
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/ingestion/normalize-event.test.mjs` Expected: PASS (3 tests).
- [ ] **Step 5: Commit** `git add api/_lib/ingestion/normalize-event.js api/_lib/ingestion/normalize-event.test.mjs && git commit -m "feat(ingestion): normalize event intermediate → candidate (TDD)"`

### Task 7: Event dedupe (`dedupe-event.js`)

**Files:** Create `api/_lib/ingestion/dedupe-event.js`, `api/_lib/ingestion/dedupe-event.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/ingestion/dedupe-event.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyEventCandidate } from './dedupe-event.js';

test('exact external_id match => update', () => {
  const existing = [{ id: 'x', external_id: 'E1', name: 'A', starts_at: '2026-06-10T14:30:00Z', place_id: 'p1', source_url: null }];
  const cand = { externalId: 'E1', name: 'A', startsAt: '2026-06-10T14:30:00Z', placeId: 'p1' };
  assert.deepEqual(classifyEventCandidate(cand, existing), { action: 'update', matchId: 'x' });
});

test('same name + same start + same place => review', () => {
  const existing = [{ id: 'y', external_id: null, name: 'Toddler Storytime', starts_at: '2026-06-10T14:30:00Z', place_id: 'p1', source_url: null }];
  const cand = { externalId: 'E9', name: 'Toddler Storytime', startsAt: '2026-06-10T14:30:00Z', placeId: 'p1' };
  assert.equal(classifyEventCandidate(cand, existing).action, 'review');
});

test('same source_url + same start date => review', () => {
  const existing = [{ id: 'z', external_id: null, name: 'X', starts_at: '2026-06-10T18:00:00Z', place_id: null, source_url: 'https://e/1' }];
  const cand = { externalId: 'E8', name: 'Y', startsAt: '2026-06-10T22:00:00Z', sourceUrl: 'https://e/1' };
  assert.equal(classifyEventCandidate(cand, existing).action, 'review');
});

test('novel => create', () => {
  assert.deepEqual(classifyEventCandidate({ externalId: 'E2', name: 'New', startsAt: '2026-07-01T14:00:00Z' }, []), { action: 'create', matchId: null });
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/ingestion/dedupe-event.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `api/_lib/ingestion/dedupe-event.js`:

```js
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const sameInstant = (a, b) => a && b && new Date(a).getTime() === new Date(b).getTime();
const sameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);
};

// Returns { action: 'create'|'update'|'review', matchId }. Never duplicates on
// description/image change (only name/time/place/url drive the decision).
export const classifyEventCandidate = (cand, existing) => {
  // 1. Exact external id.
  const byId = existing.find(e => e.external_id && e.external_id === cand.externalId);
  if (byId) return { action: 'update', matchId: byId.id };

  // 2. Same normalized name + same start instant + same place.
  const byTriple = existing.find(e =>
    norm(e.name) === norm(cand.name) &&
    sameInstant(e.starts_at, cand.startsAt) &&
    (e.place_id || null) === (cand.placeId || null));
  if (byTriple) return { action: 'review', matchId: byTriple.id };

  // 3. Same source url + same start date.
  const byUrl = existing.find(e =>
    e.source_url && cand.sourceUrl && e.source_url === cand.sourceUrl &&
    sameDay(e.starts_at, cand.startsAt));
  if (byUrl) return { action: 'review', matchId: byUrl.id };

  return { action: 'create', matchId: null };
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/ingestion/dedupe-event.test.mjs` Expected: PASS (4 tests).
- [ ] **Step 5: Commit** `git add api/_lib/ingestion/dedupe-event.js api/_lib/ingestion/dedupe-event.test.mjs && git commit -m "feat(ingestion): event dedupe classifier (TDD)"`

### Task 8: Venue → place resolution (`resolve-place.js`)

> Dedupe-or-create the venue place, reusing `dedupe.classifyCandidate`, `normalize.normalizeGooglePlace`, `connectors/google-places.fetchRaw`, `writer.*`, `enrich.enrichOne`, `images.*`. Network/AI clients are **injected** so the resolver is fully fixture-testable.

**Files:** Create `api/_lib/ingestion/resolve-place.js`, `api/_lib/ingestion/resolve-place.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/ingestion/resolve-place.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inferPlaceCategory, resolveEventPlace } from './resolve-place.js';

test('inferPlaceCategory maps event types to place taxonomy', () => {
  assert.equal(inferPlaceCategory('swim'), 'sports');
  assert.equal(inferPlaceCategory('storytime'), 'fun');
  assert.equal(inferPlaceCategory('camp'), 'camps');
  assert.equal(inferPlaceCategory('prenatal-class'), 'wellness');
});

test('no venue => null placeId, no API calls', async () => {
  let calls = 0;
  const out = await resolveEventPlace(
    { placeName: null, city: 'Tampa, FL' },
    { existingPlaces: [], venueCache: new Map(), googleSearch: async () => { calls++; return []; } });
  assert.equal(out.placeId, null);
  assert.equal(calls, 0);
});

test('local dedupe match links without Google', async () => {
  let calls = 0;
  const existingPlaces = [{ id: 'p1', google_place_id: null, name: 'Glazer Museum', city: 'Tampa, FL', lat: 27.95, lng: -82.46 }];
  const out = await resolveEventPlace(
    { placeName: 'Glazer Museum', city: 'Tampa, FL', eventType: 'museum-program' },
    { existingPlaces, venueCache: new Map(), googleSearch: async () => { calls++; return []; } });
  assert.equal(out.placeId, 'p1');
  assert.equal(out.action, 'link');
  assert.equal(calls, 0);
});

test('miss => Google create path (dryRun reports, no writes)', async () => {
  const google = async () => ([{ id: 'G1', displayName: { text: 'New Play Cafe' }, location: { latitude: 28.0, longitude: -82.5 }, formattedAddress: '1 Main St, Tampa, FL' }]);
  const out = await resolveEventPlace(
    { placeName: 'New Play Cafe', city: 'Tampa, FL', eventType: 'open-play' },
    { existingPlaces: [], venueCache: new Map(), googleSearch: google, apiKey: 'test-key', dryRun: true });
  assert.equal(out.action, 'create');
  assert.equal(out.placeId, null); // dryRun: nothing written
});

test('venue cache returns the same placeId for repeat venue', async () => {
  const cache = new Map([['glazer museum|tampa, fl', 'p1']]);
  const out = await resolveEventPlace(
    { placeName: 'Glazer Museum', city: 'Tampa, FL', eventType: 'museum-program' },
    { existingPlaces: [], venueCache: cache, googleSearch: async () => { throw new Error('should not call'); } });
  assert.equal(out.placeId, 'p1');
  assert.equal(out.action, 'cached');
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/ingestion/resolve-place.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `api/_lib/ingestion/resolve-place.js`:

```js
import { classifyCandidate } from './dedupe.js';
import { normalizeGooglePlace } from './normalize.js';
import { fetchRaw as googleFetchRaw } from './connectors/google-places.js';
import { createPlace, addPhoto, linkCategory, recordSource, refreshPlace } from './writer.js';
import { makeGradientPng, uploadGeneratedPng } from './images.js';
import { enrichOne, deriveArea, buildHeroPhoto } from './enrich.js';

// Event type -> primary place category (data-contract category mapping).
const EVENT_TO_PLACE = {
  swim: 'sports', gymnastics: 'sports', 'martial-arts': 'sports', 'kids-fitness': 'sports',
  'sports-event': 'sports', 'family-yoga': 'wellness', 'prenatal-class': 'wellness',
  'new-parent': 'wellness', 'parenting-class': 'wellness', breastfeeding: 'wellness',
  'support-group': 'wellness', camp: 'camps', 'break-camp': 'camps',
  stem: 'extracurricular', 'art-class': 'extracurricular', 'music-class': 'extracurricular',
  'dance-class': 'extracurricular', 'cooking-class': 'extracurricular',
  'language-class': 'extracurricular', tutoring: 'extracurricular', workshop: 'extracurricular',
  class: 'extracurricular',
};
export const inferPlaceCategory = (eventType) => EVENT_TO_PLACE[eventType] || 'fun';

const venueKey = (name, city) => `${(name || '').toLowerCase().trim()}|${(city || '').toLowerCase().trim()}`;

// Resolve an event's venue to a place id (dedupe-or-create). Returns
// { placeId, action } where action ∈ create|link|cached|none.
export async function resolveEventPlace(cand, ctx) {
  const {
    existingPlaces = [], venueCache = new Map(), sb = null, apiKey = null, env = {},
    dryRun = false, logger = console, googleSearch = googleFetchRaw, openai = null,
    bias = { lat: 27.9506, lng: -82.4572, radiusM: 25000 },
  } = ctx || {};

  if (!cand.placeName) return { placeId: null, action: 'none' };
  const key = venueKey(cand.placeName, cand.city);
  if (venueCache.has(key)) return { placeId: venueCache.get(key), action: 'cached' };

  // 1. Local dedupe (no API cost).
  const localCand = { googlePlaceId: null, name: cand.placeName, city: cand.city, lat: cand.lat, lng: cand.lng };
  const local = classifyCandidate(localCand, existingPlaces);
  if (local.action === 'update' || local.action === 'review') {
    venueCache.set(key, local.matchId);
    return { placeId: local.matchId, action: 'link' };
  }

  // 2. Google resolution (capture all the API).
  if (!apiKey) { return { placeId: null, action: 'none' }; } // no key → link-only, can't create
  let gp = null;
  try {
    const results = await googleSearch({ query: `${cand.placeName}, ${cand.address || cand.city}`, bias, limit: 1, apiKey, logger });
    gp = results?.[0] || null;
  } catch (e) { logger.warn?.(`venue google lookup failed: ${e.message}`); }
  if (!gp) return { placeId: null, action: 'none' };

  const placeCand = normalizeGooglePlace(gp, { category: inferPlaceCategory(cand.eventType), city: cand.city });

  // 3. Dedupe the resolved candidate (now has google_place_id + geo).
  const resolved = classifyCandidate(placeCand, existingPlaces);
  if (resolved.action === 'update' || resolved.action === 'review') {
    if (!dryRun && sb) await refreshPlace(sb, resolved.matchId, placeCand).catch(() => {});
    venueCache.set(key, resolved.matchId);
    return { placeId: resolved.matchId, action: 'link' };
  }

  // 4. Create via the place pipeline.
  if (dryRun || !sb) return { placeId: null, action: 'create' };
  const placeId = await createPlace(sb, {
    ...placeCand, review_status: 'needs_review', visible: false, origin: 'event',
  });
  await linkCategory(sb, placeId, placeCand.category);
  if (placeCand.photos?.length) {
    for (let i = 0; i < placeCand.photos.length; i++) {
      await addPhoto(sb, placeId, { googleRef: placeCand.photos[i].googleRef, source: 'google', attribution: placeCand.photos[i].attribution, isHero: i === 0, sortOrder: i });
    }
  } else {
    const png = await makeGradientPng(placeCand.name);
    const url = await uploadGeneratedPng({ supabaseUrl: env.SUPABASE_URL, serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY, slug: placeCand.slug, buffer: png });
    await addPhoto(sb, placeId, { url, source: 'generated', isHero: true });
  }
  await recordSource(sb, { sourceId: cand.sourceId || 'place-from-event', externalId: placeCand.googlePlaceId, placeId, sourceUrl: placeCand.sourceUrl, raw: gp });

  // 5. Inline OpenAI enrichment (best-effort).
  if (openai) {
    try {
      const patch = await enrichOne(openai, { name: placeCand.name, category: placeCand.category, address: placeCand.address, rating: placeCand.rating, review_count: placeCand.reviewCount });
      const area = deriveArea(placeCand.lat, placeCand.lng);
      const hero = buildHeroPhoto((placeCand.photos || []).map((p, i) => ({ google_ref: p.googleRef, is_hero: i === 0 })));
      await sb.from('places').update({ ...patch, ...(area ? { area } : {}), ...(hero ? { hero_photo: hero } : {}) }).eq('id', placeId);
    } catch (e) { logger.warn?.(`venue enrich failed: ${e.message}`); }
  }

  existingPlaces.push({ id: placeId, google_place_id: placeCand.googlePlaceId, name: placeCand.name, city: placeCand.city, lat: placeCand.lat, lng: placeCand.lng });
  venueCache.set(key, placeId);
  return { placeId, action: 'create' };
}
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/ingestion/resolve-place.test.mjs` Expected: PASS (5 tests).
- [ ] **Step 5: Commit** `git add api/_lib/ingestion/resolve-place.js api/_lib/ingestion/resolve-place.test.mjs && git commit -m "feat(ingestion): venue→place dedupe-or-create resolver (TDD)"`

### Task 9: Public reshape helper (`events-shape.js`)

**Files:** Create `api/_lib/events-shape.js`, `api/_lib/events-shape.test.mjs`

- [ ] **Step 1: Write the failing test** `api/_lib/events-shape.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reshapeEvents, splitEvents } from './events-shape.js';

const ROW = (o) => ({ id: 'e1', slug: 's', name: 'N', kind: 'recurring', day_of_week: 'Sat', bucket: 'morning', time_label: '10:30 AM', place_name: 'Park', tags: [], going_count: 5, indoor: false, kid_ages: ['1–3'], hue: 'linear-gradient(135deg,#a,#b)', hero_photo: 'x', visible: true, places: null, ...o });

test('reshapeEvents maps a row into the SUGGESTED_EVENTS shape', () => {
  const [e] = reshapeEvents([ROW({})]);
  assert.equal(e.id, 'e1');
  assert.equal(e.day, 'Sat');
  assert.equal(e.time, '10:30 AM');
  assert.equal(e.going, 5);
  assert.equal(e.place, 'Park');
});

test('place-visibility gate: event with a hidden place is dropped', () => {
  const visible = ROW({ id: 'a', places: { visible: true } });
  const hidden  = ROW({ id: 'b', places: { visible: false } });
  const placeless = ROW({ id: 'c', places: null });
  const out = reshapeEvents([visible, hidden, placeless]);
  assert.deepEqual(out.map(e => e.id), ['a', 'c']);
});

test('splitEvents separates recurring vs upcoming dated within window', () => {
  const now = new Date('2026-06-09T00:00:00Z');
  const soon = ROW({ id: 'd', kind: 'dated', starts_at: '2026-06-12T14:00:00Z' });
  const past = ROW({ id: 'p', kind: 'dated', starts_at: '2026-06-01T14:00:00Z' });
  const far  = ROW({ id: 'f', kind: 'dated', starts_at: '2026-08-01T14:00:00Z' });
  const rec  = ROW({ id: 'r', kind: 'recurring' });
  const { recurring, thisWeek } = splitEvents([soon, past, far, rec], { now, windowDays: 14 });
  assert.deepEqual(recurring.map(e => e.id), ['r']);
  assert.deepEqual(thisWeek.map(e => e.id), ['d']);
});
```

- [ ] **Step 2: Run, verify fail:** `node --test api/_lib/events-shape.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `api/_lib/events-shape.js`:

```js
// Reshape flat DB event rows into the client structure the app already uses
// (SUGGESTED_EVENTS), enforcing the place-visibility gate.
const placeVisible = (row) => row.places == null || row.places.visible === true;

const toUi = (row) => ({
  id: row.id,
  slug: row.slug,
  day: row.day_of_week,
  bucket: row.bucket,
  time: row.time_label,
  name: row.name,
  place: row.place_name || row.places?.name || '',
  going: row.going_count || 0,
  recurring: row.recurring || 'Weekly',
  tags: row.tags || [],
  indoor: row.indoor ?? null,
  mi: typeof row.mi === 'number' ? row.mi : 1.0,
  kidAges: row.kid_ages || [],
  hue: row.hue || 'linear-gradient(135deg, #E96B7D 0%, #D9A441 100%)',
  photo: row.hero_photo || row.places?.hero_photo || null,
  kind: row.kind,
  startsAt: row.starts_at || null,
  eventType: row.event_type || null,
});

// All visible rows (place-gated) in UI shape.
export const reshapeEvents = (rows) => (rows || []).filter(placeVisible).map(toUi);

// Split into recurring + upcoming dated within a window.
export const splitEvents = (rows, { now = new Date(), windowDays = 14 } = {}) => {
  const ui = reshapeEvents(rows);
  const horizon = new Date(now.getTime() + windowDays * 86400000);
  const recurring = ui.filter(e => e.kind !== 'dated');
  const thisWeek = ui
    .filter(e => e.kind === 'dated' && e.startsAt && new Date(e.startsAt) >= now && new Date(e.startsAt) <= horizon)
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  return { recurring, thisWeek };
};
```

- [ ] **Step 4: Run, verify pass:** `node --test api/_lib/events-shape.test.mjs` Expected: PASS (3 tests).
- [ ] **Step 5: Commit** `git add api/_lib/events-shape.js api/_lib/events-shape.test.mjs && git commit -m "feat(api): events reshape + place-visibility gate + split (TDD)"`

---

# Phase 3 — Connectors

Each connector exports a pure `parseX(...)` → intermediate[] (fixture-tested) plus `fetchRaw(...)` with bounded retry/backoff. Fixtures live in `scripts/ingestion/fixtures/`.

### Task 10: Eventbrite connector

**Files:** Create `api/_lib/ingestion/connectors/eventbrite.js`, `.../eventbrite.test.mjs`, `scripts/ingestion/fixtures/eventbrite-search.json`

- [ ] **Step 1: Save fixture** `scripts/ingestion/fixtures/eventbrite-search.json` (minimal Eventbrite search response with expansions):

```json
{ "events": [
  { "id": "111", "name": { "text": "Toddler Storytime" },
    "description": { "text": "Songs and books for toddlers" },
    "start": { "utc": "2026-06-10T14:30:00Z", "timezone": "America/New_York" },
    "end":   { "utc": "2026-06-10T15:15:00Z" },
    "url": "https://www.eventbrite.com/e/111",
    "is_free": true,
    "venue": { "name": "John F. Germany Library", "address": { "localized_address_display": "900 N Ashley Dr, Tampa, FL 33602", "latitude": "27.9506", "longitude": "-82.4609", "city": "Tampa", "region": "FL" } } }
] }
```

- [ ] **Step 2: Write the failing test** `api/_lib/ingestion/connectors/eventbrite.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEventbrite } from './eventbrite.js';

test('parseEventbrite → intermediate[]', async () => {
  const raw = JSON.parse(await readFile(new URL('../../../../scripts/ingestion/fixtures/eventbrite-search.json', import.meta.url)));
  const [e] = parseEventbrite(raw);
  assert.equal(e.name, 'Toddler Storytime');
  assert.equal(e.startsAt, '2026-06-10T14:30:00Z');
  assert.equal(e.placeName, 'John F. Germany Library');
  assert.equal(e.city, 'Tampa, FL');
  assert.equal(e.lat, 27.9506);
  assert.equal(e.externalId, '111');
  assert.equal(e.priceSummary, 'Free');
});

test('parseEventbrite tolerates empty body', () => {
  assert.deepEqual(parseEventbrite({}), []);
});
```

- [ ] **Step 3: Run, verify fail:** `node --test api/_lib/ingestion/connectors/eventbrite.test.mjs` Expected: FAIL.

- [ ] **Step 4: Implement** `api/_lib/ingestion/connectors/eventbrite.js`:

```js
// Eventbrite public search connector. parseEventbrite is pure (fixture-tested);
// fetchRaw paginates with bounded retry/backoff and a field expansion for venue.
const BASE = 'https://www.eventbriteapi.com/v3/events/search/';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const cityState = (addr) => {
  const c = addr?.city, r = addr?.region;
  return c && r ? `${c}, ${r}` : (c || null);
};
const num = (v) => (v == null || v === '' ? null : Number(v));

export const parseEventbrite = (body) => {
  const events = body && Array.isArray(body.events) ? body.events : [];
  return events.map(ev => {
    const a = ev.venue?.address;
    return {
      name: ev.name?.text || 'Untitled',
      description: ev.description?.text || null,
      startsAt: ev.start?.utc || null,
      endsAt: ev.end?.utc || null,
      timezone: ev.start?.timezone || 'America/New_York',
      placeName: ev.venue?.name || null,
      address: a?.localized_address_display || null,
      lat: num(a?.latitude),
      lng: num(a?.longitude),
      city: cityState(a) || 'Tampa, FL',
      website: ev.url || null,
      sourceUrl: ev.url || null,
      externalId: String(ev.id),
      sourceCategory: 'eventbrite',
      priceSummary: ev.is_free ? 'Free' : (ev.is_free === false ? 'Paid' : null),
    };
  });
};

export async function fetchRaw({ query, since, limit = 50, token, logger = console }) {
  const out = [];
  let page = 1;
  while (out.length < limit) {
    const params = new URLSearchParams({
      q: query || 'family kids', 'location.address': 'Tampa, FL', 'location.within': '25km',
      expand: 'venue', page: String(page), sort_by: 'date',
    });
    if (since) params.set('start_date.range_start', new Date(since).toISOString().slice(0, 19) + 'Z');
    let attempt = 0;
    while (true) {
      attempt++;
      const r = await fetch(`${BASE}?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const body = await r.json();
        out.push(...parseEventbrite(body));
        if (!body.pagination || page >= body.pagination.page_count) return out.slice(0, limit);
        page++;
        break;
      }
      if ((r.status === 429 || r.status >= 500) && attempt <= 3) {
        const wait = Number(r.headers.get('Retry-After')) * 1000 || attempt * 1000;
        logger.warn?.(`eventbrite ${r.status}, retry ${attempt} in ${wait}ms`);
        await sleep(wait);
        continue;
      }
      const t = await r.text().catch(() => '');
      throw new Error(`eventbrite ${r.status}: ${t.slice(0, 200)}`);
    }
  }
  return out.slice(0, limit);
}
```

> **Note (verify at live-run time):** Eventbrite has deprecated the public `events/search` endpoint for some apps. If a live call returns 404/403, keep `parseEventbrite` (still correct for fixtures) and adjust `fetchRaw`'s endpoint/params to the org/venue endpoints your token allows. The parser + downstream pipeline are unaffected.

- [ ] **Step 5: Run, verify pass:** `node --test api/_lib/ingestion/connectors/eventbrite.test.mjs` Expected: PASS (2 tests).
- [ ] **Step 6: Commit** `git add api/_lib/ingestion/connectors/eventbrite.js api/_lib/ingestion/connectors/eventbrite.test.mjs scripts/ingestion/fixtures/eventbrite-search.json && git commit -m "feat(ingestion): Eventbrite connector + fixture test"`

### Task 11: ICS connector

**Files:** Create `api/_lib/ingestion/connectors/ics.js`, `.../ics.test.mjs`, `scripts/ingestion/fixtures/sample.ics`

- [ ] **Step 1: Save fixture** `scripts/ingestion/fixtures/sample.ics`:

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:evt-001@library.org
SUMMARY:Baby Storytime
DESCRIPTION:Rhymes and books for ages 0-2
DTSTART:20260610T143000Z
DTEND:20260610T151500Z
LOCATION:John F. Germany Library, Tampa, FL
URL:https://hcplc.org/events/evt-001
END:VEVENT
END:VCALENDAR
```

- [ ] **Step 2: Write the failing test** `api/_lib/ingestion/connectors/ics.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseIcs } from './ics.js';

test('parseIcs → intermediate[]', async () => {
  const text = await readFile(new URL('../../../../scripts/ingestion/fixtures/sample.ics', import.meta.url), 'utf8');
  const [e] = parseIcs(text, { defaultCity: 'Tampa, FL', sourceCategory: 'library' });
  assert.equal(e.name, 'Baby Storytime');
  assert.equal(e.externalId, 'evt-001@library.org');
  assert.equal(new Date(e.startsAt).toISOString(), '2026-06-10T14:30:00.000Z');
  assert.equal(e.placeName, 'John F. Germany Library, Tampa, FL');
  assert.equal(e.sourceUrl, 'https://hcplc.org/events/evt-001');
});

test('parseIcs tolerates empty text', () => {
  assert.deepEqual(parseIcs(''), []);
});
```

- [ ] **Step 3: Run, verify fail:** `node --test api/_lib/ingestion/connectors/ics.test.mjs` Expected: FAIL.

- [ ] **Step 4: Implement** `api/_lib/ingestion/connectors/ics.js`:

```js
// ICS calendar connector via node-ical. parseIcs is pure (fixture-tested);
// fetchRaw GETs the feed honoring ETag/Last-Modified when given.
import ical from 'node-ical';

export const parseIcs = (text, { defaultCity = 'Tampa, FL', sourceCategory = 'official_calendar' } = {}) => {
  if (!text || typeof text !== 'string') return [];
  let data;
  try { data = ical.sync.parseICS(text); } catch { return []; }
  const out = [];
  for (const k of Object.keys(data)) {
    const v = data[k];
    if (!v || v.type !== 'VEVENT' || !v.start) continue;
    out.push({
      name: v.summary || 'Untitled',
      description: v.description || null,
      startsAt: new Date(v.start).toISOString(),
      endsAt: v.end ? new Date(v.end).toISOString() : null,
      placeName: v.location || null,
      city: defaultCity,
      website: v.url || null,
      sourceUrl: v.url || null,
      externalId: v.uid || null,
      sourceCategory,
      recurringText: v.rrule ? 'Recurring' : null,
    });
  }
  return out;
};

export async function fetchRaw({ url, defaultCity = 'Tampa, FL', sourceCategory = 'official_calendar', etag, lastModified, logger = console }) {
  const headers = {};
  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;
  const r = await fetch(url, { headers });
  if (r.status === 304) { logger.info?.(`ics ${url} unchanged (304)`); return []; }
  if (!r.ok) throw new Error(`ics ${r.status}: ${url}`);
  return parseIcs(await r.text(), { defaultCity, sourceCategory });
}
```

- [ ] **Step 5: Run, verify pass:** `node --test api/_lib/ingestion/connectors/ics.test.mjs` Expected: PASS (2 tests).
- [ ] **Step 6: Commit** `git add api/_lib/ingestion/connectors/ics.js api/_lib/ingestion/connectors/ics.test.mjs scripts/ingestion/fixtures/sample.ics && git commit -m "feat(ingestion): ICS connector (node-ical) + fixture test"`

### Task 12: JSON-LD connector

**Files:** Create `api/_lib/ingestion/connectors/json-ld.js`, `.../json-ld.test.mjs`, `scripts/ingestion/fixtures/jsonld-event.html`

- [ ] **Step 1: Save fixture** `scripts/ingestion/fixtures/jsonld-event.html`:

```html
<!doctype html><html><head>
<script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "Event",
  "name": "Family Art Day",
  "startDate": "2026-06-13T10:00:00-04:00",
  "endDate": "2026-06-13T12:00:00-04:00",
  "url": "https://glazermuseum.org/events/family-art-day",
  "description": "Hands-on art for ages 2-8",
  "location": { "@type": "Place", "name": "Glazer Children's Museum",
    "address": { "@type": "PostalAddress", "addressLocality": "Tampa", "addressRegion": "FL" },
    "geo": { "@type": "GeoCoordinates", "latitude": 27.9487, "longitude": -82.4606 } } }
</script></head><body></body></html>
```

- [ ] **Step 2: Write the failing test** `api/_lib/ingestion/connectors/json-ld.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseJsonLd } from './json-ld.js';

test('parseJsonLd extracts schema.org Event nodes', async () => {
  const html = await readFile(new URL('../../../../scripts/ingestion/fixtures/jsonld-event.html', import.meta.url), 'utf8');
  const [e] = parseJsonLd(html, { sourceCategory: 'museum' });
  assert.equal(e.name, 'Family Art Day');
  assert.equal(e.placeName, "Glazer Children's Museum");
  assert.equal(e.city, 'Tampa, FL');
  assert.equal(e.lat, 27.9487);
  assert.equal(e.sourceUrl, 'https://glazermuseum.org/events/family-art-day');
});

test('parseJsonLd tolerates pages with no JSON-LD', () => {
  assert.deepEqual(parseJsonLd('<html></html>'), []);
});
```

- [ ] **Step 3: Run, verify fail:** `node --test api/_lib/ingestion/connectors/json-ld.test.mjs` Expected: FAIL.

- [ ] **Step 4: Implement** `api/_lib/ingestion/connectors/json-ld.js`:

```js
// JSON-LD (schema.org Event) connector via cheerio. parseJsonLd is pure
// (fixture-tested); fetchRaw fetches a page's HTML.
import * as cheerio from 'cheerio';

const cityState = (addr) => {
  const c = addr?.addressLocality, r = addr?.addressRegion;
  return c && r ? `${c}, ${r}` : (c || null);
};

const collectEvents = (node, acc) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => collectEvents(n, acc)); return; }
  if (Array.isArray(node['@graph'])) collectEvents(node['@graph'], acc);
  const t = node['@type'];
  const isEvent = t === 'Event' || (Array.isArray(t) && t.includes('Event')) || /Event$/.test(String(t || ''));
  if (isEvent && node.name && node.startDate) acc.push(node);
};

export const parseJsonLd = (html, { sourceCategory = 'json_ld' } = {}) => {
  if (!html || typeof html !== 'string') return [];
  let $;
  try { $ = cheerio.load(html); } catch { return []; }
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const txt = $(el).contents().text();
    try { collectEvents(JSON.parse(txt), nodes); } catch { /* skip malformed */ }
  });
  return nodes.map(n => {
    const loc = Array.isArray(n.location) ? n.location[0] : n.location;
    return {
      name: n.name,
      description: typeof n.description === 'string' ? n.description : null,
      startsAt: n.startDate ? new Date(n.startDate).toISOString() : null,
      endsAt: n.endDate ? new Date(n.endDate).toISOString() : null,
      placeName: loc?.name || null,
      address: loc?.address?.streetAddress || null,
      lat: loc?.geo?.latitude != null ? Number(loc.geo.latitude) : null,
      lng: loc?.geo?.longitude != null ? Number(loc.geo.longitude) : null,
      city: cityState(loc?.address) || 'Tampa, FL',
      website: typeof n.url === 'string' ? n.url : null,
      sourceUrl: typeof n.url === 'string' ? n.url : null,
      externalId: typeof n.url === 'string' ? n.url : (n.name || null),
      sourceCategory,
    };
  });
};

export async function fetchRaw({ url, sourceCategory = 'json_ld', logger = console }) {
  const r = await fetch(url, { headers: { 'User-Agent': 'GoMamaBot/1.0 (+family events; contact admin)' } });
  if (!r.ok) throw new Error(`json-ld ${r.status}: ${url}`);
  return parseJsonLd(await r.text(), { sourceCategory });
}
```

- [ ] **Step 5: Run, verify pass:** `node --test api/_lib/ingestion/connectors/json-ld.test.mjs` Expected: PASS (2 tests).
- [ ] **Step 6: Commit** `git add api/_lib/ingestion/connectors/json-ld.js api/_lib/ingestion/connectors/json-ld.test.mjs scripts/ingestion/fixtures/jsonld-event.html && git commit -m "feat(ingestion): JSON-LD connector (cheerio) + fixture test"`

### Task 13: Facebook Graph connector (built, source disabled)

**Files:** Create `api/_lib/ingestion/connectors/facebook-graph.js`, `.../facebook-graph.test.mjs`, `scripts/ingestion/fixtures/fb-graph-events.json`

- [ ] **Step 1: Save fixture** `scripts/ingestion/fixtures/fb-graph-events.json`:

```json
{ "data": [
  { "id": "999", "name": "Preschool Play Date",
    "description": "Open play for under-5s",
    "start_time": "2026-06-14T15:00:00-0400",
    "end_time": "2026-06-14T17:00:00-0400",
    "place": { "name": "Riverfront Park", "location": { "city": "Tampa", "state": "FL", "latitude": 27.95, "longitude": -82.46 } } }
] }
```

- [ ] **Step 2: Write the failing test** `api/_lib/ingestion/connectors/facebook-graph.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseGraphEvents } from './facebook-graph.js';

test('parseGraphEvents → intermediate[]', async () => {
  const raw = JSON.parse(await readFile(new URL('../../../../scripts/ingestion/fixtures/fb-graph-events.json', import.meta.url)));
  const [e] = parseGraphEvents(raw);
  assert.equal(e.name, 'Preschool Play Date');
  assert.equal(e.placeName, 'Riverfront Park');
  assert.equal(e.city, 'Tampa, FL');
  assert.equal(e.externalId, '999');
});

test('parseGraphEvents tolerates empty body', () => {
  assert.deepEqual(parseGraphEvents({}), []);
});
```

- [ ] **Step 3: Run, verify fail:** `node --test api/_lib/ingestion/connectors/facebook-graph.test.mjs` Expected: FAIL.

- [ ] **Step 4: Implement** `api/_lib/ingestion/connectors/facebook-graph.js`:

```js
// Facebook Graph public-page events connector. BUILT but the source is disabled
// (no META_GRAPH_TOKEN yet). parseGraphEvents is pure (fixture-tested).
const cityState = (loc) => {
  const c = loc?.city, r = loc?.state;
  return c && r ? `${c}, ${r}` : (c || null);
};

export const parseGraphEvents = (body) => {
  const data = body && Array.isArray(body.data) ? body.data : [];
  return data.map(ev => ({
    name: ev.name || 'Untitled',
    description: ev.description || null,
    startsAt: ev.start_time ? new Date(ev.start_time).toISOString() : null,
    endsAt: ev.end_time ? new Date(ev.end_time).toISOString() : null,
    placeName: ev.place?.name || null,
    lat: ev.place?.location?.latitude ?? null,
    lng: ev.place?.location?.longitude ?? null,
    city: cityState(ev.place?.location) || 'Tampa, FL',
    sourceUrl: ev.id ? `https://facebook.com/events/${ev.id}` : null,
    externalId: ev.id ? String(ev.id) : null,
    sourceCategory: 'facebook',
  }));
};

export async function fetchRaw({ pageId, token, logger = console }) {
  if (!token) throw new Error('META_GRAPH_TOKEN not set — facebook_graph source is disabled');
  const url = `https://graph.facebook.com/v19.0/${pageId}/events?fields=name,description,start_time,end_time,place&access_token=${token}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`facebook-graph ${r.status}`);
  return parseGraphEvents(await r.json());
}
```

- [ ] **Step 5: Run, verify pass:** `node --test api/_lib/ingestion/connectors/facebook-graph.test.mjs` Expected: PASS (2 tests).
- [ ] **Step 6: Commit** `git add api/_lib/ingestion/connectors/facebook-graph.js api/_lib/ingestion/connectors/facebook-graph.test.mjs scripts/ingestion/fixtures/fb-graph-events.json && git commit -m "feat(ingestion): Facebook Graph connector (built, disabled) + fixture test"`

### Task 14: Place-website discovery connector

**Files:** Create `api/_lib/ingestion/connectors/place-website.js`, `.../place-website.test.mjs`, `scripts/ingestion/fixtures/place-home.html`

- [ ] **Step 1: Save fixture** `scripts/ingestion/fixtures/place-home.html`:

```html
<!doctype html><html><head><title>Tampa Kids Gym</title></head><body>
<nav><a href="/about">About</a><a href="/calendar">Events Calendar</a><a href="/contact">Contact</a></nav>
</body></html>
```

- [ ] **Step 2: Write the failing test** `api/_lib/ingestion/connectors/place-website.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { discoverEventPage, extractPlaceEvents } from './place-website.js';

test('discoverEventPage finds the calendar link (absolute URL)', async () => {
  const html = await readFile(new URL('../../../../scripts/ingestion/fixtures/place-home.html', import.meta.url), 'utf8');
  assert.equal(discoverEventPage(html, 'https://tampakidsgym.com'), 'https://tampakidsgym.com/calendar');
});

test('discoverEventPage returns null when no event-ish link exists', () => {
  assert.equal(discoverEventPage('<a href="/menu">Menu</a>', 'https://x.com'), null);
});

test('extractPlaceEvents prefers JSON-LD then ICS', async () => {
  const jsonld = await readFile(new URL('../../../../scripts/ingestion/fixtures/jsonld-event.html', import.meta.url), 'utf8');
  const out = extractPlaceEvents({ html: jsonld, place: { id: 'p1', city: 'Tampa, FL' } });
  assert.equal(out.length, 1);
  assert.equal(out[0].placeId, 'p1');
  assert.equal(out[0].name, 'Family Art Day');
});
```

- [ ] **Step 3: Run, verify fail:** `node --test api/_lib/ingestion/connectors/place-website.test.mjs` Expected: FAIL.

- [ ] **Step 4: Implement** `api/_lib/ingestion/connectors/place-website.js`:

```js
// Per-place website event discovery. Fans out over DB places (Section 10).
// Pure: discoverEventPage + extractPlaceEvents (fixture-tested). Network in fetchRaw.
import * as cheerio from 'cheerio';
import { parseJsonLd } from './json-ld.js';
import { parseIcs } from './ics.js';

const EVENT_HINT = /event|calendar|programs|classes|camps|schedule|things-to-do|whats-on|what's-on/i;

export const discoverEventPage = (html, baseUrl) => {
  if (!html) return null;
  let $;
  try { $ = cheerio.load(html); } catch { return null; }
  let hit = null;
  $('a[href]').each((_, el) => {
    if (hit) return;
    const href = $(el).attr('href') || '';
    const text = $(el).text() || '';
    if (EVENT_HINT.test(href) || EVENT_HINT.test(text)) {
      try { hit = new URL(href, baseUrl).href; } catch { /* skip */ }
    }
  });
  return hit;
};

// Extract events from already-fetched content, tagged with the place. Structured
// data first: JSON-LD, then ICS. `place` provides id/city/area binding.
export const extractPlaceEvents = ({ html = null, ics = null, place }) => {
  const tag = (arr) => arr.map(e => ({
    ...e,
    placeId: place?.id || null,
    placeName: e.placeName || place?.name || null,
    city: place?.city || e.city || 'Tampa, FL',
    area: place?.area || null,
    sourceCategory: 'place_website',
  }));
  if (html) {
    const jl = parseJsonLd(html, { sourceCategory: 'place_website' });
    if (jl.length) return tag(jl);
  }
  if (ics) {
    const ev = parseIcs(ics, { defaultCity: place?.city || 'Tampa, FL', sourceCategory: 'place_website' });
    if (ev.length) return tag(ev);
  }
  return [];
};

const UA = 'GoMamaBot/1.0 (+family events discovery; contact admin)';
const getText = async (url) => {
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
};

// fetchRaw runs discovery for ONE place. Returns intermediate[] tagged w/ placeId.
export async function fetchRaw({ place, logger = console }) {
  if (!place?.website) return [];
  let home;
  try { home = await getText(place.website); } catch (e) { logger.warn?.(`place-website home ${place.website}: ${e.message}`); return []; }

  // Try JSON-LD on the homepage first.
  const direct = extractPlaceEvents({ html: home, place });
  if (direct.length) return direct;

  // Otherwise discover an events page and extract from it.
  const page = discoverEventPage(home, place.website);
  if (!page) return [];
  try {
    if (/\.ics($|\?)/i.test(page)) {
      const ics = await getText(page);
      return extractPlaceEvents({ ics, place });
    }
    const html = await getText(page);
    return extractPlaceEvents({ html, place });
  } catch (e) { logger.warn?.(`place-website page ${page}: ${e.message}`); return []; }
}
```

- [ ] **Step 5: Run, verify pass:** `node --test api/_lib/ingestion/connectors/place-website.test.mjs` Expected: PASS (3 tests).
- [ ] **Step 6: Commit** `git add api/_lib/ingestion/connectors/place-website.js api/_lib/ingestion/connectors/place-website.test.mjs scripts/ingestion/fixtures/place-home.html && git commit -m "feat(ingestion): place-website discovery connector + fixture test"`

---

# Phase 4 — Source registry, writer, orchestrator, CLI

### Task 15: Event source registry

**Files:** Modify `api/_lib/ingestion/sources.js`

- [ ] **Step 1: Append** the event sources + helper to `api/_lib/ingestion/sources.js` (after the existing `getSource` export):

```js
// ----------------------------------------------------------------- event sources
export const EVENT_SOURCES = [
  {
    id: 'eventbrite-tampa-family', name: 'Eventbrite — Tampa family', type: 'eventbrite',
    city: 'Tampa, FL', county: 'Hillsborough', enabled: true, cadenceHours: 24, parserVersion: 'v1',
    queries: [
      { q: 'kids', type: 'class' }, { q: 'toddler', type: 'playgroup' },
      { q: 'storytime', type: 'storytime' }, { q: 'family camp', type: 'camp' },
      { q: 'parenting', type: 'parenting-class' }, { q: 'preschool', type: 'class' },
    ],
  },
  {
    id: 'hcplc-library-ics', name: 'Tampa-Hillsborough Library calendar', type: 'ics',
    city: 'Tampa, FL', county: 'Hillsborough', enabled: false, cadenceHours: 24, parserVersion: 'v1',
    url: '', defaultType: 'library-program',
    notes: 'Set url to the public .ics feed for library storytimes before enabling.',
  },
  {
    id: 'glazer-museum-jsonld', name: "Glazer Children's Museum events", type: 'json_ld',
    city: 'Tampa, FL', county: 'Hillsborough', enabled: false, cadenceHours: 24, parserVersion: 'v1',
    url: 'https://glazermuseum.org/events/', defaultType: 'museum-program',
    notes: 'Verify the events page exposes schema.org Event JSON-LD before enabling.',
  },
  {
    id: 'place-websites', name: 'Place websites — event discovery', type: 'place_website',
    city: 'Tampa, FL', county: 'Hillsborough', enabled: true, cadenceHours: 72, parserVersion: 'v1',
    notes: 'Iterates over DB places with a website; default scans approved places.',
  },
  {
    id: 'fb-graph-tampa-venues', name: 'Facebook Graph — Tampa venues', type: 'facebook_graph',
    city: 'Tampa, FL', county: 'Hillsborough', enabled: false, cadenceHours: 24, parserVersion: 'v1',
    notes: 'Needs an approved Meta app + page tokens; run when META_GRAPH_TOKEN present.',
  },
];

export const getEventSource = (id) => EVENT_SOURCES.find(s => s.id === id) || null;
```

- [ ] **Step 2: Syntax check:** `node --check api/_lib/ingestion/sources.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/_lib/ingestion/sources.js && git commit -m "feat(ingestion): event source registry (eventbrite/ics/json_ld/place_website/fb)"`

### Task 16: Writer — event functions

**Files:** Modify `api/_lib/ingestion/writer.js`

- [ ] **Step 1: Append** the event writer functions to `api/_lib/ingestion/writer.js` (end of file; reuses the existing `createClient` import already present):

```js
// ------------------------------------------------------------------- events

const eventCandidateToRow = (c, placeId) => ({
  slug: c.slug, name: c.name, kind: c.kind || 'dated', event_type: c.eventType || 'other',
  city: c.city, place_id: placeId || null, place_name: c.placeName || null, area: c.area || null,
  day_of_week: c.dayOfWeek, bucket: c.bucket, time_label: c.timeLabel,
  starts_at: c.startsAt || null, ends_at: c.endsAt || null, timezone: c.timezone || 'America/New_York',
  recurring: c.recurring || 'One-time', description: c.description || null,
  website: c.website || null, source_url: c.sourceUrl || null, external_id: c.externalId || null,
  tags: c.tags || [], kid_ages: c.kidAges || [], indoor: c.indoor ?? null, hue: c.hue || null,
  age_min: c.ageMin ?? null, age_max: c.ageMax ?? null, price_summary: c.priceSummary || null,
  going_count: 0, hero_photo: c.heroPhoto || null,
  visible: false, review_status: 'needs_review',
  last_seen_at: new Date().toISOString(), source_confidence: c.confidence ?? null,
});

export const createEvent = async (sb, candidate, placeId) => {
  const { data, error } = await sb.from('events').insert(eventCandidateToRow(candidate, placeId)).select('id').single();
  if (error) throw new Error(`create event failed: ${error.message}`);
  return data.id;
};

// Refresh source-of-truth facts only; never flip visible/review_status.
export const refreshEvent = async (sb, eventId, candidate, placeId) => {
  const patch = {
    description: candidate.description ?? null, website: candidate.website ?? null,
    source_url: candidate.sourceUrl ?? null, starts_at: candidate.startsAt ?? null,
    ends_at: candidate.endsAt ?? null, price_summary: candidate.priceSummary ?? null,
    place_id: placeId ?? null, place_name: candidate.placeName ?? null,
    last_seen_at: new Date().toISOString(), source_confidence: candidate.confidence ?? null,
  };
  const { error } = await sb.from('events').update(patch).eq('id', eventId);
  if (error) throw new Error(`refresh event failed: ${error.message}`);
};

export const linkEventCategory = async (sb, eventId, categoryId) => {
  await sb.from('event_categories').upsert({ event_id: eventId, category_id: categoryId }, { onConflict: 'event_id,category_id' });
};

export const recordEventSource = async (sb, { sourceId, externalId, eventId, sourceUrl, raw, contentHash }) => {
  await sb.from('source_records').upsert({
    source_id: sourceId, external_id: externalId, record_type: 'event',
    event_id: eventId, source_url: sourceUrl || null, raw: raw || null, content_hash: contentHash || null,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'source_id,external_id,record_type' });
};

export const loadExistingEvents = async (sb) => {
  const { data, error } = await sb.from('events').select('id,external_id,name,starts_at,place_id,source_url');
  if (error) throw new Error(`load events failed: ${error.message}`);
  return data || [];
};

// Places eligible for website crawling. onlyApproved=true => approved-only.
export const loadIngestablePlaces = async (sb, { onlyApproved = true, placeId = null } = {}) => {
  let q = sb.from('places').select('id,name,city,area,website,review_status').not('website', 'is', null);
  if (placeId) q = q.eq('id', placeId);
  else if (onlyApproved) q = q.eq('review_status', 'approved');
  const { data, error } = await q;
  if (error) throw new Error(`load ingestable places failed: ${error.message}`);
  return (data || []).filter(p => p.website);
};
```

- [ ] **Step 2: Syntax check:** `node --check api/_lib/ingestion/writer.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/_lib/ingestion/writer.js && git commit -m "feat(ingestion): event writer (create/refresh/category/provenance/loaders)"`

### Task 17: Event orchestrator

**Files:** Create `api/_lib/ingestion/runEventIngestion.js`

- [ ] **Step 1: Implement** `api/_lib/ingestion/runEventIngestion.js`:

```js
import OpenAI from 'openai';
import { getEventSource } from './sources.js';
import { normalizeEvent } from './normalize-event.js';
import { classifyEventCandidate } from './dedupe-event.js';
import { resolveEventPlace } from './resolve-place.js';
import {
  makeClient, createEvent, refreshEvent, linkEventCategory, recordEventSource,
  loadExistingEvents, loadIngestablePlaces, upsertSource, startRun, finishRun, loadExistingPlaces,
} from './writer.js';
import { parseEventbrite, fetchRaw as ebFetch } from './connectors/eventbrite.js';
import { fetchRaw as icsFetch } from './connectors/ics.js';
import { fetchRaw as jsonLdFetch } from './connectors/json-ld.js';
import { fetchRaw as fbFetch } from './connectors/facebook-graph.js';
import { fetchRaw as placeWebFetch } from './connectors/place-website.js';

// Yields { intermediate, raw } intermediates for a source (dispatch by type).
async function* fetchIntermediates(source, { env, limit, since, placeId, allPlaces, logger, sb }) {
  if (source.type === 'eventbrite') {
    for (const { q } of source.queries || [{ q: 'family kids' }]) {
      const items = await ebFetch({ query: q, since, limit, token: env.EVENTBRITE_API_TOKEN, logger });
      for (const it of items) yield { intermediate: it };
    }
  } else if (source.type === 'ics') {
    if (!source.url) { logger.warn?.(`ics source ${source.id} has no url`); return; }
    for (const it of await icsFetch({ url: source.url, defaultCity: source.city, sourceCategory: source.defaultType, logger })) yield { intermediate: it };
  } else if (source.type === 'json_ld') {
    for (const it of await jsonLdFetch({ url: source.url, sourceCategory: source.defaultType, logger })) yield { intermediate: it };
  } else if (source.type === 'facebook_graph') {
    if (!env.META_GRAPH_TOKEN) throw new Error('facebook_graph disabled: no META_GRAPH_TOKEN');
    for (const it of await fbFetch({ pageId: source.pageId, token: env.META_GRAPH_TOKEN, logger })) yield { intermediate: it };
  } else if (source.type === 'place_website') {
    const places = await loadIngestablePlaces(sb, { onlyApproved: !allPlaces, placeId });
    for (const place of places) {
      try {
        for (const it of await placeWebFetch({ place, logger })) yield { intermediate: it };
      } catch (e) { logger.error?.(`place-website ${place.name}: ${e.message}`); }
    }
  } else {
    throw new Error(`unknown event source type: ${source.type}`);
  }
}

// Run one event source. dryRun => no writes, counts only.
export async function runEventIngestion({ sourceId, limit = 50, since = null, dryRun = false, placeId = null, allPlaces = false, venueLimit = 100, logger = console, env }) {
  const source = getEventSource(sourceId);
  if (!source) throw new Error(`unknown event source: ${sourceId}`);

  const sb = dryRun ? null : makeClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const openai = (!dryRun && env.OPENAI_API_KEY) ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
  const counts = { fetched: 0, normalized: 0, created: 0, updated: 0, review: 0, skipped: 0, errors: 0, venuesResolved: 0, placesCreatedFromVenues: 0, venuesLinked: 0, placesScanned: 0 };
  const reviewItems = [];

  let runId = null;
  if (!dryRun) { await upsertSource(sb, source); runId = await startRun(sb, source.id); }
  const existingEvents = dryRun ? [] : await loadExistingEvents(sb);
  const existingPlaces = dryRun ? [] : await loadExistingPlaces(sb);
  const venueCache = new Map();

  try {
    for await (const { intermediate, raw } of fetchIntermediates(source, { env, limit, since, placeId, allPlaces, logger, sb })) {
      counts.fetched++;
      try {
        const cand = normalizeEvent(intermediate, { source, fetchedAt: new Date().toISOString() });
        cand.sourceId = source.id;
        counts.normalized++;

        // Venue → place (skip for place_website; placeId already known on the intermediate).
        let placeId2 = intermediate.placeId || null;
        if (!placeId2 && cand.placeName) {
          if (counts.venuesResolved < venueLimit) {
            const res = await resolveEventPlace(cand, { existingPlaces, venueCache, sb, apiKey: env.GOOGLE_PLACES_API_KEY, env, dryRun, logger, openai });
            placeId2 = res.placeId;
            counts.venuesResolved++;
            if (res.action === 'create') counts.placesCreatedFromVenues++;
            else if (res.action === 'link' || res.action === 'cached') counts.venuesLinked++;
          }
        }
        cand.placeId = placeId2;

        const verdict = classifyEventCandidate(cand, existingEvents);
        if (dryRun) {
          if (verdict.action === 'create') counts.created++;
          else if (verdict.action === 'update') counts.updated++;
          else { counts.review++; reviewItems.push(cand.name); }
          continue;
        }

        if (verdict.action === 'update') {
          await refreshEvent(sb, verdict.matchId, cand, placeId2);
          await linkEventCategory(sb, verdict.matchId, cand.eventType);
          await recordEventSource(sb, { sourceId: source.id, externalId: cand.externalId, eventId: verdict.matchId, sourceUrl: cand.sourceUrl, raw: raw || intermediate });
          counts.updated++;
        } else {
          const eventId = await createEvent(sb, cand, placeId2);
          for (const c of cand.eventCategories || [cand.eventType]) await linkEventCategory(sb, eventId, c);
          await recordEventSource(sb, { sourceId: source.id, externalId: cand.externalId, eventId, sourceUrl: cand.sourceUrl, raw: raw || intermediate });
          existingEvents.push({ id: eventId, external_id: cand.externalId, name: cand.name, starts_at: cand.startsAt, place_id: placeId2, source_url: cand.sourceUrl });
          if (verdict.action === 'review') counts.review++;
          counts.created++;
        }
      } catch (e) { counts.errors++; logger.error?.(`event "${intermediate?.name}" failed: ${e.message}`); }
    }
  } catch (e) { counts.errors++; logger.error?.(`source ${source.id} failed: ${e.message}`); }

  if (!dryRun) {
    const status = counts.errors === 0 ? 'succeeded' : (counts.created || counts.updated ? 'partial' : 'failed');
    await finishRun(sb, runId, status, { ...counts, summary: { review: counts.review, venuesResolved: counts.venuesResolved, placesCreatedFromVenues: counts.placesCreatedFromVenues } });
  }
  return { ...counts, reviewItems };
}
```

- [ ] **Step 2: Syntax check:** `node --check api/_lib/ingestion/runEventIngestion.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/_lib/ingestion/runEventIngestion.js && git commit -m "feat(ingestion): event orchestrator (fetch→normalize→resolve venue→dedupe→write)"`

### Task 18: CLI dispatch by source type

**Files:** Modify `scripts/ingest-family-data.mjs`

- [ ] **Step 1: Replace** the body of `scripts/ingest-family-data.mjs` with type-dispatching logic (keeps the existing Google place pipeline working):

```js
#!/usr/bin/env node
// CLI wrapper. Dispatches by source type:
//   google_places                              -> place pipeline (runIngestion)
//   eventbrite|ics|json_ld|facebook_graph|place_website -> event pipeline (runEventIngestion)
//
// Usage:
//   node scripts/ingest-family-data.mjs --source eventbrite-tampa-family --dry-run --limit 5
//   node scripts/ingest-family-data.mjs --source place-websites --place <uuid>
import { runIngestion } from '../api/_lib/ingestion/runIngestion.js';
import { runEventIngestion } from '../api/_lib/ingestion/runEventIngestion.js';
import { getSource } from '../api/_lib/ingestion/sources.js';
import { getEventSource } from '../api/_lib/ingestion/sources.js';

const flags = process.argv.slice(2);
const val = (name, fb) => { const i = flags.indexOf(name); return i >= 0 ? flags[i + 1] : fb; };
const sourceId = val('--source', 'google-places-tampa');
const limit = parseInt(val('--limit', '20'), 10);
const since = val('--since', null);
const place = val('--place', null);
const venueLimit = parseInt(val('--venue-limit', '100'), 10);
const allPlaces = flags.includes('--all-places');
const dryRun = flags.includes('--dry-run');

const env = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  EVENTBRITE_API_TOKEN: process.env.EVENTBRITE_API_TOKEN,
  META_GRAPH_TOKEN: process.env.META_GRAPH_TOKEN,
};
if (!dryRun && (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (required for live writes)');
  process.exit(1);
}

const isEvent = !!getEventSource(sourceId);
const run = isEvent
  ? runEventIngestion({ sourceId, limit, since, dryRun, placeId: place, allPlaces, venueLimit, env, logger: console })
  : runIngestion({ sourceId, limit, dryRun, env, logger: console });

run.then(c => {
  console.log(`\n${dryRun ? 'DRY RUN' : 'INGEST'} [${sourceId}] (${isEvent ? 'events' : 'places'})`);
  console.log(`  fetched=${c.fetched} normalized=${c.normalized} created=${c.created} updated=${c.updated} ` +
    `needs-review=${c.review ?? 0} skipped=${c.skipped} errors=${c.errors}`);
  if (isEvent) console.log(`  venuesResolved=${c.venuesResolved} placesCreatedFromVenues=${c.placesCreatedFromVenues} venuesLinked=${c.venuesLinked}`);
  if (dryRun && c.reviewItems?.length) console.log(`  review samples: ${c.reviewItems.slice(0, 8).join(', ')}`);
}).catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Syntax check:** `node --check scripts/ingest-family-data.mjs` Expected: no output.
- [ ] **Step 3: Run full suite:** `npm test` Expected: all `node:test` files PASS.
- [ ] **Step 4: Commit** `git add scripts/ingest-family-data.mjs && git commit -m "feat(ingestion): CLI dispatch places vs events by source type"`

---

# Phase 5 — Public read API + app wiring

### Task 19: `GET /api/events`

**Files:** Create `api/events.js`

- [ ] **Step 1: Write the handler** `api/events.js`:

```js
// GET /api/events — public. Visible events only, place-visibility-gated.
// Returns { recurring: [...SUGGESTED_EVENTS shape], thisWeek: [...dated upcoming] }.
import { json, supabaseCreds, sbHeaders } from './_lib/supabase.js';
import { splitEvents } from './_lib/events-shape.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=120');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const select = 'id,slug,name,kind,event_type,day_of_week,bucket,time_label,starts_at,ends_at,' +
      'recurring,place_id,place_name,city,area,tags,kid_ages,indoor,hue,hero_photo,going_count,visible,' +
      'places(name,area,lat,lng,hero_photo,visible)';
    const url = `${creds.supabaseUrl}/rest/v1/events` +
      `?select=${select}&visible=eq.true&order=starts_at.asc.nullslast&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    const { recurring, thisWeek } = splitEvents(rows, { now: new Date(), windowDays: 14 });
    return json(res, 200, { ok: true, count: rows.length, recurring, thisWeek });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
```

- [ ] **Step 2: Syntax check:** `node --check api/events.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/events.js && git commit -m "feat(api): GET /api/events (place-gated recurring + thisWeek)"`

### Task 20: `events-api.js` client + fallback

**Files:** Create `src/lib/events-api.js`, `src/lib/events-api.test.mjs`

- [ ] **Step 1: Write the failing test** `src/lib/events-api.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEventsPayload, findEventIn } from './events-api.js';

test('passes through a well-formed payload', () => {
  const out = normalizeEventsPayload({ recurring: [{ id: '1' }], thisWeek: [{ id: '2' }] });
  assert.equal(out.recurring.length, 1);
  assert.equal(out.thisWeek.length, 1);
});

test('falls back to empty arrays when missing', () => {
  const out = normalizeEventsPayload(null);
  assert.deepEqual(out.recurring, []);
  assert.deepEqual(out.thisWeek, []);
});

test('findEventIn matches by id or slug', () => {
  const list = [{ id: 'a', slug: 'sa' }, { id: 'b', slug: 'sb' }];
  assert.equal(findEventIn(list, 'sb').id, 'b');
  assert.equal(findEventIn(list, 'a').slug, 'sa');
  assert.equal(findEventIn(list, 'zzz'), null);
});
```

- [ ] **Step 2: Run, verify fail:** `node --test src/lib/events-api.test.mjs` Expected: FAIL.

- [ ] **Step 3: Implement** `src/lib/events-api.js`:

```js
// Client for the public events API. Normalizes into the shapes screens consume.
export const normalizeEventsPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return { recurring: [], thisWeek: [] };
  return {
    recurring: Array.isArray(payload.recurring) ? payload.recurring : [],
    thisWeek: Array.isArray(payload.thisWeek) ? payload.thisWeek : [],
  };
};

export const fetchEvents = async () => {
  const res = await fetch('/api/events', { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`events ${res.status}`);
  return normalizeEventsPayload(await res.json());
};

// Resolve an event by id/slug across a list (live or fallback).
export const findEventIn = (list, id) =>
  (list || []).find(e => e.id === id || e.slug === id) || null;
```

- [ ] **Step 4: Run, verify pass:** `node --test src/lib/events-api.test.mjs` Expected: PASS (3 tests).
- [ ] **Step 5: Commit** `git add src/lib/events-api.js src/lib/events-api.test.mjs && git commit -m "feat(lib): events-api client + normalize + findEventIn"`

### Task 21: `App.jsx` events loader

**Files:** Modify `src/App.jsx`

- [ ] **Step 1: Add imports** near the existing `fetchPlaces` import (`src/App.jsx:37`):

```jsx
import { fetchEvents } from './lib/events-api';
import { SUGGESTED_EVENTS as FALLBACK_EVENTS } from './data/events';
```

- [ ] **Step 2: Add loader state + effect** alongside the `livePlaces` block (around `src/App.jsx:77`):

```jsx
const [liveEvents, setLiveEvents] = useState(null); // { recurring, thisWeek } | null

useEffect(() => {
  let alive = true;
  fetchEvents()
    .then(data => { if (alive) setLiveEvents(data); })
    .catch(() => { if (alive) setLiveEvents(null); });
  return () => { alive = false; };
}, []);

// Live recurring events when present; hardcoded fallback so the app never blanks.
const eventsData = liveEvents?.recurring?.length ? liveEvents.recurring : FALLBACK_EVENTS;
const thisWeekData = liveEvents?.thisWeek || [];
```

- [ ] **Step 3: Pass props to `MainApp`** — at the `<MainApp` render (around `src/App.jsx:266`, where `places={placesData}` is already passed), add:

```jsx
events={eventsData}
thisWeek={thisWeekData}
```

- [ ] **Step 4: Build:** `npm run build` Expected: builds OK (props additive; screens read them next task).
- [ ] **Step 5: Commit** `git add src/App.jsx && git commit -m "feat(app): load live events in App.jsx with fallback"`

### Task 22: Thread events through `MainApp` + consume in screens

**Files:** Modify `src/screens/MainApp/index.jsx`, `src/screens/MainApp/ActivitiesTab.jsx`, `src/screens/MainApp/MatchesTab.jsx`

- [ ] **Step 1: Accept + forward props in `MainApp/index.jsx`.** In the shell's destructured props, add `events, thisWeek,`. Where `<ActivitiesTab` and `<MatchesTab` are rendered, pass `events={events} thisWeek={thisWeek}`. (Search: `grep -n "ActivitiesTab\|MatchesTab" src/screens/MainApp/index.jsx`.)

- [ ] **Step 2: `ActivitiesTab.jsx` — read events from props with fallback.** Change the import and component signature:

```jsx
// was: import { SUGGESTED_EVENTS } from '../../data/events';
import { SUGGESTED_EVENTS as EVENTS_FALLBACK } from '../../data/events';
```

In the `ActivitiesTab` component body (top, after the signature `export const ActivitiesTab = ({ ... }) => {`), add `events` and `thisWeek` to the destructured props and alias:

```jsx
export const ActivitiesTab = ({ events, thisWeek = [], /* ...existing props... */ }) => {
  const SUGGESTED_EVENTS = events || EVENTS_FALLBACK;
  // ...existing body unchanged, now referencing the local SUGGESTED_EVENTS
```

- [ ] **Step 3: Light up the "This week" surface.** In `ActivitiesTab.jsx`, the `passesVisibleThings` filter currently treats `'this-week'` as a no-op. Replace the things-to-do source so that when the `this-week` chip is active, real dated `thisWeek` events render. Add this just before the rendered things list is built (where the existing `SUGGESTED_EVENTS.filter(...)` for Things to do is computed, around `ActivitiesTab.jsx:465`):

```jsx
// When the "This week" chip is active and we have live dated events, show those.
const thisWeekActive = visibleThings.has?.('this-week') || (Array.isArray(visibleThings) && visibleThings.includes?.('this-week'));
const thingsSource = (thisWeekActive && thisWeek.length) ? thisWeek : SUGGESTED_EVENTS;
```

Then change the Things-to-do list builder to iterate `thingsSource` instead of `SUGGESTED_EVENTS` (replace the single `SUGGESTED_EVENTS` reference in that `.filter(...)` chain with `thingsSource`). Leave the count chip referencing `SUGGESTED_EVENTS.length` for the recurring catalog, or update to `thingsSource.length` if you want it to reflect the active view.

> If the local state variable holding the active quick-filter chips is named differently than `visibleThings`, adapt the guard to that name (search `this-weekend` in the file to find the active-set variable). The dated cards reuse the existing `EventCard` — dated events carry `day`/`time` derived server-side, so `EventCard` renders unchanged; the date label comes from `time`/`day`.

- [ ] **Step 4: `MatchesTab.jsx` — read events from props with fallback.** Same minimal pattern: change `import { SUGGESTED_EVENTS } from '../../data/events';` to `import { SUGGESTED_EVENTS as EVENTS_FALLBACK } from '../../data/events';`, add `events` to the destructured props, and at the top of the component body add `const SUGGESTED_EVENTS = events || EVENTS_FALLBACK;`.

- [ ] **Step 5: Build:** `npm run build` Expected: builds OK.
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(app): screens consume live events; light up This week surface"`

> **EXECUTION NOTE (2026-06-09):** The live `MainApp` shell was redesigned since this plan was authored. It now mounts `ThisWeekTab`/`ConnectTab`/`LocalPicksTab`/`YouTab` (NOT `ActivitiesTab`/`MatchesTab`, which are legacy/unmounted), and `ThisWeekTab` renders **hardcoded curated card arrays** (`TODAY_ITEMS`, `WEEKEND_ITEMS`, `POPULAR_PLACES`, `AGE_CATEGORIES`) rather than `SUGGESTED_EVENTS`. The data plumbing (T19 `/api/events`, T20 client, T21 `App.jsx` loader + `MainApp` prop forwarding) is correct and in place; the legacy-tab prop-consumption edits were committed (harmless, inert). **Rendering live ingested events into the redesigned `ThisWeekTab` cards is deferred as a follow-up** — it requires a DB-row→curated-card mapping and product decisions about which sections (Today/Weekend/See-all) surface dated vs. recurring events. The places slice's app-wiring is likely inert in the same way (pre-existing). Backend/admin/API phases are unaffected.

---

# Phase 6 — Admin CRUD

### Task 23: `POST /api/admin/events/update`

**Files:** Create `api/admin/events/update.js`

- [ ] **Step 1: Implement** (modeled on `api/admin/places/update.js`):

```js
// POST /api/admin/events/update — admin-only event review/CRUD.
// SECURITY: requireAdmin bearer token.
// Body is one of:
//   { id, patch: {<editable fields>} }                     -> edit one event
//   { ids: [uuid], patch: { review_status?, visible? } }   -> bulk status/visibility
//   { delete: uuid }                                        -> delete an event
//   { placeId, patch: { review_status?, visible? } }       -> cascade to a place's events
import { json, readJsonBody, supabaseCreds, sbHeaders, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';

const EDITABLE = new Set([
  'name','event_type','kind','description','place_id','place_name','area','city',
  'starts_at','ends_at','day_of_week','bucket','time_label','recurring','website','source_url',
  'tags','kid_ages','indoor','hue','age_min','age_max','price_summary','hero_photo','going_count',
  'review_status','visible',
]);

const sanitize = (patch) => {
  if (!patch || typeof patch !== 'object') return { error: 'patch object required' };
  const out = {};
  for (const [k, v] of Object.entries(patch)) {
    if (!EDITABLE.has(k)) return { error: `unknown field: ${k}` };
    out[k] = v;
  }
  if (out.review_status && !['needs_review','approved','rejected','archived'].includes(out.review_status)) return { error: 'bad review_status' };
  if (out.kind && !['recurring','dated'].includes(out.kind)) return { error: 'bad kind' };
  if (out.place_id && !isUuid(out.place_id)) return { error: 'place_id must be a uuid' };
  if (Object.keys(out).length === 0) return { error: 'patch must include at least one field' };
  return { patch: out };
};

const patchRows = async (creds, filter, patch) => {
  const url = `${creds.supabaseUrl}/rest/v1/events?${filter}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: sbHeaders(creds.serviceRoleKey, { Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text || '[]');
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });
  const body = readJsonBody(req);
  if (body === null) return json(res, 400, { error: 'Invalid JSON body' });

  try {
    if (body.delete) {
      if (!isUuid(body.delete)) return json(res, 400, { error: 'delete must be a uuid' });
      const r = await fetch(`${creds.supabaseUrl}/rest/v1/events?id=eq.${body.delete}`, { method: 'DELETE', headers: sbHeaders(creds.serviceRoleKey) });
      if (!r.ok) return json(res, 502, { error: `delete failed ${r.status}` });
      return json(res, 200, { ok: true, deleted: body.delete });
    }

    // Cascade to all of a place's events (publish/hide).
    if (body.placeId) {
      if (!isUuid(body.placeId)) return json(res, 400, { error: 'placeId must be a uuid' });
      const s = sanitize(body.patch);
      if (s.error) return json(res, 400, { error: s.error });
      const rows = await patchRows(creds, `place_id=eq.${body.placeId}`, s.patch);
      return json(res, 200, { ok: true, count: rows.length, rows });
    }

    if (Array.isArray(body.ids)) {
      if (!body.ids.every(isUuid)) return json(res, 400, { error: 'ids must be uuids' });
      const s = sanitize(body.patch);
      if (s.error) return json(res, 400, { error: s.error });
      const inList = body.ids.map(id => `"${id}"`).join(',');
      const rows = await patchRows(creds, `id=in.(${inList})`, s.patch);
      return json(res, 200, { ok: true, count: rows.length, rows });
    }

    const id = typeof body.id === 'string' ? body.id : '';
    if (!isUuid(id)) return json(res, 400, { error: 'id must be a uuid' });
    const s = sanitize(body.patch);
    if (s.error) return json(res, 400, { error: s.error });
    const rows = await patchRows(creds, `id=eq.${id}`, s.patch);
    if (!rows.length) return json(res, 404, { error: 'No event with that id' });
    return json(res, 200, { ok: true, row: rows[0] });
  } catch (e) {
    console.error('admin/events/update threw', e);
    return json(res, 502, { error: e?.message || 'Network error' });
  }
}
```

- [ ] **Step 2: Syntax check:** `node --check api/admin/events/update.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/admin/events/update.js && git commit -m "feat(api): admin events update (edit/bulk/delete/place-cascade)"`

### Task 24: Embed place + categories in `GET /api/admin/events`

**Files:** Modify `api/admin/events.js`

- [ ] **Step 1: Replace the select** so the review UI gets the matched place + types. Change the query line:

```js
const url = `${creds.supabaseUrl}/rest/v1/events` +
  `?select=*,places(id,name,area,visible),event_categories(category_id)&order=created_at.desc&limit=5000`;
```

- [ ] **Step 2: Syntax check:** `node --check api/admin/events.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/admin/events.js && git commit -m "feat(api): embed place + categories in admin events read"`

### Task 25: Per-place event ingestion route

**Files:** Create `api/admin/places/ingest-events.js`

- [ ] **Step 1: Implement** (runs the `place_website` source scoped to one place):

```js
// POST /api/admin/places/ingest-events — admin-only. Scrapes events from one
// place's website (the place_website connector), scoped to { placeId }.
import { json, readJsonBody, isUuid } from '../../_lib/supabase.js';
import { requireAdmin } from '../../_lib/admin-auth.js';
import { runEventIngestion } from '../../_lib/ingestion/runEventIngestion.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const body = readJsonBody(req);
  if (body === null || !isUuid(body.placeId)) return json(res, 400, { error: 'placeId (uuid) required' });

  const env = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  };
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const counts = await runEventIngestion({
      sourceId: 'place-websites', placeId: body.placeId, allPlaces: true,
      limit: 50, env, logger: console,
    });
    return json(res, 200, { ok: true, counts });
  } catch (e) {
    console.error('ingest-events threw', e);
    return json(res, 502, { error: e?.message || 'ingestion failed' });
  }
}
```

- [ ] **Step 2: Syntax check:** `node --check api/admin/places/ingest-events.js` Expected: no output.
- [ ] **Step 3: Commit** `git add api/admin/places/ingest-events.js && git commit -m "feat(api): per-place event ingestion endpoint"`

### Task 26: `EventEditModal` admin component

**Files:** Create `src/admin/EventEditModal.jsx`

- [ ] **Step 1: Create** `src/admin/EventEditModal.jsx` (mirrors `PlaceEditModal`; includes a place picker that sets `place_id`):

```jsx
import { useState, useMemo } from 'react';
import { C } from '../theme';
import { X } from 'lucide-react';

const TYPES = [
  'storytime','class','workshop','stem','art-class','music-class','dance-class','cooking-class',
  'language-class','tutoring','sports-event','swim','gymnastics','martial-arts','kids-fitness',
  'family-yoga','camp','break-camp','playgroup','open-play','parent-meetup','support-group',
  'performance','movie','concert','museum-program','library-program','animal-encounter','festival',
  'fair','seasonal','farmers-market','community-event','outdoor-adventure','prenatal-class',
  'new-parent','parenting-class','breastfeeding','sensory-friendly','special-needs','fundraiser',
  'religious','other',
];

export const EventEditModal = ({ event, places = [], adminFetch, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: event.name || '', event_type: event.event_type || 'other', kind: event.kind || 'dated',
    description: event.description || '', place_id: event.place_id || '', place_name: event.place_name || '',
    starts_at: event.starts_at ? event.starts_at.slice(0, 16) : '', website: event.website || '',
    source_url: event.source_url || '', tags: (event.tags || []).join(', '),
    visible: !!event.visible, review_status: event.review_status || 'needs_review',
  });
  const [placeQuery, setPlaceQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const placeMatches = useMemo(() => {
    const q = placeQuery.trim().toLowerCase();
    if (!q) return [];
    return (places || []).filter(p => `${p.name} ${p.area || ''}`.toLowerCase().includes(q)).slice(0, 6);
  }, [placeQuery, places]);

  const post = async (payload, label) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/events/update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      return true;
    } catch (e) { alert(`${label} failed: ${e.message}`); return false; }
    finally { setBusy(false); }
  };

  const save = async () => {
    const patch = {
      name: form.name, event_type: form.event_type, kind: form.kind,
      description: form.description || null, place_id: form.place_id || null, place_name: form.place_name || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      website: form.website || null, source_url: form.source_url || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      visible: form.visible, review_status: form.review_status,
    };
    if (await post({ id: event.id, patch }, 'Save')) await onSaved();
  };

  const field = (k, label, type = 'text') => (
    <label key={k} style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>{label}
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
        style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
    </label>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.paper, borderRadius: 16, width: 560, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 20 }}>
        <div className="flex items-center mb-3">
          <h3 style={{ fontFamily: 'Fraunces', fontSize: 18, color: C.ink, flex: 1 }}>Edit event</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {field('name', 'Name')}
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Type
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)}
              style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {field('starts_at', 'Starts at', 'datetime-local')}
          <label style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Kind
            <select value={form.kind} onChange={e => set('kind', e.target.value)}
              style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>
              <option value="dated">dated</option><option value="recurring">recurring</option>
            </select>
          </label>
          {field('website', 'Website')}
          {field('source_url', 'Source URL')}
        </div>

        {/* Place picker */}
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>
            Linked place: <strong>{form.place_name || '—'}</strong> {form.place_id ? `(${form.place_id.slice(0, 8)})` : '(unlinked)'}
          </div>
          <input value={placeQuery} onChange={e => setPlaceQuery(e.target.value)} placeholder="search places to link…"
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13, marginTop: 4 }} />
          {placeMatches.map(p => (
            <button key={p.id} onClick={() => { set('place_id', p.id); set('place_name', p.name); setPlaceQuery(''); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: C.cream, border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px', fontFamily: 'Albert Sans', fontSize: 12.5, marginTop: 4, cursor: 'pointer' }}>
              {p.name} · {p.area || '—'}
            </button>
          ))}
        </div>

        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Description
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
        </label>
        <label style={{ display: 'block', marginTop: 8, fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkSoft }}>Tags (comma-separated)
          <input value={form.tags} onChange={e => set('tags', e.target.value)}
            style={{ width: '100%', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '6px 8px', fontSize: 13 }} />
        </label>

        <div className="flex items-center gap-3 mt-3">
          <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink }}>
            <input type="checkbox" checked={form.visible} onChange={e => set('visible', e.target.checked)} /> visible in app
          </label>
          <select value={form.review_status} onChange={e => set('review_status', e.target.value)}
            style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '5px 8px', fontSize: 12.5 }}>
            {['needs_review','approved','rejected','archived'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button disabled={busy} onClick={save}
            style={{ marginLeft: 'auto', background: C.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit** `git add src/admin/EventEditModal.jsx && git commit -m "feat(admin): event edit modal + place picker"`

### Task 27: `EventsManager` admin view + tab

**Files:** Create `src/admin/EventsManager.jsx`; Modify `src/AdminPage.jsx`

- [ ] **Step 1: Create** `src/admin/EventsManager.jsx`:

```jsx
import { useState, useMemo } from 'react';
import { C } from '../theme';
import { Check, EyeOff, X, Pencil, Search, Calendar } from 'lucide-react';
import { EventEditModal } from './EventEditModal';

const STATUSES = ['needs_review', 'approved', 'rejected', 'archived'];

export const EventsManager = ({ rows, places = [], adminFetch, onReload }) => {
  const [status, setStatus] = useState('needs_review');
  const [kind, setKind] = useState('all');
  const [hasPlace, setHasPlace] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => (rows || []).filter(r => {
    if (status !== 'all' && r.review_status !== status) return false;
    if (kind !== 'all' && r.kind !== kind) return false;
    if (hasPlace && !r.place_id) return false;
    if (q && !(`${r.name} ${r.place_name || ''} ${r.event_type || ''}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [rows, status, kind, hasPlace, q]);

  const toggle = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const post = async (payload) => {
    setBusy(true);
    try {
      const r = await adminFetch('/api/admin/events/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
      setSelected(new Set());
      await onReload();
    } catch (e) { alert(`Update failed: ${e.message}`); }
    finally { setBusy(false); }
  };
  const setRow = (id, patch) => post({ id, patch });
  const bulk = (patch) => post({ ids: [...selected], patch });

  const chip = (active, onClick, label) => (
    <button key={label} onClick={onClick} style={{
      background: active ? C.sageDark : 'transparent', color: active ? '#fff' : C.inkSoft,
      border: `1px solid ${active ? C.sageDark : C.divider}`, borderRadius: 999,
      padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer',
    }}>{label}</button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {chip(status === 'all', () => setStatus('all'), 'All')}
        {STATUSES.map(s => chip(status === s, () => setStatus(s), s))}
        <span style={{ width: 1, height: 18, background: C.divider }} />
        {['all','recurring','dated'].map(k => chip(kind === k, () => setKind(k), k))}
        <label style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkSoft }}>
          <input type="checkbox" checked={hasPlace} onChange={e => setHasPlace(e.target.checked)} /> has place
        </label>
        <div className="flex items-center gap-1" style={{ border: `1px solid ${C.divider}`, borderRadius: 8, padding: '2px 8px' }}>
          <Search size={13} style={{ color: C.inkMuted }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="search name/place/type"
            style={{ border: 'none', outline: 'none', fontFamily: 'Albert Sans', fontSize: 12.5, width: 170 }} />
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'Albert Sans', fontSize: 12, color: C.inkMuted }}>{filtered.length} events</span>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-xl" style={{ background: C.sage, border: `1px solid ${C.sageDark}33` }}>
          <span style={{ fontFamily: 'Albert Sans', fontSize: 12.5, fontWeight: 600, color: C.ink }}>{selected.size} selected</span>
          <button disabled={busy} onClick={() => bulk({ review_status: 'approved', visible: true })}
            style={{ background: C.sageDark, color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            <Check size={12} className="inline mr-1" />Approve + Publish
          </button>
          <button disabled={busy} onClick={() => bulk({ review_status: 'rejected', visible: false })}
            style={{ background: C.paper, color: C.terracotta, border: `1px solid ${C.terracotta}`, borderRadius: 8, padding: '5px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Reject
          </button>
        </div>
      )}

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.divider}`, background: C.paper }}>
        {filtered.map(r => (
          <div key={r.id} className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: `1px solid ${C.divider}` }}>
            <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} />
            <div style={{ width: 36, height: 36, borderRadius: 8, background: r.hue || C.sage, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={15} style={{ color: '#fff' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: 'Fraunces', fontSize: 14, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11.5, color: C.inkMuted }}>
                {r.event_type} · {r.kind} · {r.place_name || (r.place_id ? 'linked place' : 'no place')} · {r.day_of_week || ''} {r.time_label || ''} · <span style={{ color: r.visible ? C.sageDark : C.inkMuted }}>{r.review_status}</span>
              </div>
            </div>
            <button title="Approve" disabled={busy} onClick={() => setRow(r.id, { review_status: 'approved', visible: true })} style={{ color: C.sageDark, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Check size={16} /></button>
            <button title="Hide" disabled={busy} onClick={() => setRow(r.id, { visible: false })} style={{ color: C.inkMuted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><EyeOff size={16} /></button>
            <button title="Reject" disabled={busy} onClick={() => setRow(r.id, { review_status: 'rejected', visible: false })} style={{ color: C.terracotta, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
            <button title="Edit" onClick={() => setEditing(r)} style={{ color: C.ink, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}><Pencil size={15} /></button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="p-6 text-center" style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.inkMuted }}>No events match these filters.</div>
        )}
      </div>

      {editing && (
        <EventEditModal event={editing} places={places} adminFetch={adminFetch}
          onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await onReload(); }} />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Wire into `AdminPage.jsx`.** (a) import near the `PlacesManager` import (`src/AdminPage.jsx:8`): `import { EventsManager } from './admin/EventsManager';` (b) ensure `Calendar` is in the lucide import block (`src/AdminPage.jsx:5` area) — add `Calendar,` if absent. (c) add a tab after the `places` tab entry (around `src/AdminPage.jsx:1929`): `{ id: 'events', icon: Calendar, label: 'Events' },` (d) add the render line after the `places` render (around `src/AdminPage.jsx:1978`):

```jsx
{tab === 'events' && <EventsManager rows={events || []} places={places || []} adminFetch={adminFetch} onReload={load}/>}
```

- [ ] **Step 3: Confirm `events` is loaded in AdminPage.** Check the admin `load()` function fetches `/api/admin/events` into an `events` state. Search: `grep -n "admin/events\|setEvents\|const \[events" src/AdminPage.jsx`. If no `events` state exists, add it next to `places`: a `const [events, setEvents] = useState([]);` and, in `load()`, fetch `/api/admin/events` and `setEvents(body.rows || [])` (mirror how `places` is loaded).

- [ ] **Step 4: Build:** `npm run build` Expected: builds OK.
- [ ] **Step 5: Commit** `git add src/admin/EventsManager.jsx src/AdminPage.jsx && git commit -m "feat(admin): Events review queue + filters + bulk/row actions + tab"`

### Task 28: Per-place events panel in `PlaceEditModal`

**Files:** Modify `src/admin/PlaceEditModal.jsx`

- [ ] **Step 1: Add events state + load + scrape** inside `PlaceEditModal` (after the existing `const [busy, setBusy] = useState(false);`):

```jsx
const [placeEvents, setPlaceEvents] = useState(null);
const [scraping, setScraping] = useState(false);

const loadPlaceEvents = async () => {
  try {
    const r = await adminFetch('/api/admin/events');
    const body = await r.json().catch(() => ({}));
    setPlaceEvents((body.rows || []).filter(e => e.place_id === place.id));
  } catch { setPlaceEvents([]); }
};

const scrapeEvents = async () => {
  setScraping(true);
  try {
    const r = await adminFetch('/api/admin/places/ingest-events', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ placeId: place.id }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || r.status);
    alert(`Scrape done: created=${body.counts?.created ?? 0}, updated=${body.counts?.updated ?? 0}, errors=${body.counts?.errors ?? 0}`);
    await loadPlaceEvents();
  } catch (e) { alert(`Scrape failed: ${e.message}`); }
  finally { setScraping(false); }
};

const publishPlaceEvents = async () => {
  try {
    const r = await adminFetch('/api/admin/events/update', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId: place.id, patch: { review_status: 'approved', visible: true } }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || r.status); }
    await loadPlaceEvents();
  } catch (e) { alert(`Publish failed: ${e.message}`); }
};
```

- [ ] **Step 2: Add the Events section** to the modal body, just before the closing `</div>` of the inner modal panel (after the existing Save row). Insert:

```jsx
<div style={{ marginTop: 16, borderTop: `1px solid ${C.divider}`, paddingTop: 12 }}>
  <div className="flex items-center gap-2 mb-2">
    <span style={{ fontFamily: 'Fraunces', fontSize: 15, color: C.ink, flex: 1 }}>Events at this place</span>
    {placeEvents === null
      ? <button onClick={loadPlaceEvents} style={{ background: 'transparent', border: `1px solid ${C.divider}`, borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontSize: 12, cursor: 'pointer', color: C.inkSoft }}>Load events</button>
      : <button onClick={publishPlaceEvents} style={{ background: C.sageDark, color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Publish all approved</button>}
    <button disabled={scraping || !place.website} title={place.website ? 'Scrape this place’s website for events' : 'No website set'}
      onClick={scrapeEvents}
      style={{ background: place.website ? C.saffron : C.divider, color: C.ink, border: 'none', borderRadius: 8, padding: '4px 10px', fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12, cursor: place.website ? 'pointer' : 'not-allowed' }}>
      {scraping ? 'Scraping…' : 'Scrape events'}
    </button>
  </div>
  {placeEvents && placeEvents.length === 0 && (
    <div style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.inkMuted }}>No events linked to this place yet.</div>
  )}
  {placeEvents && placeEvents.map(e => (
    <div key={e.id} className="flex items-center gap-2 py-1" style={{ borderBottom: `1px solid ${C.divider}` }}>
      <div className="flex-1 min-w-0" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {e.name} <span style={{ color: C.inkMuted }}>· {e.event_type} · {e.day_of_week || ''} {e.time_label || ''} · {e.review_status}</span>
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Build:** `npm run build` Expected: builds OK.
- [ ] **Step 4: Commit** `git add src/admin/PlaceEditModal.jsx && git commit -m "feat(admin): per-place events panel + scrape-from-website button"`

### Task 29: `origin` badge + filter in `PlacesManager`

**Files:** Modify `src/admin/PlacesManager.jsx`

- [ ] **Step 1: Add an `origin` filter chip.** Add state near the other filters (`const [origin, setOrigin] = useState('all');`) and include it in the `filtered` memo predicate:

```jsx
if (origin !== 'all' && (r.origin || 'curated') !== origin) return false;
```

Add the chips to the filter bar (after the category select):

```jsx
{['all','curated','google','event'].map(o => chip(origin === o, () => setOrigin(o), o))}
```

- [ ] **Step 2: Add a "From event" badge** on event-origin rows. In the row meta line (where `{r.category} · {r.area ...}` renders), append:

```jsx
{r.origin === 'event' && <span style={{ marginLeft: 6, background: `${C.saffron}33`, color: C.saffron, borderRadius: 999, padding: '1px 6px', fontSize: 10.5, fontWeight: 700 }}>From event</span>}
```

- [ ] **Step 3: Build:** `npm run build` Expected: builds OK.
- [ ] **Step 4: Commit** `git add src/admin/PlacesManager.jsx && git commit -m "feat(admin): origin filter + 'From event' badge in Places queue"`

---

# Phase 7 — Live run + end-to-end verification

### Task 30: Dry run, then live bounded ingestion

**Files:** none (commands; require env)

- [ ] **Step 1: Full test suite:** `npm test` Expected: all `node:test` files PASS.
- [ ] **Step 2: Build:** `npm run build` Expected: PASS.
- [ ] **Step 3: Eventbrite dry run:**

```bash
set -a && . ./.env && set +a
npm run ingest -- --source eventbrite-tampa-family --dry-run --limit 5
```
Expected: a counts line with `fetched>0`, `normalized>0`. (If `fetched=0`/`errors>0`, the Eventbrite search endpoint may be restricted for your token — see the note in Task 10; the parser + pipeline are still correct.)

- [ ] **Step 4: Live bounded Eventbrite run:**

```bash
set -a && . ./.env && set +a
npm run ingest -- --source eventbrite-tampa-family --limit 5 --venue-limit 5
```
Expected: `created>0`. New events `visible=false`/`needs_review`; venue places (if any) created `origin='event'`.

- [ ] **Step 5: Verify in DB** (MCP `execute_sql`):

```sql
select count(*) filter (where review_status='needs_review') as pending_events,
       count(*) filter (where kind='dated') as dated
from public.events;
select origin, count(*) from public.places group by origin;
```
Expected: `pending_events>0`, `dated>0`; a `places.origin='event'` row if a venue was created.

- [ ] **Step 6: Place-website run for one place** (pick a place with a website):

```bash
set -a && . ./.env && set +a
# find a place id with a website via MCP, then:
npm run ingest -- --source place-websites --limit 10 --all-places
```
Expected: counts line; `placesScanned`/created reflect discovery (may be 0 if no place site exposes structured events — that's fine).

### Task 31: End-to-end admin + app verification

**Files:** none

- [ ] **Step 1: Apply the admin events read change** is live (Task 24) and `/api/admin/events` returns rows — open `/admin` → **Events** tab. Expected: ingested events listed, filter `needs_review`.
- [ ] **Step 2: Link + approve.** Edit an event with no place → use the place picker to link it → set a sensible `event_type` → Approve + Publish a few.
- [ ] **Step 3: Per-place scrape.** Open `/admin` → **Places** → edit a place with a website → **Scrape events** → confirm the events panel populates; **Publish all approved**.
- [ ] **Step 4: Visibility cascade.** In **Places**, hide that place (set `visible=false`). Reload `/api/events` (curl or app). Expected: that place's events disappear from the public payload even though their own `visible` may be true (place-gate).

```bash
curl -s http://localhost:3000/api/events | head -c 400   # vercel dev or deployed URL
```

- [ ] **Step 5: App surfaces.** Open `/prototype` → Activities tab → toggle **This week** → approved dated events appear, ordered by date; recurring events still render in the catalog. Group cards (`MatchesTab`) show live recurring events.
- [ ] **Step 6: Fallback.** Simulate `/api/events` failure (offline / temporarily rename route) → app still renders `SUGGESTED_EVENTS`, no blank screen.
- [ ] **Step 7: Final commit** (if any notes changed): `git commit -am "docs: family-data-ingestion events slice complete"`

---

## Self-Review (completed during authoring)

**Spec coverage:** schema events+categories+join+places.origin (T1–T3); reuse provenance (T3 note); pure helpers time/type/normalize/dedupe/resolve/shape (T4–T9); connectors eventbrite/ics/json_ld/facebook/place_website (T10–T14); source registry (T15); writer (T16); orchestrator with venue resolution + place fan-out (T17); CLI dispatch incl. `--place`/`--all-places`/`--venue-limit` (T18); public `/api/events` place-gated recurring+thisWeek (T19); events-api client + App loader + screen wiring + This-week surface (T20–T22); admin events update incl. place-cascade (T23); admin events read embed (T24); per-place ingest endpoint (T25); EventEditModal+EventsManager+tab (T26–T27); per-place events panel + scrape button (T28); origin badge/filter (T29); live run + e2e + fallback (T30–T31). All spec sections (§1–§10, §4.1, §5.1, §8.1, §8.2) map to tasks.

**Placeholder scan:** every code step contains complete code; SQL/commands carry expected output. The two deferred-verification items (Eventbrite endpoint availability; the exact `visibleThings` state-variable name in ActivitiesTab) are flagged with concrete fallback instructions, not left blank.

**Type consistency:** intermediate shape is produced identically by all `parseX` and consumed by `normalizeEvent`; `resolveEventPlace` returns `{ placeId, action }` used by the orchestrator; `classifyEventCandidate` returns `{ action, matchId }`; writer `createEvent(sb, candidate, placeId)` / `refreshEvent(sb, id, candidate, placeId)` signatures match orchestrator calls; `reshapeEvents`/`splitEvents` output (`{ recurring, thisWeek }`) matches `/api/events` and `normalizeEventsPayload`; admin `update.js` body variants (`id`/`ids`/`delete`/`placeId`) match what `EventsManager`/`EventEditModal`/`PlaceEditModal` post; `EVENT_TO_PLACE`/`inferPlaceCategory` map to the live place taxonomy (`fun/sports/wellness/schools/childcare/extracurricular/camps/health`).
