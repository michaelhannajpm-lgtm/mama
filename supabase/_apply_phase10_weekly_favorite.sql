-- Phase 10: Weekly Favorite ("Local Favorite This Week") with history.
-- Apply via Supabase MCP / SQL editor. Idempotent. Service-role only.
-- NOTE: place_id is uuid (not bigint) — matches public.places(id) which is uuid.

create table if not exists public.weekly_favorites (
  id          uuid primary key default gen_random_uuid(),
  week_start  date not null,
  city        text not null default 'Tampa',
  place_id    uuid not null references public.places(id) on delete cascade,
  source      text not null default 'auto' check (source in ('admin','auto')),
  created_at  timestamptz not null default now(),
  unique (week_start, city)
);

create index if not exists weekly_favorites_week_idx
  on public.weekly_favorites (city, week_start desc);

-- Lock down: only service-role server routes touch this table. RLS on with no
-- policy denies anon/public PostgREST access; service role bypasses RLS.
alter table public.weekly_favorites enable row level security;
