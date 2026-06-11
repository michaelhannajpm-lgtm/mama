# Go Mama

A mom-friendship matching app — **anti-Tinder positioning**: the core value is *real meetups*, not endless chat. Verified-only, warm coral + navy editorial aesthetic, built to feel like a curated magazine cover rather than a feed.

React + Vite on the front end, Supabase (Postgres + Auth) for data, and Vercel serverless functions (`api/*`) for everything that touches the database. Admin console at `/admin`.

## Stack

- **Vite + React 18** (`@vitejs/plugin-react`)
- **Tailwind CSS** (via PostCSS) + a small set of inline `C`-token styles
- **lucide-react** icons
- **Supabase** — Postgres + Auth. The browser client is **auth-only** (anonymous sign-in for chat/presence); all app data flows through `api/*` on the service role
- **Vercel** — hosting + serverless functions (`@vercel/functions`, `@vercel/blob` for image storage)
- **Tooling deps** — `cheerio`, `node-ical`, `openai` (AI describe/review + portraits), `web-push` (push notifications), `sharp` (image processing)
- **Tests** — `node --test` over co-located `*.test.mjs` files

## Getting started

```bash
npm install
npm run dev          # Vite dev server on :5173 (client only — api/* routes are NOT live)
npm run dev:api      # vercel dev — full stack incl. api/* serverless routes
```

Use `npm run dev` for pure UI work; reach for `npm run dev:api` whenever you need live places/events/moms data or any `api/*` endpoint.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server (client only) |
| `npm run dev:api` | `vercel dev` — full stack including `api/*` |
| `npm run build` | Production build |
| `npm run preview` | Preview the built app |
| `npm test` | `node --test` — runs all `*.test.mjs` |
| `npm run seed` | Seed mom profiles / places / events |
| `npm run ingest` | Run a family-data ingestion pass |
| `npm run enrich` | Enrich place rows |
| `npm run backfill:photos` | Backfill place photos to Vercel Blob |
| `npm run portraits` | Generate seeded-mom portraits |

## Routes

Routing is path-based in `src/App.jsx`.

| Route | Surface |
|---|---|
| `/` | The phone app (Landing → AboutYou → Account → MainApp). `PhoneFrame` on wide viewports; full-screen on phone-sized viewports (`max-width: 640px`). |
| `/admin`, `/admin/<section>` | Password-gated admin console (Overview, Onboarding, Mom profiles, Users, Places, Events, Featured, Ingestion, Sources, Config, Deployments). |
| `/policy`, `/terms`, `/data-deletion` | Static legal HTML (Vercel rewrites). |

## How it works

- **Verified-only.** A two-signal gate — (Instagram OR Facebook) **AND** a real photo — keeps the space safe and gates connect / RSVP / DM actions. This is a safety mechanism, orthogonal to Plus; never move it behind a paywall.
- **Live data.** Phone-app surfaces render places / events / moms from `api/*` (via `lib/*-api.js` + a pure client-side ranking engine), never from the static `data/*` catalogs. Every data-backed section follows the three-state contract: **loading skeleton → data → warm empty state**.
- **State lives in `src/App.jsx`.** `PrototypeApp` owns all phone-app state and prop-drills it down — no Context, no store.
- **Premium (Plus).** The app works fully for free; Plus removes friction (unlimited DMs, full profile depth, advanced filters) but never gates the core find-a-mom-and-meet-up loop. Prices and limits are admin-configurable via `app_config` / `/api/config`.
- **Chat** is the one browser-accessible data surface, secured by Supabase RLS keyed on `auth.uid()`; everything else is service-role-only.

## Project structure

```
src/
├── App.jsx          # state owner + router
├── theme.js         # the `C` design tokens (coral/navy palette)
├── data/            # taxonomy, vocabulary, discussion topics
├── lib/             # API clients + pure ranking/logic (framework-free; many have *.test.mjs)
├── components/      # leaf components
├── sheets/          # bottom-drawer modals
└── screens/         # Landing, onboarding/, MainApp/ (5 tabs), admin/ (own AC design system)

api/                 # Vercel serverless functions (service-role)
├── _lib/            # shared server code (supabase, match, nearby, ingestion connectors, …)
└── …                # config, places, events, onboarding/, mom-profiles/, account/, admin/, push/, …

supabase/            # SQL schemas / migrations
```

Dependency direction is one-way: `data ← lib ← components ← sheets ← screens ← App.jsx`. `theme.js` is a leaf imported by everyone. The admin console (`src/screens/admin/**`) is a self-contained subtree on its own `AC` token system.

## Conventions

- **Named exports only**, one component per file, file name = component name.
- **No barrel `index.js`** except the two app shells (`MainApp/index.jsx`, `admin/index.jsx`).
- **Never hardcode hex** — reference `C.tokenName` from `src/theme.js`. Typography is Fraunces (display/serif) + Albert Sans (UI/body).
- The phone app targets ~375×740; don't use `100vw`/`100vh` or fixed widths > 375 in phone-app UI.

See `CLAUDE.md` and `.claude/context/*` for the full project notes, and `docs/superpowers/specs/` + `docs/superpowers/plans/` for per-feature design and implementation docs.
