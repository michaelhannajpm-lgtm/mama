create extension if not exists pgcrypto;

create table if not exists public.mom_profiles (
  id                  uuid primary key default gen_random_uuid(),
  auth_user_id        uuid unique references auth.users(id) on delete cascade,

  -- Identity
  display_name        text not null,
  username            text unique,
  age                 smallint check (age is null or (age >= 16 and age <= 80)),
  bio                 text,
  photos              text[] not null default '{}',

  -- Family
  kids_ages           jsonb not null default '{}'::jsonb,
  mom_types           text[] not null default '{}',

  -- Preference axes
  values              text[] not null default '{}',
  interests           text[] not null default '{}',
  free_slots          text[] not null default '{}',
  places              uuid[] not null default '{}',
  preferred_event_ids uuid[] not null default '{}',

  -- Geo
  city                text not null,
  neighborhood        text,
  home_lat            numeric(9,6),
  home_lng            numeric(9,6),
  distance_miles      smallint,

  -- Visibility / moderation
  visible             boolean not null default true,
  verified            boolean not null default false,
  blocked_global      boolean not null default false,

  -- Social
  social_links        jsonb not null default '{}'::jsonb,

  -- Audit
  source              text not null default 'onboarding'
                       check (source in ('onboarding','seed','admin-import')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_active_at      timestamptz
);

create index if not exists mom_profiles_visible_city_idx
  on public.mom_profiles (city)
  where visible and not blocked_global;
create index if not exists mom_profiles_geo_idx
  on public.mom_profiles (home_lat, home_lng)
  where visible and not blocked_global;
create index if not exists mom_profiles_kids_idx       on public.mom_profiles using gin (kids_ages);
create index if not exists mom_profiles_values_idx     on public.mom_profiles using gin (values);
create index if not exists mom_profiles_interests_idx  on public.mom_profiles using gin (interests);
create index if not exists mom_profiles_slots_idx      on public.mom_profiles using gin (free_slots);
create index if not exists mom_profiles_last_active_idx
  on public.mom_profiles (last_active_at desc nulls last);

drop trigger if exists mom_profiles_updated_at on public.mom_profiles;
create trigger mom_profiles_updated_at
before update on public.mom_profiles
for each row execute function public.touch_updated_at();

alter table public.mom_profiles enable row level security;

-- Phase 1 only allows a mom to read her own profile row. Phase 2 will add
-- the policy that lets authenticated moms read other moms' rows for browsing.
drop policy if exists "moms read own mom_profile" on public.mom_profiles;
create policy "moms read own mom_profile"
  on public.mom_profiles for select
  using (auth.uid() = auth_user_id);

comment on table public.mom_profiles is
  'Discoverable mom directory. Separate from onboarding_profiles (which captures funnel state). One row per mom who finished onboarding, joined via auth_user_id.';
