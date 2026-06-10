# Chat Module — Design Spec

**Date:** 2026-06-09
**Status:** Approved (design), pending implementation
**Branch:** `feature/chat-module`

## Summary

Add a real, persisted, realtime **chat module** to Go Mama spanning three
surfaces:

1. **1:1 DMs** between two moms — *linear chat*.
2. **Group chats** (one per `GROUP_DISCUSSIONS` topic) — *threaded feed*
   (top-level posts → comments → likes).
3. **Place / Event / Things-to-do threads** — *threaded feed*, one conversation
   per subject, reusing the group-feed UI.

Today both 1:1 messaging (`messageHistory` in `App.jsx` + `MessageSheet`) and
group discussions (`GroupDiscussionSheet` seeded from `data/discussions.js`) are
**client-only** with no persistence. This module gives all three real backend
storage and live updates.

## Key decisions (from brainstorming)

| Decision | Choice | Why |
|---|---|---|
| Scope | Build all three surfaces in one module | User directive |
| Transport | **Supabase Realtime + RLS**, browser talks to Supabase directly | True push; chosen over polling |
| Identity | **Anonymous Supabase sessions** for everyone (`signInAnonymously`) | Realtime+RLS needs a real `auth.uid()` per user; also fixes the global "no session" problem (e.g. the Facebook link dead-end) |
| Interaction model | 1:1 = linear chat; group + subject = threaded feed (posts/comments/likes) | Matches today's `GroupDiscussionSheet` feel |
| Table shape | **Unified** `conversations` + `messages` + `reactions` + `participants` | Least duplication; all surfaces are the same data rendered two ways |

This is a **deliberate, scoped exception** to the project's service-role-only
data model (browser client is otherwise auth-only). Only the chat tables are
browser-accessible, and only through RLS policies keyed on `auth.uid()`.

## Architecture

```
Browser (anon or linked Supabase session, auth.uid())
  │
  ├─ src/lib/supabase.js   → signInAnonymously() if no session on load
  ├─ src/lib/chat.js       → the ONLY chat data interface (UI never calls supabase-js directly)
  │     • getOrCreateDM / getGroupConversation / getSubjectConversation
  │     • listMessages / sendMessage / toggleReaction / markRead
  │     • subscribe(conversationId, handlers)  ← Realtime channel
  │
  ▼  (RLS-enforced reads/writes + Realtime)
Supabase Postgres
  conversations · conversation_participants · messages · message_reactions
  + RPC get_or_create_dm(other_user_id)  [SECURITY DEFINER]
```

No new `api/` endpoints are required for chat send/read — RLS is the boundary.
The only server-side SQL artifact beyond tables/policies is the
`get_or_create_dm` function (atomic find-or-create to avoid duplicate DM rows).

## Data model

All tables get RLS enabled. `user_id` / `author_id` columns reference
`auth.uid()` (uuid). Migrations live in `supabase/_apply_phase8_chat.sql`.

### `conversations`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `kind` | text | `dm` \| `group` \| `subject` |
| `subject_type` | text null | `place` \| `event` \| `activity` (null for dm/group) |
| `subject_id` | text null | external id of the place/event/activity (null for dm/group) |
| `group_key` | text null | `GROUP_DISCUSSIONS[].id` for `group` rows (null otherwise) |
| `title` | text null | display title (group/subject) |
| `created_by` | uuid | `auth.uid()` |
| `created_at` | timestamptz | default now() |

- Uniqueness: one `group` per `group_key`; one `subject` per
  (`subject_type`,`subject_id`). DM canonicalization handled by the RPC + a
  unique index on the sorted participant pair (see below).

### `conversation_participants`
| column | type | notes |
|---|---|---|
| `conversation_id` | uuid fk | |
| `user_id` | uuid | `auth.uid()` |
| `role` | text | `member` \| `owner` |
| `joined_at` | timestamptz | default now() |
| `last_read_at` | timestamptz null | drives unread counts |

- PK (`conversation_id`,`user_id`).
- DM rows: exactly two participants. A unique index enforces one DM per pair:
  store a generated `dm_pair_key = least(a,b)||':'||greatest(a,b)` on the
  `conversations` row (only for `kind='dm'`) with a partial unique index.
- Subject feeds have **no** participant rows (open to any authenticated user).
- Group rows get a participant row when a user taps "Join group".

### `messages`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `conversation_id` | uuid fk | |
| `parent_id` | uuid null fk → messages.id | null = top-level post / DM line; set = comment |
| `author_id` | uuid | `auth.uid()` |
| `author_name` | text | **denormalized snapshot** at send time |
| `author_photo` | text null | denormalized snapshot |
| `body` | text | non-empty, length-capped (e.g. 2000) |
| `created_at` | timestamptz | default now() |
| `deleted_at` | timestamptz null | soft delete |

- Index on (`conversation_id`,`created_at`) and (`parent_id`,`created_at`).
- Denormalized author snapshot → rendering needs no join and works for anon
  users with no `mom_profile`. Editing a profile/linking an identity changes
  only *future* messages' snapshots (standard chat behavior).

### `message_reactions`
| column | type | notes |
|---|---|---|
| `message_id` | uuid fk | |
| `user_id` | uuid | `auth.uid()` |
| `kind` | text | `like` (only value in v1) |

- PK (`message_id`,`user_id`,`kind`).

### RLS policies (summary)

- **`conversations`**
  - SELECT: `kind='subject'` (any authenticated) OR caller is a participant
    (dm/group) OR caller is `created_by`.
  - INSERT: any authenticated user (with `created_by = auth.uid()`).
- **`conversation_participants`**
  - SELECT: rows for conversations you participate in.
  - INSERT: only your own row (`user_id = auth.uid()`); join group / be added to
    a DM you created.
  - UPDATE: only your own row (e.g. `last_read_at`).
- **`messages`**
  - SELECT: you can read the parent conversation (subject = any authenticated;
    dm/group = participant).
  - INSERT: authenticated AND (subject → any authenticated; dm/group →
    participant) AND `author_id = auth.uid()`.
  - UPDATE/DELETE: only your own (soft delete via `deleted_at`).
- **`message_reactions`**: INSERT/DELETE only your own (`user_id = auth.uid()`).

### `get_or_create_dm(other_user_id uuid) → uuid` (SECURITY DEFINER)

Returns the canonical DM conversation id for (`auth.uid()`, `other_user_id`),
creating it + both participant rows atomically if absent. Rejects DMs with a
blocked user (checks `mom_profiles.blocked_global` / block relationship).

## Client library — `src/lib/chat.js`

The single, well-bounded interface. UI components never import supabase-js for
chat; they use these functions only.

| function | purpose |
|---|---|
| `getMyUserId()` | current `auth.uid()` (after anon/real session) |
| `getOrCreateDM(otherUserId)` | RPC → DM conversation id |
| `getGroupConversation(groupKey, title)` | find-or-create `group` conversation |
| `getSubjectConversation(type, id, title)` | find-or-create `subject` conversation |
| `listMessages(conversationId, { parentId=null, limit, before })` | top-level posts or a post's comments, paginated |
| `sendMessage(conversationId, { body, parentId=null, author })` | insert with denormalized author snapshot |
| `toggleReaction(messageId)` | like/unlike (current user) |
| `markRead(conversationId)` | set participant `last_read_at` |
| `subscribe(conversationId, handlers)` | Realtime channel for message inserts/updates + reactions; returns unsubscribe fn |

`author` snapshot is sourced from the app's `profile`/`account`
(name, primary photo) at call sites.

## Session bootstrap

`src/lib/supabase.js` + an effect in `App.jsx`:

```
on load:
  if no session → supabase.auth.signInAnonymously()
  (sets auth.uid() for RLS + Realtime)
```

- Anonymous users can later `linkIdentity()` (Facebook/email) — same `auth.uid()`,
  upgraded in place. This supersedes the current `linkFacebook` session guard
  (the dead-end goes away because there is always a session).
- **Dashboard prerequisite:** enable **Authentication → Anonymous sign-ins** in
  Supabase. Documented here; cannot be toggled from code.

## Frontend integration

### A · 1:1 DM — refactor `MessageSheet`
- On open: `getOrCreateDM(momUserId)` → `listMessages` → `subscribe`.
- Sends persist via `sendMessage`; incoming lines arrive over Realtime.
- **Premium lever preserved exactly:** the **3-message free limit per mom**
  stays (`FREE_LIMIT = 3` in `MessageSheet`). It now counts the user's own
  persisted messages in that DM; `limitReached` still gates the composer and
  routes to `PremiumSheet`. No change to monetization behavior.
- Remove the client-only `messageHistory` map from `App.jsx` once the sheet
  reads from the backend.
- `momUserId` = the mom's `auth_user_id` (from her `mom_profile`). DMs to moms
  without an `auth_user_id` (pure seed rows) are disabled with a hint, or the
  seed is treated as a synthetic id — resolved during planning.

### B · Group chat — back `GroupDiscussionSheet` with real data
- Each `GROUP_DISCUSSIONS` topic ↔ a `group` conversation
  (`getGroupConversation(topic.id, topic.title)`).
- Existing posts/comments/likes UI stays; replace local seed state with
  `listMessages` (posts), `listMessages({parentId})` (comments),
  `toggleReaction` (likes), all Realtime.
- "Join group" → `conversation_participants` insert; open-join, one tap.

### C · Place / Event / Things-to-do threads — new feed
- Add a **"Discuss" entry point** to `PlaceDetailSheet`, `EventDetailSheet`, and
  the activity/EventDetail path.
- Opens a `subject` conversation
  (`getSubjectConversation('place'|'event'|'activity', id, title)`) rendered with
  the **shared feed component** extracted from `GroupDiscussionSheet`.

### Shared feed component
Extract the post/comment/like feed from `GroupDiscussionSheet` into a reusable
component used by both B and C, so the feed UI is defined once.

## Premium gating

- **1:1 DMs:** 3 free messages per mom, then Plus. Unchanged.
- **Group & subject feeds:** free (community surfaces; discussions are free
  today). The "shared ground is always free" principle is untouched.

## Out of scope for v1 (explicit YAGNI)

Live presence / typing indicators · push notifications · message search ·
edit history · media attachments · @mentions. Online counts stay static for v1
(live presence is a noted fast-follow). Blocking reuses the existing
`blocked_global` signal to exclude blocked users from DM creation; richer
moderation is a fast-follow.

## Testing

- **Pure logic (node:test, `*.test.mjs`)** — the repo runs `npm test`:
  - DM pair-key canonicalization (a,b == b,a → same key).
  - Free-limit counting logic for DMs (own messages only, 3-cap, premium bypass).
  - Message shaping/snapshot helpers; parent/child (post vs comment) grouping.
- **RLS** — SQL-level policy assertions where feasible (read/write allowed for
  participant, denied for non-participant; subject feeds readable by any
  authenticated user).
- **Manual** — two browser sessions (anon) exchanging a DM and posting in a
  group/subject feed, verifying realtime delivery and the 3-message gate.

## Rollout / prerequisites

1. Enable **Anonymous sign-ins** in the Supabase dashboard.
2. Apply `supabase/_apply_phase8_chat.sql` (tables + RLS + RPC).
3. Ensure the chat tables are added to the Realtime publication
   (`supabase_realtime`).
4. Ship client lib + UI behind the existing surfaces.

## Resolved defaults (revisit in the plan only if a blocker surfaces)

- **DM target identity for seed-only moms (no `auth_user_id`):** DMs require the
  target to have an `auth_user_id`. Seed-only moms (no auth row) show the DM
  action in a **disabled state** with a hint ("Not on Go Mama yet"). No
  synthetic ids in v1 — keeps `author_id`/`participant.user_id` strictly
  `auth.uid()`-backed for RLS integrity.
- **Order/pagination:** feeds (group + subject) render **top-level posts
  newest-first**, comments under a post **oldest-first**; linear DM chat renders
  **oldest-first (chronological)**. Page size 30, "load older" via `before`
  cursor on `created_at`.
- **Block source for `get_or_create_dm`:** v1 uses the existing
  `mom_profiles.blocked_global` flag (a globally-hidden mom can't be DM'd). No
  per-user block table is assumed; introducing one is a fast-follow.
