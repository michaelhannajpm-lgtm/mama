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
grant execute on function public.is_participant(uuid) to authenticated;
-- Harden: keep it off the anon RPC surface (Supabase grants new funcs to anon
-- by default). RLS policy evaluation only needs `authenticated`.
revoke execute on function public.is_participant(uuid) from anon, public;

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
  using (
    exists (
      select 1 from public.messages m
      join public.conversations c on c.id = m.conversation_id
      where m.id = message_id
        and (c.kind = 'subject' or public.is_participant(c.id))
    )
  );
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
  insert into public.conversations (kind, dm_pair_key, created_by)
    values ('dm', pair, me)
    on conflict (dm_pair_key) where kind = 'dm' do nothing
    returning id into conv;
  if conv is null then
    -- lost the race (or already existed): fetch the canonical row
    select id into conv from public.conversations where kind = 'dm' and dm_pair_key = pair;
  else
    insert into public.conversation_participants (conversation_id, user_id)
      values (conv, me), (conv, other_user_id);
  end if;
  return conv;
end;
$$;
grant execute on function public.get_or_create_dm(uuid) to authenticated;
-- Harden: signed-in users only (not anon).
revoke execute on function public.get_or_create_dm(uuid) from anon, public;

-- ---------- realtime ----------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.message_reactions;
