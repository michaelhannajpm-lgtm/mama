create extension if not exists pgcrypto;

create table if not exists public.onboarding_profiles (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null unique,
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  current_step    smallint not null default 0,
  completed_at    timestamptz,

  -- Screen 3 (location)
  location        text,
  distance_miles  smallint,

  -- Screen 4 (profile)
  kids_ages       jsonb,
  mom_types       text[],
  values          text[],
  interests       text[],

  -- Screen 5 + 6 (when + where)
  slots           text[],
  places          text[],

  -- AccountScreen / OAuth
  first_name      text,
  username        text unique,
  contact_method  text check (contact_method in ('phone','email','google','facebook','apple')),
  phone           text,
  email           text,
  agreed_terms    boolean,
  auth_provider   text,

  -- Future profile-edit feature (Instagram, Facebook, WhatsApp, TikTok, …)
  social_links    jsonb not null default '{}'::jsonb,

  -- Telemetry
  user_agent      text,
  referrer        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists onboarding_profiles_auth_user_idx
  on public.onboarding_profiles (auth_user_id);

create index if not exists onboarding_profiles_completed_at_idx
  on public.onboarding_profiles (completed_at desc);

create index if not exists onboarding_profiles_current_step_idx
  on public.onboarding_profiles (current_step);

create or replace function public.touch_onboarding_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists onboarding_profiles_updated_at on public.onboarding_profiles;
create trigger onboarding_profiles_updated_at
before update on public.onboarding_profiles
for each row execute function public.touch_onboarding_profiles_updated_at();

alter table public.onboarding_profiles enable row level security;
-- No RLS policies: only the service role (via Vercel API routes) reads or writes.

comment on table public.onboarding_profiles is
  'One row per mom — captures every onboarding-screen field plus auth-user link. Written exclusively by the /api/onboarding/* Vercel functions using the service role key.';
