-- Phase 5: Ingestion control + Blob images.
-- Apply via Supabase MCP execute_sql/apply_migration, or paste into the SQL editor.
-- Idempotent: safe to re-run.

-- 1. Event image provenance. hero_photo holds the durable Vercel Blob URL;
--    image_source_url keeps the original external image URL as provenance.
alter table public.events
  add column if not exists image_source_url text;

-- 2. Background ingestion job queue (admin-launched, chunked processing).
create table if not exists public.ingestion_jobs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('places','events')),
  source_id   text not null,
  params      jsonb not null default '{}'::jsonb,
  status      text not null default 'queued'
              check (status in ('queued','running','succeeded','failed','partial','canceled')),
  cursor      integer not null default 0,
  total       integer,
  counts      jsonb not null default '{}'::jsonb,
  error       text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  updated_at  timestamptz not null default now()
);
create index if not exists ingestion_jobs_status_idx on public.ingestion_jobs (status, created_at);
