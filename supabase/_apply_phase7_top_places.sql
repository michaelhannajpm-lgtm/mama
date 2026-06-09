-- Phase 7: Top-places promotion + configurable radius.
-- Apply via Supabase MCP / SQL editor. Idempotent.

-- 1. Promotion fields on places (admin "Feature as top place" + rank).
alter table public.places
  add column if not exists is_featured boolean not null default false,
  add column if not exists top_rank    integer;
create index if not exists places_featured_idx on public.places (is_featured) where is_featured;
create index if not exists places_top_rank_idx on public.places (top_rank) where top_rank is not null;

-- 2. App-level configuration (key/value). Source of truth for the default
--    top-places radius; editable without a deploy. Read via GET /api/config.
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_config (key, value) values
  ('default_places_radius_miles', '50'::jsonb)
on conflict (key) do nothing;

-- Lock down: only service-role server routes touch app_config. RLS on with no
-- policy denies anon/public PostgREST access; service role bypasses RLS.
alter table public.app_config enable row level security;

drop trigger if exists app_config_updated_at on public.app_config;
create trigger app_config_updated_at before update on public.app_config
  for each row execute function public.touch_updated_at();

-- 3. Per-user override for the top-places radius (null = use app default).
alter table public.onboarding_profiles
  add column if not exists places_radius_miles integer;
