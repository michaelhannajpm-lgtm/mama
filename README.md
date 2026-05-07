# Mama

Mama is a React/Vite app for a mom-friendship product. The public entry point is a waitlist landing page, and the interactive mobile prototype lives at a clean `/prototype` route.

The product is scheduling-first: Mama helps moms find nearby people who overlap on real availability, shared kid stages, values, interests, and preferred meetup places.

```txt
Live site:  https://mama-iota-weld.vercel.app
Prototype:  https://mama-iota-weld.vercel.app/prototype
GitHub:     git@github.com:michaelhannajpm-lgtm/mama.git
```

## Current App

- `/` renders the marketing waitlist page.
- `/prototype` renders the phone-framed product prototype.
- `/api/waitlist` stores public waitlist submissions in Supabase.
- `/api/onboarding/*` is the in-progress onboarding persistence layer.
- `vercel.json` rewrites `/prototype` to the SPA entrypoint so direct links work on Vercel.

## Product Areas

- Waitlist marketing page for early demand capture
- Onboarding for location, kid ages, mom type, values, interests, availability, and places
- Matching cards based on schedule overlap and profile fit
- Main app tabs for matches, calendar, places, events, and profile
- Bottom-sheet flows for profiles, scheduling, messages, premium, account creation, and profile editing
- Premium preview for full profiles, full attendee visibility, and expanded messaging

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- lucide-react
- Vercel hosting and serverless functions
- Supabase database and auth
- Google Fonts: Fraunces and Albert Sans

## Project Structure

```txt
api/
  _lib/supabase.js            Shared Vercel API helpers
  waitlist.js                 Waitlist signup endpoint
  onboarding/
    step.js                   Save partial onboarding progress
    signup.js                 Password signup + profile promotion
    promote.js                OAuth/session promotion
    get.js                    Load saved onboarding profile

src/
  App.jsx                     Route switch between waitlist and prototype
  WaitlistPage.jsx            Public marketing page
  waitlist.css                Marketing page styles
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
  waitlist_schema.sql         waitlist_signups table
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
VITE_WAITLIST_ENDPOINT=/api/waitlist
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Security notes:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code.
- `VITE_` variables are public to anyone visiting the site.
- Do not commit real secrets to `.env`, `.env.local`, or `.env.example`.

## Waitlist Backend

Endpoint:

```txt
POST /api/waitlist
```

Example body:

```json
{
  "firstName": "Maya",
  "email": "maya@example.com",
  "city": "Tampa, FL",
  "audience": "New mom",
  "source": "marketing-waitlist"
}
```

The endpoint validates the email, normalizes fields, captures user agent/referrer, and writes to:

```txt
public.waitlist_signups
```

Schema:

```txt
supabase/waitlist_schema.sql
```

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

Run both SQL files in the Supabase SQL editor:

```txt
supabase/waitlist_schema.sql
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

The app uses a warm editorial visual system:

- Cream and paper backgrounds
- Terracotta primary actions
- Sage secondary accents
- Saffron highlights
- Fraunces headings
- Albert Sans body and UI text

Shared color tokens live in:

```txt
src/theme.js
```

## Notes For Contributors

- Keep UI changes consistent with the existing phone-frame prototype style.
- Keep marketing-page changes in `WaitlistPage.jsx` and `waitlist.css`.
- Keep server secrets in Vercel/Supabase configuration, not committed files.
- Before pushing, check the working tree:

```bash
git status --short --branch
```
