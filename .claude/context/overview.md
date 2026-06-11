# Go Mama — overview

A React/Vite app for **Go Mama**, a mom-friendship matching app, backed by Supabase and Vercel serverless functions.

## Positioning

- **Anti-Tinder.** The core value is *real meetups*, not endless chat.
- **Verified-only.** A two-signal verification gate (Instagram or Facebook + a real photo) keeps the space safe for moms, and gates connect/RSVP/DM actions.
- **Coral + navy editorial aesthetic.** Hero-image landing, warm cream backgrounds, Fraunces serif headlines. Ported from the GoMama Expo prototype on 2026-06-01.

## Stack

- Vite + React 18 (`@vitejs/plugin-react`)
- Tailwind CSS (via PostCSS) + a few inline `C`-token styles
- `lucide-react` for icons
- Supabase (Postgres + Auth) — schemas in `supabase/*.sql`; the browser client is **auth-only** (anonymous sign-in for chat/presence), all data flows through `api/*` on the service role
- Vercel — hosting + serverless functions in `api/` (`@vercel/functions`, `@vercel/blob` for image storage)
- Ingestion / tooling deps: `cheerio`, `node-ical`, `openai` (AI describe/review + portraits), `web-push` (push notifications), `sharp` (image processing)
- Tests: `node --test` over `*.test.mjs` (co-located with the code they cover, in both `src/lib/` and `api/_lib/`)

## Scripts (`package.json`)

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (port 5173) — serves the client only; `api/*` routes are NOT live |
| `npm run dev:api` | `vercel dev` — full stack incl. `api/*` serverless routes |
| `npm run build` | Production build |
| `npm run preview` | Preview the built app |
| `npm test` | `node --test` — runs all `*.test.mjs` |
| `npm run seed` | `scripts/seed-supabase.mjs` — seed mom profiles/places/events |
| `npm run ingest` | `scripts/ingest-family-data.mjs` — run a family-data ingestion pass |
| `npm run enrich` | `scripts/enrich-places.mjs` — enrich place rows |
| `npm run backfill:photos` | `scripts/backfill-place-photos.mjs` — backfill place photos to Blob |
| `npm run portraits` | `scripts/generate-mom-portraits.mjs` — generate seeded-mom portraits |

Other tooling: `scripts/render-og.mjs` (OG image), `scripts/seed-data/*` (name/photo/coords pools), `scripts/ingestion/fixtures/*` (connector test fixtures). Cron: `api/internal/purge-deleted` runs nightly (see `vercel.json`).

## Target audience

Moms looking for real-life friendship with other moms — not chat pen-pals, not dating-app-style swiping. The app is built to feel like a curated magazine cover, not a feed.

## Routes

Routing is path-based in `src/App.jsx` (`/admin*` → admin console, everything else → the phone app). Static legal pages are served by `vercel.json` rewrites.

| Route | Surface |
|---|---|
| `/` | The interactive phone app (Landing → AboutYou → Account → MainApp). Wrapped in `PhoneFrame` on wide viewports; renders full-screen on phone-sized viewports (`max-width: 640px`). |
| `/admin`, `/admin/<section>` | Admin console (Overview, Onboarding, Mom profiles, Users, Places, Events, Featured, Ingestion, Sources, Config, Deployments, Quick actions). Password-gated. |
| `/policy`, `/terms`, `/data-deletion` | Static legal HTML (Vercel rewrites). |

> The old `/prototype`, `/live`, and the public `/waitlist` marketing page have been removed. `PrototypeApp` still accepts a `bare` prop (frame-less) for potential embedding, but no route sets it today — the phone-vs-full-screen choice is driven purely by viewport width.
