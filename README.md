# Go Mama

Go Mama is a React/Vite app for a mom-friendship product. The public entry point is the interactive mobile app prototype.

The product is scheduling-first: Go Mama helps moms find nearby people who overlap on real availability, shared kid stages, values, interests, and preferred meetup places.

```txt
Live site:  https://gomama.app
Prototype:  https://gomama.app/prototype
GitHub:     git@github.com:michaelhannajpm-lgtm/mama.git
```

## Infrastructure

| Layer | Service | Link |
|---|---|---|
| Hosting + serverless functions | Vercel | https://vercel.com |
| Database (Postgres) | Supabase | https://supabase.com |
| Auth (email, phone, Google, Facebook, Apple) | Supabase Auth | https://supabase.com/auth |
| Source control | GitHub | https://github.com/michaelhannajpm-lgtm/mama |

The database is **Postgres**, managed by Supabase. Schema lives in `supabase/*.sql`. Tables in use:

- `public.onboarding_profiles` — prototype onboarding data, one row per mom
- `public.places` / `public.events` — local family places and events surfaced in the app
- `auth.users` — Supabase-managed auth records (linked from `onboarding_profiles.auth_user_id`)

## Current App

- `/prototype` renders the phone-framed product prototype.
- `/api/onboarding/*` is the in-progress onboarding persistence layer.
- `vercel.json` rewrites `/prototype` to the SPA entrypoint so direct links work on Vercel.

## Product Areas

- 3-screen GoMama-style onboarding (AboutYou → VillagePreview → Account) capturing Tampa-Bay area, kid ages, mom type, available days, and interests
- Matching cards based on schedule overlap and profile fit
- 4-tab main app: Meetups (1:1 + group toggle), Places, Favorites, Profile (with verification + upcoming meetups)
- Profile verification via Instagram or Facebook plus a real photo
- Bottom-sheet flows for profiles, scheduling, messages, premium, account creation, and profile editing
- Premium preview for full profiles, full attendee visibility, and expanded messaging (25-message free tier)

## Tech Stack

- [React 18](https://react.dev)
- [Vite](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [lucide-react](https://lucide.dev)
- [Vercel](https://vercel.com) — hosting and serverless functions
- [Supabase](https://supabase.com) — Postgres database and auth (Google / Facebook / Apple OAuth + email/phone)
- Google Fonts: [Fraunces](https://fonts.google.com/specimen/Fraunces) and [Albert Sans](https://fonts.google.com/specimen/Albert+Sans)

## Project Structure

```txt
api/
  _lib/supabase.js            Shared Vercel API helpers
  onboarding/
    step.js                   Save partial onboarding progress
    signup.js                 Password signup + profile promotion
    promote.js                OAuth/session promotion
    get.js                    Load saved onboarding profile

src/
  App.jsx                     Route switch between admin and prototype
  lib/
    onboarding.js             Client helpers for onboarding persistence
    supabase.js               Browser Supabase auth client
  components/                 Shared prototype components
  data/                       Sample moms, places, events, taxonomy
  screens/                    Onboarding screens
  screens/MainApp/            Main app tabs
  sheets/                     Bottom-sheet flows
  theme.js                    Shared color tokens

supabase/
  _remove_waitlist.sql        Cleanup for retired waitlist table
  onboarding_schema.sql       onboarding_profiles table

vercel.json                   SPA rewrites
```

## Local Development

Install dependencies:

```bash
npm install
```

Start Vite:

```bash
npm run dev
```

Local routes:

```txt
http://localhost:5173/
http://localhost:5173/prototype
```

Build:

```bash
npm run build
```

Preview the built app:

```bash
npm run preview
```

## Environment Variables

Server-side Vercel functions use:

```txt
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Browser code uses:

```txt
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Security notes:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
- `VITE_` variables are public to anyone visiting the site.
- Do not commit real secrets to `.env`, `.env.local`, or `.env.example`.

## Onboarding Backend

The onboarding persistence layer is designed to capture partial and completed prototype profiles in Supabase.

Routes:

```txt
POST /api/onboarding/step
POST /api/onboarding/signup
POST /api/onboarding/promote
GET  /api/onboarding/get?session_id=<uuid>
```

Data is written to:

```txt
public.onboarding_profiles
```

Schema:

```txt
supabase/onboarding_schema.sql
```

Client flow:

- The browser creates a `mama:session_id` in localStorage.
- Each onboarding step can fire-and-forget progress to `/api/onboarding/step`.
- Password signup goes through `/api/onboarding/signup`.
- OAuth/session restore goes through Supabase auth and `/api/onboarding/promote`.
- Saved rows preserve drop-offs and completed profiles.

## Supabase Setup

Run the current SQL files in the Supabase SQL editor as needed:

```txt
supabase/onboarding_schema.sql
```

Both tables have RLS enabled. The intended access pattern is server-side writes through Vercel functions using the Supabase service role key.

For OAuth, configure Supabase Auth providers and callback URLs to return to:

```txt
https://mama-iota-weld.vercel.app/prototype
http://localhost:5173/prototype
```

## Deployment

The project is deployed on Vercel from GitHub.

Typical Vercel settings:

```txt
Framework: Vite
Build command: npm run build
Output directory: dist
```

Push committed changes to deploy:

```bash
git push
```

The local branch tracks:

```txt
origin/master
```

## Design System

The app uses the GoMama coral / navy visual system (ported from the
Expo prototype at `C:\projects\GoMama` on 2026-06-01):

- Cream + blush backgrounds
- Coral primary actions (`#E96B7D` / `#D6446A` gradient)
- Navy ink for body text
- Light sage / lilac / peach feature backgrounds
- Saffron highlights for premium pop
- Fraunces headings
- Albert Sans body and UI text

Shared color tokens live in:

```txt
src/theme.js
```

Existing token names (`terracotta`, `ink`, `sage`, etc.) are preserved
so every component inherits the palette without a rename. See
`docs/superpowers/specs/2026-06-01-gomama-prototype-port-design.md` for
the full mapping.

## Notes For Contributors

- Keep UI changes consistent with the existing phone-frame prototype style.
- Keep server secrets in Vercel/Supabase configuration, not committed files.
- Before pushing, check the working tree:

```bash
git status --short --branch
```
