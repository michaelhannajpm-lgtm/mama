---
name: create-event
description: Use when the user wants to create, add, publish, or import one or more Go Mama events into the Supabase events table from a prompt, a description, or a link (Eventbrite, Facebook, Instagram, venue/library/museum sites). Fills every event field from sparse input, matches a place, derives the matching metadata, confirms a draft, then writes.
---

# Create Event

Turn a sparse prompt — prose, one link, or several — into a complete `events`
row, show the user the filled draft, and on their OK, write it to Supabase.

**Require little, auto-fill the rest.** Block the user only on the three things
you genuinely can't guess: the event's **name**, its **when**, and its
**where**. Derive everything else — especially the matching metadata that
decides who the event is shown to.

**REQUIRED REFERENCE:** Read `references/field-reference.md` before building a
draft — it has every column, its rule, and the exact controlled vocab. Don't
invent tag strings; matching compares literal strings.

## The four source scenarios

| # | Source | How you get the fields |
|---|---|---|
| 1 | **Go Mama first-party** ("we're hosting…") | Prose. `metadata.source='gomama'`. Often publish-live. |
| 2 | **Community host, user describes it** | Prose. `metadata.source='community'`. |
| 3 | **A link: Eventbrite / venue / library / museum / news calendar** | Fetch the page; extract **JSON-LD `schema.org/Event`** first (name, startDate, endDate, location, image, offers) — reliable. Fall back to OpenGraph (`og:*`) and visible HTML. |
| 4 | **A link behind auth: Facebook / Instagram** | These block anonymous fetches and JS-render content. In order: (a) ask the user for a `curl` cookie/header string and fetch the authed HTML yourself; (b) if that fails, ask the user to paste the page text. **Never fabricate details you couldn't actually fetch** — say what you couldn't get and ask. |

For a batch (several links/events): extract each, build all drafts, confirm once.

### Fetching a link
- Try `WebFetch` first. For authed pages use `Bash` `curl` with the user's
  cookie/header: `curl -sL -H 'cookie: …' '<url>'`, then parse.
- Pull the `<script type="application/ld+json">` block and look for
  `"@type":"Event"`. That gives clean fields. Then OpenGraph. Then body text.
- Respect the guardrails in the `family-data-ingestion` skill (official/public
  data, provenance, no private/personal data). This skill is the **manual,
  on-demand** counterpart to that automated job — reuse its vocabulary, don't
  rebuild its crawler.

## Workflow

1. **Classify the source** (1–4 above). If a link, fetch and extract now.
2. **Sanity-check the extraction (before drafting).** Stop and surface, don't
   silently import, when any of these is true:
   - **HARD — Past / stale date.** `starts_at` (or the parsed date) is before
     today, or you can't tell when it is. Don't import expired events.
   - **HARD — Out of service area.** Location is not Tampa Bay (Hillsborough /
     Pinellas / Pasco and nearby — see the `area` vocab in
     `references/field-reference.md`). Naples, Orlando, Miami, out-of-state,
     etc. don't belong in the catalog.
   - **HARD — Missing a blocker** — no real name, no when, or no where.
   - **SOFT — Not mom/family relevant.** Event reads as business / networking /
     pitch / 21+ / adult-only / otherwise not for moms-and-kids (signal: hosted
     at a bank/office, "pitch"/"mixer"/"happy hour"/"summit" framing, no kid
     angle). This does **not** block creation — warn, recommend **skip**, but if
     the user says create anyway, proceed and set **`family_relevant=false`**
     (default is `true`) plus a reason in `metadata.off_topic_reason`.

   For HARD issues, report what you got, name the problem, and ask how to
   proceed (skip / import anyway hidden / user supplies the missing detail);
   default recommendation **skip**. For the SOFT issue, the user can override
   and you create it flagged. Never fabricate a time, date, or location to get
   past this check.
3. **Match the place.** Query `places` by name/area (see Write section). Link
   `place_id` when confident; else fill `place_name`/`area` free-text and flag
   it as **unlinked** in the draft.
4. **Fill every field** per `references/field-reference.md` — including
   `kid_age_ranges`, `value_tags`, `interest_tags`, `mom_type_fit`,
   `neighborhoods`. Generate the `slug`. Set `city='Tampa, FL'`.
5. **Decide publish state.** Default hidden (`review_status='needs_review'`,
   `visible=false`). Only if the prompt says publish/go-live ⇒
   `review_status='approved'`, `visible=true`.
6. **Show the complete draft** — every field, with explicit ⚠️ flags for:
   unlinked place, will-be-published-live, low source_confidence, any guessed
   field. Ask for **one yes/no** (per event, or one OK for the batch).
7. **Write** (see below). 8. **Report** the new `id`, the publish state, and a
   direct admin review deep-link: `<host>/admin/events/<id>` (the id is in the
   insert's `returning` clause). The link opens the event's edit modal straight
   away — regardless of the current review-status filter. `<host>` is the dev
   server or deployed admin origin.

## Writing the event

The reliable write path is a **direct service-role insert that includes a
generated `slug`** (the column is `NOT NULL` with no default and no trigger).

⚠️ The admin HTTP API `POST /api/admin/events/update` `{create:…}` does **not**
set `slug`, so that path hits a NOT NULL violation today. Prefer direct insert;
only use the admin API if `slug` support is added there.

**Match a place** (run before drafting):
```sql
select id, name, area, city, hero_photo from places
where name ilike '%<venue>%' or area ilike '%<area>%'
order by visible desc limit 5;
```

**Insert** (after the user confirms) via the Supabase MCP `execute_sql`. Pass
`text[]` as `array['…','…']` and JSON as a jsonb literal:
```sql
insert into events
  (slug, name, city, kind, event_type, description,
   place_id, place_name, area,
   starts_at, ends_at, day_of_week, bucket, time_label, recurring,
   tags, kid_ages, kid_age_ranges, value_tags, interest_tags,
   mom_type_fit, neighborhoods, age_min, age_max, price_summary,
   indoor, hue, hero_photo, image_source_url,
   website, source_url, external_id, going_count,
   visible, review_status, timezone, source_confidence, family_relevant, metadata)
values
  ('evt-…','…','Tampa, FL','dated','meetup','…',
   null,'…','Hyde Park',
   '2026-06-20T13:30:00-04:00', null,'Sat','noon','1:30 PM',null,
   array['…'], array['1–3','3–5'], array['1–3','3–5'], array['Outdoors'],
   array['Playground visits'], array['sahm','new'], array['Hyde Park'],
   1, 5, 'Free', false, null, null, null,
   null, '<source url>', null, 0,
   false, 'needs_review', 'America/New_York', 0.9, true,
   '{"source":"eventbrite","skill":"create-event"}'::jsonb)
returning id, slug, name, visible, review_status, family_relevant;
```
Set `place_id` to the matched uuid (then `place_name`/`area` can be null).
For a batch, insert multiple `values` rows in one statement.

## Common mistakes

- **Hyphen vs en-dash in ages.** Buckets use `–` (`1–3`), never `-`. Wrong char = no match.
- **Forgetting `slug` or `city`.** Both NOT NULL — insert fails without them.
- **Trusting `visible`'s DB default.** It's `true`. Always set it; default hidden.
- **Inventing tag strings.** Only use the vocab in `field-reference.md`.
- **Claiming you scraped FB/IG when you didn't.** Anonymous fetch sometimes works (public OG tags) but rarely gives the exact time/address — ask for a cookie or a paste; never fabricate.
- **Importing a past or out-of-area event.** Run the step-2 sanity check first; default to skipping stale or non‑Tampa events.
- **Skipping the confirm step.** Always show the filled draft and get the OK before inserting.
- **Raw source image in `hero_photo`.** Route through Vercel Blob first (`store-image` skill); keep the original in `image_source_url`.

## Quick reference

| Decision | Default |
|---|---|
| Write path | Direct service-role insert via Supabase MCP, with generated `slug` |
| Publish state | Hidden (`needs_review` / `visible=false`) unless prompt says go-live |
| Place | Match existing → `place_id`; else free-text + ⚠️ unlinked |
| City | `'Tampa, FL'` |
| Confirm | Show full draft → one yes/no → insert |
