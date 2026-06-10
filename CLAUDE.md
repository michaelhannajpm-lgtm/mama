# Go Mama — project notes for Claude Code

A React/Vite app for **Go Mama**, a mom-friendship matching app. Anti-Tinder positioning, coral + navy editorial aesthetic (ported from the GoMama Expo prototype on 2026-06-01). Modular React structure under `src/`: `data/`, `components/`, `screens/`, `sheets/`, `lib/`. Supabase Auth + Postgres backend; Vercel hosting. Admin dashboard at `/admin`.

> **Data access exception (chat):** the app is otherwise service-role-only — the browser Supabase client is auth-only and all data flows through `api/*`. The **chat** tables (`conversations`, `conversation_participants`, `messages`, `message_reactions`; see `supabase/_apply_phase8_chat.sql`) are the one **browser-accessible** surface, secured by RLS keyed on `auth.uid()`. Every user gets a real session via anonymous sign-in (`ensureSession()` in `src/lib/supabase.js`); `src/lib/chat.js` is the only chat data interface. Requires "Anonymous sign-ins" enabled in the Supabase dashboard.

## Project context

These files are auto-loaded as context — read them before making changes:

@.claude/context/overview.md
@.claude/context/file-layout.md
@.claude/context/design-tokens.md
@.claude/context/architecture.md
@.claude/context/premium-model.md
@.claude/context/conventions.md
@.claude/context/todo.md

## Specialized agents

`.claude/agents/` contains subagents for common tasks:

- **`screen-builder`** — adds new onboarding screens or MainApp tabs following existing patterns
- **`design-reviewer`** — audits UI changes for design-token compliance (no hardcoded hex, correct semantic palette)
- **`data-extender`** — adds entries to `SAMPLE_MOMS`, `PLACES`, `SUGGESTED_EVENTS` matching existing shapes

Dispatch them via the Task tool when their description matches the work.

## Project skills

- **`family-data-ingestion`** — read `.claude/skills/family-data-ingestion/SKILL.md` when building background jobs that import Tampa-area family places/events from Google Places, Eventbrite, public social APIs, civic calendars, libraries, museums, attractions, local media, YMCA, kids gyms, or similar sources.
- **`store-image`** — read `.claude/skills/store-image/SKILL.md` when storing, uploading, importing, generating, or persisting images. Images must go to Vercel Blob first, then the returned public blob URL should be saved in Supabase or app data.

## Quick reference

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview built app |

## Per-feature specs

For each shipped feature, see `docs/superpowers/specs/2026-06-01-*.md` — one design doc per feature (palette, Landing, AboutYou, VillagePreview, 4-tab MainApp, Favorites, Profile verification, Calendar fold, Premium softening, Admin updates).

## Where to start

For remaining UX work, see `.claude/context/todo.md` — items are prioritized and self-contained. Implement one at a time and commit between each.
