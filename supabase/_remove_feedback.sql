-- Remove the retired feedback-submissions feature from the database.
-- Pairs with deleting api/feedback.js, api/admin/feedback.js, and the
-- AdminPage Feedback tab. Apply once in Supabase SQL editor,
-- Supabase MCP execute_sql, or psql.

drop table if exists public.feedback_submissions cascade;
