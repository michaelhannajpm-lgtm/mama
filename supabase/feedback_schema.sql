-- Feedback submissions from the /promo "Founding Moms" landing page.
-- Captures the 6-question feedback form: a 1-10 rating plus free-text
-- responses and a multi-value "useful features" checkbox set.
--
-- Apply via the Supabase SQL editor (or your migration tool of choice).

create extension if not exists pgcrypto;

create table if not exists public.feedback_submissions (
  id          uuid primary key default gen_random_uuid(),
  rating      smallint not null check (rating between 1 and 10),
  describe    text,
  useful      text[] not null default '{}',
  confusing   text,
  use_when    text,
  missing     text,
  name        text,
  source      text not null default 'promo',
  user_agent  text,
  referrer    text,
  created_at  timestamptz not null default now()
);

alter table public.feedback_submissions enable row level security;

create index if not exists feedback_submissions_created_at_idx
  on public.feedback_submissions (created_at desc);

create index if not exists feedback_submissions_rating_idx
  on public.feedback_submissions (rating);

comment on table public.feedback_submissions is
  'Qualitative feedback collected from the /promo Founding Moms landing page.';
