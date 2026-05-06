# Mama

A React prototype for a mom-friendship app. Editorial-warm aesthetic, scheduling-first product.

## Quick start

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The app renders inside a phone-frame mockup centered on the page.

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # serves the dist/ build locally
```

## Tech stack

- **React 18** + Vite
- **Tailwind CSS** for styling (utility classes + inline `style` for design tokens)
- **lucide-react** for icons
- Fonts loaded at runtime via Google Fonts: **Fraunces** (display serif) + **Albert Sans** (body)

## Working with Claude Code

This project ships with a `CLAUDE.md` file at the repo root. Claude Code will read it automatically on first turn. It contains:

- Architecture overview
- Color palette and typography tokens
- A prioritized TODO list of UX improvements waiting to be implemented

Recommended workflow:

1. Run `claude` in this directory.
2. Try a focused task: *"Implement TODO #1 from CLAUDE.md — persona-based onboarding"*
3. Commit between each TODO so you can roll back easily.

The single-file structure (`src/App.jsx`, ~4000 lines) keeps everything in one place for easy navigation. If you want it split into modules, ask Claude Code: *"Refactor src/App.jsx into separate files under src/screens/, src/components/, src/data/"*.
