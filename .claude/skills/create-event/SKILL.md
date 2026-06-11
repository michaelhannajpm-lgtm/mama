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
| 3 | **A link: Eventbrite / venue / library / museum / news calendar** | Fetch the page; extract **JSON-LD `schema.org/Event`** first (name, startDate, endDate, location, image, offers) — reliable. Fall back to OpenGraph (`og:*`) and visible HTML. **The hero image is the field most often dropped — see *Capturing the event image* below; run the helper, don't eyeball it.** |
| 4 | **A link behind auth: Facebook / Instagram** | Run `scripts/fb-extract.sh <url>` — see below. It resolves `/share/` links and reads OpenGraph via the crawler UA (no login needed) for name, date, host, address, image. **Never fabricate details you couldn't actually fetch** — say what you couldn't get and ask. |

For a batch (several links/events): extract each, build all drafts, confirm once.

### Fetching a link
- Try `WebFetch` first. Pull the `<script type="application/ld+json">` block and
  look for `"@type":"Event"` — clean fields. Then OpenGraph. Then body text.
- Respect the guardrails in the `family-data-ingestion` skill (official/public
  data, provenance, no private/personal data). This skill is the **manual,
  on-demand** counterpart to that automated job — reuse its vocabulary, don't
  rebuild its crawler.

### Facebook / Instagram links (no manual paste)
`WebFetch` and a plain `curl` get nothing useful from FB/IG — they JS-render and
gate content. Two helpers in `scripts/` get the public fields automatically:

- **`scripts/fb-extract.sh [--authed] [--open] <url>`** — the one to run.
  1. Resolves `/share/…` and short links to the canonical `…/events/<id>/`.
  2. **Primary, no login:** fetches with the `facebookexternalhit` crawler UA.
     FB serves OpenGraph to its own crawler, so you reliably get `og:title`
     (name), `og:description` (`Event in <city> by <host> on <date>[ at <time>]
     with N interested`), `og:url` (slug usually embeds the **street address**),
     and `og:image`. This alone fills name, date, host, area, and often the time.
  3. `--authed` also decrypts the **default browser's** cookies and fetches the
     page logged-in (see next bullet). `--open` launches the link in the browser.
- **`scripts/chrome-cookies.py <domain-substring>`** — prints a `Cookie:` header
  by reading Chrome's on-disk cookie store and decrypting it with the macOS
  Keychain key (PBKDF2 via stdlib + `openssl` for AES; no pip deps). **Triggers a
  one-time Keychain "Allow" GUI prompt** the user must click. Used by
  `fb-extract.sh --authed`; call directly only if you need the raw cookie.

**Known limit — exact start time.** FB loads an event's precise time through an
authed GraphQL route that is **not** in the page HTML, so neither the crawler OG
nor the cookie fetch can always recover it. When `og:description` carries no
`at <time>`, **don't invent one** — run `fb-extract.sh --open <url>` to put the
event in front of the user and ask them for the start time, or have them paste it.
The cookie grab proves login and resolves the link; it is not a full bypass.

### Capturing the event image (do this for every link source)
The hero image is the field most often lost on import — **`WebFetch` returns
prose, not the `<meta og:image>` URL**, so if you rely on it you'll never see an
image to store. Don't skip it and don't paste a raw source URL into
`hero_photo`. One helper does the whole job — extract the source image, download
it, validate it, upload to the public Vercel Blob `events/<slug>/` folder, and
print the durable blob URL:

```bash
# From a page (Eventbrite, venue, library, museum, news calendar):
node .claude/skills/create-event/scripts/store-event-image.mjs --slug <evt-slug> --page <event-page-url>

# From a direct image URL (e.g. the og:image fb-extract.sh already printed for FB/IG):
node .claude/skills/create-event/scripts/store-event-image.mjs --slug <evt-slug> --image <image-url>
```

It prints JSON: `{ source_image_url, hero_photo, pathname }`.
- Put `hero_photo` (the **blob URL**) into the row's `hero_photo` column.
- Put `source_image_url` into `image_source_url` (provenance — never the raw
  source URL in `hero_photo`).
- **Where the image lives:** the helper pulls `og:image` first (Eventbrite
  serves a clean `img.evbuc.com` URL there), then JSON-LD `schema.org/Event`
  `image`, then `twitter:image`. Eventbrite, libraries, museums, and most venue
  pages all set `og:image`, so `--page` alone usually succeeds.
- **If `hero_photo` comes back `null`** (no image on the page, or the upload
  failed): it's **non-fatal** — create the event without an image, leave
  `hero_photo` null, and tell the user the image couldn't be captured. Never
  invent one and never hotlink the source.
- Requires `BLOB_READ_WRITE_TOKEN` (already in `.env`); the script loads `.env`
  itself and resolves paths from its own location, so it runs from any CWD.

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
4. **Capture the event image.** Generate the `slug` first, then run
   `store-event-image.mjs` (see *Capturing the event image* above) to download
   the source image and upload it to Vercel Blob. Use the returned blob URL for
   `hero_photo` and `source_image_url` for `image_source_url`. Do this for every
   link source — it's the field most often dropped. `null` result ⇒ proceed
   without an image and say so; never hotlink the raw source.
5. **Fill every field** per `references/field-reference.md` — including
   `kid_age_ranges`, `value_tags`, `interest_tags`, `mom_type_fit`,
   `neighborhoods`, and the `hero_photo` / `image_source_url` pair from step 4.
   Set `city='Tampa, FL'`.
6. **Decide publish state.** Default hidden (`review_status='needs_review'`,
   `visible=false`). Only if the prompt says publish/go-live ⇒
   `review_status='approved'`, `visible=true`.
7. **Show the complete draft** — every field, with explicit ⚠️ flags for:
   unlinked place, will-be-published-live, low source_confidence, missing
   `hero_photo` (image couldn't be captured), any guessed field. Ask for **one
   yes/no** (per event, or one OK for the batch).
8. **Write** (see below).
9. **Open the review page.** After the insert succeeds, make sure the dev server
   is up and open the new event's admin page in the browser — see
   *After the insert* below.
10. **Report** the new `id`, the publish state, and the admin review deep-link
   `<host>/admin/events/<id>` (the id is in the insert's `returning` clause).
   The link opens the event's edit modal straight away — regardless of the
   current review-status filter. `<host>` is the dev server or deployed origin.

### After the insert — show it in the browser
Once the row is written, surface it so the user can review/finish it:

1. **Ensure the dev server is running.** Check `http://localhost:3000` first; if
   it's not up, start it via the **`dev-skill`** (don't hand-roll the command).
   Reuse a running server — don't spawn a duplicate.
2. **Open the event's admin page in a new browser process** (not a reused tab):
   ```bash
   open -na "Google Chrome" --args --new-window "http://localhost:3000/admin/events/<id>"
   ```
   Fallback to `open "http://localhost:3000/admin/events/<id>"` if Chrome isn't
   the default. Run it detached so it doesn't block. Use the `<id>` from the
   insert's `returning`. This is the review surface — the edit modal opens
   straight to the new event regardless of the active status filter.

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
   1, 5, 'Free', false, null,
   '<blob url from store-event-image.mjs>', '<source_image_url>',
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
- **Dropping the image.** `WebFetch` returns prose, not the `og:image` URL — if you don't run `store-event-image.mjs` you'll silently lose the hero. Run it for every link source.
- **Raw source image in `hero_photo`.** Always the Blob URL from `store-event-image.mjs` in `hero_photo`; the original source URL goes in `image_source_url`, never in `hero_photo`.

## Quick reference

| Decision | Default |
|---|---|
| Write path | Direct service-role insert via Supabase MCP, with generated `slug` |
| Publish state | Hidden (`needs_review` / `visible=false`) unless prompt says go-live |
| Place | Match existing → `place_id`; else free-text + ⚠️ unlinked |
| Image | `store-event-image.mjs --page/--image` → blob URL in `hero_photo`, source in `image_source_url`; `null` ⇒ no image, say so |
| City | `'Tampa, FL'` |
| Confirm | Show full draft → one yes/no → insert |
