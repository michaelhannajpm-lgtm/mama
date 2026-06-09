-- Reset onboarding_profiles: drop every row and re-apply the canonical schema
-- fresh. This also resets the admin "Avg. time to complete" stat (which is
-- computed live from created_at -> completed_at), since it clears all rows.
--
-- "Re-apply current schema fresh" — no shape change; this mirrors the live
-- table (funnel fields + neighborhood-picker geo columns), its updated_at
-- trigger, indexes, RLS, and table comment.
--
-- Apply once in Supabase SQL editor, Supabase MCP execute_sql, or psql.

create extension if not exists pgcrypto;

drop table if exists public.onboarding_profiles cascade;

create table public.onboarding_profiles (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null unique,
  auth_user_id    uuid unique references auth.users(id) on delete set null,
  current_step    smallint not null default 0,
  completed_at    timestamptz,

  -- Location (Screen 3)
  location        text,
  distance_miles  smallint,

  -- Geo (neighborhood picker)
  location_place_id      text,
  location_city          text,
  location_neighborhood  text,
  location_county        text,
  location_lat           numeric,
  location_lng           numeric,

  -- Profile (Screen 4)
  kids_ages       jsonb,
  mom_types       text[],
  values          text[],
  interests       text[],

  -- Preferences (Screen 5 + 6)
  slots           text[],
  places          text[],

  -- Account / OAuth
  first_name      text,
  username        text unique,
  contact_method  text check (contact_method in ('phone','email','google','facebook','apple')),
  phone           text,
  email           text,
  agreed_terms    boolean,
  auth_provider   text,

  -- Future profile-edit feature
  social_links    jsonb not null default '{}'::jsonb,

  -- Telemetry
  user_agent      text,
  referrer        text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.onboarding_profiles is
  'One row per mom — captures every onboarding-screen field plus auth-user link. Written exclusively by the /api/onboarding/* Vercel functions using the service role key.';

create index on public.onboarding_profiles (auth_user_id);
create index on public.onboarding_profiles (completed_at);
create index on public.onboarding_profiles (current_step);

alter table public.onboarding_profiles enable row level security;
-- No RLS policies: only the service role (via API routes) writes or reads.

create or replace function public.touch_onboarding_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger onboarding_profiles_updated_at
  before update on public.onboarding_profiles
  for each row execute function public.touch_onboarding_profiles_updated_at();
