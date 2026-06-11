-- Phase 13 — account lifecycle: deactivate / delete (soft) / 30-day purge.
-- Apply via Supabase MCP execute_sql, the SQL editor, or psql. Idempotent.
--
-- See docs/superpowers/specs/2026-06-11-account-deactivation-deletion-design.md

-- 1) Lifecycle columns on the canonical per-user record.
--    account_status ∈ {'active','deactivated','deleted'}.
alter table public.mom_profiles
  add column if not exists account_status text not null default 'active',
  add column if not exists deactivated_at timestamptz,
  add column if not exists deleted_at     timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'mom_profiles_account_status_chk'
  ) then
    alter table public.mom_profiles
      add constraint mom_profiles_account_status_chk
      check (account_status in ('active','deactivated','deleted')) not valid;
  end if;
end $$;

-- Speeds up the 30-day purge sweep (status + age).
create index if not exists mom_profiles_account_status_idx
  on public.mom_profiles (account_status, deleted_at);

-- 2) Deletion-reason feedback. Survives the purge so the reason is never lost.
--    Keyed by the opaque auth user id; carries no PII after the purge runs.
create table if not exists public.account_deletion_feedback (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid,
  username      text,
  reason_code   text,
  reason_note   text,
  created_at    timestamptz not null default now()
);

-- Backend-only: revoke public grants + enable RLS with no policies so it's
-- reachable only by the service-role /api/* routes (matches the security model
-- in _secure_backend_only_tables.sql).
revoke all on public.account_deletion_feedback from anon, authenticated;
alter table public.account_deletion_feedback enable row level security;
