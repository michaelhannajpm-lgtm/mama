# /promo Landing Page + Feedback Admin Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the dark-mode "Founding Moms of Tampa" landing page at `/promo`, route its signup form into the existing waitlist pipeline (extended with `neighborhood` + `mom_type`), pipe its 6-question feedback form into a new `feedback_submissions` table, and grow the admin dashboard with a "Feedback" tab containing NPS-style charts and a searchable + exportable raw list.

**Architecture:** `public/promo.html` ships as a static file (artifact verbatim with surgical edits to wire forms to internal APIs, swap in `/live` as the prototype link, and JSON-ify the submit handler). `vercel.json` adds one rewrite. `api/waitlist.js` gains two pass-through fields. New `api/feedback.js` (public POST) and `api/admin/feedback.js` (admin GET) follow the existing Vercel-function patterns. New `feedback_submissions` Supabase table; two columns added to `waitlist_signups`. Admin gets a new `FeedbackTab` co-located in `src/AdminPage.jsx`.

**Tech Stack:** Plain HTML/CSS/JS for the landing page (no React on `/promo`). Vercel serverless functions (Node 18+, ESM). Supabase REST API via service-role key. React 18 hooks for the admin tab. Lucide-react icons. The `C` design-token export from `src/theme.js`. No new dependencies.

---

## Reference: spec & key files

- Spec: `docs/superpowers/specs/2026-05-07-promo-landing-and-feedback-design.md`
- Existing waitlist API: `api/waitlist.js` (~100 lines, will be extended)
- Existing waitlist schema: `supabase/waitlist_schema.sql`
- Existing admin endpoint pattern: `api/admin/mom-profiles.js`, `api/admin/waitlist.js`
- Admin dashboard root: `src/AdminPage.jsx` (~1610 lines after lightbox lands)
  - State block: lines ~1457-1463
  - `load()` Promise.all: lines ~1480-1495
  - Loading guard: line ~1593
  - Tab list: lines ~1549-1553
  - Tab routing: lines ~1603-1607
  - Existing tab components for reference: `Overview` (164), `MomsReport` (~274), `MomProfilesTab` (~547), `WaitlistTable` (~198), `QuickActions` (~674)
  - Reusable primitives: `Stat`, `BarList`, `DailyTrend`, `Card`, `SectionTitle`, `tally`, `csvEscape`, `downloadCsv`, `rel`, `fmt`, `pct`
- Artifact already pasted at: `public/promo.html` (untracked, 896 lines as of plan write)
- Branch: `feat/promo-landing` (already created off master, spec already committed)

---

## Notes on testing & local dev

The repo has **no automated test framework**. Each task ends with `npm run build` (where applicable) and a manual sanity check, then a commit.

API routes do **not** run under `npm run dev` — the existing `fetchEndpoint` helper in `AdminPage.jsx` already detects this. For end-to-end testing of the new endpoints, deploy a Vercel preview and exercise the public surfaces from there, or use `vercel dev` locally if installed.

---

## Task 1: Apply surgical edits to `public/promo.html`

The artifact exists at `public/promo.html` (untracked working tree file). This task replaces the Formspree placeholders, the prototype link, the form submit JS, and stages the file for tracking. Everything else (CSS, copy, fonts, animations, structure) stays byte-identical.

**Files:**
- Modify: `public/promo.html` (already exists, untracked)

- [ ] **Step 1: Replace the signup form's `action` and add hidden inputs**

Find at `public/promo.html:708`:

```html
      <form class="form-card" id="signup-form" action="https://formspree.io/f/YOUR_SIGNUP_FORM_ID" method="POST">
        <div class="field">
          <label for="name">First name</label>
          <input type="text" id="name" name="first_name" placeholder="Maya" required />
        </div>
```

Replace with:

```html
      <form class="form-card" id="signup-form" action="/api/waitlist" method="POST">
        <input type="hidden" name="source" value="promo" />
        <input type="hidden" name="audience" value="founding-tampa" />
        <div class="field">
          <label for="name">First name</label>
          <input type="text" id="name" name="first_name" placeholder="Maya" required />
        </div>
```

- [ ] **Step 2: Replace the feedback form's `action`**

Find at `public/promo.html:771`:

```html
      <form class="form-card" id="feedback-form" action="https://formspree.io/f/YOUR_FEEDBACK_FORM_ID" method="POST">
```

Replace with:

```html
      <form class="form-card" id="feedback-form" action="/api/feedback" method="POST">
```

- [ ] **Step 3: Replace the prototype link**

Find at `public/promo.html:752`:

```html
          <a href="YOUR_PROTOTYPE_LINK" target="_blank" rel="noopener" class="btn btn-primary">
```

Replace with:

```html
          <a href="/live" target="_blank" rel="noopener" class="btn btn-primary">
```

- [ ] **Step 4: Replace the form submit JS to send JSON instead of `FormData`**

Find at `public/promo.html:866-889`:

```js
    function handleForm(formId, successId) {
      const form = document.getElementById(formId);
      const success = document.getElementById(successId);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        try {
          const res = await fetch(form.action, {
            method: 'POST',
            body: data,
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            form.style.display = 'none';
            success.classList.add('visible');
            success.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            alert('Something went wrong. Please try again or DM us directly.');
          }
        } catch (err) {
          alert('Something went wrong. Please try again or DM us directly.');
        }
      });
    }
```

Replace with:

```js
    // Convert a FormData into a plain JSON object. Multi-value fields whose
    // names end in [] (e.g. useful[]) are collected into arrays; everything
    // else collapses to its last value.
    function formDataToJson(data) {
      const out = {};
      for (const [rawKey, value] of data.entries()) {
        if (rawKey.endsWith('[]')) {
          const key = rawKey.slice(0, -2);
          if (!Array.isArray(out[key])) out[key] = [];
          out[key].push(value);
        } else {
          out[rawKey] = value;
        }
      }
      return out;
    }

    function handleForm(formId, successId) {
      const form = document.getElementById(formId);
      const success = document.getElementById(successId);
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = formDataToJson(new FormData(form));
        try {
          const res = await fetch(form.action, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });
          if (res.ok) {
            form.style.display = 'none';
            success.classList.add('visible');
            success.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            alert('Something went wrong. Please try again or DM us directly.');
          }
        } catch (err) {
          alert('Something went wrong. Please try again or DM us directly.');
        }
      });
    }
```

- [ ] **Step 5: Update the SETUP NOTES comment block at the top of the file**

Find at `public/promo.html:9-18`:

```html
  <!-- ============================================================
       SETUP NOTES:
       1) FORMS: sign up at formspree.io (free), create 2 forms
          ("Signups" + "Feedback"), then replace:
          - YOUR_SIGNUP_FORM_ID
          - YOUR_FEEDBACK_FORM_ID
       2) PROTOTYPE LINK: replace YOUR_PROTOTYPE_LINK
       3) FOUNDING MOM COUNTER: update id="founder-count" weekly
       4) WHATSAPP: add your number where it says (YOUR NUMBER)
       ============================================================ -->
```

Replace with:

```html
  <!-- ============================================================
       SETUP NOTES:
       1) FORMS: wired to internal APIs (/api/waitlist, /api/feedback) —
          no Formspree account needed.
       2) PROTOTYPE LINK: points at /live (the existing mobile preview).
       3) FOUNDING MOM COUNTER: edit TARGET_COUNT at the bottom of this
          file to match the real Supabase count (refresh weekly).
       4) WHATSAPP: replace (YOUR NUMBER) below with the real number.
       ============================================================ -->
```

- [ ] **Step 6: Verify the file builds cleanly into the dist tree**

Run: `npm run build`
Expected: build succeeds. Check that `dist/promo.html` exists and is roughly the same size as `public/promo.html` (Vite copies files from `public/` to `dist/` verbatim).

```bash
ls -la dist/promo.html public/promo.html
```

Both should exist; their byte counts should match (Vite doesn't transform HTML in `public/`).

- [ ] **Step 7: Commit**

```bash
git add public/promo.html
git commit -m "feat(promo): add /promo landing page wired to internal APIs"
```

---

## Task 2: Add `/promo` rewrite to `vercel.json`

Vercel needs to know `/promo` should serve `/promo.html`. Without this, hitting `/promo` would 404 (the existing rewrites only cover `/admin`, `/preview`, `/prototype`, `/live`).

**Files:**
- Modify: `vercel.json`

- [ ] **Step 1: Read the current `vercel.json`**

The current file is:

```json
{
  "rewrites": [
    {
      "source": "/prototype",
      "destination": "/"
    },
    {
      "source": "/prototype/:path*",
      "destination": "/"
    },
    {
      "source": "/preview",
      "destination": "/"
    },
    {
      "source": "/preview/:path*",
      "destination": "/"
    },
    {
      "source": "/admin",
      "destination": "/"
    },
    {
      "source": "/admin/:path*",
      "destination": "/"
    },
    {
      "source": "/live",
      "destination": "/"
    },
    {
      "source": "/live/:path*",
      "destination": "/"
    }
  ]
}
```

- [ ] **Step 2: Add the `/promo` rewrite at the end of the `rewrites` array**

Replace the file with:

```json
{
  "rewrites": [
    {
      "source": "/prototype",
      "destination": "/"
    },
    {
      "source": "/prototype/:path*",
      "destination": "/"
    },
    {
      "source": "/preview",
      "destination": "/"
    },
    {
      "source": "/preview/:path*",
      "destination": "/"
    },
    {
      "source": "/admin",
      "destination": "/"
    },
    {
      "source": "/admin/:path*",
      "destination": "/"
    },
    {
      "source": "/live",
      "destination": "/"
    },
    {
      "source": "/live/:path*",
      "destination": "/"
    },
    {
      "source": "/promo",
      "destination": "/promo.html"
    }
  ]
}
```

The `/promo` entry is the only addition. Order doesn't affect correctness — Vercel matches the first rule whose source matches.

- [ ] **Step 3: Verify it parses as valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8')); console.log('OK')"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add vercel.json
git commit -m "chore(vercel): rewrite /promo → /promo.html"
```

---

## Task 3: Extend `api/waitlist.js` to accept `neighborhood` + `mom_type`

The endpoint already does email validation, dedupe, service-role insert, and Resend confirmation. This task adds two pass-through fields and accepts both camelCase and snake_case names so the existing `/WaitlistPage` (camelCase) and the new `/promo` form (snake_case) both work.

**Files:**
- Modify: `api/waitlist.js`

- [ ] **Step 1: Locate the payload construction**

Lines 56-64 currently read:

```js
  const payload = {
    first_name: cleanText(body.firstName, 80),
    email,
    city: cleanText(body.city, 120),
    audience: cleanText(body.audience, 80),
    source: cleanText(body.source, 80) || 'marketing-waitlist',
    user_agent: cleanText(req.headers['user-agent'], 300),
    referrer: cleanText(req.headers.referer, 500),
  };
```

- [ ] **Step 2: Replace with the extended payload that accepts both naming conventions**

Replace lines 56-64 with:

```js
  const payload = {
    first_name: cleanText(body.firstName ?? body.first_name, 80),
    email,
    city: cleanText(body.city, 120),
    audience: cleanText(body.audience, 80),
    source: cleanText(body.source, 80) || 'marketing-waitlist',
    neighborhood: cleanText(body.neighborhood, 120),
    mom_type: cleanText(body.mom_type ?? body.momType, 40),
    user_agent: cleanText(req.headers['user-agent'], 300),
    referrer: cleanText(req.headers.referer, 500),
  };
```

Two lines added (`neighborhood`, `mom_type`), and `first_name` now falls back to `body.first_name` if `body.firstName` is missing (covers the snake_case form submission).

- [ ] **Step 3: Verify the file is still syntactically valid**

Run: `node --check api/waitlist.js`
Expected: no output (success). If it prints a SyntaxError, the edit broke something.

- [ ] **Step 4: Verify build still passes**

Run: `npm run build`
Expected: build succeeds. (This only checks the Vite frontend; the API file isn't compiled by Vite, but the import graph from any frontend code that touches `api/` would surface here. None does.)

- [ ] **Step 5: Commit**

```bash
git add api/waitlist.js
git commit -m "feat(waitlist): accept neighborhood + mom_type, support snake_case keys"
```

---

## Task 4: Add `feedback_submissions` schema + extend `waitlist_signups` schema

Two SQL files: a brand-new schema for feedback, and an `ALTER TABLE` appended to the existing waitlist schema for the two new columns.

**Files:**
- Create: `supabase/feedback_schema.sql`
- Modify: `supabase/waitlist_schema.sql`

- [ ] **Step 1: Create `supabase/feedback_schema.sql`**

```sql
-- Feedback submissions from the /promo "Founding Moms" landing page.
-- Captures the 6-question feedback form: a 1-10 rating plus free-text
-- responses and a multi-value "useful features" checkbox set.
--
-- Apply via the Supabase SQL editor (or your migration tool of choice).

create extension if not exists pgcrypto;

create table if not exists public.feedback_submissions (
  id          uuid primary key default gen_random_uuid(),
  rating      smallint not null check (rating between 1 and 10),
  describe    text,
  useful      text[] not null default '{}',
  confusing   text,
  use_when    text,
  missing     text,
  name        text,
  source      text not null default 'promo',
  user_agent  text,
  referrer    text,
  created_at  timestamptz not null default now()
);

alter table public.feedback_submissions enable row level security;

create index if not exists feedback_submissions_created_at_idx
  on public.feedback_submissions (created_at desc);

create index if not exists feedback_submissions_rating_idx
  on public.feedback_submissions (rating);

comment on table public.feedback_submissions is
  'Qualitative feedback collected from the /promo Founding Moms landing page.';
```

- [ ] **Step 2: Append the `waitlist_signups` migration to its existing schema file**

Read the current `supabase/waitlist_schema.sql` first. After the existing `comment on table ...` line at the bottom, append:

```sql

-- 2026-05-07 — additions for the /promo Founding Moms landing page.
-- Both columns are nullable; existing rows get NULL.
alter table public.waitlist_signups
  add column if not exists neighborhood text,
  add column if not exists mom_type text;
```

The leading blank line keeps the appended block visually separate from the original schema.

- [ ] **Step 3: Apply the SQL to Supabase**

This step is **manual**. The repo has no automated migration runner. Open the Supabase SQL Editor for the project (URL is in the user's Supabase dashboard) and run the new SQL:

1. Run the full contents of `supabase/feedback_schema.sql` once.
2. Run the appended `alter table public.waitlist_signups ...` block once.

Both use `if not exists` clauses, so re-running them is safe.

After running, verify:
- `select * from feedback_submissions limit 1;` — returns 0 rows but no error.
- `select neighborhood, mom_type from waitlist_signups limit 1;` — returns no error (column exists, value is NULL for existing rows).

If you cannot run SQL right now, this step can be deferred — but the feedback endpoint (Task 5) and the new waitlist columns (Task 3) won't write successfully until the schema is in place. Tasks 5–9 will still build and commit cleanly, but live data tests at Task 10 will fail until the SQL runs.

- [ ] **Step 4: Commit the schema files**

```bash
git add supabase/feedback_schema.sql supabase/waitlist_schema.sql
git commit -m "feat(db): feedback_submissions + waitlist neighborhood/mom_type"
```

---

## Task 5: Add `POST /api/feedback`

Public endpoint matching the `/api/waitlist` pattern: no auth, JSON body, service-role insert, fire-and-forget. Whitelists the `useful[]` enum values.

**Files:**
- Create: `api/feedback.js`

- [ ] **Step 1: Create `api/feedback.js`**

```js
// POST /api/feedback — receives feedback submissions from the /promo
// landing page's 6-question form. Inserts into Supabase
// `feedback_submissions` via service-role REST.
//
// Mirrors api/waitlist.js: no auth, JSON body, fire-and-forget.

const EMAIL_SAFE_USEFUL = new Set([
  'schedule', 'kid_age', 'match_pct', 'places', 'groups', 'verified',
]);

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

const cleanText = (value, maxLength) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

// Accept arrays or comma-separated strings; whitelist against the
// known enum values. Drops anything we don't recognize.
const cleanUseful = (value) => {
  const arr = Array.isArray(value)
    ? value
    : (typeof value === 'string' ? value.split(',') : []);
  const out = [];
  for (const v of arr) {
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (EMAIL_SAFE_USEFUL.has(t) && !out.includes(t)) out.push(t);
  }
  return out;
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 500, { error: 'Feedback backend is not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }

  const ratingRaw = body.rating;
  const ratingNum = typeof ratingRaw === 'number'
    ? ratingRaw
    : (typeof ratingRaw === 'string' ? Number(ratingRaw) : NaN);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 10) {
    return json(res, 400, { error: 'rating must be an integer 1-10' });
  }

  const name = cleanText(body.name, 80);
  if (!name) return json(res, 400, { error: 'name required' });

  const describe = cleanText(body.describe, 1000);
  if (!describe) return json(res, 400, { error: 'describe required' });

  const payload = {
    rating: ratingNum,
    describe,
    useful: cleanUseful(body.useful),
    confusing: cleanText(body.confusing, 2000),
    use_when: cleanText(body.use_when, 2000),
    missing: cleanText(body.missing, 2000),
    name,
    source: cleanText(body.source, 80) || 'promo',
    user_agent: cleanText(req.headers['user-agent'], 300),
    referrer: cleanText(req.headers.referer, 500),
  };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/feedback_submissions`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('[feedback] supabase insert failed', response.status, text);
      return json(res, 502, { error: `Supabase ${response.status}: ${text.slice(0, 200)}` });
    }

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error('[feedback] threw', e);
    return json(res, 500, { error: 'Could not save feedback' });
  }
}
```

- [ ] **Step 2: Sanity-check the file loads as a module**

Run: `node --check api/feedback.js`
Expected: no output (success).

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add api/feedback.js
git commit -m "feat(api): POST /api/feedback for /promo feedback submissions"
```

---

## Task 6: Add `GET /api/admin/feedback`

Admin-only read endpoint following the existing `api/admin/*` pattern.

**Files:**
- Create: `api/admin/feedback.js`

- [ ] **Step 1: Create `api/admin/feedback.js`**

```js
// GET /api/admin/feedback — returns all feedback_submissions for the admin dashboard.
// SECURITY: NO authentication. Add auth before exposing publicly.
import { json, supabaseCreds, sbHeaders } from '../_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  try {
    const url = `${creds.supabaseUrl}/rest/v1/feedback_submissions?select=*&order=created_at.desc&limit=5000`;
    const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
    }
    const rows = await r.json();
    return json(res, 200, { ok: true, count: rows.length, rows });
  } catch (e) {
    return json(res, 502, { error: e?.message || 'Could not reach Supabase' });
  }
}
```

This matches `api/admin/mom-profiles.js` byte-for-byte except for the table name and the comment header. The relative path `../_lib/supabase.js` is correct from `api/admin/feedback.js` (one level up to `api/`, then into `_lib/`).

- [ ] **Step 2: Sanity-check the file loads**

Run: `node -e "import('./api/admin/feedback.js').then(() => console.log('OK')).catch(e => console.error('FAIL', e.message))"`
Expected: `OK`.

- [ ] **Step 3: Verify build passes**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add api/admin/feedback.js
git commit -m "feat(api): GET /api/admin/feedback for admin dashboard"
```

---

## Task 7: Add the `FeedbackTab` component (defined but unused)

Defines the read-only Feedback tab as a top-level `const` in `src/AdminPage.jsx`. After this task the component compiles but isn't yet rendered anywhere — Task 8 wires it into the dashboard. Splitting the work this way keeps every intermediate commit's build green.

**Files:**
- Modify: `src/AdminPage.jsx`

- [ ] **Step 1: Add `Fragment` to the React import**

The current top-of-file React import (line 1):

```jsx
import { useEffect, useMemo, useState } from 'react';
```

Replace with:

```jsx
import { Fragment, useEffect, useMemo, useState } from 'react';
```

`Fragment` is needed because each table row maps to a pair of `<tr>` elements (the data row + the optional expansion row), and a `<Fragment>` wrapper is the cleanest way to return both from a single `.map()` callback without breaking `<tbody>` semantics.

- [ ] **Step 2: Add `MessageSquare` to the lucide-react imports**

The current import (lines 2-6):

```jsx
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff,
  Monitor, Smartphone, Zap, Trash2, ShieldAlert, Check as CheckIcon, Sprout, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
```

Replace with:

```jsx
import {
  BarChart3, Users, ListChecks, RefreshCw, Download, AlertTriangle, ShieldOff,
  Monitor, Smartphone, Zap, Trash2, ShieldAlert, Check as CheckIcon, Sprout, X,
  ChevronLeft, ChevronRight, MessageSquare,
} from 'lucide-react';
```

`MessageSquare` will be used by the tab nav in Task 8. Adding it now keeps both the icon import and the component definition in one commit; the icon is unused after this task but Vite/React don't warn on unused imports.

- [ ] **Step 3: Locate the insertion site for the component**

The new component goes immediately above the `// =====` divider for `// Quick Actions tab` (search for the comment `// Quick Actions tab — destructive operations live here`).

For reference: `MomProfilesTab` ends with its closing `};` and is followed by the photo lightbox component, then the `// Quick Actions tab` divider. We insert at the same level — top-level `const`, just above the Quick Actions divider.

- [ ] **Step 4: Insert the `FeedbackTab` component**

Insert the following block immediately above the `// =====` divider that introduces `// Quick Actions tab`:

```jsx
// ============================================================================
// Feedback tab — qualitative responses from the /promo Founding Moms page.
// Read-only. Renders an NPS-style stat strip + charts + a searchable,
// expandable, exportable raw table.
// ============================================================================

// Friendly labels for the useful[] enum values stored in the DB.
const USEFUL_LABELS = {
  schedule:  'Free at the same times',
  kid_age:   'Kids same age',
  match_pct: 'Match percentage',
  places:    'Suggested places',
  groups:    'Group meet-ups',
  verified:  'Verified profiles',
};

const FeedbackTab = ({ rows }) => {
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.name, r.describe, r.confusing, r.use_when, r.missing]
        .some(v => (v || '').toString().toLowerCase().includes(q))
    );
  }, [rows, query]);

  // NPS-style buckets (industry: NPS uses 0-10; we use 1-10, same bands).
  const promoters  = rows.filter(r => r.rating >= 9).length;
  const passives   = rows.filter(r => r.rating >= 7 && r.rating <= 8).length;
  const detractors = rows.filter(r => r.rating <= 6).length;

  const avgRating = rows.length
    ? (rows.reduce((sum, r) => sum + (r.rating || 0), 0) / rows.length)
    : 0;

  // Rating distribution split into 3 bands so each renders with its own color.
  const ratingItems = (lo, hi) => {
    const out = [];
    for (let i = lo; i <= hi; i++) {
      out.push([String(i), rows.filter(r => r.rating === i).length]);
    }
    return out;
  };
  const detractorBars = ratingItems(1, 6);
  const passiveBars   = ratingItems(7, 8);
  const promoterBars  = ratingItems(9, 10);

  // Useful-features tally — friendly labels, fallback to raw key if unknown.
  const usefulRaw = tally(rows, r => r.useful || []);
  const usefulItems = usefulRaw.map(([k, n]) => [USEFUL_LABELS[k] || k, n]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total feedback" value={fmt(rows.length)}/>
        <Stat label="Average rating" value={rows.length ? avgRating.toFixed(1) : '—'} hint="out of 10"/>
        <Stat label="Promoters" value={fmt(promoters)} hint={`${pct(promoters, rows.length)} rated 9–10`}/>
        <Stat label="Detractors" value={fmt(detractors)} hint={`${pct(detractors, rows.length)} rated 1–6`}/>
      </div>

      <SectionTitle hint="last 30 days">Daily submissions</SectionTitle>
      <DailyTrend rows={rows} color={C.terracotta}/>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        <Card>
          <SectionTitle hint="1–10 split into NPS bands">Rating distribution</SectionTitle>
          <div className="space-y-3">
            <div>
              <div className="text-[10.5px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.terracotta, fontFamily: 'Albert Sans', fontWeight: 700 }}>
                Detractors · {fmt(detractors)} ({pct(detractors, rows.length)})
              </div>
              <BarList items={detractorBars} total={rows.length} color={C.terracotta}/>
            </div>
            <div>
              <div className="text-[10.5px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.inkSoft, fontFamily: 'Albert Sans', fontWeight: 700 }}>
                Passives · {fmt(passives)} ({pct(passives, rows.length)})
              </div>
              <BarList items={passiveBars} total={rows.length} color={C.ink}/>
            </div>
            <div>
              <div className="text-[10.5px] tracking-[.16em] uppercase mb-1.5" style={{ color: C.sageDark, fontFamily: 'Albert Sans', fontWeight: 700 }}>
                Promoters · {fmt(promoters)} ({pct(promoters, rows.length)})
              </div>
              <BarList items={promoterBars} total={rows.length} color={C.sageDark}/>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle hint="up to 2 picks per response">Most useful features</SectionTitle>
          <BarList items={usefulItems} total={rows.length} color={C.saffron}/>
        </Card>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name / describe / confusing / use when / missing…"
          className="flex-1 rounded-xl px-3 py-2 outline-none text-[13px]"
          style={{ background: C.paper, border: `1px solid ${C.divider}`, color: C.ink, fontFamily: 'Albert Sans' }}/>
        <button onClick={() => downloadCsv(`gomama-feedback-${new Date().toISOString().slice(0, 10)}.csv`, filtered)}
          className="rounded-xl px-3 py-2 flex items-center gap-1.5"
          style={{ background: C.ink, color: C.cream, fontFamily: 'Albert Sans', fontWeight: 600, fontSize: 12 }}>
          <Download size={14}/> Export CSV ({filtered.length})
        </button>
      </div>

      <Card padding={0}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontFamily: 'Albert Sans', fontSize: 12.5, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead style={{ background: C.creamSoft }}>
              <tr>
                {['Name', 'Rating', 'Describe', 'Useful', 'Confusing', 'Use when', 'Missing', 'Submitted'].map(h => (
                  <th key={h} className="text-left px-3 py-2" style={{
                    color: C.inkSoft, fontWeight: 700, letterSpacing: '.04em',
                    textTransform: 'uppercase', fontSize: 10.5, whiteSpace: 'nowrap',
                    position: 'sticky', top: 0, background: C.creamSoft,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 500).map(r => {
                const isExpanded = expandedId === r.id;
                const ratingColor = r.rating >= 9 ? C.sageDark : (r.rating <= 6 ? C.terracotta : C.ink);
                const truncate = (s, n = 60) => {
                  if (!s) return '—';
                  return s.length > n ? `${s.slice(0, n)}…` : s;
                };
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="cursor-pointer transition-colors hover:bg-[var(--fb-row-hover)]"
                      style={{ borderTop: `1px solid ${C.divider}`, ['--fb-row-hover']: C.creamSoft }}
                    >
                      <td className="px-3 py-2" style={{ color: C.ink, whiteSpace: 'nowrap', fontWeight: 600 }}>
                        {r.name || '—'}
                      </td>
                      <td className="px-3 py-2" style={{ color: ratingColor, fontWeight: 700 }}>
                        {r.rating}
                      </td>
                      <td className="px-3 py-2" style={{ color: C.ink, maxWidth: 260 }} title={r.describe || ''}>
                        {truncate(r.describe)}
                      </td>
                      <td className="px-3 py-2" style={{ whiteSpace: 'nowrap' }}>
                        {(r.useful || []).length === 0 ? (
                          <span style={{ color: C.inkMuted }}>—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.useful.map((k, i) => (
                              <span key={`${k}-${i}`}
                                className="rounded-full px-2 py-0.5 text-[10.5px]"
                                style={{ background: C.creamSoft, color: C.ink, fontFamily: 'Albert Sans' }}
                              >
                                {USEFUL_LABELS[k] || k}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2" style={{ color: C.inkSoft, maxWidth: 220 }} title={r.confusing || ''}>
                        {truncate(r.confusing)}
                      </td>
                      <td className="px-3 py-2" style={{ color: C.inkSoft, maxWidth: 220 }} title={r.use_when || ''}>
                        {truncate(r.use_when)}
                      </td>
                      <td className="px-3 py-2" style={{ color: C.inkSoft, maxWidth: 220 }} title={r.missing || ''}>
                        {truncate(r.missing)}
                      </td>
                      <td className="px-3 py-2" style={{ color: C.inkMuted, whiteSpace: 'nowrap' }}>
                        {rel(r.created_at)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: C.creamSoft }}>
                        <td colSpan={8} className="px-3 py-3" style={{ borderTop: `1px solid ${C.divider}` }}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]" style={{ fontFamily: 'Albert Sans' }}>
                            {[
                              { label: 'Describe',  value: r.describe },
                              { label: 'Confusing', value: r.confusing },
                              { label: 'Use when',  value: r.use_when },
                              { label: 'Missing',   value: r.missing },
                            ].map(f => (
                              <div key={f.label}>
                                <div className="text-[10.5px] tracking-[.16em] uppercase mb-1" style={{ color: C.inkSoft, fontWeight: 700 }}>
                                  {f.label}
                                </div>
                                <div style={{ color: f.value ? C.ink : C.inkMuted, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                                  {f.value || '—'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-6 text-center" style={{ color: C.inkMuted, fontFamily: 'Albert Sans' }}>
                  {rows.length === 0 ? 'No feedback yet. Submissions from /promo will appear here.' : 'No feedback matches that search.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 500 && (
          <div className="px-3 py-2 border-t text-[11.5px]" style={{ borderColor: C.divider, color: C.inkMuted, fontFamily: 'Albert Sans' }}>
            Showing 500 of {fmt(filtered.length)}. Use Export CSV for the full set.
          </div>
        )}
      </Card>
    </div>
  );
};
```

The component uses the existing `Stat`, `Card`, `SectionTitle`, `BarList`, `DailyTrend`, `tally`, `downloadCsv`, `rel`, `fmt`, `pct` helpers (all defined earlier in the same file) and the `C` token export.

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: build **succeeds**. The new `FeedbackTab` and `MessageSquare` import are unused at this point — that's intentional and not a warning. Task 8 wires them up.

- [ ] **Step 6: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): FeedbackTab component — NPS stats, charts, expandable list"
```

---

## Task 8: Wire `FeedbackTab` into the dashboard

`AdminPage` needs a 6th `useState` for `feedback`, a 6th `Promise.all` fetch in `load()`, an updated loading guard, a new tab entry in the sub-nav, and a new tab routing line. The `FeedbackTab` component already exists from Task 7 — this task just consumes it.

**Files:**
- Modify: `src/AdminPage.jsx`

- [ ] **Step 1: Add `feedback` to the state hooks**

The current state block (around line 1457):

```jsx
  const [tab, setTab] = useState('overview');
  const [moms, setMoms] = useState(null);
  const [waitlist, setWaitlist] = useState(null);
  const [momProfiles, setMomProfiles] = useState(null);
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
```

Replace with (one new line, between `places` and `error`):

```jsx
  const [tab, setTab] = useState('overview');
  const [moms, setMoms] = useState(null);
  const [waitlist, setWaitlist] = useState(null);
  const [momProfiles, setMomProfiles] = useState(null);
  const [places, setPlaces] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
```

- [ ] **Step 2: Extend the `load()` `Promise.all`**

The current Promise.all destructures 4 values:

```jsx
      const [a, b, c, d] = await Promise.all([
        fetchEndpoint('/api/admin/onboarding',   'Onboarding'),
        fetchEndpoint('/api/admin/waitlist',     'Waitlist'),
        fetchEndpoint('/api/admin/mom-profiles', 'Mom profiles'),
        fetchEndpoint('/api/admin/places',       'Places'),
      ]);
      setMoms(a.rows || []);
      setWaitlist(b.rows || []);
      setMomProfiles(c.rows || []);
      setPlaces(d.rows || []);
```

Replace with:

```jsx
      const [a, b, c, d, e] = await Promise.all([
        fetchEndpoint('/api/admin/onboarding',   'Onboarding'),
        fetchEndpoint('/api/admin/waitlist',     'Waitlist'),
        fetchEndpoint('/api/admin/mom-profiles', 'Mom profiles'),
        fetchEndpoint('/api/admin/places',       'Places'),
        fetchEndpoint('/api/admin/feedback',     'Feedback'),
      ]);
      setMoms(a.rows || []);
      setWaitlist(b.rows || []);
      setMomProfiles(c.rows || []);
      setPlaces(d.rows || []);
      setFeedback(e.rows || []);
```

- [ ] **Step 3: Update the loading guard**

Current line (around 1593):

```jsx
        {!moms || !waitlist || !momProfiles || !places ? (
```

Replace with:

```jsx
        {!moms || !waitlist || !momProfiles || !places || !feedback ? (
```

- [ ] **Step 4: Insert the `feedback` tab into the tab list**

The current list (lines 1549-1553):

```jsx
            { id: 'overview',     icon: BarChart3,  label: 'Overview' },
            { id: 'onboarding',   icon: ListChecks, label: 'Onboarding' },
            { id: 'mom-profiles', icon: Users,      label: 'Mom profiles' },
            { id: 'waitlist',     icon: ListChecks, label: 'Waitlist' },
            { id: 'actions',      icon: Zap,        label: 'Quick Actions' },
```

Replace with (insert one new entry between `waitlist` and `actions`):

```jsx
            { id: 'overview',     icon: BarChart3,     label: 'Overview' },
            { id: 'onboarding',   icon: ListChecks,    label: 'Onboarding' },
            { id: 'mom-profiles', icon: Users,         label: 'Mom profiles' },
            { id: 'waitlist',     icon: ListChecks,    label: 'Waitlist' },
            { id: 'feedback',     icon: MessageSquare, label: 'Feedback' },
            { id: 'actions',      icon: Zap,           label: 'Quick Actions' },
```

(Whitespace alignment widened to keep the table readable. The semantic change is one new entry.)

- [ ] **Step 5: Insert the tab routing line**

The current routing block (lines 1603-1607):

```jsx
            {tab === 'overview'     && <Overview moms={moms} waitlist={waitlist}/>}
            {tab === 'onboarding'   && <MomsReport rows={moms} momProfiles={momProfiles}/>}
            {tab === 'mom-profiles' && <MomProfilesTab rows={momProfiles} places={places || []} onPatch={(updated) => setMomProfiles(prev => prev.map(r => r.id === updated.id ? updated : r))}/>}
            {tab === 'waitlist'     && <WaitlistTable rows={waitlist}/>}
            {tab === 'actions'      && <QuickActions onReset={load} momsCount={moms.length} waitlistCount={waitlist.length}/>}
```

Replace with (one line added between `waitlist` and `actions`):

```jsx
            {tab === 'overview'     && <Overview moms={moms} waitlist={waitlist}/>}
            {tab === 'onboarding'   && <MomsReport rows={moms} momProfiles={momProfiles}/>}
            {tab === 'mom-profiles' && <MomProfilesTab rows={momProfiles} places={places || []} onPatch={(updated) => setMomProfiles(prev => prev.map(r => r.id === updated.id ? updated : r))}/>}
            {tab === 'waitlist'     && <WaitlistTable rows={waitlist}/>}
            {tab === 'feedback'     && <FeedbackTab rows={feedback}/>}
            {tab === 'actions'      && <QuickActions onReset={load} momsCount={moms.length} waitlistCount={waitlist.length}/>}
```

- [ ] **Step 6: Verify build passes**

Run: `npm run build`
Expected: build succeeds. `FeedbackTab` and `MessageSquare` are now consumed.

- [ ] **Step 7: Manual smoke check**

Run: `npm run dev`. Visit `http://localhost:5173/#admin`. Click the new "Feedback" tab in the sub-nav. Under `npm run dev` real Supabase data won't load (API routes don't run), but the empty-state path should render cleanly: muted "No feedback yet" message in the table, all stat cards show "—" or "0", charts show "No data yet."

Console should be free of new errors.

- [ ] **Step 8: Commit**

```bash
git add src/AdminPage.jsx
git commit -m "feat(admin): wire feedback fetch + tab nav"
```

---

## Task 9: Final QA pass

End-to-end verification against a deployed Vercel preview where the new endpoints actually run and the new schema exists.

This task has no code changes unless QA reveals deviations.

- [ ] **Step 1: Deploy a preview**

Push the branch to the Vercel-connected repo. Wait for the preview build to succeed.

- [ ] **Step 2: Verify the SQL is applied**

In Supabase SQL Editor, run:

```sql
select column_name from information_schema.columns
  where table_name = 'feedback_submissions';
```

Expected: returns rows for `id`, `rating`, `describe`, `useful`, `confusing`, `use_when`, `missing`, `name`, `source`, `user_agent`, `referrer`, `created_at`. If empty, run `supabase/feedback_schema.sql`.

```sql
select column_name from information_schema.columns
  where table_name = 'waitlist_signups'
    and column_name in ('neighborhood', 'mom_type');
```

Expected: returns 2 rows. If empty, run the appended block from `supabase/waitlist_schema.sql`.

- [ ] **Step 3: Verify `/promo` loads**

Visit `https://<preview-url>/promo`. Expected:
- Dark theme, animations play, "0 of 50" counter ticks up to 12.
- Hero, perks grid, 3-step process, signup form, prototype card, feedback form, footer all render.
- Inspect element on the signup form: `action="/api/waitlist"`, two hidden inputs (`source=promo`, `audience=founding-tampa`).
- Inspect element on the feedback form: `action="/api/feedback"`.
- Prototype CTA: `href="/live"`.

- [ ] **Step 4: Submit a real signup**

Use a fresh email address. Fill out the signup form. Submit.

Expected:
- Form hides, green success message ("✓ You're in") slides in.
- A row appears in Supabase `waitlist_signups` with: `email` set, `first_name` set, `neighborhood` set, `mom_type` set, `audience='founding-tampa'`, `source='promo'`, `user_agent` populated, `referrer` populated.
- A confirmation email arrives at the test address (Resend should fire — same as the existing waitlist flow).

Submit the same form again with the same email. Expected: success message still shows (the API returns `{ ok: true, duplicate: true }`). No second confirmation email.

- [ ] **Step 5: Submit real feedback**

Fill out the feedback form: pick a rating, fill all required fields (`describe`, `name`), check 1–2 useful boxes, fill at least one of the optional textareas. Submit.

Expected:
- Form hides, "✓ Thank you" success message appears.
- A row appears in Supabase `feedback_submissions` with: `rating` set, `useful` array containing the picked enum values, all text fields set, `source='promo'`.

Try submitting the form with `rating` empty. Expected: browser-level "Please select one" tooltip blocks submit.

Try submitting via DevTools console with an invalid rating:

```js
fetch('/api/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rating: 99, describe: 'x', name: 'y' })
}).then(r => r.json()).then(console.log);
```

Expected: `{ error: 'rating must be an integer 1-10' }`.

Try with an unknown `useful[]` value:

```js
fetch('/api/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rating: 5, describe: 'x', name: 'y', useful: ['schedule', 'BOGUS'] })
}).then(r => r.json()).then(console.log);
```

Expected: `{ ok: true }`. The DB row's `useful` should be `["schedule"]` only — `BOGUS` was silently dropped.

- [ ] **Step 6: Verify the admin Feedback tab**

Visit `/admin` (or `/#admin`) on the preview. Click the Feedback tab.

Expected:
- Four stat cards show non-zero values once the test submissions have landed.
- Daily-submissions chart shows a bar for today.
- Rating distribution shows three bands (Detractors / Passives / Promoters) with a bar in whichever band the test ratings fell into.
- "Most useful features" chart shows whichever features were checked.
- The raw table shows the test submissions, name + rating + truncated text columns.
- Click a row → expands inline showing all four free-text fields in full.
- Type a search term in the input → table filters to matching rows.
- Click "Export CSV" → downloads `gomama-feedback-YYYY-MM-DD.csv` with all rows and all columns.

- [ ] **Step 7: Verify empty states still work**

(Skip this if the preview already has feedback data.) Truncate the table or filter to a no-match search:

- Empty `feedback_submissions`: stats all show 0, charts show "No data yet.", table shows "No feedback yet. Submissions from /promo will appear here."
- Search that matches nothing: table shows "No feedback matches that search."

- [ ] **Step 8: Verify no regressions on other admin tabs**

Click each of the other tabs (Overview, Onboarding, Mom profiles, Waitlist, Quick Actions). Each should work as before. Particularly verify:
- Waitlist tab now shows the test signup with the new fields populated where relevant.
- The mom-profile detail modal still opens, photo lightbox still works (these landed earlier in the branch's lineage).

- [ ] **Step 9: No commit unless code changed**

If everything passes, this task is verification only. If a deviation appears, fix inline with a focused commit, then re-run the failing scenario.

---

## File summary

After all tasks complete:

| File | Action | Purpose |
|---|---|---|
| `public/promo.html` | Add | Static landing page, ~896 lines, artifact verbatim with surgical wiring edits |
| `vercel.json` | Modify | +1 rewrite for `/promo` |
| `api/waitlist.js` | Modify | +2 fields (`neighborhood`, `mom_type`), accept snake_case keys |
| `api/feedback.js` | Add | Public POST endpoint (~100 lines) |
| `api/admin/feedback.js` | Add | Admin GET endpoint (~25 lines) |
| `supabase/feedback_schema.sql` | Add | New table |
| `supabase/waitlist_schema.sql` | Modify | +2 columns at the bottom |
| `src/AdminPage.jsx` | Modify | +1 state, +1 fetch, +1 tab entry, +1 routing line, +1 lucide icon, +`Fragment` import, +`FeedbackTab` component |
| `docs/superpowers/specs/2026-05-07-promo-landing-and-feedback-design.md` | (already committed) | Spec |
| `docs/superpowers/plans/2026-05-07-promo-landing-and-feedback.md` | (this file) | Plan |

No new dependencies, no new third-party services, no new auth surfaces.
