# Go Mama — overview

A React prototype for **Go Mama**, a mom-friendship matching app.

## Positioning

- **Anti-Tinder.** The core value is *real meetups*, not endless chat.
- **Verified-only.** A two-signal verification gate (Instagram or Facebook + a real photo) keeps the space safe for moms.
- **Coral + navy editorial aesthetic.** Hero-image landing, warm cream backgrounds, Fraunces serif headlines. Ported from the GoMama Expo prototype on 2026-06-01.

## Stack

- Vite + React 18
- Tailwind CSS (via PostCSS)
- `lucide-react` for icons
- Supabase (Postgres + Auth) — schemas in `supabase/*.sql`
- Vercel — hosting + serverless functions in `api/`
- No test framework yet
- Modular React structure under `src/`: `data/`, `components/`, `screens/`, `sheets/`, `lib/`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the built app |

## Target audience

Moms looking for real-life friendship with other moms — not chat pen-pals, not dating-app-style swiping. The app is built to feel like a curated magazine cover, not a feed.

## Routes

| Route | Surface |
|---|---|
| `/` | Public waitlist marketing page |
| `/promo` | Founding-moms dark-mode landing |
| `/prototype` | The interactive product (Landing → AboutYou → VillagePreview → Account → MainApp) |
| `/live` | Same prototype, "bare" — no `PhoneFrame`, used for embedding |
| `/admin` | Admin dashboard (overview, waitlist, moms report, mom profiles, feedback) |
