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

## Specialized agents

`.claude/agents/` contains subagents for common tasks:

- **`screen-builder`** — builds and edits any phone-app UI (onboarding screens, MainApp tabs, sheets, components, cards, empty states, copy). Owns both the build mechanics (file conventions, state flow through `App.jsx`, `C` tokens, live `api/*` data) and the UX/taste layer (intuitive/calm/on-brand/pulls-forward) plus mandatory skeleton/ghost loading for any API-driven surface. Apply it BEFORE writing user-facing JSX. (Absorbs the former `ux-oracle` skill, archived at `docs/ux-oracle.md`.)
- **`design-reviewer`** — audits UI changes for design-system compliance: token usage (no hardcoded hex, correct coral/sage/saffron semantics), typography, component reuse, spacing/hierarchy, accessibility, responsive/phone-frame fidelity, the three-state loading contract, and dependency direction. Dispatch it AFTER a UI change.

Dispatch them via the Task tool when their description matches the work.

> Admin-console UI (`src/screens/admin/**`) uses its own `AC` design system, not these agents — see the `admin-design` skill.

## Project skills

- **`data-ingestion`** — read `.claude/skills/data-ingestion/SKILL.md` when building background jobs that import Tampa-area family places/events from Google Places, Eventbrite, public social APIs, civic calendars, libraries, museums, attractions, local media, YMCA, kids gyms, or similar sources.
- **`create-event`** — read `.claude/skills/create-event/SKILL.md` when creating/importing individual events into the Supabase `events` table from a prompt or a link.
- **`admin-design`** — read `.claude/skills/admin-design/SKILL.md` before editing any admin-console UI (the `AC` token system).
- **`dev-skill`** — read `.claude/skills/dev-skill/SKILL.md` to run the app locally (Vite client vs. full `vercel dev`).
- **`store-image`** — read `.claude/skills/store-image/SKILL.md` when storing, uploading, importing, generating, or persisting images. Images must go to Vercel Blob first, then the returned public blob URL should be saved in Supabase or app data.

## Quick reference

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview built app |

## Per-feature specs

For shipped features, see the design docs under `docs/superpowers/specs/` and the implementation plans under `docs/superpowers/plans/` — one document per feature (palette, Landing, AboutYou, MainApp tabs, verification, presence, chat, ingestion, premium, admin console, account lifecycle, etc.). These are historical: where a plan references the old single-file `src/AdminPage.jsx`, the live code is now under `src/screens/admin/`.
