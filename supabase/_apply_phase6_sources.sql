-- Phase 6: DB-backed ingestion source registry.
-- Apply via Supabase MCP execute_sql/apply_migration, or paste into the SQL editor.
-- Idempotent: safe to re-run.

-- Per-source kind + type-specific config (bias, queries, url, defaultType, pageId).
alter table public.ingestion_sources
  add column if not exists kind   text not null default 'places',
  add column if not exists config jsonb not null default '{}'::jsonb;

alter table public.ingestion_sources drop constraint if exists ingestion_sources_kind_check;
alter table public.ingestion_sources add constraint ingestion_sources_kind_check
  check (kind in ('places','events'));
