create extension if not exists pgcrypto;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  email text not null unique,
  city text,
  audience text,
  source text not null default 'marketing-waitlist',
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;

create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);

comment on table public.waitlist_signups is
  'Marketing waitlist signups collected by the Mama Vercel waitlist API.';

-- 2026-05-07 — additions for the /promo Founding Moms landing page.
-- Both columns are nullable; existing rows get NULL.
alter table public.waitlist_signups
  add column if not exists neighborhood text,
  add column if not exists mom_type text;
