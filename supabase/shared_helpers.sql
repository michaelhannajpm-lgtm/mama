-- Shared utility functions used by multiple table schemas.
-- Apply this once before any of the per-table _schema.sql files.

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
