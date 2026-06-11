# Event field reference

Every column of `public.events`, what fills it, and the controlled vocab.
Source of truth verified against the live DB and `src/data/taxonomy.js` /
`src/data/matching-vocab.js`. If you change a vocab list, re-check those files.

## Required at insert (NOT NULL, no default — you MUST supply)

| Column | Rule |
|---|---|
| `slug` | Generate `evt-<source>-<kebab-name>`. Namespaced `evt-` so it can never collide with curated ids (`e-*`, `home-*`). On unique-collision append `-2`, `-3`. |
| `name` | The event title. Required by both DB and the admin API. |
| `city` | Always `'Tampa, FL'` format (state included) unless clearly elsewhere — e.g. `'St. Petersburg, FL'`. Matches every existing row; city dedupe/filters break otherwise. |
| `kind` | `'dated'` (one specific date) or `'recurring'` (repeats). DB defaults `recurring`; set it explicitly. |
| `event_type` | One of `class`, `meetup`, `attraction`, `playgroup`, `story_time`, `class`, `festival`, `popup`. Infer from content (see mapping below). |
| `tags` `kid_ages` | `text[]`, default `'{}'`. Always pass an array (can be empty). |
| `going_count` | int, default 0. New events → 0. |
| `visible` | **DB default is `true`.** ALWAYS set explicitly — default to `false` (hidden) unless the prompt says publish live. |
| `review_status` | `needs_review` (default) · `approved` · `rejected` · `archived`. Publish-live ⇒ `approved`. |
| `family_relevant` | bool, default `true`. Set `false` ONLY when force-creating an off-topic event (business/networking/21+) past the soft relevance guardrail. Also stash `metadata.off_topic_reason`. |
| `timezone` | `'America/New_York'`. |

## Timing — fill the columns that match `kind`

- **dated**: `starts_at` (timestamptz, ISO), optional `ends_at`. Also derive `day_of_week` (`Mon`..`Sun`), `bucket`, `time_label` (`'9:30 AM'`) for display/filter parity.
- **recurring**: `day_of_week`, `bucket`, `time_label`, `recurring` (`'Weekly'`, `'Monthly'`, `'1st Sat'`…). Leave `starts_at` null.

`bucket` ∈ `morning` (6a–12p) · `noon` (12–2p) · `afternoon` (2–5p) · `night-owl` (5p+). Derive from the time.

## Place / location

| Column | Rule |
|---|---|
| `place_id` | uuid FK. Try to match an existing `places` row (`name ilike`/area). Link it when confident. |
| `place_name` | Free-text venue if no `place_id` match. |
| `area` | A real Tampa-area neighborhood (see vocab). |
| `website` `source_url` `external_id` | From the source link. `source_url` = the page you pulled; `external_id` = the platform's event id when present (Eventbrite numeric id, FB event id). |

## Matching metadata — the part that decides WHO sees the event

Map content against these exact strings. Empty array is fine; a wrong string is worse than an empty one (Jaccard matching compares literal strings).

- **`kid_age_ranges`** / `kid_ages` — from `['0–1','1–3','3–5','5–8','8–12','12–18']` (en-dash `–`, not hyphen). Also set `age_min`/`age_max` (smallint years) when stated.
- **`value_tags`** — from: Gentle parenting · Outdoors · Education-focused · Faith-based · Multilingual home · Adventure · Creativity · Honest communication · Play-based learning · Community involvement
- **`interest_tags`** — from: Coffee meetups · Playground visits · Stroller walks · Arts & crafts · Library visits · Music activities · Beach days · Pool & swim · Zoo trips · Farmers markets · Bike rides · Theme parks · Fitness · Weekend outings
- **`mom_type_fit`** — from MOM_TYPE ids: `working` · `sahm` · `solo` · `new` · `multi` · `hybrid` · `multicultural` · `new_to_area`
- **`neighborhoods`** — real areas: South Tampa · Tampa · Hyde Park · Seminole Heights · Carrollwood · Temple Terrace · Ybor City · New Tampa · Brandon · Citrus Park · Riverview · Westchase · Downtown · Channelside · Davis Islands · Westshore (plus the rest already in `places.area`). Usually mirror the event's `area`.

## event_type inference

| Content signal | event_type |
|---|---|
| yoga, music class, storytime, swim lesson, art class | `class` |
| playgroup, stroller walk, coffee, park hang, mom meetup | `meetup` (playgroups → `playgroup`) |
| zoo, museum, aquarium, splash pad, theme park, attraction | `attraction` |
| fair, festival, market | `festival` |
| one-off pop-up, vendor event | `popup` |

## Other

- `description` — 1–3 sentences. From source, or written from the prompt. Calm, warm, factual.
- `hue` — a brand gradient. Reuse existing patterns from `src/data/events.js` (coral `#E96B7D`/`#D6446A`, sage `#5E7A3B`, saffron `#D9A441`). Optional.
- `hero_photo` — public image URL. **Route through Vercel Blob first** (see `store-image` skill): download source `og:image` → upload to Blob → store the returned blob URL here. Put the original source image URL in `image_source_url`.
- `indoor` — boolean when known.
- `source_confidence` — 0–1 numeric. Prose from user ≈ 0.9; clean JSON-LD ≈ 0.8; loose HTML scrape ≈ 0.5.
- `metadata` — jsonb. Stash provenance: `{ "source": "eventbrite", "fetched_at": "...", "skill": "create-event" }`.
