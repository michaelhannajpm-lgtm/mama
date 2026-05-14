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
