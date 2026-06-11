---
name: admin-design
description: Use when adding or editing ANY UI under src/screens/admin/** — the Go Mama admin console. The console has its OWN design system (the `AC` tokens), deliberately separate from the coral/navy phone app (`C`). Read this BEFORE writing admin JSX so you don't reach for the wrong palette, font weights, or layout patterns.
---

# Admin Console design system

The admin console (`/admin`, `src/screens/admin/**`) is a **neutral, dense, data-first operator surface** — NOT the warm coral/navy editorial phone app. Two separate worlds; do not mix them.

| | Phone app (`src/screens`, `sheets`, `components`) | Admin console (`src/screens/admin/**`) |
|---|---|---|
| Tokens | `C` from `src/theme.js` | **`AC` from `src/screens/admin/admin-theme.js`** |
| Mood | warm, editorial, magazine cover | cool, neutral, dashboard |
| Background | cream `#FBF5EF` | slate-tinted gray `AC.bg` `#F5F6F8` |
| Headlines | Fraunces serif, often italic-colored | **Albert Sans, weight 700** (Fraunces ONLY for the wordmark) |
| Layout | 375×740 phone frame | full-width, sidebar + content, `AC.maxContent` 1200 |
| Density | spacious, one idea per screen | compact tables, many rows visible |

## The one rule that matters most

**Import `AC`, never `C`, in admin code.** If you write `C.cream` or `C.terracotta` inside `src/screens/admin/`, you've used the wrong system. The single shared value is the brand accent — and it's exposed as `AC.accent` (the same coral), so you still never need `C` here.

```js
import { AC } from '../admin-theme';            // ✅ console
import { C } from '../../../theme';              // ❌ wrong system (only legacy.jsx, pending migration)
```

## Build from primitives, not raw divs

`src/screens/admin/components/primitives.jsx` is the shared vocabulary. Compose these instead of hand-styling:

- `<PageHeader title subtitle actions />` — every section starts with one.
- `<Card padding>` — the surface for everything. White, hairline border, soft shadow.
- `<StatCard label value hint tone icon />` — KPI tiles. Big tabular number.
- `<DataTable columns rows />` — the default for any list. Columns: `{ key, header, width, align, mono, wrap, render(row) }`. Use `mono: true` for IDs, counts, timestamps.
- `<Button variant size icon>` — variants `primary | secondary | ghost | danger`.
- `<Badge tone dot>` — status pills. Tones: `accent | success | warn | danger | info | neutral`.
- `<Toolbar>` — control strip above a table (search, filters, actions).
- `<Input>` — console-styled text input.
- `<EmptyState icon title body action />` — empty / not-configured states.
- `<Banner tone icon>` — inline error / notice.
- Helpers: `fmt(n)` (locale number), `pct(a,b)`, `rel(iso)` (relative time).

If you need something new, add it to `primitives.jsx` so every section shares it — don't one-off it inside a section.

## Semantic color (console standard — NOT the app's sage/saffron)

The phone app maps coral=intimacy / sage=community / saffron=premium. **The console does not use that mapping.** It uses dashboard-standard state colors via `AC` and the `Badge`/tone system:

- `accent` (coral) — primary actions, active nav, the brand. Use sparingly.
- `success` (green) — confirmed, ready, healthy, verified.
- `warn` (amber) — anonymous, pending, needs attention.
- `danger` (red) — errors, banned, destructive.
- `info` (blue) — building, in-progress, neutral-informational.
- `neutral` (gray) — default, inactive, archived.

Pick the tone by **state meaning**, not by the app's intimacy/community semantics.

## Navigation & routing

- The dark left **rail is the nav** (`components/Sidebar.jsx`), driven by `nav.js`. To add a section: add an entry to `NAV_GROUPS` in `nav.js`, then a `case` in `renderSection` inside `index.jsx`. It deep-links automatically.
- Every section is a real URL: `/admin/<id>` (see `lib/adminRouter.js`). Don't add in-memory-only tabs.
- New sections that fetch their own data should NOT be added to `NEEDS_SHARED` in `index.jsx` — they manage their own loading/empty/error states (see `UsersSection`, `DeploymentsSection` as the reference implementations).

## Data fetching

Use `fetchEndpoint(path, label)` / `adminFetch` from `lib/adminFetch.js`. They attach the admin bearer token and surface the "API routes don't run under `npm run dev`" hint. Back every section with an `/api/admin/*` route gated by `requireAdmin`. New external integrations should **degrade gracefully** when their env/token is missing — return `200 { configured: false }` and render an `EmptyState` setup card rather than an error (see `api/admin/deployments.js`).

## Typography

- **Albert Sans** for everything (`AC.font`). Section titles are weight 700, ~21px.
- **Fraunces** (`AC.brandFont`) ONLY for the "Go Mama Console" wordmark and the login mark. Never for section content.
- **Monospace** (`AC.mono`) for IDs, SHAs, counts, timestamps — anything tabular/technical.

## Theming (light / dark / system)

The whole console themes via a 3-way toggle in the header (`components/ThemeToggle.jsx`, driven by `lib/useAdminTheme.js`). Every **color** token on `AC` is a CSS variable (`var(--ac-x, <lightfallback>)`); the active values come from the `LIGHT` / `DARK` maps in `admin-theme.js`, emitted as `AC_THEME_CSS` and flipped by `data-ac-theme="light|dark"` on `<html>`. Non-color tokens (radius, widths, fonts) are plain literals and never theme.

**Rule for consumers:** a color token is a CSS *value* — never string-concatenate an alpha suffix (`${AC.accent}33` → `var(...)33` is invalid). Use the `*Soft` / `*Border` tokens, or `color-mix(in srgb, ${AC.x} N%, transparent)`. Likewise, give lucide icons their color via `style={{ color: AC.x }}`, not the `color={AC.x}` attribute (`var()` doesn't resolve in SVG presentation attributes).

## Legacy debt

`sections/legacy.jsx` (Overview, Onboarding, Mom profiles, Quick actions) and the `managers/*` files were relocated verbatim from the old single-file AdminPage. As of the 2026-06-11 theming work they were fully migrated off the phone-app `C` palette onto `AC` (so they participate in dark mode) — but they still carry their own private helpers/layout rather than the shared primitives. When you touch one, prefer migrating it to `PageHeader` / `Card` / `DataTable` etc. New work always uses the console primitives from the start.
