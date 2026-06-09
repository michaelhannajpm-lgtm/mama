-- Profile screen overhaul: per-user notification + privacy settings.
-- mom_profiles already has bio (text), social_links (jsonb), verified (boolean).
-- Apply via Supabase MCP / SQL editor. Idempotent.
alter table public.mom_profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;
