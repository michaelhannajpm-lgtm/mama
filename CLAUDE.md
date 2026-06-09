# Go Mama — project notes for Claude Code

A React/Vite app for **Go Mama**, a mom-friendship matching app. Anti-Tinder positioning, coral + navy editorial aesthetic (ported from the GoMama Expo prototype on 2026-06-01). Modular React structure under `src/`: `data/`, `components/`, `screens/`, `sheets/`, `lib/`. Supabase Auth + Postgres backend; Vercel hosting. Admin dashboard at `/admin`.

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
