-- Remove the retired waitlist feature from the database.
-- Apply once in Supabase SQL editor, Supabase MCP execute_sql, or psql.

drop table if exists public.waitlist_signups cascade;
