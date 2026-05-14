# Claude on gomama.app — design

**Status:** Draft for review
**Date:** 2026-05-13
**Branch this will land on:** `feat/claude-on-gomama` (TBD on plan creation)

## 1. Goal

Add an in-browser Claude chat at `gomama.app/builder` that lets the owner (and a small email allowlist) prompt Claude from any device to make code changes to this repo. Each prompt produces a commit on a rolling `release-latest` branch, a `release-{N}` tag, and an auto-deployed Vercel preview. A separate `gomama.app/live` route lists those tagged versions and links each to its Vercel preview URL.

The owner's analyst should be able to use the same chat — no Mac, no CLI, no local environment — and a non-technical user should be able to switch between versions at `/live` to compare them.

## 2. Non-goals (explicit YAGNI)

- No rollback or merge-to-master button in v1. The owner merges `release-latest` → `master` via GitHub UI when satisfied.
- No multi-repo support. Hardcoded to `mama-app`.
- No diff preview before push. The Vercel preview deployment **is** the preview.
- No PR creation mode. Direct branch push only.
- No billing / usage caps in v1. Anthropic spend is monitored manually.
- No file-scope restrictions on what Claude can edit, **except** a hard guard on builder-system paths (see §6).

## 3. Decisions captured during brainstorming

| Axis | Decision |
|---|---|
| Build vs. buy | Build custom on gomama.app |
| Access control | Supabase Auth + email allowlist (owner + analyst) |
| Execution host | GitHub Actions (workflow_dispatch + `anthropics/claude-code-action`) |
| Branch scheme | Single rolling `release-latest` branch + `release-{N}` tags per commit |
| `/live` UX | Dropdown picker, redirects to Vercel preview URL on click |
| Progress feedback | Live-streamed via Supabase Realtime on a `builder_events` table |
| Conversation memory | Per-session toggle: "Continue thread" (full history) vs "Fresh start" |

## 4. System shape

Three layers, all on infra you already use:

1. **gomama.app frontend.** New routes `/builder` (chat) and `/live` (version picker). Both gated by Supabase Auth + a server-side email allowlist check.
2. **gomama.app backend (Vercel functions).** Thin endpoints: receive prompt → trigger GitHub Action; receive progress webhooks → insert events; list versions for `/live`.
3. **GitHub Actions worker.** Triggered by `workflow_dispatch`. Checks out `release-latest`, runs Claude headlessly via `anthropics/claude-code-action`, commits, tags `release-{N}`, pushes branch + tag. Streams progress back to gomama.app via HMAC-signed webhooks. Vercel auto-deploys the new commit.

No new infrastructure. No new bills. Secrets stay where they belong:
- `ANTHROPIC_API_KEY` — **GitHub Secrets only**, never reaches Vercel.
- `GITHUB_TOKEN_BUILDER` (fine-grained PAT, contents:write + actions:write on this repo) — Vercel env vars only.
- `VERCEL_API_TOKEN` (read-only) — Vercel env vars only.
- `BUILDER_WEBHOOK_SECRET` (HMAC) — both GitHub Secrets and Vercel env vars.
- `BUILDER_ALLOWED_EMAILS` (comma-separated) — Vercel env vars only.

## 5. Data flow for one prompt

```
You (browser)                       Vercel functions             GitHub Actions             Vercel deploy
─────────────                       ────────────────             ──────────────             ─────────────
Type prompt, hit send ─POST /api/builder/prompt──▶
                                    auth check + allowlist
                                    upsert builder_sessions row
                                    insert prompt event
                                    workflow_dispatch trigger ───▶
◀── 200 { session_id } ─────────                                  checkout release-latest
                                                                  load conv history (if continue)
subscribe Supabase Realtime                                       run claude-code-action with prompt
on builder_events                                                 stream logs ──▶ POST /api/builder/webhook
                                    insert event rows                                      (HMAC verified)
◀── Realtime: logs, file diffs ──                                 git commit
                                                                  tag release-N
                                                                  git push branch + tag ────▶ Vercel builds preview
                                                                                                deployment ready
                                    POST webhook "done" ◀─────
                                    poll Vercel API for URL ──────────────────────────────────▶ returns URL
◀── Realtime: done, here's URL ──   insert done event with URL
```

### Invariants

- One prompt → one workflow run → one commit on `release-latest` → one new tag → one new Vercel preview URL.
- The chat UI uses **Supabase Realtime** (already in the stack) to subscribe to `INSERT` on `builder_events WHERE session_id = …`. No custom SSE plumbing.
- Page reload re-hydrates from the `builder_events` table, then resubscribes. No state lost.

### Concurrency

- The GitHub workflow declares a `concurrency: group: release-latest, cancel-in-progress: false` block. Overlapping prompts queue instead of racing.
- Tag numbering: at push time, the Action reads the latest `release-*` tag, increments, and retries `git push --tags` up to 3 times on conflict.

## 6. Components & files

### 6.1 Frontend additions (`src/`)

- `src/screens/Builder/index.jsx` — chat UI shell. Full-width admin-style layout matching the existing `/admin` look (not the phone frame).
- `src/screens/Builder/ChatPane.jsx` — message list + input. Renders prompt bubbles, log lines, file-edit chips, status pills. Subscribes to Supabase Realtime.
- `src/screens/Builder/SessionToolbar.jsx` — "New session" button, "Continue thread / Fresh start" toggle, current `release-N` indicator, link to preview deploy when ready.
- `src/screens/Live/index.jsx` — `/live` version-picker. Dropdown listing `release-*` tags newest-first with prompt summary + relative age. Click → `window.open(deployUrl, '_blank')`.
- `src/lib/builderClient.js` — wraps `POST /api/builder/prompt`, Supabase JWT propagation, Realtime subscription helper.

App-level routing: extend `App.jsx` to recognize `/builder` and `/live` paths (or use the existing path-based rewrite in `vercel.json`). The phone-frame wrapper is bypassed for these routes — they're admin tools, not the consumer app.

### 6.2 Backend additions (`api/`)

- `api/builder/prompt.js` — `POST`. Authn + allowlist → upsert session → insert prompt event → trigger `workflow_dispatch` with inputs `{prompt, session_id, mode, conversation_history_b64}`.
- `api/builder/webhook.js` — `POST`. HMAC-verify (`x-builder-signature` header). Write event row to `builder_events`. Idempotent on `(session_id, event_id)`.
- `api/builder/sessions.js` — `GET`. List the caller's sessions. `GET /api/builder/sessions/:id` returns the session + its events for hydration on page load.
- `api/live/versions.js` — `GET`. Lists `release-*` tags via GitHub API, looks up each tag's commit SHA, fetches the matching Vercel deployment URL via Vercel API. Cached 30s.
- `api/_lib/builderAuth.js` — shared Supabase JWT verify + email allowlist enforcement. Returns 401 if no JWT, 403 if email not in `BUILDER_ALLOWED_EMAILS`.

### 6.3 Supabase schema (new migration)

```sql
create table builder_sessions (
  id uuid primary key default gen_random_uuid(),
  created_by_email text not null,
  mode text not null check (mode in ('continue', 'fresh')) default 'continue',
  status text not null check (status in ('idle', 'running', 'error', 'done')) default 'idle',
  last_release_tag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table builder_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references builder_sessions(id) on delete cascade,
  ts timestamptz not null default now(),
  kind text not null check (kind in
    ('prompt','log','file_edit','commit','tag','deploy','error','done')),
  payload jsonb not null
);

create index builder_events_session_ts on builder_events (session_id, ts);
```

RLS policy: authenticated users can only `SELECT` / `INSERT` rows where `created_by_email = auth.jwt() ->> 'email'` (sessions) or the related session row matches that condition (events). This makes each user's sessions private to them. The allowlist (`BUILDER_ALLOWED_EMAILS` env var) is enforced separately in API code as the first gate — non-allowlisted emails never reach the database at all.

### 6.4 GitHub Actions (`.github/workflows/claude-builder.yml`)

Triggered by `workflow_dispatch`. Inputs:
- `prompt` (string, required)
- `session_id` (string, required)
- `mode` (string, `continue` | `fresh`)
- `conversation_history_b64` (string, base64-encoded JSON of prior events when `mode=continue`)

Concurrency:
```yaml
concurrency:
  group: release-latest
  cancel-in-progress: false
```

Steps (high level):
1. Checkout `release-latest` (create from `master` if missing).
2. Webhook: status=running.
3. Pre-flight guard: dump the current SHA of `.github/workflows/claude-builder.yml`, `api/builder/*`, `api/live/versions.js`, `api/_lib/builderAuth.js` for later comparison.
4. Run `anthropics/claude-code-action` with the prompt + conversation history. Wrap stdout/stderr to also post chunks to the webhook every N seconds.
5. **Builder-system guard:** if any of the pre-flight paths changed, abort with `error` (no commit, no push). This prevents the chat from rewriting its own auth.
6. `git add -A && git commit -m "release-{N}: {first 80 chars of prompt}"`.
7. Read latest `release-*` tag, compute next N, `git tag release-{N}`.
8. `git push origin release-latest --tags` (retry on conflict).
9. Webhook: status=committed, tag=release-N, sha=…
10. Poll Vercel API for the deployment matching the new SHA until READY (timeout 5 min).
11. Webhook: status=done, deployUrl=…
12. `if: failure()` step posts status=error with last log lines.

### 6.5 Vercel config

- Enable preview deploys for `release-latest` (or all branches).
- Env vars: `GITHUB_TOKEN_BUILDER`, `VERCEL_API_TOKEN`, `BUILDER_WEBHOOK_SECRET`, `BUILDER_ALLOWED_EMAILS`.
- Add rewrites for `/builder` and `/builder/:path*` to `/` (so React Router handles them — same pattern as the existing `/admin` and `/live` rewrites).

## 7. Error handling & edge cases

| Scenario | Handling |
|---|---|
| Two prompts overlap on `release-latest` | Workflow concurrency group queues them. UI shows "queued, waiting for prior run". |
| Tag numbering race | Action retries push on conflict up to 3 times, re-reading latest tag each retry. |
| Action fails mid-task | `if: failure()` step posts `{status: error, log: ...}` webhook. Chat shows red bubble + link to Action run. |
| Vercel deploy fails | `/live` row shows "build failed" badge instead of a link; `release-N` tag still exists for inspection. |
| Allowlist mismatch | API returns 403; UI shows "Not authorized — your email isn't on the builder allowlist." |
| Conversation history huge | "Continue thread" caps at last 20 prompts + their diff summaries; older context summarized into a single system note. |
| Webhook spoofing | HMAC over request body using `BUILDER_WEBHOOK_SECRET`. Reject if signature missing/invalid. |
| Lost SSE / page reload | Supabase Realtime auto-reconnects. UI re-hydrates from `builder_events` on mount before resubscribing. |
| Claude tries to edit builder system files | Pre-commit guard in the Action aborts the run with `error`. No commit, no push. |
| Vercel API returns no deployment for SHA | Poll retries for 5 min; if still missing, mark deploy=unknown but session=done. |
| Anthropic API key leaks | Key only ever exists inside the Action runtime. Vercel functions never see it. Rotate via GitHub Secrets. |

## 8. Open questions / things to revisit

- Should `/live` also be allowlist-gated, or public for sharing previews with stakeholders? Default: **allowlist-gated**, can relax later.
- Should the analyst be able to start new sessions, or only continue the owner's? Default: **full session control for allowlisted emails**. RLS keeps each user's sessions private to them (own `created_by_email`).
- How many `release-*` tags do we keep before pruning? Default: **all**, prune later if it becomes noisy.
- Conversation-history summarization strategy — naive truncation in v1, smarter summarization in v2.

## 9. Out of scope, captured for v2+

- Merge-to-master button (with confirmation).
- Diff preview before push.
- Comment-on-line / "fix this" pointing at a specific element on the running preview.
- Spend cap + monthly token budget.
- Multi-repo support.
- Per-path edit policies (e.g., "Claude can edit `src/` but not `api/`").
- Public read-only `/live` mode for sharing builds with stakeholders.

## 10. Implementation order (to be expanded by the writing-plans skill)

Rough phasing — the plan will detail each:

1. Supabase migration + RLS + allowlist env var.
2. `api/_lib/builderAuth.js` + `api/builder/prompt.js` stub (no workflow trigger yet — just records the prompt).
3. `/builder` UI: chat shell, prompt input, Supabase Realtime subscription, hydrate from events table.
4. `.github/workflows/claude-builder.yml` with builder-system guard.
5. Webhook endpoint + HMAC verification + event insertion.
6. Wire `api/builder/prompt.js` to actually trigger `workflow_dispatch`.
7. `api/live/versions.js` + `/live` UI.
8. End-to-end test: send a real prompt, verify branch + tag + deploy + version listed in `/live`.
9. Polish: error states, conversation-history compression, queued-prompt UI.
