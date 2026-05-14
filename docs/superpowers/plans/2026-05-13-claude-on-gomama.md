# Claude on gomama.app Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an authenticated `/builder` chat on gomama.app that prompts Claude (via GitHub Actions) to make code changes, committing each prompt to `release-latest`, tagging `release-{N}`, and auto-deploying via Vercel; plus a `/live` route that lists tagged versions and links to their preview URLs.

**Architecture:** Three layers, all on existing infra. Frontend chat & version picker on Vercel. Thin Vercel functions for auth + workflow dispatch + webhook receipt + version listing. GitHub Actions workflow runs `anthropics/claude-code-action` headlessly, commits to `release-latest`, tags `release-{N}`, pushes (which triggers Vercel auto-deploy), and streams progress back via HMAC-signed webhooks that land in a Supabase `builder_events` table the chat UI subscribes to via Realtime.

**Tech Stack:** Vite + React 18 (existing), Vercel serverless functions (existing), Supabase Postgres + Auth + Realtime (existing), GitHub Actions (`anthropics/claude-code-action`), Node `node:crypto` for HMAC, `node --test` for pure-function unit tests (no new test framework).

**Spec:** `docs/superpowers/specs/2026-05-13-claude-on-gomama-design.md`

---

## File map

| Path | Action | Responsibility |
|---|---|---|
| `supabase/builder_schema.sql` | CREATE | `builder_sessions` + `builder_events` tables + RLS + indexes |
| `api/_lib/builderHmac.js` | CREATE | `sign(body, secret)` + `verify(body, sig, secret)` — pure, testable |
| `api/_lib/builderHmac.test.mjs` | CREATE | Unit tests via `node --test` |
| `api/_lib/builderAuth.js` | CREATE | `verifyJwt(req)` (calls Supabase Auth REST) + `isAllowlisted(email)` |
| `api/_lib/builderAuth.test.mjs` | CREATE | Unit tests for the allowlist parser |
| `api/_lib/githubDispatch.js` | CREATE | `dispatchClaudeBuilder({prompt, sessionId, mode, historyB64})` |
| `api/_lib/vercelDeployments.js` | CREATE | `findDeployForSha(sha)` |
| `api/builder/webhook.js` | CREATE | `POST` — HMAC-verify and insert event into `builder_events` |
| `api/builder/sessions.js` | CREATE | `GET` — list caller's sessions or hydrate one by `id` |
| `api/builder/prompt.js` | CREATE | `POST` — auth + insert prompt event + dispatch workflow |
| `api/live/versions.js` | CREATE | `GET` — list `release-*` tags joined with Vercel deploy URLs (30s cache) |
| `.github/workflows/claude-builder.yml` | CREATE | The `workflow_dispatch` worker; builder-system guard included |
| `src/lib/builderClient.js` | CREATE | Browser helpers: `sendPrompt`, `subscribeEvents`, `listSessions` |
| `src/screens/Builder/index.jsx` | CREATE | Shell page; auth gate + layout |
| `src/screens/Builder/ChatPane.jsx` | CREATE | Message list + input |
| `src/screens/Builder/EventBubble.jsx` | CREATE | Renders one `builder_events` row |
| `src/screens/Builder/SessionToolbar.jsx` | CREATE | New / Continue toggle / release-N indicator / preview link |
| `src/screens/Live/index.jsx` | CREATE | `/live` version picker dropdown |
| `src/App.jsx` | MODIFY | Add `/builder` and rewire `/live` route |
| `vercel.json` | MODIFY | Add `/builder` rewrite |
| `.env.example` | MODIFY (or CREATE) | Document new env vars |
| `README.md` | MODIFY | One section: "How the in-browser builder works" |

**No new npm deps.** Everything uses Node stdlib + existing `@supabase/supabase-js` (already in `dependencies`).

---

## Env vars summary (for reference while building)

**Vercel (set via Vercel dashboard or `vercel env add`):**
- `BUILDER_ALLOWED_EMAILS` — comma-separated, e.g. `you@example.com,analyst@example.com`
- `BUILDER_WEBHOOK_SECRET` — random 32+ byte hex (see Task 1 for generator)
- `GITHUB_TOKEN_BUILDER` — fine-grained PAT, scopes: `contents:write`, `actions:write`, `metadata:read` on this repo only
- `GITHUB_REPO` — `michaelhannajpm-lgtm/mama-app` (owner/repo)
- `VERCEL_API_TOKEN` — read-only token from Vercel dashboard
- `VERCEL_PROJECT_ID` — from `.vercel/project.json` (already present in repo)
- (Already set) `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

**GitHub Secrets (repo settings → Secrets and variables → Actions):**
- `ANTHROPIC_API_KEY` — never leaves GitHub
- `BUILDER_WEBHOOK_SECRET` — same value as Vercel's
- `BUILDER_WEBHOOK_URL` — `https://gomama.app/api/builder/webhook`

---

# Tasks

## Task 1: Supabase schema + RLS

**Files:**
- Create: `supabase/builder_schema.sql`

- [ ] **Step 1: Generate the webhook secret you'll need later, save it now**

Run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output. You'll paste it into Vercel env and GitHub Secrets as `BUILDER_WEBHOOK_SECRET` in Task 13.

- [ ] **Step 2: Create `supabase/builder_schema.sql`**

```sql
-- builder_sessions: one row per chat session
create table if not exists builder_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by_email text not null,
  mode text not null check (mode in ('continue','fresh')) default 'continue',
  status text not null check (status in ('idle','running','error','done')) default 'idle',
  last_release_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists builder_sessions_owner_created
  on builder_sessions (created_by_email, created_at desc);

-- builder_events: append-only event log per session
create table if not exists builder_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references builder_sessions(id) on delete cascade,
  ts timestamptz not null default now(),
  kind text not null check (kind in
    ('prompt','log','file_edit','commit','tag','deploy','error','done','status')),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists builder_events_session_ts
  on builder_events (session_id, ts);

-- Touch the parent session whenever an event lands, so /builder lists can sort by activity.
create or replace function builder_touch_session() returns trigger as $$
begin
  update builder_sessions
     set updated_at = now(),
         status = case
           when new.kind = 'done' then 'done'
           when new.kind = 'error' then 'error'
           when new.kind in ('prompt','log','file_edit','commit','tag','deploy','status') then 'running'
           else status
         end,
         last_release_tag = coalesce(new.payload->>'tag', last_release_tag)
   where id = new.session_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists builder_events_touch on builder_events;
create trigger builder_events_touch
  after insert on builder_events
  for each row execute function builder_touch_session();

-- RLS: authenticated users may only see their own sessions/events.
-- All writes go through service_role (Vercel functions), which bypasses RLS.
alter table builder_sessions enable row level security;
alter table builder_events   enable row level security;

drop policy if exists builder_sessions_self_select on builder_sessions;
create policy builder_sessions_self_select on builder_sessions
  for select to authenticated
  using (created_by_email = auth.jwt() ->> 'email');

drop policy if exists builder_events_self_select on builder_events;
create policy builder_events_self_select on builder_events
  for select to authenticated
  using (
    exists (
      select 1 from builder_sessions s
      where s.id = builder_events.session_id
        and s.created_by_email = auth.jwt() ->> 'email'
    )
  );

-- Enable Realtime publication so the browser can subscribe via supabase-js Realtime.
alter publication supabase_realtime add table builder_events;
```

- [ ] **Step 3: Apply the migration**

Two ways depending on how this project applies SQL:

- If you have the Supabase CLI configured: `supabase db push` (or `supabase db reset` if you're in a fresh local DB).
- Otherwise: open the Supabase dashboard → SQL editor → paste the file contents → run.

- [ ] **Step 4: Verify the tables exist**

In the Supabase SQL editor, run:
```sql
select table_name from information_schema.tables
 where table_schema = 'public' and table_name like 'builder_%';
```
Expected: two rows — `builder_sessions`, `builder_events`.

Run:
```sql
select tablename, policyname from pg_policies where tablename like 'builder_%';
```
Expected: at least two rows — `builder_sessions_self_select`, `builder_events_self_select`.

- [ ] **Step 5: Commit**

```bash
git add supabase/builder_schema.sql
git commit -m "feat(builder): schema for sessions + events with RLS and realtime"
```

---

## Task 2: HMAC helper + unit tests

**Files:**
- Create: `api/_lib/builderHmac.js`
- Create: `api/_lib/builderHmac.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `api/_lib/builderHmac.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from './builderHmac.js';

const SECRET = 'unit-test-secret-not-real';

test('sign produces a hex string of expected length (sha256 = 64 chars)', () => {
  const sig = sign('hello', SECRET);
  assert.equal(typeof sig, 'string');
  assert.equal(sig.length, 64);
  assert.match(sig, /^[0-9a-f]{64}$/);
});

test('verify returns true for a signature produced by sign', () => {
  const body = JSON.stringify({ kind: 'log', payload: { line: 'hi' } });
  const sig = sign(body, SECRET);
  assert.equal(verify(body, sig, SECRET), true);
});

test('verify returns false for a bad signature', () => {
  assert.equal(verify('hello', 'a'.repeat(64), SECRET), false);
});

test('verify returns false when the body is tampered with', () => {
  const body = '{"x":1}';
  const sig = sign(body, SECRET);
  assert.equal(verify('{"x":2}', sig, SECRET), false);
});

test('verify returns false on missing/invalid input', () => {
  assert.equal(verify('hello', '', SECRET), false);
  assert.equal(verify('hello', null, SECRET), false);
  assert.equal(verify('hello', 'abc', SECRET), false); // wrong length
});

test('verify uses constant-time comparison (length-mismatched sig returns false without throwing)', () => {
  // crypto.timingSafeEqual throws on length mismatch; verify() must guard against it.
  assert.doesNotThrow(() => verify('hello', 'abcd', SECRET));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test api/_lib/builderHmac.test.mjs`
Expected: FAIL with `Cannot find module './builderHmac.js'` or similar.

- [ ] **Step 3: Implement the helper**

Create `api/_lib/builderHmac.js`:

```js
// HMAC-SHA256 sign/verify for the builder webhook.
// Constant-time compare, length-guarded so a bad client can't crash us.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const sign = (body, secret) =>
  createHmac('sha256', secret).update(body, 'utf8').digest('hex');

export const verify = (body, sigHex, secret) => {
  if (typeof sigHex !== 'string' || sigHex.length !== 64) return false;
  const expected = sign(body, secret);
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sigHex, 'hex'));
  } catch {
    return false;
  }
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test api/_lib/builderHmac.test.mjs`
Expected: PASS, all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/builderHmac.js api/_lib/builderHmac.test.mjs
git commit -m "feat(builder): HMAC sign/verify helper with unit tests"
```

---

## Task 3: Auth + allowlist helper + unit tests

**Files:**
- Create: `api/_lib/builderAuth.js`
- Create: `api/_lib/builderAuth.test.mjs`

- [ ] **Step 1: Write the failing tests for the pure allowlist parser**

Create `api/_lib/builderAuth.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAllowlist, isAllowlisted } from './builderAuth.js';

test('parseAllowlist splits comma-separated emails and lowercases them', () => {
  assert.deepEqual(
    parseAllowlist('You@Example.com, analyst@example.com'),
    ['you@example.com', 'analyst@example.com']
  );
});

test('parseAllowlist drops empty entries and trims whitespace', () => {
  assert.deepEqual(parseAllowlist(' a@x.com ,, , b@y.com,'), ['a@x.com', 'b@y.com']);
});

test('parseAllowlist returns [] for empty/missing input', () => {
  assert.deepEqual(parseAllowlist(''), []);
  assert.deepEqual(parseAllowlist(undefined), []);
  assert.deepEqual(parseAllowlist(null), []);
});

test('isAllowlisted is case-insensitive on input email', () => {
  const list = parseAllowlist('a@x.com,b@y.com');
  assert.equal(isAllowlisted('A@X.COM', list), true);
  assert.equal(isAllowlisted('b@y.com', list), true);
  assert.equal(isAllowlisted('c@z.com', list), false);
});

test('isAllowlisted returns false for empty allowlist (fail-closed)', () => {
  assert.equal(isAllowlisted('a@x.com', []), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test api/_lib/builderAuth.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `api/_lib/builderAuth.js`:

```js
// Auth helpers for builder endpoints.
// - verifyJwt: calls Supabase /auth/v1/user with the caller's JWT; returns the user or null.
// - parseAllowlist / isAllowlisted: env-var-driven email allowlist (pure, tested).
// - requireBuilder: convenience wrapper used by API routes.
import { json } from './supabase.js';

export const parseAllowlist = (raw) =>
  (typeof raw === 'string' ? raw : '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const isAllowlisted = (email, list) => {
  if (!email || !Array.isArray(list) || list.length === 0) return false;
  return list.includes(String(email).toLowerCase());
};

const extractJwt = (req) => {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== 'string') return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
};

export const verifyJwt = async (req) => {
  const jwt = extractJwt(req);
  if (!jwt) return null;
  const url = process.env.SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const r = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${jwt}` },
  });
  if (!r.ok) return null;
  const user = await r.json().catch(() => null);
  if (!user?.email) return null;
  return user;
};

// One-shot guard. Returns the user, or null after responding with an error.
export const requireBuilder = async (req, res) => {
  const user = await verifyJwt(req);
  if (!user) { json(res, 401, { error: 'Not signed in' }); return null; }
  const allowlist = parseAllowlist(process.env.BUILDER_ALLOWED_EMAILS);
  if (!isAllowlisted(user.email, allowlist)) {
    json(res, 403, { error: 'Email not on builder allowlist' });
    return null;
  }
  return user;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test api/_lib/builderAuth.test.mjs`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add api/_lib/builderAuth.js api/_lib/builderAuth.test.mjs
git commit -m "feat(builder): auth + email allowlist helper with unit tests"
```

---

## Task 4: Webhook endpoint

**Files:**
- Create: `api/builder/webhook.js`

- [ ] **Step 1: Implement the endpoint**

Create `api/builder/webhook.js`:

```js
// POST /api/builder/webhook
// Receives progress events from the GitHub Action. HMAC-signed body.
// Inserts a row into builder_events. Idempotent on (session_id, payload.event_id) if event_id provided.
import { json, supabaseCreds, sbHeaders, readJsonBody, isUuid } from '../_lib/supabase.js';
import { verify } from '../_lib/builderHmac.js';

const ALLOWED_KINDS = new Set([
  'prompt','log','file_edit','commit','tag','deploy','error','done','status',
]);

const readRawBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const secret = process.env.BUILDER_WEBHOOK_SECRET;
  if (!secret) return json(res, 500, { error: 'BUILDER_WEBHOOK_SECRET not set' });

  // We need the raw body for HMAC. Vercel parses JSON automatically only when
  // req.body is consumed; this endpoint reads the stream itself.
  const raw = await readRawBody(req).catch(() => '');
  const sig = req.headers['x-builder-signature'];
  if (!verify(raw, sig, secret)) return json(res, 401, { error: 'Bad signature' });

  let body;
  try { body = JSON.parse(raw); } catch { return json(res, 400, { error: 'Invalid JSON' }); }

  const { session_id, kind, payload } = body || {};
  if (!isUuid(session_id)) return json(res, 400, { error: 'Bad session_id' });
  if (!ALLOWED_KINDS.has(kind)) return json(res, 400, { error: 'Bad kind' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const insertUrl = `${creds.supabaseUrl}/rest/v1/builder_events`;
  const r = await fetch(insertUrl, {
    method: 'POST',
    headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=representation' },
    body: JSON.stringify({ session_id, kind, payload: payload ?? {} }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return json(res, 502, { error: `Supabase ${r.status}: ${text.slice(0, 200)}` });
  }
  const rows = await r.json().catch(() => []);
  return json(res, 201, { ok: true, event: rows?.[0] || null });
}
```

- [ ] **Step 2: Smoke test locally with curl**

In one terminal: `npm run dev` (or `vercel dev` if you use it). In another, with the secret you generated in Task 1 step 1 exported as `S`:

```bash
S="<the secret you generated>"
SESSION="00000000-0000-0000-0000-000000000000"   # not a real row — endpoint will get a 502, that's fine
BODY="{\"session_id\":\"$SESSION\",\"kind\":\"log\",\"payload\":{\"line\":\"hello\"}}"
SIG=$(node -e "const c=require('crypto');console.log(c.createHmac('sha256',process.argv[1]).update(process.argv[2]).digest('hex'))" "$S" "$BODY")
curl -sS -X POST http://localhost:3000/api/builder/webhook \
  -H "content-type: application/json" \
  -H "x-builder-signature: $SIG" \
  --data "$BODY" | jq
```

Expected: status 502 with a Supabase error (the session doesn't exist yet — that's OK, it proves HMAC passed). If you get 401, your secret is wrong. If 400, your payload is malformed.

- [ ] **Step 3: Commit**

```bash
git add api/builder/webhook.js
git commit -m "feat(builder): HMAC-verified webhook endpoint for action progress"
```

---

## Task 5: Sessions endpoint

**Files:**
- Create: `api/builder/sessions.js`

- [ ] **Step 1: Implement the endpoint**

Create `api/builder/sessions.js`:

```js
// GET /api/builder/sessions             → list caller's sessions (recent first, limit 50)
// GET /api/builder/sessions?id=<uuid>   → that session + its events for hydration
import { json, supabaseCreds, sbHeaders, isUuid } from '../_lib/supabase.js';
import { requireBuilder } from '../_lib/builderAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireBuilder(req, res);
  if (!user) return; // requireBuilder already responded

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  const url = new URL(req.url, 'http://x');
  const id = url.searchParams.get('id');

  if (id) {
    if (!isUuid(id)) return json(res, 400, { error: 'Bad id' });
    // Fetch session
    const sUrl = `${creds.supabaseUrl}/rest/v1/builder_sessions?id=eq.${id}&created_by_email=eq.${encodeURIComponent(user.email)}&select=*`;
    const sr = await fetch(sUrl, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!sr.ok) return json(res, 502, { error: 'Supabase session fetch failed' });
    const sessions = await sr.json();
    if (!sessions.length) return json(res, 404, { error: 'Not found' });
    // Fetch events for this session, oldest first
    const eUrl = `${creds.supabaseUrl}/rest/v1/builder_events?session_id=eq.${id}&order=ts.asc&select=*&limit=2000`;
    const er = await fetch(eUrl, { headers: sbHeaders(creds.serviceRoleKey) });
    if (!er.ok) return json(res, 502, { error: 'Supabase events fetch failed' });
    const events = await er.json();
    return json(res, 200, { session: sessions[0], events });
  }

  // List sessions
  const listUrl = `${creds.supabaseUrl}/rest/v1/builder_sessions?created_by_email=eq.${encodeURIComponent(user.email)}&order=updated_at.desc&select=*&limit=50`;
  const r = await fetch(listUrl, { headers: sbHeaders(creds.serviceRoleKey) });
  if (!r.ok) return json(res, 502, { error: 'Supabase list failed' });
  const sessions = await r.json();
  return json(res, 200, { sessions });
}
```

- [ ] **Step 2: Smoke test (requires Task 12 frontend; defer until then if you'd rather)**

You can validate the 401/403 path now:

```bash
curl -sS http://localhost:3000/api/builder/sessions | jq
# Expected: { "error": "Not signed in" }
```

- [ ] **Step 3: Commit**

```bash
git add api/builder/sessions.js
git commit -m "feat(builder): GET /api/builder/sessions list + hydrate"
```

---

## Task 6: Prompt endpoint stub (no workflow dispatch yet)

**Files:**
- Create: `api/builder/prompt.js`

- [ ] **Step 1: Implement the stub**

We split the workflow dispatch into its own helper (Task 7) so this endpoint stays small. For now, prompt.js just creates the session row and inserts the prompt event. Wiring the dispatch comes in Task 8.

Create `api/builder/prompt.js`:

```js
// POST /api/builder/prompt
// Body: { session_id?: uuid, mode: 'continue'|'fresh', prompt: string }
// - If session_id missing: create a new session.
// - Insert a 'prompt' event for the user message.
// - (Task 8 will append: dispatch the GitHub Action.)
import { json, supabaseCreds, sbHeaders, readJsonBody, cleanText, isUuid } from '../_lib/supabase.js';
import { requireBuilder } from '../_lib/builderAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireBuilder(req, res);
  if (!user) return;

  const body = readJsonBody(req) || {};
  const prompt = cleanText(body.prompt, 8000);
  const mode = body.mode === 'fresh' ? 'fresh' : 'continue';
  let sessionId = body.session_id;

  if (!prompt) return json(res, 400, { error: 'Prompt required' });
  if (sessionId && !isUuid(sessionId)) return json(res, 400, { error: 'Bad session_id' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  // 1) Create session if needed.
  if (!sessionId) {
    const r = await fetch(`${creds.supabaseUrl}/rest/v1/builder_sessions`, {
      method: 'POST',
      headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=representation' },
      body: JSON.stringify({ created_by_email: user.email, mode }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase session create: ${t.slice(0, 200)}` });
    }
    const rows = await r.json();
    sessionId = rows?.[0]?.id;
  }

  // 2) Insert prompt event.
  const er = await fetch(`${creds.supabaseUrl}/rest/v1/builder_events`, {
    method: 'POST',
    headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=representation' },
    body: JSON.stringify({
      session_id: sessionId,
      kind: 'prompt',
      payload: { text: prompt, by: user.email, mode },
    }),
  });
  if (!er.ok) {
    const t = await er.text().catch(() => '');
    return json(res, 502, { error: `Supabase event insert: ${t.slice(0, 200)}` });
  }

  // 3) (Task 8) dispatch workflow with history.
  // For now: just return the session id.
  return json(res, 200, { session_id: sessionId, dispatched: false });
}
```

- [ ] **Step 2: Smoke test**

Sign in via the frontend (or grab a JWT from `localStorage.supabase.auth.token`) and curl:

```bash
JWT="<paste your supabase jwt>"
curl -sS -X POST http://localhost:3000/api/builder/prompt \
  -H "content-type: application/json" \
  -H "Authorization: Bearer $JWT" \
  --data '{"prompt":"hello world","mode":"fresh"}' | jq
```

Expected: `{ "session_id": "<uuid>", "dispatched": false }`. Check the Supabase dashboard: a row in `builder_sessions` and one in `builder_events` (kind=prompt).

- [ ] **Step 3: Commit**

```bash
git add api/builder/prompt.js
git commit -m "feat(builder): POST /api/builder/prompt stub (no dispatch yet)"
```

---

## Task 7: GitHub dispatch helper

**Files:**
- Create: `api/_lib/githubDispatch.js`

- [ ] **Step 1: Implement the helper**

Create `api/_lib/githubDispatch.js`:

```js
// Trigger the claude-builder workflow via GitHub API.
// Requires env: GITHUB_TOKEN_BUILDER (fine-grained PAT) + GITHUB_REPO (owner/repo).
const WORKFLOW_FILE = 'claude-builder.yml';

export const dispatchClaudeBuilder = async ({ prompt, sessionId, mode, historyB64 }) => {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN_BUILDER;
  if (!repo || !token) return { ok: false, error: 'GITHUB_REPO or GITHUB_TOKEN_BUILDER missing' };

  const r = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'master',  // workflow file is read from master; the action checks out release-latest itself
        inputs: {
          prompt: prompt.slice(0, 8000),
          session_id: sessionId,
          mode,
          history_b64: historyB64 || '',
        },
      }),
    }
  );
  if (r.status === 204) return { ok: true };
  const text = await r.text().catch(() => '');
  return { ok: false, status: r.status, error: text.slice(0, 300) };
};
```

- [ ] **Step 2: Commit**

```bash
git add api/_lib/githubDispatch.js
git commit -m "feat(builder): GitHub workflow_dispatch helper"
```

---

## Task 8: Wire prompt.js to dispatch the workflow (with history bundling)

**Files:**
- Modify: `api/builder/prompt.js`

- [ ] **Step 1: Add history bundling + dispatch**

Replace `api/builder/prompt.js` with the version below. The new logic: after inserting the prompt event, if `mode === 'continue'`, fetch the last N events for this session and base64-encode a compact summary; dispatch the workflow; insert a `status` event marking the dispatch.

```js
// POST /api/builder/prompt
// Body: { session_id?: uuid, mode: 'continue'|'fresh', prompt: string }
import { json, supabaseCreds, sbHeaders, readJsonBody, cleanText, isUuid } from '../_lib/supabase.js';
import { requireBuilder } from '../_lib/builderAuth.js';
import { dispatchClaudeBuilder } from '../_lib/githubDispatch.js';

const MAX_HISTORY_EVENTS = 60; // ~last 20 turns of prompt+commit+file_edit

const buildHistory = async (creds, sessionId) => {
  const url = `${creds.supabaseUrl}/rest/v1/builder_events?session_id=eq.${sessionId}&kind=in.(prompt,commit,file_edit,tag)&order=ts.asc&select=ts,kind,payload&limit=${MAX_HISTORY_EVENTS}`;
  const r = await fetch(url, { headers: sbHeaders(creds.serviceRoleKey) });
  if (!r.ok) return '';
  const rows = await r.json();
  const lines = rows.map((e) => {
    if (e.kind === 'prompt') return `[user] ${e.payload?.text || ''}`;
    if (e.kind === 'commit') return `[committed] ${e.payload?.sha?.slice(0, 7) || ''} ${e.payload?.message || ''}`;
    if (e.kind === 'tag') return `[tagged] ${e.payload?.tag || ''}`;
    if (e.kind === 'file_edit') return `[edited] ${e.payload?.path || ''}`;
    return '';
  }).filter(Boolean);
  return Buffer.from(lines.join('\n'), 'utf8').toString('base64');
};

const insertEvent = (creds, sessionId, kind, payload) =>
  fetch(`${creds.supabaseUrl}/rest/v1/builder_events`, {
    method: 'POST',
    headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=minimal' },
    body: JSON.stringify({ session_id: sessionId, kind, payload }),
  });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireBuilder(req, res);
  if (!user) return;

  const body = readJsonBody(req) || {};
  const prompt = cleanText(body.prompt, 8000);
  const mode = body.mode === 'fresh' ? 'fresh' : 'continue';
  let sessionId = body.session_id;

  if (!prompt) return json(res, 400, { error: 'Prompt required' });
  if (sessionId && !isUuid(sessionId)) return json(res, 400, { error: 'Bad session_id' });

  const creds = supabaseCreds();
  if (!creds) return json(res, 500, { error: 'Supabase env not configured' });

  // 1) Create session if needed.
  if (!sessionId) {
    const r = await fetch(`${creds.supabaseUrl}/rest/v1/builder_sessions`, {
      method: 'POST',
      headers: { ...sbHeaders(creds.serviceRoleKey), Prefer: 'return=representation' },
      body: JSON.stringify({ created_by_email: user.email, mode }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return json(res, 502, { error: `Supabase session create: ${t.slice(0, 200)}` });
    }
    const rows = await r.json();
    sessionId = rows?.[0]?.id;
  }

  // 2) Insert prompt event.
  await insertEvent(creds, sessionId, 'prompt', { text: prompt, by: user.email, mode });

  // 3) Bundle history (only in continue mode).
  const historyB64 = mode === 'continue' ? await buildHistory(creds, sessionId) : '';

  // 4) Dispatch workflow.
  const result = await dispatchClaudeBuilder({ prompt, sessionId, mode, historyB64 });
  if (!result.ok) {
    await insertEvent(creds, sessionId, 'error', { stage: 'dispatch', detail: result.error || 'unknown' });
    return json(res, 502, { error: 'Dispatch failed', detail: result.error });
  }

  await insertEvent(creds, sessionId, 'status', { stage: 'dispatched' });
  return json(res, 200, { session_id: sessionId, dispatched: true });
}
```

- [ ] **Step 2: Smoke test (auth + dispatch)**

You'll need `GITHUB_TOKEN_BUILDER` and `GITHUB_REPO` set in `.env` for local dev. Then with a real JWT:

```bash
curl -sS -X POST http://localhost:3000/api/builder/prompt \
  -H "content-type: application/json" \
  -H "Authorization: Bearer $JWT" \
  --data '{"prompt":"hello from prompt endpoint","mode":"fresh"}' | jq
```

Expected: `{ "session_id": "...", "dispatched": true }`. Open GitHub → Actions tab → you should see a `Claude Builder` run queued (the workflow itself doesn't exist yet — that's Task 11; the API call will succeed but the run will fail with "workflow not found" until then. That's fine).

- [ ] **Step 3: Commit**

```bash
git add api/builder/prompt.js
git commit -m "feat(builder): dispatch claude-builder workflow with conversation history"
```

---

## Task 9: Browser-side builder client

**Files:**
- Create: `src/lib/builderClient.js`

- [ ] **Step 1: Implement the client**

Create `src/lib/builderClient.js`:

```js
// Builder client: thin wrappers around the /api/builder/* endpoints + Supabase Realtime subscription.
import { supabase } from './supabase';

const authHeaders = async () => {
  if (!supabase) throw new Error('Supabase not configured');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not signed in');
  return { Authorization: `Bearer ${session.access_token}` };
};

export const sendPrompt = async ({ prompt, sessionId, mode }) => {
  const headers = { ...(await authHeaders()), 'content-type': 'application/json' };
  const r = await fetch('/api/builder/prompt', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, session_id: sessionId, mode }),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
  return r.json();
};

export const listSessions = async () => {
  const headers = await authHeaders();
  const r = await fetch('/api/builder/sessions', { headers });
  if (!r.ok) throw new Error('Failed to list sessions');
  return r.json();
};

export const getSession = async (id) => {
  const headers = await authHeaders();
  const r = await fetch(`/api/builder/sessions?id=${encodeURIComponent(id)}`, { headers });
  if (!r.ok) throw new Error('Failed to load session');
  return r.json();
};

// Subscribe to new events for a given session_id via Supabase Realtime.
// Returns an unsubscribe function.
export const subscribeEvents = (sessionId, onEvent) => {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`builder_events:${sessionId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'builder_events', filter: `session_id=eq.${sessionId}` },
      (payload) => onEvent(payload.new)
    )
    .subscribe();
  return () => { supabase.removeChannel(channel); };
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/builderClient.js
git commit -m "feat(builder): browser client for prompt API + realtime subscription"
```

---

## Task 10: Builder UI — shell, toolbar, chat pane, event bubble

**Files:**
- Create: `src/screens/Builder/index.jsx`
- Create: `src/screens/Builder/SessionToolbar.jsx`
- Create: `src/screens/Builder/ChatPane.jsx`
- Create: `src/screens/Builder/EventBubble.jsx`

- [ ] **Step 1: Create `EventBubble.jsx`**

Create `src/screens/Builder/EventBubble.jsx`:

```jsx
import { C } from '../../theme';

const KIND_LABEL = {
  prompt: 'You',
  log: 'log',
  file_edit: 'edit',
  commit: 'commit',
  tag: 'tag',
  deploy: 'deploy',
  status: 'status',
  done: 'done',
  error: 'error',
};

const KIND_COLOR = {
  prompt: C.terracotta,
  error: '#B23A48',
  done: C.sageDark,
  deploy: C.sageDark,
  commit: C.saffron,
  tag: C.saffron,
};

export function EventBubble({ event }) {
  const { kind, payload, ts } = event;
  const color = KIND_COLOR[kind] || C.inkSoft;
  const time = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const body = (() => {
    switch (kind) {
      case 'prompt':    return payload?.text || '';
      case 'log':       return payload?.line || JSON.stringify(payload);
      case 'file_edit': return payload?.path ? `edited ${payload.path}` : 'edited a file';
      case 'commit':    return `committed ${payload?.sha?.slice(0, 7) || ''} — ${payload?.message || ''}`;
      case 'tag':       return `tagged ${payload?.tag || ''}`;
      case 'deploy':    return payload?.url ? `deployed → ${payload.url}` : 'deploying…';
      case 'status':    return `status: ${payload?.stage || ''}`;
      case 'done':      return payload?.deployUrl ? `done — ${payload.deployUrl}` : 'done';
      case 'error':     return `error — ${payload?.detail || payload?.stage || ''}`;
      default:          return JSON.stringify(payload);
    }
  })();

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '6px 12px',
      fontFamily: 'Albert Sans, sans-serif', fontSize: 14,
      borderLeft: `3px solid ${color}`, marginBottom: 4, background: C.paper,
    }}>
      <span style={{ color: C.inkMuted, minWidth: 60, fontSize: 11 }}>{time}</span>
      <span style={{ color, minWidth: 56, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {KIND_LABEL[kind] || kind}
      </span>
      <span style={{ color: C.ink, flex: 1, whiteSpace: 'pre-wrap' }}>{body}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create `SessionToolbar.jsx`**

Create `src/screens/Builder/SessionToolbar.jsx`:

```jsx
import { C } from '../../theme';

export function SessionToolbar({ mode, onModeChange, lastReleaseTag, status, onNewSession, deployUrl }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
      background: C.creamSoft, borderBottom: `1px solid ${C.divider}`,
      fontFamily: 'Albert Sans, sans-serif', fontSize: 13,
    }}>
      <button onClick={onNewSession} style={btn(C.terracotta)}>+ New session</button>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', color: C.inkSoft }}>
        <input type="checkbox" checked={mode === 'continue'} onChange={(e) => onModeChange(e.target.checked ? 'continue' : 'fresh')} />
        Continue thread (remember previous prompts)
      </label>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
        {lastReleaseTag && <span style={{ color: C.saffron }}>{lastReleaseTag}</span>}
        {status && <span style={{ color: status === 'error' ? '#B23A48' : C.inkSoft }}>status: {status}</span>}
        {deployUrl && <a href={deployUrl} target="_blank" rel="noreferrer" style={{ color: C.sageDark }}>preview ↗</a>}
      </div>
    </div>
  );
}

const btn = (color) => ({
  background: color, color: 'white', border: 'none',
  padding: '6px 12px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
});
```

- [ ] **Step 3: Create `ChatPane.jsx`**

Create `src/screens/Builder/ChatPane.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';
import { C } from '../../theme';
import { EventBubble } from './EventBubble';

export function ChatPane({ events, onSend, busy }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events.length]);

  const submit = () => {
    const t = text.trim();
    if (!t || busy) return;
    onSend(t);
    setText('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, background: C.cream }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        {events.length === 0 && (
          <div style={{ color: C.inkMuted, fontFamily: 'Albert Sans, sans-serif', fontSize: 14, textAlign: 'center', marginTop: 80 }}>
            Type a prompt below. Claude will edit the code, commit to <code>release-latest</code>, and deploy a preview.
          </div>
        )}
        {events.map((e) => <EventBubble key={e.id} event={e} />)}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: `1px solid ${C.divider}`, background: C.paper }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="Ask Claude to make a change… (Cmd/Ctrl+Enter to send)"
          rows={3}
          style={{ flex: 1, padding: 8, fontFamily: 'Albert Sans, sans-serif', fontSize: 14, border: `1px solid ${C.divider}`, borderRadius: 4, resize: 'vertical' }}
          disabled={busy}
        />
        <button onClick={submit} disabled={busy || !text.trim()} style={{
          background: busy ? C.inkMuted : C.terracotta, color: 'white', border: 'none',
          padding: '0 16px', borderRadius: 4, fontSize: 14, cursor: busy ? 'not-allowed' : 'pointer', minWidth: 80,
        }}>
          {busy ? '…' : 'Send'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `index.jsx` (shell + auth gate + state wiring)**

Create `src/screens/Builder/index.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { C } from '../../theme';
import { supabase, isSupabaseReady } from '../../lib/supabase';
import { sendPrompt, getSession, subscribeEvents } from '../../lib/builderClient';
import { SessionToolbar } from './SessionToolbar';
import { ChatPane } from './ChatPane';

export function BuilderPage() {
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [mode, setMode] = useState('continue');
  const [events, setEvents] = useState([]);
  const [session, setSession] = useState(null); // builder_sessions row
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseReady()) { setAuthReady(true); return; }
    supabase.auth.getUser().then(({ data }) => { setAuthUser(data.user || null); setAuthReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthUser(s?.user || null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  // Subscribe to events when sessionId changes.
  useEffect(() => {
    if (!sessionId) { setEvents([]); setSession(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { session: s, events: hist } = await getSession(sessionId);
        if (cancelled) return;
        setSession(s);
        setEvents(hist);
      } catch (e) { setError(e.message); }
    })();
    const unsub = subscribeEvents(sessionId, (row) => {
      setEvents((prev) => prev.some((p) => p.id === row.id) ? prev : [...prev, row]);
      // Refresh session metadata (status, last_release_tag) on terminal events.
      if (['done','error','tag','deploy'].includes(row.kind)) {
        getSession(sessionId).then(({ session: s }) => setSession(s)).catch(() => {});
      }
    });
    return () => { cancelled = true; unsub(); };
  }, [sessionId]);

  // Reset busy when terminal event lands.
  useEffect(() => {
    const last = events[events.length - 1];
    if (last && (last.kind === 'done' || last.kind === 'error')) setBusy(false);
  }, [events]);

  const handleSend = async (text) => {
    setBusy(true); setError(null);
    try {
      const { session_id } = await sendPrompt({ prompt: text, sessionId, mode });
      if (!sessionId) setSessionId(session_id);
    } catch (e) { setError(e.message); setBusy(false); }
  };

  const handleNewSession = () => { setSessionId(null); setEvents([]); setSession(null); setError(null); };

  // ---- Renders ----
  if (!authReady) return <Centered>Loading…</Centered>;
  if (!authUser) return <Centered>Sign in via gomama.app first, then return to /builder.</Centered>;

  const deployUrl = (() => {
    // Last event of kind 'done' or 'deploy' with a url.
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.kind === 'done' && e.payload?.deployUrl) return e.payload.deployUrl;
      if (e.kind === 'deploy' && e.payload?.url) return e.payload.url;
    }
    return null;
  })();

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.cream }}>
      <header style={{ padding: '12px 16px', borderBottom: `1px solid ${C.divider}`, background: C.paper }}>
        <h1 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: 22, color: C.ink }}>
          Builder <span style={{ color: C.inkMuted, fontSize: 14, fontFamily: 'Albert Sans, sans-serif' }}>— gomama.app</span>
        </h1>
      </header>
      <SessionToolbar
        mode={mode}
        onModeChange={setMode}
        lastReleaseTag={session?.last_release_tag}
        status={session?.status}
        onNewSession={handleNewSession}
        deployUrl={deployUrl}
      />
      {error && <div style={{ padding: 8, background: '#FBE5E1', color: '#B23A48', fontSize: 13 }}>{error}</div>}
      <ChatPane events={events} onSend={handleSend} busy={busy} />
    </div>
  );
}

function Centered({ children }) {
  return (
    <div style={{ height: '100vh', display: 'grid', placeItems: 'center', fontFamily: 'Albert Sans, sans-serif', color: C.inkSoft }}>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/Builder/
git commit -m "feat(builder): chat UI — shell, toolbar, pane, event bubbles"
```

---

## Task 11: Routing — wire `/builder` and update `/live`

**Files:**
- Modify: `src/App.jsx` (lines ~290–298)
- Modify: `vercel.json`

- [ ] **Step 1: Add the route to `App.jsx`**

In `src/App.jsx`, find the routing block (currently around line 290). It looks like:

```js
if (route === '/prototype' || route === '/preview') return <PrototypeApp />;
if (route === '/live') return <PrototypeApp bare />;
if (route === '/admin' || route.startsWith('/admin/')) {
  return <AdminPage />;
}
```

Change it to (note we'll replace the `/live` line in Task 13 with the version picker; for now we add `/builder` and leave `/live` alone):

```js
import { BuilderPage } from './screens/Builder';
// …elsewhere in the imports

// In the routing block:
if (route === '/prototype' || route === '/preview') return <PrototypeApp />;
if (route === '/builder' || route.startsWith('/builder/')) return <BuilderPage />;
if (route === '/live') return <PrototypeApp bare />;
if (route === '/admin' || route.startsWith('/admin/')) {
  return <AdminPage />;
}
```

- [ ] **Step 2: Add the rewrite to `vercel.json`**

In `vercel.json`, the `rewrites` array currently has entries for `/prototype`, `/preview`, `/admin`, `/live`, `/promo`. Add `/builder`:

```json
{
  "source": "/builder",
  "destination": "/"
},
{
  "source": "/builder/:path*",
  "destination": "/"
},
```

Place these alongside the existing `/admin` rewrites — same shape.

- [ ] **Step 3: Smoke test the UI end-to-end**

Run `npm run dev`. Navigate to `http://localhost:5173/builder`.

Expected sequence:
1. If not signed in: "Sign in via gomama.app first…"
2. After signing in: empty chat with the "+ New session" toolbar.
3. Type a prompt → hit Cmd+Enter → see a "You" bubble appear immediately, then a "status: dispatched" event.
4. (GitHub Action doesn't exist yet, so no further events. That's expected — Task 12 builds the Action.)

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx vercel.json
git commit -m "feat(builder): wire /builder route + rewrite"
```

---

## Task 12: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/claude-builder.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/claude-builder.yml`:

```yaml
name: Claude Builder

on:
  workflow_dispatch:
    inputs:
      prompt:
        description: 'Prompt to send to Claude'
        required: true
        type: string
      session_id:
        description: 'Builder session UUID'
        required: true
        type: string
      mode:
        description: 'continue or fresh'
        required: true
        type: string
        default: 'continue'
      history_b64:
        description: 'Base64-encoded prior conversation summary (continue mode only)'
        required: false
        type: string
        default: ''

concurrency:
  group: claude-builder-release-latest
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    permissions:
      contents: write
      actions: read

    steps:
      - name: Checkout release-latest (or create from master)
        uses: actions/checkout@v4
        with:
          ref: release-latest
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}
        continue-on-error: true

      - name: Fall back to master if release-latest doesn't exist
        if: failure()
        uses: actions/checkout@v4
        with:
          ref: master
          fetch-depth: 0

      - name: Ensure we're on release-latest
        run: |
          set -euo pipefail
          if git show-ref --verify --quiet refs/remotes/origin/release-latest; then
            git checkout release-latest
            git pull --ff-only origin release-latest
          else
            git checkout -B release-latest
          fi
          echo "On branch: $(git rev-parse --abbrev-ref HEAD)"

      - name: Configure git identity
        run: |
          git config user.name  "claude-builder[bot]"
          git config user.email "claude-builder@users.noreply.github.com"

      - name: Webhook helper (POST signed JSON to gomama.app)
        run: |
          cat > /tmp/notify.sh <<'EOF'
          #!/usr/bin/env bash
          set -euo pipefail
          BODY="$1"
          SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$BUILDER_WEBHOOK_SECRET" -hex | awk '{print $NF}')
          curl -fsS -X POST "$BUILDER_WEBHOOK_URL" \
            -H "content-type: application/json" \
            -H "x-builder-signature: $SIG" \
            --data "$BODY" >/dev/null || echo "webhook post failed (non-fatal)"
          EOF
          chmod +x /tmp/notify.sh
        env:
          BUILDER_WEBHOOK_SECRET: ${{ secrets.BUILDER_WEBHOOK_SECRET }}
          BUILDER_WEBHOOK_URL:    ${{ secrets.BUILDER_WEBHOOK_URL }}

      - name: Notify start
        run: /tmp/notify.sh "$(jq -nc --arg s "${{ inputs.session_id }}" '{session_id:$s, kind:"status", payload:{stage:"started"}}')"
        env:
          BUILDER_WEBHOOK_SECRET: ${{ secrets.BUILDER_WEBHOOK_SECRET }}
          BUILDER_WEBHOOK_URL:    ${{ secrets.BUILDER_WEBHOOK_URL }}

      - name: Record pre-flight SHAs of builder-system paths (guard)
        id: preflight
        run: |
          set -euo pipefail
          GUARD_FILES=(
            ".github/workflows/claude-builder.yml"
            "api/builder/prompt.js"
            "api/builder/webhook.js"
            "api/builder/sessions.js"
            "api/live/versions.js"
            "api/_lib/builderAuth.js"
            "api/_lib/builderHmac.js"
            "api/_lib/githubDispatch.js"
            "supabase/builder_schema.sql"
          )
          touch /tmp/preflight.txt
          for f in "${GUARD_FILES[@]}"; do
            if [ -f "$f" ]; then
              echo "$f $(git hash-object "$f")" >> /tmp/preflight.txt
            fi
          done
          cat /tmp/preflight.txt

      - name: Decode history (if continue mode)
        id: history
        run: |
          if [ -n "${{ inputs.history_b64 }}" ]; then
            echo "${{ inputs.history_b64 }}" | base64 -d > /tmp/history.txt
            echo "has_history=1" >> "$GITHUB_OUTPUT"
          else
            : > /tmp/history.txt
            echo "has_history=0" >> "$GITHUB_OUTPUT"
          fi
          wc -l /tmp/history.txt || true

      - name: Run Claude Code action
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            You are working in the gomama.app repo on branch `release-latest`.

            Conversation history (older prompts and changes; empty if this is a fresh session):
            ----
            ${{ steps.history.outputs.has_history == '1' && '(see /tmp/history.txt on disk)' || '(none)' }}
            ----

            User's new prompt:
            ----
            ${{ inputs.prompt }}
            ----

            Constraints:
            - DO NOT modify any of these paths (builder-system guard, the workflow will abort if you do):
              .github/workflows/claude-builder.yml
              api/builder/**, api/live/**, api/_lib/builderAuth.js,
              api/_lib/builderHmac.js, api/_lib/githubDispatch.js,
              supabase/builder_schema.sql
            - Make focused changes. Commit nothing yourself — the workflow will commit after you finish.
            - If the prompt is unsafe or impossible, refuse and explain briefly.

      - name: Builder-system guard (abort if guarded files changed)
        run: |
          set -euo pipefail
          FAIL=0
          while read -r line; do
            [ -z "$line" ] && continue
            f=$(echo "$line" | awk '{print $1}')
            old=$(echo "$line" | awk '{print $2}')
            new=$(git hash-object "$f" 2>/dev/null || echo "missing")
            if [ "$old" != "$new" ]; then
              echo "GUARD VIOLATION: $f changed ($old -> $new)"
              FAIL=1
            fi
          done < /tmp/preflight.txt
          if [ "$FAIL" -eq 1 ]; then
            /tmp/notify.sh "$(jq -nc --arg s "${{ inputs.session_id }}" '{session_id:$s, kind:"error", payload:{stage:"guard", detail:"builder-system path was modified"}}')"
            exit 1
          fi
        env:
          BUILDER_WEBHOOK_SECRET: ${{ secrets.BUILDER_WEBHOOK_SECRET }}
          BUILDER_WEBHOOK_URL:    ${{ secrets.BUILDER_WEBHOOK_URL }}

      - name: Stage & commit (skip if nothing changed)
        id: commit
        run: |
          set -euo pipefail
          git add -A
          if git diff --cached --quiet; then
            echo "no_changes=1" >> "$GITHUB_OUTPUT"
          else
            MSG=$(printf 'release: %s' "${{ inputs.prompt }}" | head -c 80)
            git commit -m "$MSG"
            SHA=$(git rev-parse HEAD)
            echo "sha=$SHA" >> "$GITHUB_OUTPUT"
            echo "msg=$MSG" >> "$GITHUB_OUTPUT"
            echo "no_changes=0" >> "$GITHUB_OUTPUT"
          fi

      - name: Notify commit
        if: steps.commit.outputs.no_changes == '0'
        run: |
          /tmp/notify.sh "$(jq -nc \
            --arg s "${{ inputs.session_id }}" \
            --arg sha "${{ steps.commit.outputs.sha }}" \
            --arg msg "${{ steps.commit.outputs.msg }}" \
            '{session_id:$s, kind:"commit", payload:{sha:$sha, message:$msg}}')"
        env:
          BUILDER_WEBHOOK_SECRET: ${{ secrets.BUILDER_WEBHOOK_SECRET }}
          BUILDER_WEBHOOK_URL:    ${{ secrets.BUILDER_WEBHOOK_URL }}

      - name: Compute next release-N tag and push (with retry)
        id: tagpush
        if: steps.commit.outputs.no_changes == '0'
        run: |
          set -euo pipefail
          # Fetch tags so we see the latest release-N globally.
          git fetch --tags --force
          # Find the highest existing release-N and increment.
          LATEST=$(git tag -l 'release-*' | sed 's/release-//' | grep -E '^[0-9]+$' | sort -n | tail -1 || true)
          if [ -z "$LATEST" ]; then NEXT=1; else NEXT=$((LATEST + 1)); fi
          for attempt in 1 2 3; do
            TAG="release-$NEXT"
            if git rev-parse "refs/tags/$TAG" >/dev/null 2>&1; then
              NEXT=$((NEXT + 1))
              continue
            fi
            git tag "$TAG"
            if git push origin release-latest "$TAG"; then
              echo "tag=$TAG"     >> "$GITHUB_OUTPUT"
              echo "n=$NEXT"      >> "$GITHUB_OUTPUT"
              exit 0
            fi
            # Push failed — refetch and bump.
            git tag -d "$TAG"
            git fetch --tags --force
            git pull --ff-only origin release-latest || true
            NEXT=$((NEXT + 1))
          done
          echo "Failed after 3 attempts" >&2
          exit 1

      - name: Notify tag
        if: steps.tagpush.outputs.tag != ''
        run: |
          /tmp/notify.sh "$(jq -nc \
            --arg s "${{ inputs.session_id }}" \
            --arg t "${{ steps.tagpush.outputs.tag }}" \
            --arg sha "${{ steps.commit.outputs.sha }}" \
            '{session_id:$s, kind:"tag", payload:{tag:$t, sha:$sha}}')"
        env:
          BUILDER_WEBHOOK_SECRET: ${{ secrets.BUILDER_WEBHOOK_SECRET }}
          BUILDER_WEBHOOK_URL:    ${{ secrets.BUILDER_WEBHOOK_URL }}

      - name: Wait for Vercel deployment & notify done
        if: steps.tagpush.outputs.tag != ''
        env:
          VERCEL_API_TOKEN: ${{ secrets.VERCEL_API_TOKEN }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
          SHA: ${{ steps.commit.outputs.sha }}
          BUILDER_WEBHOOK_SECRET: ${{ secrets.BUILDER_WEBHOOK_SECRET }}
          BUILDER_WEBHOOK_URL: ${{ secrets.BUILDER_WEBHOOK_URL }}
          TAG: ${{ steps.tagpush.outputs.tag }}
          SID: ${{ inputs.session_id }}
        run: |
          set -euo pipefail
          DEPLOY_URL=""
          for i in $(seq 1 60); do  # ~5 minutes (60 * 5s)
            RESP=$(curl -fsS "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&meta-githubCommitSha=${SHA}&limit=1" \
              -H "Authorization: Bearer ${VERCEL_API_TOKEN}" || echo '{}')
            STATE=$(echo "$RESP" | jq -r '.deployments[0].state // empty')
            URL=$(echo "$RESP" | jq -r '.deployments[0].url // empty')
            if [ "$STATE" = "READY" ] && [ -n "$URL" ]; then
              DEPLOY_URL="https://$URL"
              break
            fi
            sleep 5
          done
          BODY=$(jq -nc --arg s "$SID" --arg url "$DEPLOY_URL" --arg t "$TAG" --arg sha "$SHA" \
            '{session_id:$s, kind:"done", payload:{deployUrl:$url, tag:$t, sha:$sha}}')
          /tmp/notify.sh "$BODY"

      - name: Notify no-op (if Claude made no changes)
        if: steps.commit.outputs.no_changes == '1'
        run: |
          /tmp/notify.sh "$(jq -nc --arg s "${{ inputs.session_id }}" '{session_id:$s, kind:"done", payload:{detail:"no changes made"}}')"
        env:
          BUILDER_WEBHOOK_SECRET: ${{ secrets.BUILDER_WEBHOOK_SECRET }}
          BUILDER_WEBHOOK_URL:    ${{ secrets.BUILDER_WEBHOOK_URL }}

      - name: Notify failure
        if: failure()
        run: |
          /tmp/notify.sh "$(jq -nc --arg s "${{ inputs.session_id }}" --arg run "${{ github.run_id }}" \
            '{session_id:$s, kind:"error", payload:{stage:"workflow", run_id:$run, detail:"see Actions logs"}}')"
        env:
          BUILDER_WEBHOOK_SECRET: ${{ secrets.BUILDER_WEBHOOK_SECRET }}
          BUILDER_WEBHOOK_URL:    ${{ secrets.BUILDER_WEBHOOK_URL }}
```

- [ ] **Step 2: Add `VERCEL_PROJECT_ID` and `VERCEL_API_TOKEN` to GitHub Secrets**

In the GitHub repo: Settings → Secrets and variables → Actions → New repository secret. Add:
- `ANTHROPIC_API_KEY` — your Anthropic API key
- `BUILDER_WEBHOOK_SECRET` — same value you set in Vercel
- `BUILDER_WEBHOOK_URL` — `https://gomama.app/api/builder/webhook`
- `VERCEL_API_TOKEN` — same read-only token
- `VERCEL_PROJECT_ID` — found in `.vercel/project.json` in your repo (the `projectId` field)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/claude-builder.yml
git commit -m "feat(builder): GitHub Action — claude-code, commit, tag, deploy, notify"
```

- [ ] **Step 4: Push the branch and end-to-end smoke test**

```bash
git push -u origin <your branch>
```

In the browser at `/builder`, send a small prompt like "Add a comment to src/theme.js explaining the C export." Expected sequence in the chat:
1. `prompt` bubble (your text)
2. `status: dispatched`
3. `status: started` (from the Action)
4. `commit` (with SHA)
5. `tag release-1` (or next N)
6. `done` with a deploy URL

If anything stalls, check the GitHub Actions run logs.

---

## Task 13: Add env vars in Vercel + verify deploy

**Files:** (config only)

- [ ] **Step 1: Set env vars in Vercel**

In the Vercel dashboard for this project → Settings → Environment Variables. Add (Production + Preview):
- `BUILDER_ALLOWED_EMAILS` = `you@example.com,analyst@example.com`
- `BUILDER_WEBHOOK_SECRET` = `<the hex you generated in Task 1 Step 1>`
- `GITHUB_TOKEN_BUILDER` = a fine-grained PAT scoped to this repo, `Contents: Read & write`, `Actions: Read & write`
- `GITHUB_REPO` = `michaelhannajpm-lgtm/mama-app`
- `VERCEL_API_TOKEN` = a read-only Vercel token (Dashboard → Account → Tokens)
- `VERCEL_PROJECT_ID` = from `.vercel/project.json`

Confirm `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` are already set (they should be).

- [ ] **Step 2: Trigger a production redeploy**

After saving env vars, Vercel does NOT auto-redeploy. Either push a trivial commit or use the "Redeploy" button in the dashboard.

- [ ] **Step 3: Smoke test against production**

Sign in at `gomama.app`, navigate to `gomama.app/builder`, send a small prompt, watch it run end-to-end.

---

## Task 14: Versions endpoint for /live

**Files:**
- Create: `api/_lib/vercelDeployments.js`
- Create: `api/live/versions.js`

- [ ] **Step 1: Create the Vercel deployment lookup helper**

Create `api/_lib/vercelDeployments.js`:

```js
// Find a Vercel deployment by commit SHA. Returns { url, state } or null.
export const findDeployForSha = async (sha) => {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  const u = `https://api.vercel.com/v6/deployments?projectId=${projectId}&meta-githubCommitSha=${sha}&limit=1`;
  const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  const data = await r.json().catch(() => ({}));
  const d = data?.deployments?.[0];
  if (!d) return null;
  return { url: `https://${d.url}`, state: d.state, created: d.created };
};
```

- [ ] **Step 2: Create the versions endpoint**

Create `api/live/versions.js`:

```js
// GET /api/live/versions
// Lists release-* tags newest-first, joined with their Vercel deployment URLs.
// Cached 30s in memory per Vercel function instance.
import { json } from '../_lib/supabase.js';
import { requireBuilder } from '../_lib/builderAuth.js';
import { findDeployForSha } from '../_lib/vercelDeployments.js';

let CACHE = { ts: 0, data: null };
const TTL_MS = 30_000;

const listReleaseTags = async () => {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN_BUILDER;
  if (!repo || !token) return [];
  // List all matching refs (lightweight). Up to 100 newest tags.
  const r = await fetch(`https://api.github.com/repos/${repo}/git/matching-refs/tags/release-`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!r.ok) return [];
  const refs = await r.json();
  // refs: [{ ref: 'refs/tags/release-3', object: { sha } }, ...]
  // Sort by numeric suffix desc.
  return refs
    .map((x) => ({
      tag: x.ref.replace('refs/tags/', ''),
      n: Number(x.ref.replace('refs/tags/release-', '')) || 0,
      sha: x.object?.sha,
    }))
    .filter((x) => Number.isFinite(x.n) && x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 50);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const user = await requireBuilder(req, res);
  if (!user) return;

  if (CACHE.data && Date.now() - CACHE.ts < TTL_MS) {
    return json(res, 200, CACHE.data);
  }

  const tags = await listReleaseTags();
  // Resolve deploy URLs in parallel.
  const enriched = await Promise.all(tags.map(async (t) => {
    const deploy = await findDeployForSha(t.sha);
    return { ...t, deployUrl: deploy?.url || null, state: deploy?.state || 'UNKNOWN' };
  }));
  const data = { versions: enriched };
  CACHE = { ts: Date.now(), data };
  return json(res, 200, data);
}
```

- [ ] **Step 3: Commit**

```bash
git add api/_lib/vercelDeployments.js api/live/versions.js
git commit -m "feat(live): GET /api/live/versions — tags joined with vercel deploys"
```

---

## Task 15: /live UI

**Files:**
- Create: `src/screens/Live/index.jsx`
- Modify: `src/App.jsx` (replace the existing `/live` route)

- [ ] **Step 1: Create the version picker UI**

Create `src/screens/Live/index.jsx`:

```jsx
import { useEffect, useState } from 'react';
import { C } from '../../theme';
import { supabase, isSupabaseReady } from '../../lib/supabase';

export function LivePage() {
  const [authReady, setAuthReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseReady()) { setAuthReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const r = await fetch('/api/live/versions', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `HTTP ${r.status}`);
        const data = await r.json();
        setVersions(data.versions || []);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [authed]);

  if (!authReady) return <Centered>Loading…</Centered>;
  if (!authed) return <Centered>Sign in via gomama.app first.</Centered>;

  return (
    <div style={{ minHeight: '100vh', background: C.cream, padding: 24, fontFamily: 'Albert Sans, sans-serif' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Fraunces, serif', color: C.ink, marginBottom: 4 }}>Live versions</h1>
        <p style={{ color: C.inkSoft, marginTop: 0 }}>Pick a release to open its preview in a new tab.</p>
        {loading && <div style={{ color: C.inkMuted }}>Loading versions…</div>}
        {error && <div style={{ color: '#B23A48' }}>{error}</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {versions.map((v) => (
            <li key={v.tag} style={{
              padding: 12, marginBottom: 8, background: C.paper,
              border: `1px solid ${C.divider}`, borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 600, color: C.ink }}>{v.tag}</div>
                <div style={{ color: C.inkMuted, fontSize: 12 }}>sha {v.sha?.slice(0, 7)} · {v.state}</div>
              </div>
              {v.deployUrl ? (
                <a href={v.deployUrl} target="_blank" rel="noreferrer"
                   style={{ background: C.terracotta, color: 'white', padding: '6px 12px', borderRadius: 4, textDecoration: 'none' }}>
                  Open ↗
                </a>
              ) : (
                <span style={{ color: C.inkMuted, fontSize: 12 }}>no deploy</span>
              )}
            </li>
          ))}
          {!loading && versions.length === 0 && (
            <li style={{ color: C.inkMuted }}>No release-N tags yet. Send a prompt at /builder to create one.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function Centered({ children }) {
  return <div style={{ height: '100vh', display: 'grid', placeItems: 'center', color: C.inkSoft }}>{children}</div>;
}
```

- [ ] **Step 2: Replace the `/live` route in `App.jsx`**

In `src/App.jsx`, replace:
```js
if (route === '/live') return <PrototypeApp bare />;
```
with:
```js
if (route === '/live' || route.startsWith('/live/')) return <LivePage />;
```

Add to the imports near the other screen imports:
```js
import { LivePage } from './screens/Live';
```

- [ ] **Step 3: Smoke test**

Run `npm run dev`, navigate to `/live` while signed in. After Task 12's smoke test created `release-1`, you should see it listed with an "Open ↗" button that pops the Vercel preview URL.

- [ ] **Step 4: Commit**

```bash
git add src/screens/Live/ src/App.jsx
git commit -m "feat(live): version picker UI at /live"
```

---

## Task 16: Docs + .env.example

**Files:**
- Create or modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Append builder env vars to `.env.example`**

Edit `.env.example` (or create if missing) to add the new vars next to the existing ones:

```
# Builder (Claude on gomama.app)
BUILDER_ALLOWED_EMAILS=you@example.com,analyst@example.com
BUILDER_WEBHOOK_SECRET=<64-hex-chars>
GITHUB_TOKEN_BUILDER=<fine-grained PAT>
GITHUB_REPO=michaelhannajpm-lgtm/mama-app
VERCEL_API_TOKEN=<read-only token>
VERCEL_PROJECT_ID=<from .vercel/project.json>
```

- [ ] **Step 2: Add a "Builder" section to README.md**

Append the following section to `README.md`:

```markdown
## In-browser builder (`/builder` and `/live`)

`/builder` is an authenticated chat where the owner (and a small email allowlist) can prompt Claude to make code changes from any device. Each prompt:

1. Inserts a `prompt` event into Supabase `builder_events`.
2. Triggers a `workflow_dispatch` on `claude-builder.yml`.
3. The Action runs `anthropics/claude-code-action` against the `release-latest` branch.
4. Claude's changes are committed and pushed; a `release-N` tag is created.
5. Vercel auto-deploys the new commit.
6. Action posts back HMAC-signed webhooks; the chat UI subscribes via Supabase Realtime.

`/live` lists `release-*` tags and links each one to its Vercel preview URL.

**Builder-system guard:** the Action aborts if Claude tries to edit any of the builder's own auth or workflow files. See `.github/workflows/claude-builder.yml`.

**Env vars:** see `.env.example` (and configure them in Vercel + GitHub Secrets).
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs(builder): env vars + readme section"
```

---

## Task 17: End-to-end manual smoke test

**Files:** none (verification)

- [ ] **Step 1: Confirm the happy path produces a release**

In the deployed gomama.app:
1. Open `/builder` while signed in.
2. Send: "Add a JSDoc comment above the export const C in src/theme.js explaining each color group."
3. Watch the chat. Expected events, in order:
   - `prompt` (your text)
   - `status: dispatched`
   - `status: started`
   - 0 or more `log` lines
   - `commit` with a SHA
   - `tag release-N` with the new number
   - `done` with a deploy URL (clickable, opens the preview)
4. Click the preview URL — verify the change is visible.

- [ ] **Step 2: Confirm `/live` lists the new release**

Navigate to `/live`. Expected: `release-N` at the top of the list with an Open button → preview URL.

- [ ] **Step 3: Confirm the builder-system guard**

Send the prompt: "Edit api/builder/prompt.js to remove the allowlist check."

Expected: the Action runs to the guard step, posts an `error` event with `stage: guard`, exits non-zero, and **no commit is pushed**. The chat shows a red error bubble.

- [ ] **Step 4: Confirm the allowlist gate**

Sign out (or sign in as a non-allowlisted email). Try to load `/builder`. Expected: 403 from the API and "Email not on builder allowlist" message in the UI.

- [ ] **Step 5: Confirm "fresh" mode forgets history**

Start a new session, toggle off "Continue thread", send a prompt that references a previous one (e.g., "make that button bigger" with no prior context). Expected: Claude has no idea what "that button" is and either asks for clarification or refuses.

- [ ] **Step 6: Capture any rough edges as follow-up tickets**

Open issues or add a `## Follow-ups` section to the spec file with anything you saw that wasn't right — e.g., conversation-history summarization, file-edit event granularity, queue indicator when concurrency blocks a run.

---

## Self-review notes (filled in during plan authoring)

- **Spec coverage:** every section of the spec maps to a task — schema (Task 1), HMAC + auth (Tasks 2–3), webhook (Task 4), sessions endpoint (Task 5), prompt + dispatch (Tasks 6–8), builder UI (Tasks 9–11), GH Action with guard + tag retry + concurrency (Task 12), env wiring (Task 13), `/live` (Tasks 14–15), docs (Task 16), smoke test (Task 17).
- **Type/name consistency:** `session_id` (snake) on the wire, `sessionId` (camel) in JS. The webhook validates `session_id`; the client sends `session_id` in JSON. Event `kind` values are a single shared set defined in the schema and re-checked in `webhook.js` — including `status`, added during plan writing because the workflow needs it and the spec's original list omitted it.
- **Placeholder scan:** no `TBD`/`TODO` in any task body. Every code step includes actual code.
- **One thing I changed during plan writing vs. the spec:** schema migration file lives at `supabase/builder_schema.sql` (flat directory, matching the existing convention — `events_schema.sql`, `feedback_schema.sql`, etc.) rather than the `supabase/migrations/…` path the spec suggested.
