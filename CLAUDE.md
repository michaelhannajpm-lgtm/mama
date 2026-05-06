# Mama — project notes for Claude Code

A React prototype for **Mama**, a mom-friendship matching app. Anti-Tinder positioning, editorial-warm aesthetic, single-file (`src/App.jsx`).

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

## Quick reference

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview built app |

## Where to start

For UX improvements, see `.claude/context/todo.md` — items are prioritized and self-contained. Implement one at a time and commit between each.
