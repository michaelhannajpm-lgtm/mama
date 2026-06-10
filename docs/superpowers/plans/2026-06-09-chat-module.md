# Chat Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted, realtime chat module with three surfaces — 1:1 DMs (linear), group chats and place/event/things-to-do threads (feed) — backed by Supabase Realtime + RLS over anonymous sessions.

**Architecture:** The browser talks to Supabase directly for chat (RLS is the security boundary — a scoped exception to the otherwise service-role-only model). Every user gets a real `auth.uid()` via `signInAnonymously()`. A unified data model (`conversations` + `messages` + `message_reactions` + `conversation_participants`) serves all three surfaces. A single client lib `src/lib/chat.js` is the only place UI touches supabase-js for chat; pure logic lives in `src/lib/chat-helpers.js` (unit-tested).

**Tech Stack:** Vite + React 18, `@supabase/supabase-js` v2 (Realtime + RLS), Supabase Postgres, `node --test` (`*.test.mjs`).

**Spec:** `docs/superpowers/specs/2026-06-09-chat-module-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/_apply_phase8_chat.sql` (new) | Tables, indexes, RLS policies, `get_or_create_dm` RPC, realtime publication |
| `src/lib/chat-helpers.js` (new) | Pure helpers: DM pair key, free-limit counting, message tree grouping, author snapshot — no I/O |
| `src/lib/chat-helpers.test.mjs` (new) | node:test coverage for the helpers |
| `src/lib/supabase.js` (modify) | Add `ensureSession()` (anonymous sign-in) + `getUserId()` |
| `src/lib/chat.js` (new) | The only chat data interface (conversations, messages, reactions, realtime) |
| `src/App.jsx` (modify) | Anonymous-session bootstrap effect; pass `author` snapshot; remove `messageHistory` |
| `src/sheets/MessageSheet.jsx` (modify) | 1:1 DM backed by `chat.js`; preserve 3-message free limit |
| `src/components/ConversationFeed.jsx` (new) | Shared feed UI (posts → comments → likes) for group + subject surfaces |
| `src/sheets/GroupDiscussionSheet.jsx` (modify) | Group chat backed by `chat.js`, rendering `ConversationFeed` |
| `src/sheets/SubjectThreadSheet.jsx` (new) | Opens a `subject` conversation, renders `ConversationFeed` |
| `src/sheets/PlaceDetailSheet.jsx` / `EventDetailSheet.jsx` (modify) | "Discuss" entry point → `SubjectThreadSheet` |

**Testing reality:** this repo has no React test runner — only `node --test` over `*.test.mjs`. So *pure logic* (`chat-helpers.js`) is TDD'd with real failing-tests-first; *SQL* and *React* changes are verified via `npm run build` + documented manual steps. Do not invent a React testing harness.

---

## Task 1: Backend schema, RLS & RPC (SQL)

**Files:**
- Create: `supabase/_apply_phase8_chat.sql`

This SQL is applied manually (Supabase SQL editor / MCP `execute_sql` / psql), like the other `supabase/_apply_phase*.sql` files. It is not run by the app.

- [ ] **Step 1: Write the migration file**

Create `supabase/_apply_phase8_chat.sql` with exactly this content:

```sql
-- Phase 8 — Chat module. Browser-accessible (RLS-protected) tables for 1:1 DMs,
-- group chats, and place/event/activity threads. UNLIKE the service-role-only
-- tables, these are read/written by the browser supabase client under RLS keyed
-- on auth.uid() (anonymous or linked sessions). Apply once.

-- ---------- tables ----------
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('dm','group','subject')),
  subject_type text check (subject_type in ('place','event','activity')),
  subject_id   text,
  group_key    text,
  title        text,
  dm_pair_key  text,
  created_by   uuid not null default auth.uid(),
  created_at   timestamptz not null default now()
);

-- one group per topic, one subject per (type,id), one dm per pair
create unique index if not exists conversations_group_key_uniq
  on public.conversations (group_key) where kind = 'group';
create unique index if not exists conversations_subject_uniq
  on public.conversations (subject_type, subject_id) where kind = 'subject';
create unique index if not exists conversations_dm_pair_uniq
  on public.conversations (dm_pair_key) where kind = 'dm';

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null,
  role            text not null default 'member' check (role in ('member','owner')),
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  parent_id       uuid references public.messages(id) on delete cascade,
  author_id       uuid not null default auth.uid(),
  author_name     text not null,
  author_photo    text,
  body            text not null check (length(body) between 1 and 2000),
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index if not exists messages_conv_created_idx on public.messages (conversation_id, created_at);
create index if not exists messages_parent_created_idx on public.messages (parent_id, created_at);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id    uuid not null,
  kind       text not null default 'like' check (kind = 'like'),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, kind)
);

-- ---------- helper: am I a participant? (avoids RLS recursion) ----------
create or replace function public.is_participant(conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants p
    where p.conversation_id = conv and p.user_id = auth.uid()
  );
$$;

-- ---------- RLS ----------
alter table public.conversations            enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages                 enable row level security;
alter table public.message_reactions        enable row level security;

-- conversations
create policy conv_select on public.conversations for select to authenticated
  using (kind = 'subject' or created_by = auth.uid() or public.is_participant(id));
create policy conv_insert on public.conversations for insert to authenticated
  with check (created_by = auth.uid());

-- participants
create policy part_select on public.conversation_participants for select to authenticated
  using (user_id = auth.uid() or public.is_participant(conversation_id));
create policy part_insert on public.conversation_participants for insert to authenticated
  with check (user_id = auth.uid());
create policy part_update on public.conversation_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- messages
create policy msg_select on public.messages for select to authenticated
  using (
    exists (select 1 from public.conversations c where c.id = conversation_id
            and (c.kind = 'subject' or public.is_participant(c.id)))
  );
create policy msg_insert on public.messages for insert to authenticated
  with check (
    author_id = auth.uid() and
    exists (select 1 from public.conversations c where c.id = conversation_id
            and (c.kind = 'subject' or public.is_participant(c.id)))
  );
create policy msg_update on public.messages for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- reactions
create policy react_select on public.message_reactions for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id));
create policy react_write on public.message_reactions for insert to authenticated
  with check (user_id = auth.uid());
create policy react_delete on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());

-- ---------- RPC: canonical DM find-or-create ----------
create or replace function public.get_or_create_dm(other_user_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  pair text;
  conv uuid;
  blocked boolean;
begin
  if me is null or other_user_id is null or me = other_user_id then
    raise exception 'invalid dm participants';
  end if;
  select coalesce(bool_or(blocked_global), false) into blocked
    from public.mom_profiles where auth_user_id = other_user_id;
  if blocked then raise exception 'user unavailable'; end if;

  pair := least(me::text, other_user_id::text) || ':' || greatest(me::text, other_user_id::text);
  select id into conv from public.conversations where kind = 'dm' and dm_pair_key = pair;
  if conv is null then
    insert into public.conversations (kind, dm_pair_key, created_by)
      values ('dm', pair, me) returning id into conv;
    insert into public.conversation_participants (conversation_id, user_id)
      values (conv, me), (conv, other_user_id);
  end if;
  return conv;
end;
$$;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

-- ---------- realtime ----------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
```

- [ ] **Step 2: Commit the migration**

```bash
git add supabase/_apply_phase8_chat.sql
git commit -m "feat(chat): phase 8 SQL — chat tables, RLS, get_or_create_dm RPC"
```

- [ ] **Step 3: Apply + manually verify (document, do not automate)**

Apply via Supabase SQL editor or MCP `execute_sql`. Then in the dashboard:
- **Authentication → Sign In / Providers → enable Anonymous sign-ins.**
- Confirm `messages` + `message_reactions` are in the `supabase_realtime` publication (Database → Publications).
Record completion in the PR description. (No code change in this step.)

---

## Task 2: Pure helpers — DM pair key (TDD)

**Files:**
- Create: `src/lib/chat-helpers.js`
- Test: `src/lib/chat-helpers.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `src/lib/chat-helpers.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dmPairKey } from './chat-helpers.js';

test('dmPairKey is order-independent and colon-joined sorted', () => {
  assert.equal(dmPairKey('b', 'a'), 'a:b');
  assert.equal(dmPairKey('a', 'b'), 'a:b');
});

test('dmPairKey returns null for missing or identical ids', () => {
  assert.equal(dmPairKey('a', 'a'), null);
  assert.equal(dmPairKey('a', null), null);
  assert.equal(dmPairKey(undefined, 'b'), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/lib/chat-helpers.test.mjs`
Expected: FAIL — cannot find module / `dmPairKey is not a function`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/chat-helpers.js`:

```js
// Pure chat logic — no I/O, no supabase. Unit-tested in chat-helpers.test.mjs.

// Canonical, order-independent key for a DM pair. Mirrors the SQL
// get_or_create_dm pairing so client + server agree. null when invalid.
export const dmPairKey = (a, b) => {
  if (!a || !b || a === b) return null;
  return a < b ? `${a}:${b}` : `${b}:${a}`;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/lib/chat-helpers.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat-helpers.js src/lib/chat-helpers.test.mjs
git commit -m "feat(chat): dmPairKey helper + tests"
```

---

## Task 3: Pure helpers — free-limit + message tree (TDD)

**Files:**
- Modify: `src/lib/chat-helpers.js`
- Modify: `src/lib/chat-helpers.test.mjs`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/chat-helpers.test.mjs`:

```js
import { dmFreeState, buildThread } from './chat-helpers.js';

test('dmFreeState counts only my own messages against the 3-cap', () => {
  const msgs = [
    { author_id: 'me' }, { author_id: 'her' }, { author_id: 'me' },
  ];
  const s = dmFreeState(msgs, 'me', false);
  assert.equal(s.used, 2);
  assert.equal(s.remaining, 1);
  assert.equal(s.limitReached, false);
});

test('dmFreeState locks at 3 sent and premium bypasses entirely', () => {
  const mine = [{ author_id: 'me' }, { author_id: 'me' }, { author_id: 'me' }];
  assert.equal(dmFreeState(mine, 'me', false).limitReached, true);
  const premium = dmFreeState(mine, 'me', true);
  assert.equal(premium.limitReached, false);
  assert.equal(premium.remaining, Infinity);
});

test('buildThread nests comments under their parent post, drops deleted', () => {
  const rows = [
    { id: 'p1', parent_id: null, body: 'post', created_at: '2026-06-09T10:00:00Z' },
    { id: 'c1', parent_id: 'p1', body: 'reply', created_at: '2026-06-09T10:01:00Z' },
    { id: 'p2', parent_id: null, body: 'gone', created_at: '2026-06-09T09:00:00Z', deleted_at: 'x' },
  ];
  const tree = buildThread(rows);
  assert.equal(tree.length, 1);                 // p2 dropped (deleted)
  assert.equal(tree[0].id, 'p1');
  assert.equal(tree[0].comments.length, 1);
  assert.equal(tree[0].comments[0].id, 'c1');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test src/lib/chat-helpers.test.mjs`
Expected: FAIL — `dmFreeState`/`buildThread` not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/chat-helpers.js`:

```js
// 1:1 DM free-tier state. FREE_LIMIT is the protected 3-message lever
// (see CLAUDE.md / premium-model.md — do not change without product sign-off).
export const DM_FREE_LIMIT = 3;

export const dmFreeState = (messages = [], myUserId, isPremium = false) => {
  const used = messages.filter((m) => m.author_id === myUserId).length;
  if (isPremium) return { used, remaining: Infinity, limitReached: false };
  const remaining = Math.max(0, DM_FREE_LIMIT - used);
  return { used, remaining, limitReached: remaining <= 0 };
};

// Group flat message rows into a feed tree: top-level posts (parent_id=null)
// each carrying their comments. Soft-deleted rows are dropped. Posts newest-
// first; comments oldest-first.
export const buildThread = (rows = []) => {
  const live = rows.filter((r) => !r.deleted_at);
  const posts = live.filter((r) => !r.parent_id)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const byParent = new Map();
  for (const r of live) {
    if (!r.parent_id) continue;
    if (!byParent.has(r.parent_id)) byParent.set(r.parent_id, []);
    byParent.get(r.parent_id).push(r);
  }
  return posts.map((p) => ({
    ...p,
    comments: (byParent.get(p.id) || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
  }));
};
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test src/lib/chat-helpers.test.mjs`
Expected: PASS (all 5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/chat-helpers.js src/lib/chat-helpers.test.mjs
git commit -m "feat(chat): dmFreeState + buildThread helpers + tests"
```

---

## Task 4: Anonymous-session bootstrap

**Files:**
- Modify: `src/lib/supabase.js`
- Modify: `src/App.jsx` (the existing auth `useEffect` near the `promoteSession` hydrate, ~lines 207-269)

- [ ] **Step 1: Add session helpers to `src/lib/supabase.js`**

Replace the file body's export section so it reads (keep the existing `createClient` block; add below it):

```js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

export const isSupabaseReady = () => supabase !== null;

// Guarantee a session so RLS + Realtime work for everyone. Returns the user id
// (auth.uid()) or null if auth isn't configured. Anonymous users can later
// linkIdentity() to upgrade in place (same uid).
export const ensureSession = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data?.session?.user) return data.session.user.id;
  const { data: anon, error } = await supabase.auth.signInAnonymously();
  if (error) return null;
  return anon?.user?.id || null;
};

export const getUserId = async () => {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
};
```

- [ ] **Step 2: Call `ensureSession()` on app load**

In `src/App.jsx`, locate the auth bootstrap `useEffect` (the one that calls `hydrate()` / subscribes via `onAuthChange`). Add an import at the top with the other lib imports:

```js
import { ensureSession } from './lib/supabase';
```

Inside that effect, before `hydrate();`, call:

```js
    // Guarantee a session (anonymous if needed) so chat RLS + Realtime work.
    ensureSession();
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.js src/App.jsx
git commit -m "feat(chat): ensure an (anonymous) Supabase session on load"
```

---

## Task 5: Client lib `src/lib/chat.js`

**Files:**
- Create: `src/lib/chat.js`

- [ ] **Step 1: Write the client lib**

Create `src/lib/chat.js`:

```js
// The ONLY chat data interface. UI never imports supabase-js for chat — it
// calls these. Reads/writes go directly to Supabase under RLS (anon/linked
// session). Realtime via .channel(). See the design spec for the model.
import { supabase, ensureSession } from './supabase';

const need = () => {
  if (!supabase) throw new Error('Chat not configured');
};

export const getMyUserId = () => ensureSession();

// ---- conversations ----
export const getOrCreateDM = async (otherUserId) => {
  need();
  await ensureSession();
  const { data, error } = await supabase.rpc('get_or_create_dm', { other_user_id: otherUserId });
  if (error) throw error;
  return data; // conversation id
};

const findOrCreateConversation = async (match, insert) => {
  need();
  await ensureSession();
  const { data: found } = await supabase
    .from('conversations').select('id').match(match).maybeSingle();
  if (found) return found.id;
  const { data: made, error } = await supabase
    .from('conversations').insert(insert).select('id').single();
  if (error) {
    // lost an insert race → re-read
    const { data: again } = await supabase
      .from('conversations').select('id').match(match).maybeSingle();
    if (again) return again.id;
    throw error;
  }
  return made.id;
};

export const getGroupConversation = (groupKey, title) =>
  findOrCreateConversation({ kind: 'group', group_key: groupKey },
    { kind: 'group', group_key: groupKey, title });

export const getSubjectConversation = (subjectType, subjectId, title) =>
  findOrCreateConversation({ kind: 'subject', subject_type: subjectType, subject_id: String(subjectId) },
    { kind: 'subject', subject_type: subjectType, subject_id: String(subjectId), title });

export const joinConversation = async (conversationId) => {
  need();
  const uid = await ensureSession();
  await supabase.from('conversation_participants')
    .upsert({ conversation_id: conversationId, user_id: uid }, { onConflict: 'conversation_id,user_id' });
};

// ---- messages ----
export const listMessages = async (conversationId, { parentId = null, limit = 200 } = {}) => {
  need();
  await ensureSession();
  let q = supabase.from('messages')
    .select('id,conversation_id,parent_id,author_id,author_name,author_photo,body,created_at,deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  q = parentId === null ? q.is('parent_id', null) : q.eq('parent_id', parentId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

// For feed surfaces: fetch all rows (posts + comments) so buildThread can nest.
export const listThread = async (conversationId, { limit = 500 } = {}) => {
  need();
  await ensureSession();
  const { data, error } = await supabase.from('messages')
    .select('id,conversation_id,parent_id,author_id,author_name,author_photo,body,created_at,deleted_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

export const sendMessage = async (conversationId, { body, parentId = null, author }) => {
  need();
  const uid = await ensureSession();
  const row = {
    conversation_id: conversationId,
    parent_id: parentId,
    author_id: uid,
    author_name: author?.name || 'Mama',
    author_photo: author?.photo || null,
    body: body.trim(),
  };
  const { data, error } = await supabase.from('messages').insert(row).select().single();
  if (error) throw error;
  return data;
};

// ---- reactions ----
export const listReactions = async (messageIds = []) => {
  need();
  if (!messageIds.length) return [];
  await ensureSession();
  const { data, error } = await supabase.from('message_reactions')
    .select('message_id,user_id,kind').in('message_id', messageIds);
  if (error) throw error;
  return data || [];
};

export const toggleReaction = async (messageId) => {
  need();
  const uid = await ensureSession();
  const { data: existing } = await supabase.from('message_reactions')
    .select('message_id').eq('message_id', messageId).eq('user_id', uid).maybeSingle();
  if (existing) {
    await supabase.from('message_reactions').delete()
      .eq('message_id', messageId).eq('user_id', uid);
    return false;
  }
  await supabase.from('message_reactions')
    .insert({ message_id: messageId, user_id: uid, kind: 'like' });
  return true;
};

// ---- read state ----
export const markRead = async (conversationId) => {
  need();
  const uid = await ensureSession();
  await supabase.from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId).eq('user_id', uid);
};

// ---- realtime ----
// handlers: { onMessage(row), onReaction(row, eventType) }. Returns unsubscribe.
export const subscribe = (conversationId, handlers = {}) => {
  if (!supabase) return () => {};
  const ch = supabase.channel(`conv:${conversationId}`)
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => handlers.onMessage?.(payload.new || payload.old, payload.eventType))
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'message_reactions' },
      (payload) => handlers.onReaction?.(payload.new || payload.old, payload.eventType))
    .subscribe();
  return () => { supabase.removeChannel(ch); };
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds (no consumers yet, just compile).

- [ ] **Step 3: Commit**

```bash
git add src/lib/chat.js
git commit -m "feat(chat): chat.js client lib (conversations, messages, reactions, realtime)"
```

---

## Task 6: 1:1 DM — back `MessageSheet` with `chat.js`

**Files:**
- Modify: `src/sheets/MessageSheet.jsx`
- Modify: `src/App.jsx` (the `MessageSheet` render + props; remove `messageHistory` plumbing)

The current `MessageSheet` takes `history` (client-only) + `onSend`. Replace its data source with `chat.js` while keeping the 3-message UI/gate intact via `dmFreeState`.

- [ ] **Step 1: Rewrite `MessageSheet` data flow**

In `src/sheets/MessageSheet.jsx`:
- Add imports:

```js
import { useEffect, useRef, useState } from 'react';
import { getOrCreateDM, listMessages, sendMessage, subscribe } from '../lib/chat';
import { dmFreeState, DM_FREE_LIMIT } from '../lib/chat-helpers';
```

- Replace the component signature + state. The component now receives
  `mom`, `isPremium`, `author` ({ name, photo }), `myUserId`, `onClose`,
  `openPremium`, `flash`. Internally:

```js
export const MessageSheet = ({ mom, isPremium, author, myUserId, onClose, openPremium, flash }) => {
  const FREE_LIMIT = DM_FREE_LIMIT; // 3 — protected lever, see CLAUDE.md
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [unavailable, setUnavailable] = useState(!mom?.auth_user_id);
  const endRef = useRef(null);

  // Open (or create) the DM and load history; subscribe for live lines.
  useEffect(() => {
    if (!mom?.auth_user_id) { setUnavailable(true); return; }
    let unsub = () => {};
    (async () => {
      try {
        const id = await getOrCreateDM(mom.auth_user_id);
        setConvId(id);
        setMessages(await listMessages(id));
        unsub = subscribe(id, {
          onMessage: (row) => setMessages((cur) =>
            cur.some((m) => m.id === row.id) ? cur : [...cur, row]),
        });
      } catch {
        setUnavailable(true);
      }
    })();
    return () => unsub();
  }, [mom?.auth_user_id]);

  const free = dmFreeState(messages, myUserId, isPremium);
  const limitReached = free.limitReached;
  const canSend = text.trim().length > 0 && !limitReached && convId;

  const handleSend = async () => {
    if (!canSend) return;
    const body = text.trim();
    setText('');
    try {
      const row = await sendMessage(convId, { body, author });
      setMessages((cur) => cur.some((m) => m.id === row.id) ? cur : [...cur, row]);
    } catch {
      flash?.('Could not send');
    }
  };
```

- Keep the existing header / free-counter / composer JSX, but:
  - Drive the counter dots + "N free messages left" from `free.used` / `free.remaining` / `limitReached` (same visual, new source).
  - Render `messages` chronologically (oldest→newest): each line shows
    `m.author_name`, `m.body`, aligned right when `m.author_id === myUserId`.
  - Replace the seeded default-text behavior: only prefill the icebreaker when
    `messages.length === 0`.
  - When `unavailable`, show a centered note: "Not on Go Mama yet — you can't
    message {firstName} just yet." and hide the composer.

- [ ] **Step 2: Update `App.jsx` to pass the new props and drop `messageHistory`**

In `src/App.jsx`:
- Remove `const [messageHistory, setMessageHistory] = useState({});` and every
  `messageHistory` / `setMessageHistory` reference (the `MessageSheet` `onSend`
  handler block, and the `messageHistory={...}` props passed to `MainApp`/sheets).
- Add a derived author snapshot near other derived values:

```js
const chatAuthor = { name: account?.firstName || profile?.firstName || 'Mama', photo: profile?.photos?.[0] || null };
const [myUserId, setMyUserId] = useState(null);
```

- In the existing auth bootstrap effect, after `ensureSession()`, capture the id:

```js
    ensureSession().then(setMyUserId);
```

- Replace the `MessageSheet` render with:

```jsx
{messageMom && <MessageSheet
  mom={messageMom}
  isPremium={!!account?.isPremium}
  author={chatAuthor}
  myUserId={myUserId}
  flash={flash}
  onClose={() => setMessageMom(null)}
  openPremium={() => { setMessageMom(null); setPremiumOpen(true); }}/>}
```

- For any component that still expects a `messageHistory` prop (e.g. `MainApp`,
  `MyVillageSheet`), remove that prop and the now-dead per-mom message-count
  reads. Where a "messages used" count was shown, derive nothing for v1 (the
  count now lives server-side); leave the UI without the stale client count.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds; grep shows no remaining `messageHistory`:
`grep -rn "messageHistory" src` → no results.

- [ ] **Step 4: Commit**

```bash
git add src/sheets/MessageSheet.jsx src/App.jsx
git commit -m "feat(chat): persist 1:1 DMs via chat.js, keep 3-message free limit"
```

---

## Task 7: Shared `ConversationFeed` component

**Files:**
- Create: `src/components/ConversationFeed.jsx`

Extract the post/comment/like feed UI so group + subject surfaces share it. It
renders from `chat.js` data using `buildThread`.

- [ ] **Step 1: Create the component**

Create `src/components/ConversationFeed.jsx`:

```js
import { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Send, MessageCircle } from 'lucide-react';
import { C } from '../theme';
import { listThread, listReactions, sendMessage, toggleReaction, subscribe } from '../lib/chat';
import { buildThread } from '../lib/chat-helpers';

// Threaded feed (posts → comments → likes) for group + subject conversations.
// `conversationId` must already exist (caller find-or-creates it). `author` is
// the { name, photo } snapshot. `myUserId` aligns ownership + like state.
export const ConversationFeed = ({ conversationId, author, myUserId, placeholder = 'Share with the group…', flash }) => {
  const [rows, setRows] = useState([]);
  const [likes, setLikes] = useState([]);   // {message_id,user_id}
  const [composer, setComposer] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  const refresh = async () => {
    const data = await listThread(conversationId);
    setRows(data);
    setLikes(await listReactions(data.map((r) => r.id)));
  };

  useEffect(() => {
    if (!conversationId) return;
    let unsub = () => {};
    (async () => {
      await refresh();
      unsub = subscribe(conversationId, { onMessage: refresh, onReaction: refresh });
    })();
    return () => unsub();
  }, [conversationId]);

  const tree = useMemo(() => buildThread(rows), [rows]);
  const likeCount = (id) => likes.filter((l) => l.message_id === id).length;
  const iLiked = (id) => likes.some((l) => l.message_id === id && l.user_id === myUserId);

  const post = async (parentId = null) => {
    const body = composer.trim();
    if (!body) return;
    setComposer('');
    try { await sendMessage(conversationId, { body, parentId, author }); await refresh(); }
    catch { flash?.('Could not post'); }
  };
  const like = async (id) => { try { await toggleReaction(id); await refresh(); } catch { /* ignore */ } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* composer */}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={composer}
          onChange={(e) => setComposer(e.target.value)}
          placeholder={replyTo ? 'Write a reply…' : placeholder}
          style={{ flex: 1, border: `1px solid ${C.divider}`, borderRadius: 12, padding: '10px 12px',
                   fontFamily: 'Albert Sans', fontSize: 13, outline: 'none' }}/>
        <button onClick={() => post(replyTo)} aria-label="Post" style={{
          background: `linear-gradient(135deg, ${C.coral}, ${C.coralDeep})`, color: '#fff',
          border: 'none', borderRadius: 12, padding: '0 14px', cursor: 'pointer' }}>
          <Send size={16}/>
        </button>
      </div>
      {replyTo && (
        <button onClick={() => setReplyTo(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none',
          color: C.muted, fontFamily: 'Albert Sans', fontSize: 11, cursor: 'pointer' }}>
          Replying to a post · cancel
        </button>
      )}

      {/* posts */}
      {tree.map((p) => (
        <div key={p.id} style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 14, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {p.author_photo
              ? <img src={p.author_photo} alt="" style={{ width: 30, height: 30, borderRadius: 15, objectFit: 'cover' }}/>
              : <div style={{ width: 30, height: 30, borderRadius: 15, background: C.coralSoft }}/>}
            <div style={{ fontFamily: 'Albert Sans', fontSize: 12, fontWeight: 700, color: C.navy }}>{p.author_name}</div>
          </div>
          <div style={{ fontFamily: 'Albert Sans', fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 1.4 }}>{p.body}</div>
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
            <button onClick={() => like(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none',
              border: 'none', cursor: 'pointer', color: iLiked(p.id) ? C.coralDeep : C.muted,
              fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700 }}>
              <Heart size={13} fill={iLiked(p.id) ? C.coralDeep : 'none'}/> {likeCount(p.id)}
            </button>
            <button onClick={() => setReplyTo(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none',
              border: 'none', cursor: 'pointer', color: C.muted, fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700 }}>
              <MessageCircle size={13}/> {p.comments.length}
            </button>
          </div>
          {/* comments */}
          {p.comments.map((c) => (
            <div key={c.id} style={{ marginTop: 8, marginLeft: 12, paddingLeft: 10, borderLeft: `2px solid ${C.line}` }}>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 11, fontWeight: 700, color: C.navy }}>{c.author_name}</div>
              <div style={{ fontFamily: 'Albert Sans', fontSize: 12, color: C.inkSoft, marginTop: 2 }}>{c.body}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ConversationFeed.jsx
git commit -m "feat(chat): shared ConversationFeed (posts/comments/likes) component"
```

---

## Task 8: Group chat — back `GroupDiscussionSheet`

**Files:**
- Modify: `src/sheets/GroupDiscussionSheet.jsx`

Replace the local seeded post/comment/like state with a real `group`
conversation rendered by `ConversationFeed`. Keep the header (title, member
counter, Join toggle) and the surrounding `Sheet` chrome.

- [ ] **Step 1: Wire the group conversation**

In `src/sheets/GroupDiscussionSheet.jsx`:
- Add imports:

```js
import { useEffect, useState } from 'react';
import { getGroupConversation, joinConversation } from '../lib/chat';
import { ConversationFeed } from '../components/ConversationFeed';
```

- At the top of the component body, resolve the conversation:

```js
  const [convId, setConvId] = useState(null);
  useEffect(() => {
    if (!discussion?.id) return;
    getGroupConversation(discussion.id, discussion.title).then(setConvId).catch(() => {});
  }, [discussion?.id]);
```

- Replace the seeded-posts block and the local composer/post/like handlers with,
  inside the scroll area where posts used to render:

```jsx
{convId && (
  <ConversationFeed
    conversationId={convId}
    author={author}
    myUserId={myUserId}
    placeholder={`Share with ${discussion.title}…`}
    flash={flash}/>
)}
```

- Make "Join group" persist:

```js
  const handleJoin = async () => {
    if (convId) await joinConversation(convId);
    onToggleJoin?.();   // keep existing local joined state for the chip
  };
```

  and point the Join button's `onClick` at `handleJoin`.

- Add `author`, `myUserId`, `flash` to the component's props (thread them from
  the callers in Step 2). Remove the now-unused seeded `posts` state and the
  `post()`/`reply()`/`like()` local handlers and `data/discussions.js` post
  imports that are no longer referenced (keep the topic metadata import).

- [ ] **Step 2: Pass `author` / `myUserId` from callers**

`GroupDiscussionSheet` is rendered in `src/screens/MainApp/index.jsx` and
`src/screens/MainApp/ConnectTab.jsx` (via `hubDiscussion` / `selectedDiscussion`).
At each render site add:

```jsx
author={chatAuthor} myUserId={myUserId} flash={flash}
```

These come from `App.jsx` (Task 6) threaded through `MainApp` props. Add
`chatAuthor` + `myUserId` to the `MainApp` prop list and pass them down (mirror
how `flash` is already threaded). In `ConnectTab`, accept `author`/`myUserId`
props and forward.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/sheets/GroupDiscussionSheet.jsx src/screens/MainApp/index.jsx src/screens/MainApp/ConnectTab.jsx
git commit -m "feat(chat): persist group discussions via ConversationFeed"
```

---

## Task 9: Subject threads — `SubjectThreadSheet` + entry points

**Files:**
- Create: `src/sheets/SubjectThreadSheet.jsx`
- Modify: `src/sheets/PlaceDetailSheet.jsx`
- Modify: `src/sheets/EventDetailSheet.jsx`
- Modify: `src/screens/MainApp/index.jsx` (state to open the sheet)

- [ ] **Step 1: Create `SubjectThreadSheet`**

Create `src/sheets/SubjectThreadSheet.jsx`:

```js
import { useEffect, useState } from 'react';
import { C } from '../theme';
import { Sheet } from '../components/Sheet';
import { ConversationFeed } from '../components/ConversationFeed';
import { getSubjectConversation } from '../lib/chat';

// A discussion thread attached to a place / event / activity. `subject` is
// { type:'place'|'event'|'activity', id, title }.
export const SubjectThreadSheet = ({ subject, author, myUserId, flash, onClose }) => {
  const [convId, setConvId] = useState(null);
  useEffect(() => {
    if (!subject?.id) return;
    getSubjectConversation(subject.type, subject.id, subject.title).then(setConvId).catch(() => {});
  }, [subject?.type, subject?.id]);

  return (
    <Sheet onClose={onClose} tall>
      <div className="px-5 pt-1 pb-6">
        <div className="text-[11px] tracking-[.18em] uppercase" style={{ color: C.coral, fontFamily: 'Albert Sans', fontWeight: 700 }}>
          Discussion
        </div>
        <h3 className="mt-1.5" style={{ fontFamily: 'Fraunces', fontSize: 20, fontWeight: 600, color: C.navy }}>
          {subject?.title}
        </h3>
        <div style={{ marginTop: 14 }}>
          {convId && <ConversationFeed
            conversationId={convId} author={author} myUserId={myUserId}
            placeholder={`Ask or share about ${subject?.title}…`} flash={flash}/>}
        </div>
      </div>
    </Sheet>
  );
};
```

- [ ] **Step 2: Add a "Discuss" button to `PlaceDetailSheet` and `EventDetailSheet`**

Both sheets receive an `onDiscuss` callback prop. Add a button in each sheet's
action area:

```jsx
{onDiscuss && (
  <button onClick={onDiscuss} className="active:scale-[.98] transition-transform" style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    width: '100%', padding: '11px', borderRadius: 12, marginTop: 8,
    background: C.sage, color: C.sageDark, border: `1px solid ${C.sageDark}33`,
    fontFamily: 'Albert Sans', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
    <MessageCircle size={15}/> Discuss this {/* place / event */}
  </button>
)}
```

Import `MessageCircle` from `lucide-react` in each sheet if not already present.

- [ ] **Step 3: Open `SubjectThreadSheet` from `MainApp`**

In `src/screens/MainApp/index.jsx`:
- Add state: `const [subjectThread, setSubjectThread] = useState(null);`
- Where `PlaceDetailSheet` / `EventDetailSheet` are rendered (in the tabs or via
  their open state), pass an `onDiscuss` that sets the subject, e.g. for a place:

```js
onDiscuss={() => setSubjectThread({ type: 'place', id: place.id, title: place.name })}
```

  and for an event: `{ type: 'event', id: ev.id, title: ev.title }`.
  (HomeTab already opens these detail sheets — thread the same `onDiscuss` down,
  or open `SubjectThreadSheet` directly from HomeTab's place/event handlers.)
- Render the sheet near the other stacked sheets:

```jsx
{subjectThread && <SubjectThreadSheet
  subject={subjectThread} author={chatAuthor} myUserId={myUserId} flash={flash}
  onClose={() => setSubjectThread(null)}/>}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/sheets/SubjectThreadSheet.jsx src/sheets/PlaceDetailSheet.jsx src/sheets/EventDetailSheet.jsx src/screens/MainApp/index.jsx
git commit -m "feat(chat): place/event discussion threads via SubjectThreadSheet"
```

---

## Task 10: Final verification

**Files:** none (verification + docs)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new `chat-helpers.test.mjs` cases.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual smoke (document results in the PR)**

With Anonymous sign-ins enabled and the SQL applied:
- Open the app in two browsers (two anon users). Confirm:
  - 1:1 DM: messages persist + appear live in the other window; the 3rd→4th
    message gates a non-Plus sender to `PremiumSheet`.
  - Group chat: a post + comment + like persist and arrive live in the other
    window.
  - Place/Event "Discuss": a post in one window appears in the other.
- DM to a seed mom with no `auth_user_id` shows the "Not on Go Mama yet" note.

- [ ] **Step 4: Commit any doc updates**

Update `CLAUDE.md` architecture note to mention the chat tables are the one
browser-accessible (RLS) data surface, then:

```bash
git add -A
git commit -m "docs(chat): note chat is the RLS browser-accessible data surface"
```

---

## Self-review notes

- **Spec coverage:** tables/RLS/RPC (Task 1) ✓ · anon session (Task 4) ✓ ·
  client lib (Task 5) ✓ · 1:1 DM + 3-msg lever (Tasks 3,6) ✓ · shared feed
  (Task 7) ✓ · group (Task 8) ✓ · subject threads + entry points (Task 9) ✓ ·
  helpers/tests (Tasks 2,3) ✓ · author snapshot (Tasks 5,6) ✓ · resolved
  defaults: seed-mom DM disabled (Task 6), feed/chat order via `buildThread` +
  `listMessages` ordering (Tasks 3,5), block via `get_or_create_dm` (Task 1) ✓.
- **YAGNI:** no presence/typing/search/attachments — not in any task.
- **Naming consistency:** `ensureSession`, `getOrCreateDM`, `getGroupConversation`,
  `getSubjectConversation`, `listThread`, `sendMessage`, `toggleReaction`,
  `subscribe`, `buildThread`, `dmFreeState`, `dmPairKey`, `DM_FREE_LIMIT` used
  consistently across tasks.
