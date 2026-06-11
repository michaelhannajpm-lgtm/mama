# Admin Console restructure — design

**Date:** 2026-06-11
**Status:** implemented

## Problem

The admin lived in a single 1,797-line `src/AdminPage.jsx`: auth, shared
helpers, four inline tab bodies, and a tab shell whose navigation was an
in-memory `useState('overview')`. Tabs weren't deep-linkable (`/admin/places`
went nowhere; refresh always reset to Overview). It styled itself with the
phone-app palette (`C`), so the operator surface inherited a warm editorial look
ill-suited to a data console — and there was no guard against future admin work
drifting back into the phone-app design language.

## Goals

1. Move the admin under `src/screens/` for structural consistency.
2. Make every section a real, deep-linkable URL.
3. A purpose-built admin **console design system**, distinct from the phone app,
   that scales as sections are added — plus a skill so future work follows it.
4. Supabase integration: list every Auth user.
5. Vercel integration: deployment / version history with links.

## Structure

```
src/screens/admin/
  index.jsx              AdminApp shell — auth gate, shared data load, console
                         chrome, URL-routed section switch
  admin-theme.js         `AC` console design tokens (neutral slate; brand accent
                         is the only tie to the phone app)
  nav.js                 NAV_GROUPS registry — single source of truth for the
                         sidebar AND the router
  lib/
    adminFetch.js        token auth + fetchEndpoint (lifted verbatim)
    adminRouter.js       /admin/<section> History-API routing (useAdminRoute)
  components/
    AdminLogin.jsx       password → bearer-token gate (restyled to AC)
    Sidebar.jsx          dark operator rail, grouped + collapsible
    primitives.jsx       Card, PageHeader, StatCard, DataTable, Button, Badge,
                         Toolbar, Input, EmptyState, Banner, fmt/pct/rel
  sections/
    legacy.jsx           Overview, MomsReport, MomProfilesTab, QuickActions —
                         relocated VERBATIM (still `C`; migrate incrementally)
    UsersSection.jsx     NEW — Supabase Auth users (console design)
    DeploymentsSection.jsx NEW — Vercel version history (console design)
  managers/              relocated src/admin/* (Places/Events/Ingestion/Sources/
                         Config/WeeklyFavorite + modals/maps); `../theme` import
                         repointed to `../../../theme`
```

## Routing

`lib/adminRouter.js` maps `/admin → overview`, `/admin/<id> → section`, using
History-API `pushState`. `useAdminRoute()` re-renders on pushState, `popstate`
(back/forward), and refresh. Deep-links survive refresh because `vercel.json`'s
catch-all already rewrites `/admin/*` (no dot, not `api/`) to the SPA. `App.jsx`
still routes any `/admin*` path to `<AdminApp />`; sub-routing is internal.

## Design system (`AC`)

Neutral, dense, dashboard-standard. Cool gray background, white cards, dark
left rail, Albert Sans throughout (Fraunces reserved for the wordmark), tabular
mono for IDs/numbers. Semantic tones are console-standard
(`success/warn/danger/info/neutral`) — explicitly NOT the phone app's
coral=intimacy / sage=community / saffron=premium mapping. The ONE shared value
is the brand accent (`AC.accent` = the Go Mama coral) so the console still reads
as the same product. Documented + enforced by the `admin-design` skill.

## Integrations

- **Users** — `GET /api/admin/users` (requireAdmin) pages the GoTrue Admin API
  with the service-role key, returns a slim per-user shape plus provider/status
  aggregates. `UsersSection` renders KPI tiles + searchable `DataTable`.
- **Deployments** — `GET /api/admin/deployments` (requireAdmin) calls the Vercel
  REST API (`v6/deployments`), scoped by optional `VERCEL_PROJECT_ID` /
  `VERCEL_TEAM_ID`. Missing `VERCEL_TOKEN` → `200 { configured: false }` so the
  section shows a setup card, never an error. `DeploymentsSection` lists
  versions; a row opens the deployment, the commit opens the build inspector.

## New env (optional, for Deployments)

```
VERCEL_TOKEN        required to enable the section
VERCEL_PROJECT_ID   recommended — scope to this project
VERCEL_TEAM_ID      if the project is under a team
```

## Migration debt (intentional)

`sections/legacy.jsx` still uses `C`. It renders fine inside the console (shared
coral accent) but is the exception. Each legacy tab migrates to `AC` + the
primitives when next touched.

## Future sections (registry makes these cheap)

Webhooks/health, feature flags / app-config audit log, push-notification
broadcast composer, ingestion-source health, per-user impersonation/debug,
moderation queue. Each = a `nav.js` entry + a `renderSection` case.
