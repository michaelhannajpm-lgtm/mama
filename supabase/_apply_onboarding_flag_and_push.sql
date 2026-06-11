-- Onboarding-completed gate + web-push subscriptions.
-- Apply via Supabase MCP / SQL editor. Idempotent.

-- 1. Explicit "this user finished onboarding" flag. Distinct from completed_at,
--    which promote.js stamps on every first sign-in (so it's true even for a
--    user who never filled out AboutYou). This flag stays false until the
--    AboutYou essentials are submitted, and drives the routing gate in App.jsx:
--    a signed-in user with onboarding_completed = false is sent to AboutYou
--    instead of MainApp.
alter table public.onboarding_profiles
  add column if not exists onboarding_completed boolean not null default false;
create index if not exists onboarding_profiles_completed_idx
  on public.onboarding_profiles (onboarding_completed);

-- 2. Web-push subscriptions. One row per (user, browser/device endpoint). The
--    sending side (deferred to the push-delivery work) reads these to target
--    pushes. Service-role only — RLS on with no policy denies anon/public
--    PostgREST access, consistent with the service-role-only data model (chat
--    is the only browser-accessible exception).
create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (auth_user_id);

alter table public.push_subscriptions enable row level security;

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at before update on public.push_subscriptions
  for each row execute function public.touch_updated_at();
