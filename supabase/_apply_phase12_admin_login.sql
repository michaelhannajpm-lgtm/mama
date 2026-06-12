-- Phase 12: Admin login via email OTP + allowlist.
-- Apply via Supabase MCP / SQL editor. Idempotent (safe to re-run).
--
-- Replaces the shared-password admin gate with per-person email-OTP login.
-- One-time codes are delivered + verified by Supabase Auth (the same email-OTP
-- path the phone app uses) — no separate mail provider or code-storage table.
-- This migration only seeds the allowlist of who may log in (and, in future,
-- their role + module access).

-- Allowlist of console admins (email-OTP gate) + their role/module access,
-- stored in the existing app_config key/value store (service-role only).
-- role: 'full' | 'read-write' | 'read-only'. modules: ['*'] = all sections,
-- else a subset of admin nav section ids. Everyone is 'full' for now.
insert into public.app_config (key, value, category, value_type, description) values
  ('admin_users',
   '[{"email":"sana.morgan5@gmail.com","role":"full","modules":["*"],"addedBy":"system"},
     {"email":"michaelagentnj@gmail.com","role":"full","modules":["*"],"addedBy":"system"}]'::jsonb,
   'Admins', 'json',
   'Console admins, their role, and module access. The email-OTP login allowlist.')
on conflict (key) do nothing;

-- Drop the custom OTP store from the earlier Resend-based approach (now unused;
-- Supabase Auth owns code delivery/verification).
drop table if exists public.admin_otp;
