-- Phase 11 — referrals.
-- A mom shares her invite link (?ref=<username>); when a referred friend signs
-- up (their mom_profiles row is created in api/onboarding/promote.js), a row is
-- recorded here so the referrer can see who joined and earn rewards later.
--
-- Service-role-only, consistent with the rest of the data model: RLS is ENABLED
-- with NO policies, so the anon/auth browser client can never read or write.
-- All access flows through api/* using the service role (which bypasses RLS).

create table if not exists public.referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_mom_id   uuid not null references public.mom_profiles(id) on delete cascade,
  referred_mom_id   uuid not null references public.mom_profiles(id) on delete cascade,
  referrer_username text not null,
  status            text not null default 'joined',  -- 'joined' (account created); room for 'verified' later
  created_at        timestamptz not null default now(),
  -- A given mom can only be attributed to one referrer (idempotent attribution).
  constraint referrals_one_per_referred unique (referred_mom_id),
  -- Never let a mom refer herself.
  constraint referrals_no_self check (referrer_mom_id <> referred_mom_id)
);

create index if not exists referrals_referrer_idx on public.referrals (referrer_mom_id);
create index if not exists referrals_username_idx on public.referrals (referrer_username);

alter table public.referrals enable row level security;

comment on table public.referrals is 'Referral attribution: who invited whom. Written exclusively by /api/onboarding/promote (service role) when a referred mom signs up. RLS on, no policies — service-role-only.';
