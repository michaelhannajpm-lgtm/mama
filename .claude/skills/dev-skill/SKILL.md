---
name: dev-skill
description: Use when the user asks to run, start, launch, serve, or preview the Go Mama app locally. Decides whether to run the full Vercel dev server (port 3000) or the standalone Vite client (port 5173).
---

# Running the App

When the user asks to run the app, **default to the full Vercel dev server on port 3000** — it serves both the client and the `api/*` serverless functions, so the app works end-to-end.

## The rule

1. **If Vercel is connected to VS Code → run the Vercel server on port 3000.**
   Run `vercel dev` (port 3000). Do **not** run the Vite client alone on port 5173 — running the client by itself skips the `api/*` backend.

2. **Only if Vercel is NOT connected to VS Code → run the client alone on port 5173.**
   Fall back to `npm run dev` (Vite, port 5173).

In short: **prefer port 3000 (Vercel) whenever it's available; use port 5173 (Vite client only) solely as a fallback when Vercel isn't connected.**
