# /promo landing page + feedback admin dashboard

**Status:** Spec · 2026-05-07
**Surface:** Public — `/promo`. Admin — `/admin` → new "Feedback" tab.
**Branch:** `feat/promo-landing` (off master, after `fix/email-jsx-loader` merges).

## Problem

The user has a self-contained dark-mode marketing landing page (a Claude artifact) targeting "the first 50 Founding Moms in Tampa." It contains a hero with a live counter, a perks grid, a 3-step process, a signup form, a prototype CTA, and a 6-question feedback form. Today it has placeholders for two Formspree form IDs and ships nowhere.

The user wants:
1. The page live at `/promo` on the deployed Vercel app.
2. The signup form posting into the existing waitlist pipeline (so signups land in Supabase + trigger the existing Resend confirmation email).
3. The feedback form posting into a brand-new endpoint backed by a new Supabase table.
4. The admin dashboard at `/#admin` to grow a "Feedback" tab with charts and a raw list, so the user can read responses without writing SQL.

## Goals

1. `/promo` returns the artifact's page verbatim — same dark theme, same fonts, same layout, same animations. The page is intentionally **not** in the rest of the app's editorial-warm palette.
2. Signup form data lands in `waitlist_signups` with two new columns (`neighborhood`, `mom_type`) and triggers the existing waitlist confirmation email via Resend.
3. Feedback form data lands in a new `feedback_submissions` table.
4. Admin gets a "Feedback" tab between "Waitlist" and "Quick Actions" showing: total count, average rating, NPS-style breakdown (promoters/passives/detractors), daily-trend sparkline, rating distribution, "useful features" tally, and a raw table of every submission with full text columns.

## Non-goals

- **Live founder count from Supabase.** The artifact's `TARGET_COUNT = 12` stays hardcoded in the HTML for weekly manual edits. Querying Supabase from a static HTML page would require either an unauthenticated GET endpoint (cacheable but adds an API surface) or a server-side render (defeats the static-drop-in approach). Manual edits are fine for a 6-week campaign.
- **Spam protection.** No CAPTCHA, no honeypot. Founding cohort is gated to ~50 humans the user knows about; abuse risk is low.
- **Email confirmation for feedback submissions.** Signup gets the existing Resend confirmation. Feedback is fire-and-forget.
- **Editing or deleting feedback.** Admin tab is read-only.
- **Real-time updates.** Admin dashboard polls on page load + manual Refresh, same as other tabs.
- **Spam protection on the feedback endpoint.** Same reasoning as above.
- **Migration script for existing waitlist rows.** New columns are nullable; existing rows get NULL.

## User flow — public

1. User visits `https://gomama.app/promo`.
2. Browser loads the static `promo.html`. Hero animates in. Counter ticks from 0 to `TARGET_COUNT`.
3. User clicks "Claim my Founding Mom spot" → smooth-scrolls to `#signup`.
4. User fills signup form (name, email, Tampa neighborhood, mom type) and submits. The form's JS does `fetch('/api/waitlist', { method: 'POST', body: JSON.stringify(...) })`. On 200 it hides the form and shows the success state. The API also fires off the existing Resend confirmation email.
5. User clicks "Launch prototype" → opens `/live` in a new tab.
6. User completes the prototype walk-through and returns to `/promo`.
7. User fills the feedback form (10-pt rating + 5 textareas + checkboxes) and submits. JS POSTs to `/api/feedback`. On 200 it hides the form and shows the success state.

## User flow — admin

1. Admin visits `/#admin`. `AdminPage` fetches all four existing endpoints in parallel **plus** the new `/api/admin/feedback`.
2. Admin clicks the "Feedback" tab in the sub-nav.
3. Tab renders: stat cards (total, average rating, NPS breakdown), daily trend, rating distribution chart, useful-features chart, and a paginated table of submissions.
4. Admin can export the full feedback list as CSV (matching the existing `Export CSV` pattern on Waitlist / Mom profiles tabs).

## Architecture

### File layout

```
public/promo.html                          ← NEW — artifact verbatim, with surgical edits
vercel.json                                ← +1 rewrite: /promo → /promo.html
api/waitlist.js                            ← extended — accept neighborhood + mom_type
api/feedback.js                            ← NEW — public POST endpoint
api/admin/feedback.js                     ← NEW — admin GET endpoint
src/AdminPage.jsx                          ← +1 tab: "Feedback" with charts and raw list
supabase/feedback_schema.sql               ← NEW — feedback_submissions table
supabase/waitlist_schema.sql               ← extended — +2 columns (neighborhood, mom_type)
```

### `public/promo.html` — surgical edits

The artifact is dropped in verbatim. Then:

1. **Form action attributes**
   - Signup form: `action="/api/waitlist"` (was `formspree.io/...`).
   - Feedback form: `action="/api/feedback"`.

2. **Form submit JS** (the existing `handleForm` function)
   - Body changes from `FormData` (`multipart/form-data`) to JSON: `JSON.stringify(Object.fromEntries(data.entries()))` — but special-case the multi-value `useful[]` field, which must collect all checked values into an array.
   - Add `'Content-Type': 'application/json'` header.
   - Keep the existing success UI flow (hide form, show success div, smooth scroll).

3. **Hidden inputs in the signup form** — add two `<input type="hidden">`:
   - `name="source" value="promo"`
   - `name="audience" value="founding-tampa"`

4. **`YOUR_PROTOTYPE_LINK`** → `/live` (the existing mobile preview).

5. **`TARGET_COUNT`** → set to 12 initially. Documented as the weekly-edit knob.

6. **`(YOUR NUMBER)`** → leave as-is with an HTML comment `<!-- TODO: WhatsApp / SMS contact number -->` so it's discoverable.

7. **No Formspree references remain** — both `https://formspree.io/f/YOUR_*_FORM_ID` placeholders are replaced.

The artifact's CSS, copy, layout, animations, and structure stay byte-identical otherwise.

### `vercel.json`

Add one entry to the existing `rewrites` array:

```json
{ "source": "/promo", "destination": "/promo.html" }
```

Order doesn't matter — Vercel's static file serving handles `/promo.html` directly, and this rewrite makes the friendly URL `/promo` resolve to the same file.

### `/api/waitlist` — extension

The endpoint already does email validation, dedupe-by-email (returns `{ duplicate: true }` on 409), service-role insert, and Resend confirmation send. Two surgical changes:

1. **Accept additional fields.** The JSON body parser pulls two new optional values: `neighborhood`, `mom_type`. Both pass through `cleanText(value, 120)`.
2. **Field-name flexibility.** Accept both `firstName` (camelCase, what the existing `/WaitlistPage` sends) and `first_name` (snake_case, what the artifact form sends). Same for `mom_type` / `momType`. Implementation: `body.firstName ?? body.first_name`.

The insert payload gains two keys: `neighborhood` and `mom_type`. All other behavior — email validation, dedupe, Resend send, response shape — is unchanged.

The /promo signup form additionally sends `audience: 'founding-tampa'` and `source: 'promo'` so the existing admin dashboard's "by audience" and "by source" charts continue to slice this cohort correctly without any code change.

### `/api/feedback` — new

```jsonc
POST /api/feedback
{
  "rating": 8,                           // integer 1–10, required
  "describe": "Mom-friendship matching", // text, required
  "useful": ["schedule", "kid_age"],     // string[], 0–6 items, optional
  "confusing": "...",                    // text, optional
  "use_when": "...",                     // text, optional
  "missing": "...",                      // text, optional
  "name": "Maya"                         // text, required
}

→ 200 { ok: true }
→ 400 { error: "rating must be 1-10" }   // and similar for other validation
→ 405 { error: "Method not allowed" }
→ 500 { error: "Feedback backend not configured" }
→ 502 { error: "Supabase 4xx: ..." }
```

Matches the shape of `api/waitlist.js`:
- `cleanText` helper for text fields (each capped: `name` 80, `describe` 1000, others 2000).
- Service-role insert via Supabase REST.
- Captures `user_agent` and `referrer` from request headers (matches the waitlist precedent).
- Whitelists the `useful[]` enum values: `schedule`, `kid_age`, `match_pct`, `places`, `groups`, `verified`. Drops anything else silently.
- No auth (matches the public waitlist endpoint).

### `/api/admin/feedback` — new

```jsonc
GET /api/admin/feedback

→ 200 { ok: true, count: 23, rows: [ ...feedback rows... ] }
→ 405, 500, 502 — same error shapes as other admin endpoints
```

Mirrors `api/admin/mom-profiles.js`:
- Service-role REST query: `SELECT * FROM feedback_submissions ORDER BY created_at DESC LIMIT 5000`.
- No auth (matches the rest of `/api/admin/*`).
- Returns `{ ok, count, rows }`.

### `feedback_submissions` schema (NEW)

```sql
create extension if not exists pgcrypto;

create table if not exists public.feedback_submissions (
  id          uuid primary key default gen_random_uuid(),
  rating      smallint not null check (rating between 1 and 10),
  describe    text,
  useful      text[] not null default '{}',
  confusing   text,
  use_when    text,
  missing     text,
  name        text,
  source      text not null default 'promo',
  user_agent  text,
  referrer    text,
  created_at  timestamptz not null default now()
);

alter table public.feedback_submissions enable row level security;

create index if not exists feedback_submissions_created_at_idx
  on public.feedback_submissions (created_at desc);

create index if not exists feedback_submissions_rating_idx
  on public.feedback_submissions (rating);

comment on table public.feedback_submissions is
  'Qualitative feedback collected from the /promo Founding Moms landing page.';
```

### `waitlist_signups` schema additions

Append to `supabase/waitlist_schema.sql` (existing file):

```sql
alter table public.waitlist_signups
  add column if not exists neighborhood text,
  add column if not exists mom_type text;
```

Both nullable. Existing rows get NULL. No backfill.

## Admin dashboard — Feedback tab

Lives between "Waitlist" and "Quick Actions" in the existing sub-nav. Tab id `feedback`, label "Feedback", icon `MessageSquare` from lucide-react.

`AdminPage.load()` adds a 5th `Promise.all` fetch for `/api/admin/feedback` and a 5th `useState(null)` for `feedback`. Loading guard extended to wait for it.

The new `FeedbackTab` component lives in `src/AdminPage.jsx` (single-file admin convention). It renders the following blocks **in this order**, top to bottom:

### Stat strip

Four `<Stat>` cards (matching existing tabs):

| Label | Value | Hint |
|---|---|---|
| Total feedback | `{count}` | — |
| Average rating | `{avg.toFixed(1)}` | "out of 10" |
| Promoters | `{promoters}` | "{pct}% rated 9-10" |
| Detractors | `{detractors}` | "{pct}% rated ≤6" |

(Promoters = ratings 9–10. Passives = 7–8. Detractors = 1–6. NPS = %promoters − %detractors, optionally shown as a badge color: sage if positive, terracotta if negative, ink if neutral.)

### Daily trend

Reuses the existing `<DailyTrend rows={feedback} color={C.terracotta} />` (last 30 days of submission counts).

### Rating distribution

A horizontal bar chart, one row per rating value 1–10. Reuses the existing `<BarList>` component:
- Items: `[['1', count1], ['2', count2], …, ['10', count10]]`.
- Total: `feedback.length`.
- Color: sage for ratings 9–10, ink for 7–8, terracotta for 1–6 (color the bar based on its NPS bucket).

Implementation: instead of a single `BarList`, render three vertically-stacked sub-sections — Detractors (ratings 1–6), Passives (7–8), Promoters (9–10) — each a sub-`BarList` with its own color. This makes the NPS framing visible at a glance.

### Useful features

`<BarList>` of how often each enum value was checked:
- `schedule` → "Free at the same times"
- `kid_age` → "Kids same age"
- `match_pct` → "Match percentage"
- `places` → "Suggested places"
- `groups` → "Group meet-ups"
- `verified` → "Verified profiles"

(Friendly labels — the raw enum values would be unreadable.)

### Recent feedback table

Card containing a search input + an `Export CSV` button (matching the existing Waitlist/Mom Profiles pattern), then a wide table:

| Name | Rating | Describe | Confusing | Use when | Missing | Created |
|---|---|---|---|---|---|---|
| Maya | 9 (sage) | "matches moms by free time" | — | "Tuesday mornings…" | "couples meetups" | 2h ago |

- Long text columns truncate with `text-overflow: ellipsis` and have a `title` attribute for the full string on hover.
- Search filters across `name`, `describe`, `confusing`, `use_when`, `missing`.
- `Useful` is rendered as small chips below the rating cell (one chip per checked enum, with the friendly label).
- Click a row → expands inline to show all text fields in full (so admins can read long responses without leaving the page).
- "Created" column is relative time (matches existing `rel()` helper).

### CSV export

`Export CSV` button on the Feedback tab downloads `gomama-feedback-YYYY-MM-DD.csv` with one row per submission, every column. Reuses the existing `downloadCsv` helper.

## Design tokens (admin tab only — promo page keeps its own dark theme)

Strict token discipline per `CLAUDE.md`:
- Stat values use `Fraunces`, `C.ink`.
- Bar colors: `C.sageDark` (promoters), `C.ink` (passives), `C.terracotta` (detractors).
- Chips for `useful[]`: cream-soft bg, ink color (matches the chip pattern in the mom-profile detail modal).
- Daily trend: `C.terracotta` (matches the waitlist trend color, since promo signups land in waitlist).
- Search input + Export button: same style as Waitlist/Mom Profiles tabs — no new patterns.

## Error handling

- `/api/feedback` rejects with 400 if `rating` is missing, non-numeric, or out of 1–10. Same for missing `name` or `describe`.
- `/api/feedback` silently drops unknown `useful[]` values rather than rejecting (a typo on the client shouldn't kill the submission).
- Form submit JS: on non-200 response, show `alert('Something went wrong. Please try again or DM us directly.')` (matches the artifact's existing error path).
- `/api/admin/feedback` errors surface in the existing `error` banner at the top of the dashboard, identical to the other admin endpoints.
- If the Feedback tab loads with `feedback = []`, all charts render empty (`<BarList>` already renders "No data yet."), and the table shows an empty state.

## Testing

No automated test framework. Manual verification:

1. Visit `/promo` on a deployed Vercel preview. Page renders with dark theme, animations work, counter ticks 0→12.
2. Submit signup form with a fresh email → success message appears, row appears in Supabase `waitlist_signups` with `neighborhood`, `mom_type`, `source='promo'`, `audience='founding-tampa'`. Confirmation email arrives via Resend.
3. Submit signup form with a duplicate email → still shows success message (the API returns `{ ok: true, duplicate: true }`).
4. Submit feedback form → success message appears, row appears in Supabase `feedback_submissions`.
5. Click the prototype CTA → opens `/live` in a new tab.
6. Visit `/#admin` → "Feedback" tab in the sub-nav. Click it.
7. Verify all four stat cards have correct numbers.
8. Verify the daily trend, rating distribution (with three NPS color bands), and useful-features charts render.
9. Verify the table shows recent feedback. Click a row to expand. Type in search to filter.
10. Click "Export CSV" → downloads a CSV with all rows and all columns.
11. With zero feedback in the table, all charts and the table show graceful empty states.

## Out of scope (future work)

- Live `TARGET_COUNT` from Supabase (current count of `waitlist_signups WHERE source='promo'`).
- Email digest of new feedback to the founder (e.g., daily summary).
- Sentiment analysis on the free-text fields.
- A "respond" workflow that lets the founder reach out to specific feedback authors.
- Spam protection (Cloudflare Turnstile, honeypot fields, rate limiting).
- Auth on the admin endpoints (still a known gap repo-wide).
- Editing the promo page copy from the admin dashboard.
