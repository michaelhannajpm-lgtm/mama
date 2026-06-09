-- Secure the 8 backend-only tables that shipped with RLS disabled AND full
-- anon/authenticated grants (SELECT/INSERT/UPDATE/DELETE/TRUNCATE) — i.e. wide
-- open to anyone holding the public anon key.
--
-- These tables are read/written exclusively by the service-role /api/* routes;
-- the browser Supabase client is auth-only and never queries them. The
-- service_role bypasses BOTH RLS and grant restrictions, so the app is
-- unaffected.
--
-- Belt-and-suspenders: revoke the grants AND enable RLS (no policies) so the
-- hole stays closed even if a future GRANT re-opens it.
--
-- Apply once in Supabase SQL editor, Supabase MCP execute_sql, or psql.

-- 1) Drop the public-role grants.
revoke all on public.categories       from anon, authenticated;
revoke all on public.place_categories from anon, authenticated;
revoke all on public.place_photos     from anon, authenticated;
revoke all on public.ingestion_sources from anon, authenticated;
revoke all on public.ingestion_runs   from anon, authenticated;
revoke all on public.source_records   from anon, authenticated;
revoke all on public.event_categories from anon, authenticated;
revoke all on public.ingestion_jobs   from anon, authenticated;

-- 2) Enable RLS (no policies => default-deny for anon/authenticated;
--    service_role still has full access because it bypasses RLS).
alter table public.categories        enable row level security;
alter table public.place_categories  enable row level security;
alter table public.place_photos      enable row level security;
alter table public.ingestion_sources enable row level security;
alter table public.ingestion_runs    enable row level security;
alter table public.source_records    enable row level security;
alter table public.event_categories  enable row level security;
alter table public.ingestion_jobs    enable row level security;
