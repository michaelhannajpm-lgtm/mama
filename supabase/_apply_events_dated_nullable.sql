-- Allow kind='dated' events to omit recurring-only fields.
-- Recurring events carry day_of_week / bucket / time_label; dated events
-- (curated showcase + ingested one-off events) have a starts_at instead and
-- leave those three null. Applied live as migration `events_dated_nullable_fields`;
-- tracked here so a fresh database reproduces it. Idempotent.

alter table public.events alter column day_of_week drop not null;
alter table public.events alter column bucket      drop not null;
alter table public.events alter column time_label  drop not null;
